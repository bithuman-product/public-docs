#!/usr/bin/env node
// check-shell-tokens — docs v2 shell rule (SPEC §2): colour, font-size,
// font-weight and radius literals live only in src/styles/tokens.css, and no
// text is set in uppercase. Every other stylesheet and every <style> block or
// style="" attribute in an .astro file must use the tokens.
//
//   node scripts/check-shell-tokens.mjs            scan src/ (exit 1 on a finding)
//   node scripts/check-shell-tokens.mjs --selftest prove each rule fires
//
// Allowed: @font-face descriptors (they name a face, not a style), 0 / 50% /
// inherit radii, inherit / unset font values, and `currentColor` / `transparent`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = path.join('src', 'styles', 'tokens.css');

const RULES = [
  { id: 'colour-literal', re: /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(/g },
  { id: 'font-size-literal', re: /font-size\s*:\s*(?!\s*(?:var\(|inherit\b|unset\b|initial\b))[^;}]+/g },
  { id: 'font-weight-literal', re: /font-weight\s*:\s*(?!\s*(?:var\(|inherit\b|unset\b|initial\b))[^;}]+/g },
  { id: 'font-shorthand-literal', re: /(?<![-\w])font\s*:\s*(?!\s*(?:inherit|unset|initial)\b)[^;}]*\d[^;}]*/g },
  { id: 'radius-literal', re: /border(?:-(?:top|bottom)-(?:left|right))?-radius\s*:\s*(?!\s*(?:var\(|0\b|0px\b|50%|inherit\b|unset\b|initial\b))[^;}]+/g },
  { id: 'uppercase', re: /text-transform\s*:\s*uppercase/g },
];

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}
function stripFontFace(css) {
  return css.replace(/@font-face\s*\{[^}]*\}/g, (m) => m.replace(/[^\n]/g, ' '));
}

/** Return the CSS regions of a file, each with its starting offset. */
export function cssRegions(file, text) {
  if (file.endsWith('.css')) return [{ start: 0, css: text }];
  const out = [];
  for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
    out.push({ start: m.index + m[0].indexOf(m[1]), css: m[1] });
  }
  for (const m of text.matchAll(/\bstyle\s*=\s*(["'`])([\s\S]*?)\1/g)) {
    out.push({ start: m.index + m[0].indexOf(m[2]), css: m[2] });
  }
  return out;
}

export function scanText(file, text) {
  const findings = [];
  for (const { start, css } of cssRegions(file, text)) {
    const clean = stripFontFace(stripComments(css));
    for (const rule of RULES) {
      for (const m of clean.matchAll(rule.re)) {
        const at = start + m.index;
        const line = text.slice(0, at).split('\n').length;
        findings.push({ file, line, rule: rule.id, text: m[0].trim().slice(0, 80) });
      }
    }
  }
  return findings;
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(css|astro)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function selftest() {
  const cases = [
    ['a.css', '.x{color:#fff}', 'colour-literal'],
    ['a.css', '.x{background:rgba(0,0,0,.5)}', 'colour-literal'],
    ['a.css', '.x{font-size:13px}', 'font-size-literal'],
    ['a.css', '.x{font-weight:600}', 'font-weight-literal'],
    ['a.css', '.x{font:500 14px/1 sans-serif}', 'font-shorthand-literal'],
    ['a.css', '.x{border-radius:8px}', 'radius-literal'],
    ['a.css', '.x{text-transform:uppercase}', 'uppercase'],
    ['a.astro', '<style>.x{font-size:11px}</style>', 'font-size-literal'],
    ['a.astro', '<div style="color:#123456"></div>', 'colour-literal'],
  ];
  const clean = [
    ['a.css', '.x{color:var(--color-text);font-size:var(--fs-14);font-weight:var(--fw-medium);border-radius:var(--r-10)}'],
    ['a.css', '.x{border-radius:50%;font-size:inherit} /* #fff in a comment */'],
    ['a.css', '@font-face{font-family:"R";font-weight:700;src:local("R")}'],
    ['a.astro', '<a href="#top">top</a><style>.x{border-radius:0}</style>'],
  ];
  let bad = 0;
  for (const [f, t, want] of cases) {
    const got = scanText(f, t).map((x) => x.rule);
    if (!got.includes(want)) { console.error(`selftest: ${want} did not fire on ${t}`); bad++; }
  }
  for (const [f, t] of clean) {
    const got = scanText(f, t);
    if (got.length) { console.error(`selftest: false positive on ${t}: ${JSON.stringify(got)}`); bad++; }
  }
  if (bad) { console.error(`check-shell-tokens selftest: ${bad} failure(s)`); process.exit(1); }
  console.log(`check-shell-tokens selftest: ${cases.length} rules fire, ${clean.length} clean inputs pass`);
}

if (process.argv.includes('--selftest')) {
  selftest();
} else {
  const files = walk(path.join(ROOT, 'src')).filter((f) => path.relative(ROOT, f) !== TOKENS);
  const findings = files.flatMap((f) => scanText(path.relative(ROOT, f), fs.readFileSync(f, 'utf8')));
  for (const x of findings) console.error(`${x.file}:${x.line}  ${x.rule}  ${x.text}`);
  if (findings.length) {
    console.error(`check-shell-tokens: FAIL — ${findings.length} literal(s) outside ${TOKENS} (SPEC §2: use a token)`);
    process.exit(1);
  }
  console.log(`check-shell-tokens: PASS — ${files.length} files, no colour/size/weight/radius literals or uppercase outside ${TOKENS}`);
}
