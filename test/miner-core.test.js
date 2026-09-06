import test from "node:test";import assert from "node:assert/strict";import { MINER_PROTOCOL,miningStats,normalizeNodeUrl,rewardAddress,validateInnerHash } from "../src/miner-core.js";
test("validates Planck node endpoints",()=>{assert.equal(normalizeNodeUrl("http://127.0.0.1:9833/"),"http://127.0.0.1:9833");assert.throws(()=>normalizeNodeUrl("file:///tmp/node"),/HTTP/)});
test("derives the wormhole reward address from an inner hash",()=>{const hash="ab".repeat(32);assert.equal(validateInnerHash(hash),hash);assert.equal(rewardAddress(hash),`krk1${"ab".repeat(20)}`);assert.throws(()=>validateInnerHash("bad"),/64/)});
test("calculates session mining statistics",()=>{const stats=miningStats(30,3472222200n,1_000,61_000);assert.equal(stats.blocksPerMinute,30);assert.equal(stats.totalAtomic,"3472222200")});
test("uses the version-matched Planck miner protocol",()=>assert.equal(MINER_PROTOCOL,"korek-planck-miner/1"));
