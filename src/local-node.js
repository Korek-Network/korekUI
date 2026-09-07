import {spawn} from 'node:child_process';
import {createHash,generateKeyPairSync} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

export class LocalNode {
 constructor(resources,data){this.resources=resources;this.data=data;this.child=null;this.busy=false;}
 async start(peer=''){
  if(this.child||this.busy)throw Error('Local node is already running or changing state');
  this.busy=true;
  try{
   if(peer){const url=new URL(peer);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Use a peer HTTP(S) origin');peer=url.origin;}
   const executable=join(this.resources,process.platform==='win32'?'korek-node.exe':'korek-node');
   const manifest=JSON.parse(await readFile(join(this.resources,'manifest.json'),'utf8'));
   if(manifest.platform!==process.platform||manifest.arch!==process.arch||createHash('sha256').update(await readFile(executable)).digest('hex')!==manifest.sha256)throw Error('Bundled node integrity or platform mismatch');
   await mkdir(this.data,{recursive:true,mode:0o700});const keyPath=join(this.data,'node-key.json');
   let identity;
   try{identity=JSON.parse(await readFile(keyPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;const keys=generateKeyPairSync('ed25519'),publicKey=keys.publicKey.export({format:'pem',type:'spki'});identity={format:'korek-node-key',version:1,publicKey,privateKey:keys.privateKey.export({format:'pem',type:'pkcs8'}),peerId:createHash('sha256').update(publicKey).digest('hex')};await writeFile(keyPath,JSON.stringify(identity),{mode:0o600,flag:'wx'});}
   const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('KOREK_')&&!['NODE_OPTIONS','NODE_PATH','ELECTRON_RUN_AS_NODE'].includes(key)));
   Object.assign(env,{KOREK_NETWORK_ID:'korek-planck-testnet-2',KOREK_PORT:'18365',KOREK_MINER_PORT:'19833',KOREK_API_HOST:'127.0.0.1',KOREK_MINER_HOST:'127.0.0.1'});
   const args=['--data-dir',join(this.data,'chain'),'--node-key-file',keyPath,'--p2p-port','19333','--name','KOREK-app-node',...(peer?['--peer',peer]:[])];
   const child=spawn(executable,args,{env,stdio:['ignore','ignore','pipe'],windowsHide:true});this.child=child;let failure='';
   child.stderr.on('data',data=>{failure=(failure+data).slice(-2000)});child.on('error',error=>{failure=error.message});child.on('exit',()=>{if(this.child===child)this.child=null;});
   for(let i=0;i<100;i++){
    if(child.exitCode!==null||child.signalCode||!child.pid)throw Error('Local node failed to start: '+failure);
    try{const response=await fetch('http://127.0.0.1:18365/api/status',{signal:AbortSignal.timeout(500)});const status=await response.json();if(status.nodeIdentity===identity.peerId&&status.networkId==='korek-planck-testnet-2'&&this.child===child)return {apiUrl:'http://127.0.0.1:18365',nodeUrl:'http://127.0.0.1:19833',height:status.height,peers:status.sync.peers};}catch{}
    await delay(100);
   }
   throw Error('Local node startup timed out; check ports 18365, 19833 and 19333');
  }catch(error){await this.stop();throw error;}finally{this.busy=false;}
 }
 async stop(){const child=this.child;if(!child)return;child.kill();for(let i=0;i<50&&this.child===child;i++)await delay(100);if(this.child===child){child.kill('SIGKILL');for(let i=0;i<20&&this.child===child;i++)await delay(100);}if(this.child===child)throw Error('Local node did not stop');}
}
