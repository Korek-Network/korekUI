import test from "node:test";
import assert from "node:assert/strict";
import { createEncryptedWallet,deriveAccounts,generateMnemonic,signWormholeTransfer,unlockWallet,validateMnemonic } from "../src/wallet-core.js";
test("creates a KOREK wallet v2 with a 24-word phrase",()=>{const made=createEncryptedWallet("correct horse battery");assert.equal(made.file.version,2);assert.equal(made.recoveryPhrase.split(" ").length,24);assert.ok(validateMnemonic(made.recoveryPhrase));assert.match(made.wallet.wormhole.innerHash,/^[0-9a-f]{64}$/);assert.ok(!JSON.stringify(made.file).includes(made.recoveryPhrase))});
test("restores the same mining account",()=>{const phrase=generateMnemonic();assert.deepEqual(deriveAccounts(phrase),deriveAccounts(phrase))});
test("unlocks and signs from wormhole rewards",()=>{const made=createEncryptedWallet("long test password"),wallet=unlockWallet(made.file,"long test password"),tx=signWormholeTransfer(wallet,made.wallet.transparent.address,"2.5");assert.equal(tx.from,wallet.wormhole.address);assert.equal(tx.addressScheme,"wormhole-v1");assert.equal(tx.version,3);assert.ok(tx.signature)});
