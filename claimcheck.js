/**
 * ClaimCheck Agent — core library (browser + Node, zero dependencies).
 *
 * Takes a machine-checkable claim about on-chain state, verifies it against a
 * public JSON-RPC endpoint, and emits a structured attestation ("evidence
 * pack") that any third party can independently re-verify: same claim, same
 * block, same RPC method — the verdict must reproduce.
 *
 * Supported claim types:
 *   - nft-owner        { chain, contract, tokenId, owner }
 *   - native-balance   { chain, address, minWei }        (min in wei, string)
 *   - token-balance    { chain, contract, address, minRaw } (raw units, string)
 */

const CHAINS = {
  bsc:        { name: "BNB Smart Chain", rpc: "https://bsc-dataseed.binance.org",        chainId: 56 },
  base:       { name: "Base",            rpc: "https://mainnet.base.org",                chainId: 8453 },
  ethereum:   { name: "Ethereum",        rpc: "https://ethereum-rpc.publicnode.com",     chainId: 1 },
  robinhood:  { name: "Robinhood Chain", rpc: "https://rpc.mainnet.chain.robinhood.com", chainId: 4663 },
};

async function rpcCall(rpc, method, params) {
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${json.error.message || "RPC error"}`);
  return json.result;
}

function pad32(hexNoPrefix) {
  return hexNoPrefix.toLowerCase().padStart(64, "0");
}

function encodeAddress(addr) {
  return pad32(addr.replace(/^0x/i, ""));
}

function encodeUint(n) {
  return pad32(BigInt(n).toString(16));
}

async function sha256Hex(text) {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Node fallback
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Verify a claim. Returns an attestation object:
 * { claim, verdict, observed, blockNumber, rpc, chainId, checkedAt, evidenceHash }
 */
async function verifyClaim(claim) {
  const chain = CHAINS[claim.chain];
  if (!chain) throw new Error(`unknown chain: ${claim.chain}`);
  const rpc = claim.rpc || chain.rpc;

  const blockHex = await rpcCall(rpc, "eth_blockNumber", []);
  const blockNumber = parseInt(blockHex, 16);

  let observed;
  let verdict;

  if (claim.type === "nft-owner") {
    // ownerOf(uint256) = 0x6352211e
    const data = "0x6352211e" + encodeUint(claim.tokenId);
    const out = await rpcCall(rpc, "eth_call", [{ to: claim.contract, data }, "latest"]);
    observed = "0x" + out.slice(-40);
    verdict = observed.toLowerCase() === claim.owner.toLowerCase();
  } else if (claim.type === "native-balance") {
    const out = await rpcCall(rpc, "eth_getBalance", [claim.address, "latest"]);
    observed = BigInt(out).toString();
    verdict = BigInt(observed) >= BigInt(claim.minWei);
  } else if (claim.type === "token-balance") {
    // balanceOf(address) = 0x70a08231
    const data = "0x70a08231" + encodeAddress(claim.address);
    const out = await rpcCall(rpc, "eth_call", [{ to: claim.contract, data }, "latest"]);
    observed = BigInt(out).toString();
    verdict = BigInt(observed) >= BigInt(claim.minRaw);
  } else {
    throw new Error(`unknown claim type: ${claim.type}`);
  }

  const attestation = {
    agent: "claimcheck-agent/1.0",
    claim,
    verdict,
    observed,
    blockNumber,
    rpc,
    chainId: chain.chainId,
    checkedAt: new Date().toISOString(),
  };
  attestation.evidenceHash = await sha256Hex(
    JSON.stringify({ claim, observed, blockNumber, chainId: chain.chainId })
  );
  return attestation;
}

// Browser global + Node export
if (typeof window !== "undefined") {
  window.ClaimCheck = { CHAINS, verifyClaim };
}
export { CHAINS, verifyClaim };
