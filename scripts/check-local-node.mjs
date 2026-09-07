import {LocalNode} from '../src/local-node.js';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const data=await mkdtemp(join(tmpdir(),'korek-app-node-'));
const node=new LocalNode(resolve(process.argv[2]||'node-bundle'),data);
try{
 const first=await node.start();assert.equal(first.height,0);
 const a=await (await fetch(first.apiUrl+'/api/status')).json();
 assert.equal(a.networkId,'korek-planck-testnet-2');assert.equal(a.p2p.enabled,true);
 await assert.rejects(()=>node.start(),/already/);await node.stop();
 const second=await node.start();const b=await (await fetch(second.apiUrl+'/api/status')).json();
 assert.equal(b.nodeIdentity,a.nodeIdentity);assert.equal(b.height,a.height);
 await node.stop();assert.equal(node.child,null);
 console.log('Native node lifecycle, network identity and persistent identity checks passed.');
}finally{await node.stop();await rm(data,{recursive:true,force:true});}
