import { parentPort,workerData } from "node:worker_threads";
import { meetsDifficulty,powDigest } from "./miner-core.js";

const {challenge,difficulty,startNonce,endNonce,stride,stopBuffer}=workerData,stop=new Int32Array(stopBuffer);
let hashes=0,lastHashes=0,lastReport=Date.now(),nonce=startNonce;
while(nonce<=endNonce&&!Atomics.load(stop,0)){
 const powHash=powDigest(challenge,nonce);hashes++;
 if(meetsDifficulty(powHash,difficulty)){if(Atomics.compareExchange(stop,0,0,1)===0)parentPort.postMessage({type:"found",nonce,powHash,hashes});break}
 nonce+=stride;
 const now=Date.now();if(now-lastReport>=500){parentPort.postMessage({type:"rate",hashes:hashes-lastHashes,elapsedMs:now-lastReport});lastHashes=hashes;lastReport=now}
}
parentPort.postMessage({type:"done",hashes});
