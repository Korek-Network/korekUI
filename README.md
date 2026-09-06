# KOREK Miner UI

[![Build KOREK Miner UI](https://github.com/Korek-Network/korekUI/actions/workflows/build.yml/badge.svg)](https://github.com/Korek-Network/korekUI/actions/workflows/build.yml)


Cross-platform desktop mining dashboard for the KOREK Planck testnet. It connects to the miner-protocol port of a KOREK node, verifies the matching protocol version, submits mining work, and displays blocks, session rewards, rate, node height, hardware information, and activity logs.

## Download

Download Windows, Linux, Apple Silicon Mac, or Intel Mac packages from [KOREK Miner UI releases](https://github.com/Korek-Network/korekUI/releases/tag/korekui-testnet-latest).

## Use

Start a KOREK Planck v0.3 node with a miner port first:

```bash
./korek-node --name my-node --validator --miner-listen-port 9833 --chain planck --node-key-file node_key.p2p --rewards-inner-hash YOUR_INNER_HASH --max-blocks-per-request 64 --sync full
```

Open KOREK Miner UI, set the endpoint to `http://127.0.0.1:9833`, paste the 64-character inner hash from KOREK Wallet, check the node, and select **Start mining**.

## Current scope

This UI controls the current `korek-planck-miner/1` CPU/protocol prototype. It detects hardware for display, but it does not yet execute GPU or AI kernels. Planck state is currently held in node memory. P2P consensus/sync, authenticated ALPN, public telemetry, useful-compute verification, and post-quantum signatures remain future protocol work.

Test KRK has no monetary value. Never share a wallet recovery phrase or password.
