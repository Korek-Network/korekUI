import { app,BrowserWindow,dialog,ipcMain,shell } from "electron";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile,writeFile } from "node:fs/promises";
import { cpus,freemem,platform,totalmem } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Worker } from "node:worker_threads";
import { APP_VERSION,DEFAULT_API_URL,DEFAULT_NODE_URL,MINER_PROTOCOL,PLANCK_NETWORK,applyWorkerRate,miningStats,normalizeApiUrl,normalizeNodeUrl,rewardAddress,rollingHashrate,validateInnerHash,validateResources } from "./miner-core.js";
import { createEncryptedWallet,signMiningSubmission,signMiningWorkRequest,signWormholeTransfer,unlockWallet } from "./wallet-core.js";

const directory=fileURLToPath(new URL(".",import.meta.url)),execFileAsync=promisify(execFile);
let windowRef=null,mining=false,timer=null,session=null,activeWallet=null,cachedHardware=null,workers=new Set(),stopView=null,gpuRequest=null;
let cpuHashrate=0,gpuHashrate=0,gpuRateSamples=[];
let previousCpuTimes=null;
const emit=payload=>{if(windowRef&&!windowRef.isDestroyed())windowRef.webContents.send("miner:update",payload)};
const publicWallet=(wallet,recoveryPhrase)=>({transparentAddress:wallet.transparent.address,wormholeAddress:wallet.wormhole.address,innerHash:wallet.wormhole.innerHash,recoveryPhrase});

async function request(base,path,{method="GET",body=""}={}){
 const headers={"content-type":"application/json","x-korek-miner-protocol":MINER_PROTOCOL};
 const response=await fetch(`${base}${path}`,{method,body:body||undefined,headers,signal:AbortSignal.timeout(10_000)}),data=await response.json();
 if(response.status===426)throw new Error(`${data.error}. Install matching KOREK Node and Miner versions.`);
 if(response.status===401)throw new Error(`${data.error}. Unlock the wallet that owns this reward address and check system time.`);
 if(!response.ok)throw new Error(data.error||`Node returned HTTP ${response.status}`);
 return data;
}
async function status(base){const normalized=normalizeNodeUrl(base),data=await request(normalized,"/api/status");if(data.networkId!==PLANCK_NETWORK)throw new Error(`Wrong network: ${data.networkId||"unknown"}`);if(data.minerProtocol!==MINER_PROTOCOL)throw new Error(`Protocol mismatch: ${data.minerProtocol||"unknown"}`);return data}
async function nodeOverview(base){const normalized=normalizeNodeUrl(base),nodeStatus=await status(normalized);let blocks=[];try{const value=await request(normalized,"/api/blocks");if(Array.isArray(value))blocks=value.slice(-12).reverse()}catch{}return{status:nodeStatus,blocks,connection:{type:"remote",endpoint:normalized,localProcess:false}}}
function apiCandidates({apiUrl,nodeUrl,nodeStatus}={}){const candidates=[];const add=value=>{try{const normalized=normalizeApiUrl(value);if(!candidates.includes(normalized))candidates.push(normalized)}catch{}};add(apiUrl);if(nodeUrl){try{const derived=new URL(normalizeNodeUrl(nodeUrl));derived.port=String(nodeStatus?.apiPort||8365);add(derived.origin)}catch{}}add(DEFAULT_API_URL);return candidates}
async function apiRequest(input,path,options){let lastError;const candidates=apiCandidates(input);for(const base of candidates)try{return{...(await request(base,path,options)),apiUrl:base}}catch(error){lastError=error}throw new Error("Blockchain API unavailable at "+candidates.join(" or ")+". Check the blockchain API endpoint and your network connection. "+(lastError?.message||""))}
async function balance(input,address){return apiRequest(input,"/api/balance/"+address)}
function schedule(delay){clearTimeout(timer);if(mining)timer=setTimeout(mineOnce,delay)}
function stopWorkers(){if(stopView)Atomics.store(stopView,0,1);for(const worker of workers)worker.terminate();workers.clear();stopView=null}
function solveCpu(template,threads){return new Promise((resolve,reject)=>{const miningSession=session,stopBuffer=new SharedArrayBuffer(4);stopView=new Int32Array(stopBuffer);let completed=0,totalHashes=0,settled=false;const rates=new Map();const finish=result=>{if(settled)return;settled=true;stopWorkers();if(!result)return reject(new Error("CPU nonce range exhausted without a valid proof"));resolve({...result,hashesTried:totalHashes+(result.hashes||0),device:`${threads} CPU`})};for(let index=0;index<threads;index++){const worker=new Worker(new URL("./cpu-worker.js",import.meta.url),{workerData:{challenge:template.challenge,difficulty:template.difficulty,startNonce:template.nonceStart+index,endNonce:template.nonceEnd,stride:threads,stopBuffer}});workers.add(worker);worker.on("message",message=>{if(message?.type==="rate"){const rate=applyWorkerRate({message,mining,currentSession:session,workerSession:miningSession});if(rate===null)return;rates.set(index,rate);cpuHashrate=[...rates.values()].reduce((sum,value)=>sum+value,0);emit({type:"hashrate",cpuHashrate,gpuHashrate,totalHashes:miningSession.hashes})}else if(message?.type==="found")finish(message);else if(message?.type==="done"){totalHashes+=Number(message.hashes)||0;if(++completed===threads)finish(null)}});worker.on("error",error=>{if(!settled){settled=true;stopWorkers();reject(error)}});worker.on("exit",code=>{workers.delete(worker);if(code!==0&&mining&&!settled){settled=true;stopWorkers();reject(new Error(`CPU worker stopped with code ${code}`))}})}})}
function solveGpu(template,resources){return new Promise((resolve,reject)=>{if(!windowRef||windowRef.isDestroyed())return reject(new Error("GPU renderer unavailable"));const selected=cachedHardware?.gpu?.find(device=>device.id===resources.gpuIds[0]);if(!selected)return reject(new Error("Selected GPU is no longer available; rescan compute devices"));const requestId=randomUUID(),timeout=setTimeout(()=>{if(gpuRequest?.requestId===requestId){gpuRequest=null;reject(new Error("GPU worker timed out"))}},Math.max(5_000,template.expiresAt-Date.now()+2_000));gpuRequest={requestId,resolve:result=>{clearTimeout(timeout);gpuRequest=null;result?.nonce!==undefined?resolve({...result,device:`WebGPU · ${result.adapter||selected.name}`}):reject(new Error(result?.error||"GPU did not find a proof"))},reject};windowRef.webContents.send("miner:gpu-work",{requestId,template,options:{gpuId:selected.id,gpuName:selected.name,powerPreference:selected.integrated?"low-power":"high-performance",intensity:resources.gpuIntensity}})})}
async function solveWork(template,resources){const attempts=[];if(resources.cpuThreads>0)attempts.push(solveCpu(template,resources.cpuThreads));if(resources.gpuIds.length)attempts.push(solveGpu(template,resources).catch(error=>{emit({type:"gpu-status",state:"error",message:error.message});throw error}));try{const proof=await(attempts.length===1?attempts[0]:Promise.any(attempts));stopWorkers();if(gpuRequest){windowRef.webContents.send("miner:gpu-cancel",{requestId:gpuRequest.requestId});gpuRequest=null}return proof}finally{stopWorkers()}}
async function mineOnce(){
 if(!mining||!session)return;
 const began=Date.now();
 try{
  const current=await status(session.nodeUrl);emit({type:"status",status:current});
  if(current.sync?.state!=="Idle"){emit({type:"paused",message:`Node state is ${current.sync?.state||"unknown"}; mining paused`});return schedule(2000)}
  const workRequest=signMiningWorkRequest(activeWallet),template=await request(session.nodeUrl,"/miner/v3/work",{method:"POST",body:JSON.stringify(workRequest)});
  emit({type:"work",template:{height:template.height,difficulty:template.difficulty,expiresAt:template.expiresAt}});
  const proof=await solveWork(template,session.resources);if(!mining||!proof)return;
  const wait=Math.max(0,template.notBefore-Date.now());if(wait)await new Promise(resolve=>setTimeout(resolve,wait));if(!mining)return;
  const submission=signMiningSubmission(activeWallet,{templateId:template.templateId,nonce:proof.nonce,powHash:proof.powHash,hashesTried:proof.hashesTried,device:proof.device}),accepted=await request(session.nodeUrl,"/miner/v3/submit",{method:"POST",body:JSON.stringify(submission)}),block=accepted.block;
  const minerPayout=BigInt(block.minerReward??block.reward)+BigInt(block.feePayout||0);session.blocks++;session.totalAtomic+=minerPayout;
  const stats=miningStats(session.blocks,session.totalAtomic,session.startedAt),account=await balance({...session,nodeStatus:current},session.rewardAddress).catch(()=>null);
  if(account?.apiUrl)session.apiUrl=account.apiUrl;
  emit({type:"block",block,minerPayout:minerPayout.toString(),stats,rewardAddress:session.rewardAddress,balance:account?.balance??null,resources:session.resources});
  schedule(Math.max(25,(current.rewardBlockTimeMs||1000)-(Date.now()-began)));
 }catch(error){stopWorkers();if(/stale|expired|duplicate/i.test(error.message)){session.rejected++;emit({type:"rejected",message:error.message,rejected:session.rejected});schedule(100)}else{emit({type:"error",message:error.message});schedule(3000)}}
}
function stop(){mining=false;clearTimeout(timer);timer=null;stopWorkers();cpuHashrate=0;gpuHashrate=0;gpuRateSamples=[];if(gpuRequest&&windowRef){windowRef.webContents.send("miner:gpu-cancel",{requestId:gpuRequest.requestId});gpuRequest=null}session=null;emit({type:"hashrate",cpuHashrate:0,gpuHashrate:0,totalHashes:0});emit({type:"stopped"});return{mining:false}}
async function nvidiaTelemetry(){try{const{stdout}=await execFileAsync("nvidia-smi",["--query-gpu=index,name,utilization.gpu,temperature.gpu,power.draw","--format=csv,noheader,nounits"],{timeout:2000,windowsHide:true});return stdout.trim().split(/\r?\n/).filter(Boolean).map(line=>{const[index,name,utilization,tempC,powerW]=line.split(",").map(value=>value.trim());return{index:Number(index),name,utilization:Number(utilization),tempC:Number(tempC),powerW:Number(powerW)}})}catch{return[]}}
async function hardware(){
 if(cachedHardware)return cachedHardware;
 let gpuInfo={};try{gpuInfo=await app.getGPUInfo("basic")}catch{}
 const nvidia=await nvidiaTelemetry(),browserDevices=(gpuInfo.gpuDevice||[]).map((item,index)=>{const name=item.deviceString||`GPU ${index+1} (${item.vendorId||"unknown"}:${item.deviceId||"unknown"})`;return{id:`gpu-${index}-${item.vendorId||0}-${item.deviceId||0}`,name,vendorId:item.vendorId||0,deviceId:item.deviceId||0,active:index===0,integrated:Number(item.vendorId)===32902,usable:!/Microsoft Basic Render Driver/i.test(name)}}).filter(device=>device.usable),preferred=nvidia[0]?{id:`nvidia-${nvidia[0].index}`,name:nvidia[0].name,vendorId:4318,deviceId:0,active:true,integrated:false,usable:true,telemetryIndex:nvidia[0].index}:browserDevices.find(device=>!device.integrated)||browserDevices[0];
 cachedHardware={platform:platform(),cpu:cpus()[0]?.model||"Unknown CPU",threads:cpus().length,memoryTotal:totalmem(),memoryFree:freemem(),gpu:preferred?[preferred]:[],engine:{cpu:"local worker threads",gpu:preferred?"verified WebGPU adapter + OS telemetry":"unavailable"}};
 return cachedHardware;
}
async function telemetry(){const totals=cpus().reduce((sum,cpu)=>{const total=Object.values(cpu.times).reduce((a,b)=>a+b,0);sum.idle+=cpu.times.idle;sum.total+=total;return sum},{idle:0,total:0}),delta=previousCpuTimes?{idle:totals.idle-previousCpuTimes.idle,total:totals.total-previousCpuTimes.total}:null;previousCpuTimes=totals;const cpuPercent=delta&&delta.total?Math.max(0,Math.min(100,100*(1-delta.idle/delta.total))):0,gpu=await nvidiaTelemetry();return{timestamp:Date.now(),cpuPercent,gpu,capabilities:{cpuUtilization:true,gpuTelemetry:gpu.length>0,temperature:gpu.some(x=>Number.isFinite(x.tempC)),power:gpu.some(x=>Number.isFinite(x.powerW))}}}
async function saveWallet(password,mnemonic){
 const made=createEncryptedWallet(password,mnemonic),selected=await dialog.showSaveDialog({title:"Save encrypted KOREK mining wallet",defaultPath:`korek-wallet-${made.wallet.wormhole.address.slice(-8)}.krkwallet`,filters:[{name:"KOREK Wallet",extensions:["krkwallet"]}]});
 if(selected.canceled)return{canceled:true};
 await writeFile(selected.filePath,JSON.stringify(made.file,null,2),{mode:0o600});
 activeWallet=made.wallet;return{...publicWallet(activeWallet,made.recoveryPhrase),path:selected.filePath};
}
function createWindow(){
 windowRef=new BrowserWindow({width:1400,height:900,minWidth:1040,minHeight:720,backgroundColor:"#07110f",title:"KOREK Miner",webPreferences:{preload:join(directory,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 windowRef.removeMenu();windowRef.loadFile(join(directory,"renderer","index.html"));
 windowRef.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith("https://github.com/Korek-Network/"))shell.openExternal(url);return{action:"deny"}});
}

ipcMain.handle("miner:status",(_event,{base})=>status(base));
ipcMain.handle("node:overview",(_event,{base})=>nodeOverview(base));
ipcMain.handle("miner:start",async(_event,input)=>{
 if(mining)throw new Error("Miner is already running");
 const nodeUrl=normalizeNodeUrl(input.nodeUrl||DEFAULT_NODE_URL),apiUrl=normalizeApiUrl(input.apiUrl||DEFAULT_API_URL),innerHash=activeWallet?.wormhole.innerHash||validateInnerHash(input.innerHash),nodeStatus=await status(nodeUrl);
 if(nodeStatus.sync?.state!=="Idle")throw new Error(`Node is ${nodeStatus.sync?.state||"not ready"}`);
 const resources=validateResources(input,await hardware());
 cpuHashrate=0;gpuHashrate=0;gpuRateSamples=[];session={nodeUrl,apiUrl,innerHash,rewardAddress:rewardAddress(innerHash),resources,startedAt:Date.now(),blocks:0,rejected:0,hashes:0,totalAtomic:0n};
 mining=true;emit({type:"started",nodeStatus,rewardAddress:session.rewardAddress,resources,startedAt:session.startedAt});mineOnce();
 return{mining:true,rewardAddress:session.rewardAddress,nodeStatus,resources};
});
ipcMain.handle("miner:stop",stop);
ipcMain.handle("miner:hardware",(_event,{refresh=false}={})=>{if(refresh)cachedHardware=null;return hardware()});
ipcMain.handle("miner:telemetry",telemetry);
ipcMain.handle("miner:gpu-result",(_event,result)=>{if(gpuRequest&&result.requestId===gpuRequest.requestId)gpuRequest.resolve(result);return true});
ipcMain.handle("miner:gpu-progress",(_event,result)=>{if(session&&gpuRequest&&result.requestId===gpuRequest.requestId){session.hashes+=result.hashes;gpuRateSamples.push({hashes:Number(result.hashes),elapsedMs:Number(result.elapsedMs)});gpuRateSamples=gpuRateSamples.slice(-12);gpuHashrate=rollingHashrate(gpuRateSamples);emit({type:"hashrate",cpuHashrate,gpuHashrate,totalHashes:session.hashes})}return true});
ipcMain.handle("miner:gpu-status",(_event,result)=>{if(gpuRequest&&result?.requestId===gpuRequest.requestId)emit({type:"gpu-status",state:result.state||"active",message:result.message||"",adapter:result.adapter||"",requested:result.requested||""});return true});
ipcMain.handle("wallet:create",(_event,password)=>saveWallet(password));
ipcMain.handle("wallet:restore",(_event,{password,mnemonic})=>saveWallet(password,mnemonic));
ipcMain.handle("wallet:open",async(_event,password)=>{const selected=await dialog.showOpenDialog({title:"Open KOREK wallet",properties:["openFile"],filters:[{name:"KOREK Wallet",extensions:["krkwallet","json"]}]});if(selected.canceled)return{canceled:true};activeWallet=unlockWallet(JSON.parse(await readFile(selected.filePaths[0],"utf8")),password);return{...publicWallet(activeWallet),path:selected.filePaths[0]}});
ipcMain.handle("wallet:lock",()=>{stop();activeWallet=null;return true});
ipcMain.handle("wallet:summary",()=>activeWallet?publicWallet(activeWallet):null);
ipcMain.handle("wallet:balance",(_event,input)=>{if(!activeWallet)throw new Error("Create or open a wallet first");const connection=typeof input==="string"?{apiUrl:input}:input;return balance(connection,activeWallet.wormhole.address)});
ipcMain.handle("wallet:send",async(_event,{apiUrl,nodeUrl,to,amount})=>{if(!activeWallet)throw new Error("Unlock your wallet first");const transaction=signWormholeTransfer(activeWallet,to,amount);return apiRequest({apiUrl,nodeUrl},"/api/transactions",{method:"POST",body:JSON.stringify(transaction)})});
ipcMain.handle("app:version",()=>APP_VERSION);
ipcMain.handle("app:open-wallet",()=>shell.openExternal("https://github.com/Korek-Network/wallet/releases"));

app.commandLine.appendSwitch("force_high_performance_gpu");
app.whenReady().then(createWindow);
app.on("window-all-closed",()=>{stop();activeWallet=null;if(platform()!=="darwin")app.quit()});
app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
