import test from "node:test";
import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { meetsDifficulty,powDigest } from "../src/miner-core.js";

test("CPU worker performs and returns verifiable local proof of work",async()=>{const challenge="42".repeat(32),stopBuffer=new SharedArrayBuffer(4),proof=await new Promise((resolve,reject)=>{let found=false;const worker=new Worker(new URL("../src/cpu-worker.js",import.meta.url),{workerData:{challenge,difficulty:2,startNonce:0,endNonce:100000,stride:1,stopBuffer}});worker.on("message",message=>{if(message.type==="found"){found=true;worker.terminate();resolve(message)}});worker.on("error",reject);worker.on("exit",code=>{if(code&&!found)reject(new Error("worker failed"))})});assert.equal(proof.powHash,powDigest(challenge,proof.nonce));assert.equal(meetsDifficulty(proof.powHash,2),true);assert.ok(proof.hashes>0)});
