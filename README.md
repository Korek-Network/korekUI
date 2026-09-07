# KOREK Miner

[![Build KOREK Miner UI](https://github.com/Korek-Network/korekUI/actions/workflows/build.yml/badge.svg)](https://github.com/Korek-Network/korekUI/actions/workflows/build.yml)

Professional desktop CPU/WebGPU miner and reward wallet for the KOREK Planck testnet.

Planck currently tests the proposed mainnet economics: zero genesis premine, 210 million KRK maximum supply, 60-second reward blocks, 95% of every subsidy to the successful miner, 5% to the public testnet treasury, and 100% of accumulated transaction fees to the next successful miner.

## Download

Download Windows, Linux, Apple Silicon Mac, or Intel Mac packages from [KOREK Miner releases](https://github.com/Korek-Network/korekUI/releases/tag/korekui-testnet-latest).

## Features

- Create, restore and open encrypted KOREK wallet v2 files.
- Display the 24-word recovery phrase once during wallet creation.
- Receive rewards directly in the wallet's spendable wormhole account.
- Send KRK from the wormhole reward balance without a separate claim transaction.
- Show one clear CPU control and one preferred physical GPU control, each independently adjustable down to zero.
- Start and stop mining directly from the Compute Devices page.
- Use the permanent HTTPS Planck RPC for reward balances and network data, while preserving trusted custom endpoints.
- Connect to wallet-signed `korek-planck-miner/3` work-template and proof-submission endpoints.
- Perform SHA-256 proof-of-work locally in selected CPU worker threads.
- Use an experimental high-performance WebGPU SHA-256 worker when the system supports WebGPU, reject a detectable adapter mismatch, and smooth hashrate across completed GPU batches.
- Report live CPU/GPU hashrate, accepted/rejected proofs, CPU load, and NVIDIA utilization/temperature/power telemetry when `nvidia-smi` is available.
- Clearly distinguish a remote-node connection from a locally running node process, inspect node status, and auto-refresh recent live blocks from the built-in Node page.
- Show live accepted blocks, session rewards, blocks/minute, node height and activity.
- Build installers for Windows, Linux, Intel Mac and Apple Silicon Mac.

## Run with a local node

Start the node:

    cd ~/blockchain
    KOREK_PORT=8365 KOREK_MINER_PORT=9833 npm start

Start this desktop app from source:

    git clone https://github.com/Korek-Network/korekUI.git
    cd korekUI
    npm install
    npm start

The mining gateway and blockchain API default to `https://rpc.planck.korek.network`. Every work request and proof is signed by the unlocked wormhole wallet; no SSH tunnel or shared authentication token is required after the Planck v0.7 node is deployed.

Create or open a wallet, configure compute devices, test the node connection, then select Start mining.

## Compute and security status

Version 0.3 performs proof-of-work on the miner computer. CPU hashing uses Node worker threads. GPU hashing uses an experimental WebGPU SHA-256 compute shader. Version 0.3.7 reports GPU failure explicitly instead of claiming that an unavailable or mismatched adapter is active.

The Node page connects to and monitors an existing remote node. It does not yet launch a local node process; the UI states this directly. Local-node controls must not be marked active until a signed node runtime is bundled and its process, storage, synchronization and P2P status are verified.

The node independently validates wallet ownership, signatures, timestamps, template lifetime, nonce range, SHA-256 proof difficulty, stale work, and duplicate submissions before issuing a reward.

This remains unaudited Planck testnet software. WebGPU availability and hardware telemetry vary by driver and operating system. It must not be represented as mainnet-ready until the protocol and GPU kernel pass independent review.

Testnet KRK has no monetary value. Never share a wallet recovery phrase, wallet password, miner authentication token, or inner hash.
