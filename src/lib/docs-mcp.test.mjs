// The docs MCP server (src/lib/docs-mcp.mjs) against the built index: the
// protocol answers, `search` lands the words developers type on the right page
// (the same table site search is held to, scripts/check-search.mjs), and
// `fetch` returns a page's markdown twin. Run after `npm run build`:
//   node --test src/lib/docs-mcp.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prepare, handleBody, handleMessage, normalizeId, tokens } from "./docs-mcp.mjs";
import { QUERIES } from "../../scripts/search-queries.mjs";

const INDEX = join(import.meta.dirname, "../../dist/docs-mcp-index.json");
const built = existsSync(INDEX);
const idx = built ? prepare(JSON.parse(readFileSync(INDEX, "utf8"))) : null;
const call = (method, params, id = 1) => handleMessage(idx, { jsonrpc: "2.0", id, method, params });
const tool = (name, args) => JSON.parse(call("tools/call", { name, arguments: args }).result.content[0].text);

test("tokens keep a hyphenated word whole and in parts", () => {
  assert.deepEqual(tokens("barge-in on iOS"), ["barge-in", "barge", "in", "on", "ios"]);
});

test("normalizeId accepts a path, a URL, a .md twin and the home page", () => {
  assert.equal(normalizeId("/platforms/python"), "/platforms/python");
  assert.equal(normalizeId("https://docs.bithuman.ai/platforms/python.md#install"), "/platforms/python");
  assert.equal(normalizeId("platforms/python/"), "/platforms/python");
  assert.equal(normalizeId("https://docs.bithuman.ai"), "/");
  assert.equal(normalizeId("/index.md"), "/");
});

test("the index was built", { skip: built ? false : "run npm run build first" }, () => {
  assert.ok(idx.docs.length >= 60, `only ${idx.docs.length} pages`);
  assert.match(idx.instructions, /Creator plan or higher/);
});

test("initialize, ping, tools/list and errors follow JSON-RPC", { skip: !built }, () => {
  const init = call("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "1" } });
  assert.equal(init.result.protocolVersion, "2025-03-26");
  assert.deepEqual(Object.keys(init.result.capabilities), ["tools"]);
  assert.equal(call("initialize", { protocolVersion: "1999-01-01" }).result.protocolVersion, "2025-06-18");
  assert.deepEqual(call("ping").result, {});
  assert.deepEqual(call("tools/list").result.tools.map((t) => t.name), ["search", "fetch"]);
  assert.equal(handleMessage(idx, { jsonrpc: "2.0", method: "notifications/initialized" }), null);
  assert.equal(call("nope/nope").error.code, -32601);
  assert.equal(call("tools/call", { name: "delete", arguments: {} }).error.code, -32602);
  assert.equal(handleMessage(idx, { id: 1, method: "ping" }).error.code, -32600);
  const batch = handleBody(idx, [{ jsonrpc: "2.0", id: 1, method: "ping" }, { jsonrpc: "2.0", method: "notifications/initialized" }]);
  assert.equal(batch.length, 1);
});

test("search lands the words developers type on the right page first", { skip: !built }, () => {
  for (const { q, top } of QUERIES) {
    const { results } = tool("search", { query: q });
    assert.equal(results[0]?.id, top, `search "${q}" → ${results[0]?.id} (want ${top}); next: ${results.slice(1, 4).map((r) => r.id).join(", ")}`);
  }
});

test("search takes a section and a limit, and refuses an empty query", { skip: !built }, () => {
  const { results } = tool("search", { query: "secret", section: "API", limit: 3 });
  assert.ok(results.length > 0 && results.length <= 3);
  assert.ok(results.every((r) => r.section === "API"));
  const empty = call("tools/call", { name: "search", arguments: { query: " " } }).result;
  assert.equal(empty.isError, true);
});

test("fetch returns the page's markdown twin", { skip: !built }, () => {
  const doc = tool("fetch", { id: "https://docs.bithuman.ai/platforms/python" });
  assert.equal(doc.id, "/platforms/python");
  assert.equal(doc.url, "https://docs.bithuman.ai/platforms/python");
  assert.equal(doc.text, readFileSync(join(import.meta.dirname, "../../dist/platforms/python.md"), "utf8"));
  assert.equal(tool("fetch", { id: "/" }).id, "/");
  const missing = call("tools/call", { name: "fetch", arguments: { id: "/no/such/page" } }).result;
  assert.equal(missing.isError, true);
});
