// The docs MCP server's logic: JSON-RPC over MCP's Streamable HTTP transport,
// stateless, read-only, two tools: `search` and `fetch`. It reads one index
// built after the site (scripts/gen-docs-index.mjs → dist/docs-mcp-index.json),
// which holds every page's markdown twin, so search and fetch serve exactly what
// /<page>.md serves. api/docs-mcp.js is the thin HTTP handler around it.
//
// Plain JavaScript with no dependencies, so the Vercel function bundles it as is
// and `node --test src/lib/docs-mcp.test.mjs` runs it against the built index.

export const SERVER_INFO = { name: "bithuman-docs", title: "bitHuman docs", version: "1.0.0" };
export const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SITE = "https://docs.bithuman.ai";

export const TOOLS = [
  {
    name: "search",
    title: "Search the bitHuman docs",
    description:
      "Search docs.bithuman.ai (bitHuman realtime avatar SDKs, the REST API, deployment options, models, pricing). " +
      "Returns the best-matching pages, each with an id to pass to `fetch`.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to look for, e.g. \"Android first frame\" or \"LiveKit secret\"." },
        section: {
          type: "string",
          description: "Limit to one section.",
          enum: ["Get started", "Platforms", "Deploy", "Models", "Build", "API", "Performance", "Resources"],
        },
        limit: { type: "integer", minimum: 1, maximum: 20, description: "How many results (default 8)." },
      },
      required: ["query"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "fetch",
    title: "Fetch a bitHuman docs page",
    description:
      "Fetch one docs page as markdown by the id `search` returned (a path such as /platforms/python), or by its full URL.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "A page path (/platforms/python) or URL (https://docs.bithuman.ai/platforms/python)." } },
      required: ["id"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

const STOP = new Set(["a", "an", "the", "to", "of", "in", "on", "for", "and", "or", "how", "do", "does", "i", "is", "it", "with", "what", "my", "can", "use", "using", "bithuman"]);

/** Words of a text, lower-cased; a hyphenated word also counts whole ("barge-in"). */
export function tokens(text) {
  const out = [];
  for (const m of String(text).toLowerCase().matchAll(/[a-z0-9]+(?:[-.][a-z0-9]+)*/g)) {
    const w = m[0];
    out.push(w);
    if (/[-.]/.test(w)) for (const p of w.split(/[-.]/)) if (p) out.push(p);
  }
  return out;
}

const counts = (ws) => { const m = new Map(); for (const w of ws) m.set(w, (m.get(w) || 0) + 1); return m; };

/** Prepare an index once per process: token counts per field and document frequency. */
export function prepare(index) {
  const docs = index.docs.map((d0) => { const d = { ...d0, text: d0.text ?? d0.markdown }; return {
    ...d,
    f: {
      title: counts(tokens(`${d.title} ${d.searchTitle || ""}`)),
      path: counts(tokens(d.id.replace(/\//g, " "))),
      description: counts(tokens(d.description || "")),
      headings: counts(tokens((d.headings || []).join(" "))),
      body: counts(tokens(d.text)),
    },
    lower: { title: `${d.title} ${d.searchTitle || ""}`.toLowerCase(), text: d.text.toLowerCase() },
  }; });
  const df = new Map();
  for (const d of docs) for (const w of new Set([...d.f.title.keys(), ...d.f.body.keys(), ...d.f.headings.keys()])) df.set(w, (df.get(w) || 0) + 1);
  return { ...index, docs, df, byId: new Map(docs.map((d) => [d.id, d])) };
}

const WEIGHTS = { title: 12, path: 7, description: 4, headings: 3, body: 1 };

function termScore(d, t, idf) {
  let s = 0;
  for (const [field, w] of Object.entries(WEIGHTS)) {
    const m = d.f[field];
    let tf = m.get(t) || 0;
    let factor = 1;
    if (!tf && t.length >= 3) {
      // a prefix still counts, a little less ("self-host" finds "self-hosted")
      for (const [word, n] of m) if (word.startsWith(t)) { tf += n; factor = 0.7; }
    }
    if (tf) s += w * factor * (field === "body" ? 1 + Math.log(tf) : 1);
  }
  return s * idf;
}

/** Rank pages for a query. Returns [{ doc, score }], best first. */
export function rank(prepared, query, { section, limit = 8 } = {}) {
  const q = tokens(query).filter((t) => !STOP.has(t));
  if (!q.length) return [];
  const n = prepared.docs.length;
  const phrase = String(query).toLowerCase().trim();
  const out = [];
  for (const d of prepared.docs) {
    if (section && d.section !== section) continue;
    let s = 0;
    let hit = 0;
    for (const t of q) {
      const idf = Math.log(1 + n / (1 + (prepared.df.get(t) || 0)));
      const ts = termScore(d, t, idf);
      if (ts > 0) hit++;
      s += ts;
    }
    if (!s) continue;
    s *= (hit / q.length) ** 2;
    if (phrase.length > 2 && d.lower.title.includes(phrase)) s *= 1.6;
    else if (phrase.includes(" ") && d.lower.text.includes(phrase)) s *= 1.2;
    s *= d.weight ?? 1;
    out.push({ doc: d, score: s });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, Math.min(Math.max(1, limit | 0 || 8), 20));
}

/** A short excerpt around the first query word in a page's text. */
export function snippet(doc, query, width = 220) {
  const text = doc.text.replace(/```[\s\S]*?```/g, " ").replace(/[#>*`|]/g, " ").replace(/\]\([^)]*\)/g, "]").replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();
  const words = tokens(query).filter((t) => !STOP.has(t));
  const low = text.toLowerCase();
  let at = -1;
  for (const w of words) { at = low.indexOf(w); if (at >= 0) break; }
  if (at < 0) return doc.description || text.slice(0, width);
  const start = Math.max(0, at - 60);
  return (start ? "…" : "") + text.slice(start, start + width).trim() + (start + width < text.length ? "…" : "");
}

/** "/platforms/python", "https://docs.bithuman.ai/platforms/python.md#x" → "/platforms/python". */
export function normalizeId(id) {
  let p = String(id || "").trim();
  try { if (/^https?:\/\//i.test(p)) p = new URL(p).pathname; } catch { /* keep as typed */ }
  p = p.split(/[?#]/)[0].replace(/\.md$/, "").replace(/\/+$/, "");
  if (!p.startsWith("/")) p = `/${p}`;
  return p === "/index" ? "/" : p || "/";
}

const text = (s, isError = false) => ({ content: [{ type: "text", text: s }], ...(isError ? { isError: true } : {}) });

export function callTool(prepared, name, args = {}) {
  if (name === "search") {
    if (typeof args.query !== "string" || !args.query.trim()) return text("search needs a non-empty `query`.", true);
    const results = rank(prepared, args.query, { section: args.section, limit: args.limit }).map(({ doc }) => ({
      id: doc.id, title: doc.title, url: doc.url, section: doc.section, text: snippet(doc, args.query),
    }));
    return text(JSON.stringify({ results }));
  }
  if (name === "fetch") {
    const id = normalizeId(args.id);
    const doc = prepared.byId.get(id);
    if (!doc) return text(`No docs page at ${id}. Use \`search\` to find the page id.`, true);
    return text(JSON.stringify({ id: doc.id, title: doc.title, text: doc.markdown, url: doc.url, metadata: { section: doc.section, description: doc.description, markdown: `${doc.url === SITE ? `${SITE}/index` : doc.url}.md` } }));
  }
  return null;
}

const err = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const ok = (id, result) => ({ jsonrpc: "2.0", id, result });

/** One JSON-RPC message in, one response out (null for a notification). */
export function handleMessage(prepared, msg) {
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return err(msg && msg.id, -32600, "Invalid Request");
  }
  const isNotification = msg.id === undefined || msg.id === null;
  if (isNotification) return null;
  const { id, method, params = {} } = msg;
  switch (method) {
    case "initialize": {
      const asked = params.protocolVersion;
      return ok(id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: prepared.instructions || "",
      });
    }
    case "ping": return ok(id, {});
    case "tools/list": return ok(id, { tools: TOOLS });
    case "tools/call": {
      const r = callTool(prepared, params.name, params.arguments || {});
      return r ? ok(id, r) : err(id, -32602, `Unknown tool: ${params.name}`);
    }
    case "resources/list": return ok(id, { resources: [] });
    case "prompts/list": return ok(id, { prompts: [] });
    default: return err(id, -32601, `Method not found: ${method}`);
  }
}

/** A POST body (one message or a batch) → the response body, or null (202, nothing to send). */
export function handleBody(prepared, body) {
  if (Array.isArray(body)) {
    if (!body.length) return err(null, -32600, "Invalid Request");
    const out = body.map((m) => handleMessage(prepared, m)).filter(Boolean);
    return out.length ? out : null;
  }
  return handleMessage(prepared, body);
}
