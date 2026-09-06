import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_API_URL,MINER_PROTOCOL,createMinerAuthHeaders,formatKrk,miningStats,normalizeApiUrl,normalizeNodeUrl,rewardAddress,validateInnerHash,validateResources } from "../src/miner-core.js";
test("validates Planck endpoints",()=>{assert.equal(normalizeNodeUrl("http://127.0.0.1:9833/"),"http://127.0.0.1:9833");assert.equal(DEFAULT_API_URL,"https://rpc.planck.korek.network");assert.equal(normalizeApiUrl("http://127.0.0.1:8365/"),"http://127.0.0.1:8365");assert.throws(()=>normalizeNodeUrl("file:///tmp/node"),/HTTP/)});
test("derives wormhole address",()=>{const hash="ab".repeat(32);assert.equal(validateInnerHash(hash),hash);assert.equal(rewardAddress(hash),"krk1"+"ab".repeat(20))});
test("calculates exact display and statistics",()=>{assert.equal(formatKrk("115740740"),"1.1574074");const stats=miningStats(30,3472222200n,1000,61000);assert.equal(stats.blocksPerMinute,30);assert.equal(stats.totalAtomic,"3472222200")});
test("clamps resources to detected hardware",()=>{const hardware={threads:8,gpu:[{id:"a"},{id:"b"}]},selected=validateResources({cpuThreads:99,gpuIds:["a","missing","a"]},hardware);assert.deepEqual(selected,{cpuThreads:8,gpuIds:["a"]})});
test("creates deterministic authenticated header inputs",()=>{const headers=createMinerAuthHeaders("x".repeat(32),{method:"POST",path:"/mine",body:"{}",timestamp:123,nonce:"ab".repeat(16)});assert.equal(headers["x-korek-miner-timestamp"],"123");assert.match(headers["x-korek-miner-signature"],/^[0-9a-f]{64}$/)});
test("uses the current Planck protocol",()=>assert.equal(MINER_PROTOCOL,"korek-planck-miner/2"));
