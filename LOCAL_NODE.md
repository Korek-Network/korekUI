# Node and CPU/GPU mining in one app

The Node page now starts and stops a bundled native testnet-2 node. Starting it
selects its local API/mining endpoints. Unlock a wallet and use the existing
CPU/GPU controls to mine; running the node alone does not require wallet keys or
stake. Mining and validation are separate processes on the same computer.

The node preserves its identity and chain under the app user-data directory in
testnet-2-node. It uses API port 18365 and mining port 19833 on loopback, and P2P
port 19333. Add a testnet-2 peer to synchronize with the network; without peers
this is an isolated node, not evidence of network participation. Inbound P2P
connectivity depends on host networking/firewall configuration.

Stop node also stops app mining. App quit attempts graceful node shutdown before
forced termination. Data is preserved. Unexpected whole-app termination is not
yet covered by an OS service supervisor. Leave CPU/memory available for validation
when GPU mining. The node binary runs separately from Electron's Node runtime.

Build a native node from blockchain commit 258a5ab7788107ba830e940525c0db4c18e96e4a
using Bun 1.4.2, then run `node scripts/bundle-node.mjs /path/to/native-node` before
electron-builder. CI pins this source commit. Each app architecture requires its
own matching binary; missing or mismatched bundles fail packaging. Manifest hashes
detect bundle damage, but are not publisher signatures or an independent audit.
The API node is bundled; its separate browser explorer assets are not included.

Reproduce lifecycle validation with `node scripts/check-local-node.mjs`. The
Linux native binary passed start, duplicate-start rejection, stop and restart.
The existing 12 app tests pass. No physical GPU device is available in this build
environment; GPU execution, interactive desktop behavior and Windows/macOS
installers still require validation. Do not publish these experimental builds as
the existing 0.3.6 release. The live server remains unchanged.

The combined Linux AppImage built successfully. Its packaged node binary passed
the lifecycle check, and the packaged app archive contains the node manager.
AppImage SHA-256: `3cc7eb8e4dc31babe6137525607198e3f21916e3f8401850d64348b419480de6`.
