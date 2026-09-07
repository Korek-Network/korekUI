# Experimental testnet-2 app changes

This branch targets korek-planck-testnet-2. Transfers use version 4 signatures
bound to that network; the matching node branch is required. Wallet file encryption
and account derivation are unchanged. Mining templates must match the configured
network and unlocked wallet before CPU or GPU work begins.

Configure the API/miner endpoints for the isolated new testnet. The existing
public endpoint defaults have not been moved to testnet-2; an old-network mining
endpoint will be rejected. No installer or public server was released by this change.

Validation: 12 app tests pass. A transfer signed by this wallet module using real
PoW-funded testnet-2 state passed node admission and complete peer ledger replay.
Desktop packaging, interactive UI checks, GPU execution and a multi-host launch
rehearsal remain outstanding. Local node source tests total 127 passing tests.
