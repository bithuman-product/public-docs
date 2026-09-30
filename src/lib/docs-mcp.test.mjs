// The docs MCP server (src/lib/docs-mcp.mjs) against the built index: the
// protocol answers, `search` lands the words developers type on the right page
// (the same table site search is held to, scripts/check-search.mjs), and
// `fetch` returns a page's markdown twin. Run after `npm run build`:
//   node --test src/lib/docs-mcp.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prepare, handleBody, handleMessage, normalizeId, tokens, TOOLS, SECTION_LABELS, SECTION_ALIASES, canonicalSection, toolsFor, SERVER_INFO, PROTOCOL_VERSIONS, INSTRUCTIONS } from "./docs-mcp.mjs";
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
  assert.equal(idx.instructions, INSTRUCTIONS, "the index carries the server's one-line instructions");
});

test("initialize, ping, tools/list and errors follow JSON-RPC", { skip: !built }, () => {
  const init = call("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "1" } });
  assert.equal(init.result.protocolVersion, "2025-03-26");
  assert.deepEqual(Object.keys(init.result.capabilities), ["tools"]);
  assert.equal(call("initialize", { protocolVersion: "1999-01-01" }).result.protocolVersion, "2025-11-25");
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
  const kiosk = tool("search", { query: "kiosk" }).results[0];
  assert.doesNotMatch(kiosk.text, /URL: https:/, "a snippet starts after the twin's header");
  const { results } = tool("search", { query: "secret", section: "API", limit: 3 });
  assert.ok(results.length > 0 && results.length <= 3);
  assert.ok(results.every((r) => canonicalSection(r.section) === "API reference"));
  const empty = call("tools/call", { name: "search", arguments: { query: " " } }).result;
  assert.equal(empty.isError, true);
});

test("the section filter takes the tab labels and every earlier name", () => {
  const en = TOOLS.find((t) => t.name === "search").inputSchema.properties.section.enum;
  // Clients installed before the docs v2 tabs send these names; they must keep working.
  for (const old of ["Get started", "Platforms", "Deploy", "Models", "Build", "API", "Performance", "Resources"]) assert.ok(en.includes(old), `enum keeps "${old}"`);
  for (const label of ["Overview", "Platforms", "Models", "Guides", "Deploy", "Performance", "API reference"]) assert.ok(en.includes(label), `enum has "${label}"`);
  assert.equal(new Set(en).size, en.length, "no name twice");
  for (const [alias, tab] of Object.entries(SECTION_ALIASES)) {
    assert.ok(SECTION_LABELS.includes(tab), `${alias} → ${tab}, a tab label`);
    assert.equal(canonicalSection(alias), tab);
  }
  for (const label of SECTION_LABELS) assert.equal(canonicalSection(label), label);
});

test("an alias and its tab label filter to the same pages", { skip: !built }, () => {
  const ids = (section) => tool("search", { query: "secret", section, limit: 20 }).results.map((r) => r.id).join(" ");
  assert.ok(ids("API").length > 0);
  assert.equal(ids("API"), ids("API reference"));
  assert.equal(ids("Build"), ids("Guides"));
  assert.equal(ids("Get started"), ids("Overview"));
  assert.equal(ids("Resources"), ids("Overview"));
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

test("initialize says what the server is and gives no agent rules", () => {
  const init = handleMessage(prepare({ docs: [] }), { jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
  const ins = init.result.instructions;
  assert.equal(ins, INSTRUCTIONS);
  assert.match(ins, /^bitHuman documentation \(https:\/\/docs\.bithuman\.ai\)\./);
  assert.ok(!ins.includes("\n"), "one paragraph");
  assert.doesNotMatch(ins, /\b(never|always|must|don't|do not)\b/i, "no behaviour rules");
  assert.doesNotMatch(ins, /Creator plan|free plan|pricing/i);
});

test("protocol 2025-11-25 is accepted and is the fallback", () => {
  const p = prepare({ docs: [] });
  const init = (v) => handleMessage(p, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: v } }).result.protocolVersion;
  assert.equal(PROTOCOL_VERSIONS[0], "2025-11-25");
  assert.equal(init("2025-11-25"), "2025-11-25");
  for (const v of ["2025-06-18", "2025-03-26", "2024-11-05"]) assert.equal(init(v), v, `still speaks ${v}`);
  assert.equal(init("2099-01-01"), "2025-11-25");
});

test("serverInfo carries icons and websiteUrl (2025-11-25 Implementation)", () => {
  const info = handleMessage(prepare({ docs: [] }), { jsonrpc: "2.0", id: 1, method: "initialize", params: {} }).result.serverInfo;
  assert.deepEqual(info, SERVER_INFO);
  assert.equal(info.name, "bithuman-docs");
  assert.equal(info.websiteUrl, "https://docs.bithuman.ai/resources/agents#docs-mcp");
  assert.ok(info.icons.length >= 1);
  for (const icon of info.icons) {
    assert.match(icon.src, /^https:\/\/docs\.bithuman\.ai\/[\w./-]+\.png$/);
    assert.equal(icon.mimeType, "image/png");
    const file = join(import.meta.dirname, "../../public", new URL(icon.src).pathname);
    assert.ok(existsSync(file), `${icon.src} is served from public/`);
    // a PNG's IHDR holds width and height at bytes 16..23; sizes must say the truth
    const png = readFileSync(file);
    assert.deepEqual(icon.sizes, [`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`]);
  }
  assert.ok(info.icons.some((i) => i.src === "https://docs.bithuman.ai/favicon.png"));
});

test("both tools are annotated read-only, non-destructive and idempotent, titles copied", () => {
  for (const t of TOOLS) {
    const a = t.annotations;
    assert.equal(a.title, t.title, `${t.name}: annotations.title = title`);
    assert.equal(a.readOnlyHint, true);
    assert.equal(a.destructiveHint, false);
    assert.equal(a.idempotentHint, true);
    assert.equal(a.openWorldHint, false);
  }
});

test("the section enum lists only names whose tab has pages", () => {
  const en = (docs) => toolsFor(docs).find((t) => t.name === "search").inputSchema.properties.section.enum;
  const page = (section) => ({ id: `/${section}`, url: "", title: section, section, markdown: "x" });
  assert.deepEqual(en([page("API reference")]), ["API reference", "API"]);
  assert.deepEqual(en([page("Overview")]), ["Overview", "Get started", "Resources"]);
  assert.deepEqual(en([]), []);
  // the static list is untouched, and fetch has no section to cut
  assert.equal(TOOLS[0].inputSchema.properties.section.enum.length, SECTION_LABELS.length + Object.keys(SECTION_ALIASES).length);
  assert.deepEqual(toolsFor([]).find((t) => t.name === "fetch"), TOOLS.find((t) => t.name === "fetch"));
});

test("every section value tools/list offers finds pages in the built index", { skip: !built }, () => {
  const listed = call("tools/list").result.tools.find((t) => t.name === "search").inputSchema.properties.section.enum;
  assert.ok(listed.length > 0);
  const live = new Set(idx.docs.map((d) => canonicalSection(d.section)));
  for (const name of listed) assert.ok(live.has(canonicalSection(name)), `"${name}" matches a page`);
  for (const d of idx.docs) assert.ok(listed.includes(d.section), `page section "${d.section}" is offered`);
});
