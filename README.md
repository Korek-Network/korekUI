# KOREK Miner

[![Build KOREK Miner UI](https://github.com/Korek-Network/korekUI/actions/workflows/build.yml/badge.svg)](https://github.com/Korek-Network/korekUI/actions/workflows/build.yml)

Professional desktop mining control and reward wallet for the KOREK Planck testnet.

## Download

Download Windows, Linux, Apple Silicon Mac, or Intel Mac packages from [KOREK Miner releases](https://github.com/Korek-Network/korekUI/releases/tag/korekui-testnet-latest).

## Features

- Create, restore and open encrypted KOREK wallet v2 files.
- Display the 24-word recovery phrase once during wallet creation.
- Receive rewards directly in the wallet's spendable wormhole account.
- Send KRK from the wormhole reward balance without a separate claim transaction.
- Detect CPU threads and GPU devices, and save the user's compute allocation.
- Start and stop mining directly from the Compute Devices page.
- Connect to korek-planck-miner/2, including optional HMAC authentication for remote nodes.
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

Use miner endpoint http://127.0.0.1:9833 and blockchain API http://127.0.0.1:8365.

Create or open a wallet, configure compute devices, test the node connection, then select Start mining.

## Important compute status

Version 0.2 connects to the live Planck miner protocol and receives real testnet block rewards. The current Planck node still performs proof-of-work after each mining request. CPU/GPU device discovery and allocation are implemented in the app, but client-side CPU/GPU hashing requires the next blockchain protocol milestone: signed work templates, nonce-range assignment, share submission, duplicate/stale-work rejection, and a verified native GPU kernel.

The app deliberately reports this status in the interface; it does not fake GPU utilization.

Testnet KRK has no monetary value. Never share a wallet recovery phrase, wallet password, miner authentication token, or inner hash.
