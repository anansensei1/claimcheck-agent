# ClaimCheck Agent

**Don't trust the agent. Verify it.**

ClaimCheck is a small, zero-dependency agent that takes a machine-checkable
claim about on-chain state, verifies it against a public JSON-RPC endpoint,
and returns a structured **attestation** (an "evidence pack") that any third
party can independently re-verify: same claim, same block, same RPC call —
the verdict must reproduce.

Built for the **zkVerify Agent Games — Season 01, Wildcard track** by
@kenvyy (agent operator for the Muse "Kurumi Chan").

## Why this exists

AI agents increasingly *assert* things: "this wallet owns that NFT", "the
invoice was paid", "the balance covers it". Assertions are cheap. ClaimCheck
turns an assertion into evidence: the observed on-chain value, the block it
was read at, the exact RPC used, and a SHA-256 hash over the evidence, so a
verifier never has to trust the agent — only the chain.

## Supported claims

| type | claim | on-chain read |
|---|---|---|
| `nft-owner` | address owns token #N of an ERC-721 contract | `ownerOf(tokenId)` |
| `native-balance` | address holds at least X wei | `eth_getBalance` |
| `token-balance` | address holds at least X raw units of an ERC-20 | `balanceOf(address)` |

Chains preconfigured: BNB Smart Chain, Base, Ethereum, Robinhood Chain
(any EVM RPC can be passed per-claim).

## Attestation format

```json
{
  "agent": "claimcheck-agent/1.0",
  "claim": { "type": "nft-owner", "chain": "bsc", "contract": "0xea40…8515", "tokenId": 999, "owner": "0x2038…9712" },
  "verdict": true,
  "observed": "0x20384d078cd86068db9a629facb5f79394cd9712",
  "blockNumber": 134487628,
  "rpc": "https://bsc-dataseed.binance.org",
  "chainId": 56,
  "checkedAt": "2026-11-19T…Z",
  "evidenceHash": "24c989befe2cbdad…"
}
```

`evidenceHash = SHA-256(JSON{claim, observed, blockNumber, chainId})` — a
compact, portable fingerprint of the evidence, designed to be anchored or
submitted for proof verification (e.g. via zkVerify) so the attestation
itself becomes checkable long after the block has passed.

## Run it

**Live demo (browser):** open `index.html` from this repo's GitHub Pages —
the same library runs client-side against public RPCs.

**Agent endpoint (Node ≥ 18, no dependencies):**

```bash
node server.mjs            # listens on :8787 (or $PORT)
curl localhost:8787/health
curl -X POST localhost:8787/check -d '{"claim":{"type":"nft-owner","chain":"bsc","contract":"0xea404392be487b90f45b8436a52623bc7dbd8515","tokenId":999,"owner":"0x20384D078cd86068DB9a629facb5f79394cd9712"}}'
```

**Library:** `claimcheck.js` exports `verifyClaim(claim)` and works unchanged
in Node and in the browser.

## Verified behaviour

Tested against live BSC state: a true ownership claim returns
`verdict: true`; the same claim with a different owner returns
`verdict: false` with the real owner in `observed`; a balance claim returned
the wallet's exact wei balance. The agent discriminates — it does not just
say yes.

## Files

- `claimcheck.js` — core library (browser + Node)
- `server.mjs` — minimal HTTP endpoint (`GET /health`, `POST /check`)
- `index.html` — live demo page
- `test.mjs` — live-chain smoke test

## License

MIT
