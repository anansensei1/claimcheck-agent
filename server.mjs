/**
 * ClaimCheck Agent — minimal HTTP endpoint (Node >= 18, zero dependencies).
 *
 *   POST /check   { claim: { type, chain, ... } }  -> attestation JSON
 *   GET  /health  -> { ok: true, agent: "claimcheck-agent/1.0" }
 *
 * Run:  node server.mjs        (listens on PORT, default 8787)
 */
import { createServer } from "node:http";
import { verifyClaim } from "./claimcheck.js";

const PORT = process.env.PORT || 8787;

createServer(async (req, res) => {
  const send = (code, obj) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(obj));
  };
  try {
    if (req.method === "GET" && req.url === "/health") {
      return send(200, { ok: true, agent: "claimcheck-agent/1.0" });
    }
    if (req.method === "POST" && req.url === "/check") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const { claim } = JSON.parse(body || "{}");
      if (!claim || !claim.type || !claim.chain) {
        return send(400, { ok: false, error: "body must be { claim: { type, chain, ... } }" });
      }
      const attestation = await verifyClaim(claim);
      return send(200, { ok: true, attestation });
    }
    return send(404, { ok: false, error: "not found" });
  } catch (err) {
    return send(500, { ok: false, error: String(err.message || err) });
  }
}).listen(PORT, () => console.log(`claimcheck-agent listening on :${PORT}`));
