import { app,BrowserWindow,dialog,ipcMain,shell } from "electron";
import { readFile,writeFile } from "node:fs/promises";
import { cpus,freemem,platform,totalmem } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_VERSION,DEFAULT_API_URL,DEFAULT_NODE_URL,MINER_PROTOCOL,PLANCK_NETWORK,createMinerAuthHeaders,miningStats,normalizeApiUrl,normalizeNodeUrl,rewardAddress,validateInnerHash,validateResources } from "./miner-core.js";
import { createEncryptedWallet,signWormholeTransfer,unlockWallet } from "./wallet-core.js";

const directory=fileURLToPath(new URL(".",import.meta.url));
let windowRef=null,mining=false,timer=null,session=null,activeWallet=null,cachedHardware=null;
const emit=payload=>{if(windowRef&&!windowRef.isDestroyed())windowRef.webContents.send("miner:update",payload)};
const publicWallet=(wallet,recoveryPhrase)=>({transparentAddress:wallet.transparent.address,wormholeAddress:wallet.wormhole.address,innerHash:wallet.wormhole.innerHash,recoveryPhrase});

async function request(base,path,{method="GET",body="",authToken="",protocol=false}={}){
 const headers={"content-type":"application/json",...(protocol?{"x-korek-miner-protocol":MINER_PROTOCOL,...createMinerAuthHeaders(authToken,{method,path,body})}:{})};
 const response=await fetch(`${base}${path}`,{method,body:body||undefined,headers,signal:AbortSignal.timeout(10_000)}),data=await response.json();
 if(response.status===426)throw new Error(`${data.error}. Install matching KOREK Node and Miner versions.`);
 if(response.status===401)throw new Error(`${data.error}. Check the authentication token and system time.`);
 if(!response.ok)throw new Error(data.error||`Node returned HTTP ${response.status}`);
 return data;
}
async function status(base,authToken=""){const normalized=normalizeNodeUrl(base),data=await request(normalized,"/status",{authToken,protocol:true});if(data.networkId!==PLANCK_NETWORK)throw new Error(`Wrong network: ${data.networkId||"unknown"}`);if(data.minerProtocol!==MINER_PROTOCOL)throw new Error(`Protocol mismatch: ${data.minerProtocol||"unknown"}`);return data}
function apiCandidates({apiUrl,nodeUrl,nodeStatus}={}){const candidates=[];const add=value=>{try{const normalized=normalizeApiUrl(value);if(!candidates.includes(normalized))candidates.push(normalized)}catch{}};add(apiUrl);if(nodeUrl){try{const derived=new URL(normalizeNodeUrl(nodeUrl));derived.port=String(nodeStatus?.apiPort||8365);add(derived.origin)}catch{}}add(DEFAULT_API_URL);return candidates}
async function apiRequest(input,path,options){let lastError;const candidates=apiCandidates(input);for(const base of candidates)try{return{...(await request(base,path,options)),apiUrl:base}}catch(error){lastError=error}throw new Error("Blockchain API unavailable at "+candidates.join(" or ")+". Check the API endpoint and make sure port 8365 is reachable. "+(lastError?.message||""))}
async function balance(input,address){return apiRequest(input,"/api/balance/"+address)}
function schedule(delay){clearTimeout(timer);if(mining)timer=setTimeout(mineOnce,delay)}
async function mineOnce(){
 if(!mining||!session)return;
 const began=Date.now();
 try{
  const current=await status(session.nodeUrl,session.authToken);emit({type:"status",status:current});
  if(current.sync?.state!=="Idle"){emit({type:"paused",message:`Node state is ${current.sync?.state||"unknown"}; mining paused`});return schedule(2000)}
  const body=JSON.stringify({rewardsInnerHash:session.innerHash}),block=await request(session.nodeUrl,"/mine",{method:"POST",body,authToken:session.authToken,protocol:true});
  session.blocks++;session.totalAtomic+=BigInt(block.reward);
  const stats=miningStats(session.blocks,session.totalAtomic,session.startedAt),account=await balance({...session,nodeStatus:current},session.rewardAddress).catch(()=>null);
  if(account?.apiUrl)session.apiUrl=account.apiUrl;
  emit({type:"block",block,stats,rewardAddress:session.rewardAddress,balance:account?.balance??null,resources:session.resources});
  schedule(Math.max(100,(current.rewardBlockTimeMs||1000)-(Date.now()-began)));
 }catch(error){emit({type:"error",message:error.message});schedule(3000)}
}
function stop(){mining=false;clearTimeout(timer);timer=null;session=null;emit({type:"stopped"});return{mining:false}}
async function hardware(){
 if(cachedHardware)return cachedHardware;
 let gpuInfo={};try{gpuInfo=await app.getGPUInfo("basic")}catch{}
 const devices=(gpuInfo.gpuDevice||[]).map((item,index)=>({id:`gpu-${index}-${item.vendorId||0}-${item.deviceId||0}`,name:item.deviceString||`GPU ${index+1} (${item.vendorId||"unknown"}:${item.deviceId||"unknown"})`,vendorId:item.vendorId||0,deviceId:item.deviceId||0,active:index===0}));
 cachedHardware={platform:platform(),cpu:cpus()[0]?.model||"Unknown CPU",threads:cpus().length,memoryTotal:totalmem(),memoryFree:freemem(),gpu:devices,engine:{cpu:"node-side prototype",gpu:"detected; worker engine pending"}};
 return cachedHardware;
}
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

ipcMain.handle("miner:status",(_event,{base,authToken})=>status(base,authToken));
ipcMain.handle("miner:start",async(_event,input)=>{
 if(mining)throw new Error("Miner is already running");
 const nodeUrl=normalizeNodeUrl(input.nodeUrl||DEFAULT_NODE_URL),apiUrl=normalizeApiUrl(input.apiUrl||DEFAULT_API_URL),innerHash=activeWallet?.wormhole.innerHash||validateInnerHash(input.innerHash),nodeStatus=await status(nodeUrl,input.authToken||"");
 if(nodeStatus.sync?.state!=="Idle")throw new Error(`Node is ${nodeStatus.sync?.state||"not ready"}`);
 const resources=validateResources(input,await hardware());
 session={nodeUrl,apiUrl,innerHash,authToken:input.authToken||"",rewardAddress:rewardAddress(innerHash),resources,startedAt:Date.now(),blocks:0,totalAtomic:0n};
 mining=true;emit({type:"started",nodeStatus,rewardAddress:session.rewardAddress,resources,startedAt:session.startedAt});mineOnce();
 return{mining:true,rewardAddress:session.rewardAddress,nodeStatus,resources};
});
ipcMain.handle("miner:stop",stop);
ipcMain.handle("miner:hardware",hardware);
ipcMain.handle("wallet:create",(_event,password)=>saveWallet(password));
ipcMain.handle("wallet:restore",(_event,{password,mnemonic})=>saveWallet(password,mnemonic));
ipcMain.handle("wallet:open",async(_event,password)=>{const selected=await dialog.showOpenDialog({title:"Open KOREK wallet",properties:["openFile"],filters:[{name:"KOREK Wallet",extensions:["krkwallet","json"]}]});if(selected.canceled)return{canceled:true};activeWallet=unlockWallet(JSON.parse(await readFile(selected.filePaths[0],"utf8")),password);return{...publicWallet(activeWallet),path:selected.filePaths[0]}});
ipcMain.handle("wallet:lock",()=>{stop();activeWallet=null;return true});
ipcMain.handle("wallet:summary",()=>activeWallet?publicWallet(activeWallet):null);
ipcMain.handle("wallet:balance",(_event,input)=>{if(!activeWallet)throw new Error("Create or open a wallet first");const connection=typeof input==="string"?{apiUrl:input}:input;return balance(connection,activeWallet.wormhole.address)});
ipcMain.handle("wallet:send",async(_event,{apiUrl,nodeUrl,to,amount})=>{if(!activeWallet)throw new Error("Unlock your wallet first");const transaction=signWormholeTransfer(activeWallet,to,amount);return apiRequest({apiUrl,nodeUrl},"/api/transactions",{method:"POST",body:JSON.stringify(transaction)})});
ipcMain.handle("app:version",()=>APP_VERSION);
ipcMain.handle("app:open-wallet",()=>shell.openExternal("https://github.com/Korek-Network/wallet/releases"));

app.whenReady().then(createWindow);
app.on("window-all-closed",()=>{stop();activeWallet=null;if(platform()!=="darwin")app.quit()});
app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
