import { verifyClaim } from "./claimcheck.js";
// TRUE claim: Doge Punk #999 is owned by the Agentic Wallet (verified on-chain daily by the floor-sale watch)
const t = await verifyClaim({ type: "nft-owner", chain: "bsc", contract: "0xea404392be487b90f45b8436a52623bc7dbd8515", tokenId: 999, owner: "0x20384D078cd86068DB9a629facb5f79394cd9712" });
console.log("TRUE-claim verdict:", t.verdict, "| observed:", t.observed, "| block:", t.blockNumber, "| hash:", t.evidenceHash.slice(0, 16) + "…");
// FALSE claim: same token, wrong owner
const f = await verifyClaim({ type: "nft-owner", chain: "bsc", contract: "0xea404392be487b90f45b8436a52623bc7dbd8515", tokenId: 999, owner: "0x0c1013ED02ca6AFb6be3AA611d4cAeBf4a0Ca39D" });
console.log("FALSE-claim verdict:", f.verdict, "| observed:", f.observed);
// Balance claim: wallet 1 holds >= 0 wei BNB (trivially true) and >= 1000 BNB (false)
const b = await verifyClaim({ type: "native-balance", chain: "bsc", address: "0x20384D078cd86068DB9a629facb5f79394cd9712", minWei: "1000000000000000" });
console.log("BALANCE-claim verdict:", b.verdict, "| observed wei:", b.observed);
