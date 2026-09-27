// One request definition, three samples. A curl command (the one the API pages
// and the OpenAPI spec's x-codeSamples already carry) is parsed into a request,
// and the Python (`requests`) and Node (`fetch`) samples are generated from
// that request, so the three tabs can never disagree.
//
// Only a command this parser fully understands is converted: one `curl` with
// -X, -H, -d (a JSON body), -o/--output and the quiet/fail/follow flags, plus
// `# →` lines showing its output. Anything else (a pipe, a form upload, a
// second command, an `export`) returns null and the page keeps curl alone.
//
// Used by src/markdown/remark-api-samples.mjs (the /api/* pages) and the API
// reference page; tested by src/lib/curl-samples.test.mjs.

/** Split shell source into commands (lists of words) and `#` comment lines,
 *  honouring quotes (a quoted JSON body may span lines) and `\` line joins. */
function tokenize(src) {
  const commands = [], comments = [];
  let cmd = [], cur = null, i = 0;
  const word = () => { if (cur) cmd.push(cur); cur = null; };
  const end = () => { word(); if (cmd.length) commands.push(cmd); cmd = []; };
  while (i < src.length) {
    const c = src[i];
    if (c === "\\" && src[i + 1] === "\n") { word(); i += 2; continue; }
    if (c === "\n") { end(); i++; continue; }
    if (/\s/.test(c)) { word(); i++; continue; }
    if (c === "#" && !cur) {
      const j = src.indexOf("\n", i);
      comments.push(src.slice(i, j < 0 ? undefined : j).trim());
      i = j < 0 ? src.length : j;
      continue;
    }
    cur ??= { text: "" };
    if (c === "'") {
      const j = src.indexOf("'", i + 1);
      if (j < 0) return null;
      cur.text += src.slice(i + 1, j).replace(/\$/g, "\u0000"); // no expansion inside single quotes
      i = j + 1;
    } else if (c === '"') {
      let j = i + 1, s = "";
      while (j < src.length && src[j] !== '"') {
        if (src[j] === "\\" && /["\\$`]/.test(src[j + 1] ?? "")) { s += src[j + 1] === "$" ? "\u0000" : src[j + 1]; j += 2; continue; }
        s += src[j++];
      }
      if (j >= src.length) return null;
      cur.text += s;
      i = j + 1;
    } else if (/[|;&<>`()]/.test(c)) {
      return null; // pipes, redirects, subshells: not one plain request
    } else if (c === "\\") {
      cur.text += src[i + 1] ?? "";
      i += 2;
    } else {
      cur.text += c;
      i++;
    }
  }
  end();
  return { commands, comments };
}

/** A string with $VAR / ${VAR} → parts: [{text}|{env}]. */
function parts(s) {
  const out = [];
  let last = 0;
  for (const m of s.matchAll(/\$\{([A-Z_][A-Z0-9_]*)\}|\$([A-Z_][A-Z0-9_]*)/g)) {
    if (m.index > last) out.push({ text: s.slice(last, m.index) });
    out.push({ env: m[1] ?? m[2] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out.map((p) => (p.text ? { text: p.text.replace(/\u0000/g, "$") } : p));
}

const ENV = "\uE000"; // a private-use character: JSON allows it inside strings
/** A -d body: JSON, where a whole string value may be an environment variable
 *  spliced in with the shell idiom '{"agent_code": "'"$AGENT_CODE"'"}'. Any
 *  other expansion inside the body is not converted (undefined). */
function jsonBody(given) {
  const marked = given.replace(/\$\{?([A-Z_][A-Z0-9_]*)\}?/g, `${ENV}$1${ENV}`).replace(/\u0000/g, "$");
  let v;
  try { v = JSON.parse(marked); } catch { return undefined; }
  let bad = false;
  const walk = (x) => {
    if (typeof x === "string") {
      if (!x.includes(ENV)) return x;
      const m = new RegExp(`^${ENV}([A-Z_][A-Z0-9_]*)${ENV}$`).exec(x);
      if (!m) bad = true;
      return { env: m?.[1] };
    }
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, y]) => [k, walk(y)]));
    return x;
  };
  const out = walk(v);
  return bad ? undefined : out;
}
const isEnv = (v) => v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 1 && typeof v.env === "string";

/**
 * Parse a curl sample into { method, url, headers, body, output, fail, comments }.
 * url and header values are part lists (literal text and environment variables).
 * Returns null for anything that is not one plain request.
 */
export function parseCurl(src) {
  const t = tokenize(src);
  if (!t || t.commands.length !== 1) return null;
  const w = t.commands[0];
  const comments = t.comments;
  if (w[0].text !== "curl") return null;
  const req = { method: null, url: null, headers: [], body: undefined, output: null, fail: false, comments };
  for (let i = 1; i < w.length; i++) {
    const a = w[i].text;
    const next = () => { const v = w[++i]; if (!v) throw new Error("flag without value"); return v.text; };
    try {
      if (a === "-X" || a === "--request") req.method = next().toUpperCase();
      else if (a === "-H" || a === "--header") {
        const h = next();
        const k = h.indexOf(":");
        if (k < 1) return null;
        req.headers.push({ name: h.slice(0, k).trim(), value: parts(h.slice(k + 1).trim()) });
      } else if (a === "-d" || a === "--data" || a === "--data-raw" || a === "--json") {
        req.body = jsonBody(next());
        if (req.body === undefined) return null;
        if (a === "--json") req.headers.push({ name: "Content-Type", value: [{ text: "application/json" }] });
      } else if (a === "-o" || a === "--output") req.output = next();
      else if (a === "--fail" || a === "--location" || a === "--silent" || a === "--show-error") { if (a === "--fail") req.fail = true; }
      else if (/^-[sSfLN]+o?$/.test(a)) {
        if (a.includes("f")) req.fail = true;
        if (a.endsWith("o")) req.output = next();
      } else if (/^https?:\/\//.test(a) && !req.url) req.url = parts(a);
      else return null; // -F, -i, -G, -u, --compressed …: keep curl alone
    } catch { return null; }
  }
  if (!req.url) return null;
  req.method ??= req.body !== undefined ? "POST" : "GET";
  return req;
}

// ---------------------------------------------------------------- Python
const pyStr = (s) => JSON.stringify(s);
function pyValue(v, ind = "") {
  if (isEnv(v)) return `os.environ[${pyStr(v.env)}]`;
  if (v === null) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "string") return pyStr(v);
  if (typeof v === "number") return String(v);
  const inner = ind + "    ";
  if (Array.isArray(v)) {
    const flat = `[${v.map((x) => pyValue(x)).join(", ")}]`;
    return flat.length <= 72 ? flat : `[\n${v.map((x) => inner + pyValue(x, inner)).join(",\n")},\n${ind}]`;
  }
  const entries = Object.entries(v);
  const flat = `{${entries.map(([k, x]) => `${pyStr(k)}: ${pyValue(x)}`).join(", ")}}`;
  return flat.length <= 72 ? flat : `{\n${entries.map(([k, x]) => `${inner}${pyStr(k)}: ${pyValue(x, inner)}`).join(",\n")},\n${ind}}`;
}
function pyParts(ps) {
  if (ps.every((p) => p.text !== undefined)) return pyStr(ps.map((p) => p.text).join(""));
  if (ps.length === 1) return `os.environ[${pyStr(ps[0].env)}]`;
  return "f" + pyStr(ps.map((p) => (p.env ? `{os.environ['${p.env}']}` : p.text.replace(/[{}]/g, "$&$&"))).join(""));
}
const bodyEnv = (v) => isEnv(v) || (v && typeof v === "object" && Object.values(v).some(bodyEnv));
const usesEnv = (req) => req.url.some((p) => p.env) || req.headers.some((h) => h.value.some((p) => p.env)) || bodyEnv(req.body);
const isJsonType = (h) => /^content-type$/i.test(h.name) && h.value.length === 1 && /^application\/json\b/i.test(h.value[0].text ?? "");

export function toPython(req) {
  const headers = req.headers.filter((h) => !(req.body !== undefined && isJsonType(h)));
  const args = [pyParts(req.url)];
  if (headers.length) {
    const flat = `headers={${headers.map((h) => `${pyStr(h.name)}: ${pyParts(h.value)}`).join(", ")}}`;
    args.push(flat.length <= 76 ? flat : `headers={\n${headers.map((h) => `        ${pyStr(h.name)}: ${pyParts(h.value)}`).join(",\n")},\n    }`);
  }
  if (req.body !== undefined) args.push(`json=${pyValue(req.body, "    ")}`);
  const fn = ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(req.method) ? req.method.toLowerCase() : null;
  const call = fn ? `requests.${fn}(` : `requests.request(${pyStr(req.method)}, `;
  const oneLine = `resp = ${call}${args.join(", ")})`;
  const body = oneLine.length <= 88 && !oneLine.includes("\n") ? oneLine : `resp = ${call}\n${args.map((a) => `    ${a},`).join("\n")}\n)`;
  const tail = req.output
    ? `resp.raise_for_status()\nwith open(${pyStr(req.output)}, "wb") as f:\n    f.write(resp.content)`
    : req.fail ? "resp.raise_for_status()\nprint(resp.json())" : "print(resp.json())";
  return `import ${usesEnv(req) ? "os, " : ""}requests\n\n${body}\n${tail}\n`;
}

// ---------------------------------------------------------------- Node
const jsKey = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));
function jsValue(v, ind = "") {
  if (isEnv(v)) return `process.env.${v.env}`;
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  const inner = ind + "  ";
  if (Array.isArray(v)) {
    const flat = `[${v.map((x) => jsValue(x)).join(", ")}]`;
    return flat.length <= 72 ? flat : `[\n${v.map((x) => inner + jsValue(x, inner)).join(",\n")},\n${ind}]`;
  }
  const entries = Object.entries(v);
  const flat = `{ ${entries.map(([k, x]) => `${jsKey(k)}: ${jsValue(x)}`).join(", ")} }`;
  return flat.length <= 72 ? flat : `{\n${entries.map(([k, x]) => `${inner}${jsKey(k)}: ${jsValue(x, inner)}`).join(",\n")},\n${ind}}`;
}
function jsParts(ps) {
  if (ps.every((p) => p.text !== undefined)) return JSON.stringify(ps.map((p) => p.text).join(""));
  if (ps.length === 1) return `process.env.${ps[0].env}`;
  return "`" + ps.map((p) => (p.env ? `\${process.env.${p.env}}` : p.text.replace(/[`\\]/g, "\\$&").replace(/\$\{/g, "\\${"))).join("") + "`";
}

export function toNode(req) {
  const headers = [...req.headers];
  if (req.body !== undefined && !headers.some((h) => /^content-type$/i.test(h.name))) headers.push({ name: "Content-Type", value: [{ text: "application/json" }] });
  const opts = [];
  if (req.method !== "GET") opts.push(`method: ${JSON.stringify(req.method)}`);
  if (headers.length) {
    const flat = `headers: { ${headers.map((h) => `${jsKey(h.name)}: ${jsParts(h.value)}`).join(", ")} }`;
    opts.push(flat.length <= 76 ? flat : `headers: {\n${headers.map((h) => `    ${jsKey(h.name)}: ${jsParts(h.value)},`).join("\n")}\n  }`);
  }
  if (req.body !== undefined) opts.push(`body: JSON.stringify(${jsValue(req.body, "  ")})`);
  const url = jsParts(req.url);
  const call = opts.length ? `const resp = await fetch(${url}, {\n${opts.map((o) => `  ${o},`).join("\n")}\n});` : `const resp = await fetch(${url});`;
  const check = "if (!resp.ok) throw new Error(`HTTP ${resp.status}`);";
  if (req.output) return `import { writeFile } from "node:fs/promises";\n\n${call}\n${check}\nawait writeFile(${JSON.stringify(req.output)}, Buffer.from(await resp.arrayBuffer()));\n`;
  return `${call}\n${req.fail ? check + "\n" : ""}console.log(await resp.json());\n`;
}

/** curl → { python, node }, or null when the command is not one plain request. */
export function samplesFromCurl(src) {
  const req = parseCurl(src);
  if (!req) return null;
  return { python: toPython(req), node: toNode(req) };
}
