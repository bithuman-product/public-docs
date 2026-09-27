// src/openapi/bithuman.yaml, read at build time for the static API reference
// (/api/reference) and its .md twin. Every operation becomes plain data: its
// parameters, request body fields, responses with an example, and curl,
// Python and Node samples generated from one request definition (the spec's
// own x-codeSamples curl, through src/lib/curl-samples.mjs).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { samplesFromCurl } from "./curl-samples.mjs";

type Json = any;
const METHODS = ["get", "post", "put", "patch", "delete"] as const;

export interface Field { name: string; where?: string; type: string; required: boolean; description: string }
export interface Sample { label: string; lang: string; code: string }
export interface ApiResponse { status: string; description: string; example?: string }
export interface Operation {
  id: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  deprecated: boolean;
  /** true when the route answers with no credential */
  keyless: boolean;
  params: Field[];
  body: Field[];
  bodyType?: string;
  responses: ApiResponse[];
  samples: Sample[];
}
export interface Tag { name: string; slug: string; description: string; operations: Operation[] }
export interface ApiSpec { title: string; description: string; tags: Tag[]; count: number }

let cache: ApiSpec | null = null;

/** Markdown from the spec → HTML (no raw HTML passes through). Links the old
 *  console used (#tag/…/operation/<id>, #operation/<id>) point at this page's anchors. */
export function mdHtml(md: string): string {
  const fixed = (md ?? "")
    .replace(/\]\(#tag\/[^/)]+\/operation\/([A-Za-z0-9_]+)\)/g, "](#$1)")
    .replace(/\]\(#operation\/([A-Za-z0-9_]+)\)/g, "](#$1)")
    .replace(/\]\(#tag\/([^)]+)\)/g, (_, t: string) => `](#tag/${slugTag(decodeURIComponent(t))})`)
    .replace(/\]\(https:\/\/docs\.bithuman\.ai(\/[^)]*)\)/g, "]($1)");
  return micromark(fixed, { extensions: [gfm()], htmlExtensions: [gfmHtml()] });
}

/** The tag anchors the old console used, kept so links into it still land: tag/voice, tag/webhooks. */
export const slugTag = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function loadSpec(): Json {
  return yaml.load(readFileSync(join(process.cwd(), "src/openapi/bithuman.yaml"), "utf8"));
}

export function apiSpec(): ApiSpec {
  if (cache) return cache;
  const spec = loadSpec();
  const deref = (x: Json): Json => {
    if (!x || typeof x !== "object" || !("$ref" in x)) return x;
    const path = String(x.$ref).replace(/^#\//, "").split("/");
    let v: Json = spec;
    for (const k of path) v = v?.[k];
    if (v === undefined) throw new Error(`openapi: unresolved ${x.$ref}`);
    return deref(v);
  };

  const typeOf = (s: Json): string => {
    s = deref(s) ?? {};
    if (s.oneOf || s.anyOf) return (s.oneOf ?? s.anyOf).map(typeOf).join(" or ");
    if (s.type === "array") return `array of ${typeOf(s.items ?? {})}`;
    const t = Array.isArray(s.type) ? s.type.join(" or ") : s.type ?? (s.properties ? "object" : "any");
    return s.format ? `${t} (${s.format})` : t;
  };
  const describe = (s: Json): string => {
    s = deref(s) ?? {};
    const bits = [s.description ?? ""];
    if (s.enum) bits.push(`One of: ${s.enum.map((e: Json) => `\`${e}\``).join(", ")}.`);
    if (s.default !== undefined) bits.push(`Default: \`${JSON.stringify(s.default)}\`.`);
    return bits.filter(Boolean).join(" ").trim();
  };
  /** Request body fields, nested objects flattened as a.b. */
  const fields = (schema: Json, prefix = "", depth = 0): Field[] => {
    const s = deref(schema) ?? {};
    const props = s.properties ?? {};
    const req = new Set<string>(s.required ?? []);
    const out: Field[] = [];
    for (const [k, v0] of Object.entries<Json>(props)) {
      const v = deref(v0);
      const name = prefix + k;
      out.push({ name, type: typeOf(v), required: req.has(k), description: describe(v) });
      if (depth < 2 && v?.type === "object" && v.properties) out.push(...fields(v, name + ".", depth + 1));
    }
    return out;
  };
  /** An example value for a schema: its own example, else one built from its properties. */
  const exampleOf = (schema: Json, depth = 0): Json => {
    const s = deref(schema) ?? {};
    if (s.example !== undefined) return s.example;
    if (s.examples && Array.isArray(s.examples) && s.examples.length) return s.examples[0];
    if (depth > 4) return undefined;
    if (s.oneOf || s.anyOf) return exampleOf((s.oneOf ?? s.anyOf)[0], depth + 1);
    if (s.allOf) return Object.assign({}, ...s.allOf.map((x: Json) => exampleOf(x, depth + 1) ?? {}));
    if (s.type === "array") { const e = exampleOf(s.items ?? {}, depth + 1); return e === undefined ? [] : [e]; }
    if (s.properties) {
      const o: Record<string, Json> = {};
      for (const [k, v] of Object.entries<Json>(s.properties)) { const e = exampleOf(v, depth + 1); if (e !== undefined) o[k] = e; }
      return Object.keys(o).length ? o : undefined;
    }
    if (s.enum) return s.enum[0];
    return undefined;
  };
  const mediaExample = (content: Json): string | undefined => {
    const media = content?.["application/json"];
    if (!media) return undefined;
    let v = media.example;
    if (v === undefined && media.examples) v = (Object.values<Json>(media.examples)[0] as Json)?.value;
    if (v === undefined) v = exampleOf(media.schema);
    return v === undefined ? undefined : JSON.stringify(v, null, 2);
  };

  const tagMeta = new Map<string, Json>((spec.tags ?? []).map((t: Json) => [t.name, t]));
  const apiGroup = (spec["x-tagGroups"] ?? []).find((g: Json) => g.name === "API reference");
  const order: string[] = apiGroup?.tags ?? [...tagMeta.keys()];
  const byTag = new Map<string, Operation[]>(order.map((t) => [t, []]));
  const globalSecurity = spec.security ?? [];

  for (const [path, item0] of Object.entries<Json>(spec.paths ?? {})) {
    const item = deref(item0);
    for (const m of METHODS) {
      const op = item[m];
      if (!op) continue;
      const params: Field[] = [...(item.parameters ?? []), ...(op.parameters ?? [])].map((p0: Json) => {
        const p = deref(p0);
        return { name: p.name, where: p.in, type: typeOf(p.schema ?? {}), required: !!p.required, description: [p.description ?? "", describe({ ...(deref(p.schema) ?? {}), description: undefined })].filter(Boolean).join(" ") };
      });
      const rb = op.requestBody ? deref(op.requestBody) : null;
      const bodyType = rb ? Object.keys(rb.content ?? {})[0] : undefined;
      const body = rb && bodyType ? fields(rb.content[bodyType].schema) : [];
      const responses: ApiResponse[] = Object.entries<Json>(op.responses ?? {}).map(([status, r0]) => {
        const r = deref(r0);
        return { status, description: r.description ?? "", example: status.startsWith("2") ? mediaExample(r.content) : undefined };
      });
      const samples: Sample[] = [];
      for (const cs of op["x-codeSamples"] ?? []) {
        const src = String(cs.source ?? "").replace(/\n+$/, "");
        const gen = /curl/i.test(cs.label ?? "") ? samplesFromCurl(src) : null;
        if (gen) samples.push({ label: "curl", lang: "bash", code: src }, { label: "Python", lang: "python", code: gen.python.trimEnd() }, { label: "Node", lang: "js", code: gen.node.trimEnd() });
        else samples.push({ label: /curl/i.test(cs.label ?? "") ? "curl" : cs.label ?? "Shell", lang: cs.lang === "shell" ? "bash" : cs.lang ?? "bash", code: src });
      }
      const security = op.security ?? globalSecurity;
      const keyless = Array.isArray(security) && (security.length === 0 || security.some((s: Json) => Object.keys(s).length === 0));
      const tag = (op.tags ?? ["Other"])[0];
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag)!.push({
        id: op.operationId ?? `${m}-${path}`.replace(/[^A-Za-z0-9]+/g, "-"),
        method: m.toUpperCase(), path, summary: op.summary ?? "", description: op.description ?? "",
        deprecated: !!op.deprecated, keyless, params, body, bodyType, responses, samples,
      });
    }
  }
  const tags: Tag[] = [...byTag.entries()].filter(([, ops]) => ops.length).map(([name, operations]) => ({
    name, slug: slugTag(name), description: tagMeta.get(name)?.description ?? "", operations,
  }));
  cache = { title: spec.info?.title ?? "bitHuman", description: spec.info?.description ?? "", tags, count: tags.reduce((a, t) => a + t.operations.length, 0) };
  return cache;
}
