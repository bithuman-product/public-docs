// The docs MCP server at https://docs.bithuman.ai/docs-mcp (vercel.json rewrites
// the path here). MCP over Streamable HTTP, stateless and read-only: POST a
// JSON-RPC message, get one JSON response. A browser's GET is sent to the page
// that explains how to connect. The logic is src/lib/docs-mcp.mjs; the index it
// reads is built with the site (scripts/gen-docs-index.mjs) and bundled with
// this function (vercel.json `functions.includeFiles`).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prepare, handleBody } from "../src/lib/docs-mcp.mjs";

let prepared = null;
function index() {
  prepared ??= prepare(JSON.parse(readFileSync(join(process.cwd(), "dist/docs-mcp-index.json"), "utf8")));
  return prepared;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

export default function handler(req, res) {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET" || req.method === "HEAD") {
    if (/text\/html/i.test(req.headers.accept || "")) {
      res.setHeader("Location", "/resources/agents#docs-mcp");
      return res.status(307).end();
    }
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "POST a JSON-RPC message to this endpoint (MCP Streamable HTTP). Setup: https://docs.bithuman.ai/resources/agents#docs-mcp" } });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).end();
  }
  let body = req.body;
  if (typeof body === "string" || Buffer.isBuffer(body)) {
    try { body = JSON.parse(String(body)); } catch { return res.status(400).json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
  }
  let out;
  try {
    out = handleBody(index(), body);
  } catch (e) {
    return res.status(500).json({ jsonrpc: "2.0", id: body && body.id ? body.id : null, error: { code: -32603, message: "Internal error" } });
  }
  if (out === null) return res.status(202).end();
  return res.status(200).json(out);
}
