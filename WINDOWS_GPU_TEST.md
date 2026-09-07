# Experimental Windows node + GPU test

This build targets fresh testnet-2 and includes a native Windows x64 node. It has
not been executed on Windows or tested with a physical GPU. It retains the 0.3.6
app identity; test in a separate Windows test account or machine, not over
your everyday KOREK installation. Use a new test wallet, not an existing recovery
phrase. The current public endpoints still belong to the previous network.

1. Extract the portable ZIP and open `KOREK Miner.exe` in that test account.
2. Open Node and select Start local node. Initially leave the peer field empty
   for an isolated check. Expect height 0 and zero peers, not network sync.
3. Create a new test wallet. Open mining hardware controls, rescan, select your
   GPU and set CPU threads to 0. Start mining. Record the GPU adapter name,
   hashrate and any error. A nonzero counter alone is not a successful proof.
4. Leave the node running and wait for an accepted proof. Default difficulty and
   the 60-second reward interval apply; a reward is not guaranteed every minute.
   Confirm node height and the wallet's mined reward increase.
5. Stop mining. Confirm GPU work stops while the node remains running. Then stop
   the node and start it again; the same chain height and identity should return.
6. Close and reopen the app, start its node, and check the chain again. To test
   real synchronization later, use a verified testnet-2 peer; none is supplied by
   this build. Do not use old-network seeds.

Send the app error text, GPU model, Windows version, driver version and the result
of each step. Do not send a private key or recovery phrase. If Windows security
blocks the installer, record the exact warning; do not disable security software.

Build checks performed here: Windows x64 node cross-compilation, PE format and
packaged-node checksum matching, plus 12 passing app tests on Linux. These checks
do not validate Windows process shutdown, GPU drivers, installer execution,
publisher signing or antivirus reputation. The NSIS installer build failed because
Wine is unavailable here; the ZIP contains the assembled portable Windows app.
No live server was changed.
