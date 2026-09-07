# Linux packaging rehearsal

The testnet-2 branch built successfully using the existing lockfile:
`npm ci --ignore-scripts`, `node node_modules/electron/install.js`,
then `npm run dist:linux` (publishing disabled).

Electron 38.8.6 / electron-builder 26.15.3 produced Linux x64 AppImage and Debian
packages. The packaged Electron Node runtime reports v22.22.0. A smoke check
imported wallet-core directly from the built app.asar archive and successfully
signed a testnet-2 version 4 transfer. No test keys were saved in the package.

Build output SHA-256:

- AppImage: `1cfd091e2ec5482ee18abd69f61c2a4e7d685ec9c7388720734ffcbf53116ff4`
- Debian package: `ded9b1a856811e2762606cdfcfdc706fd48500282d53decd20ff5b79f249fb18`

These are local validation builds retaining the existing 0.3.6 filename, not new
public releases. Set a distinct prerelease version before distribution. The
application still requires the isolated new-network endpoints to be configured.

No interactive desktop/GPU execution, Windows or macOS build, installer signing,
or antivirus reputation validation was performed. The desktop runtime is separate
from the Node 24 blockchain service; do not assume it embeds the new node.

The companion blockchain branch's three-node rehearsal passed signed transfers,
failover, fork behavior, disk recovery and faucet cooldown after restart. Its
Linux standalone node compiled and started with Bun 1.4.2, and all 13 storage
tests passed under Bun. Neither result constitutes public launch approval.
