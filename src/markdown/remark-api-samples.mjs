// On the /api/* pages every request example reads curl → Python → Node, as one
// tab group (docs spec §3.3 D). The page's markdown carries the curl command
// only; the Python (`requests`) and Node (`fetch`) samples are generated here,
// at build time, from that same command (src/lib/curl-samples.mjs), so the
// three can never disagree. A hand-written `tab="Python"` sample next to the
// curl is kept and only the Node tab is added.
//
// A command the generator does not fully understand (a pipe, a form upload,
// an `export` line) stays a plain curl block. Runs before remark-code-tabs,
// which turns the tab-labelled fences into one tab group.
import { samplesFromCurl } from "../lib/curl-samples.mjs";

const TAB = /\btab="([^"]+)"/;
const isApiPage = (file) => /[\\/]src[\\/]content[\\/]docs[\\/](api[\\/]|platforms[\\/]livekit[\\/]cloud-avatar\.md)/.test(String(file?.path ?? file?.history?.[0] ?? ""));
const fence = (lang, tab, value) => ({ type: "code", lang, meta: `tab="${tab}"`, value: value.replace(/\n$/, "") });

export default function remarkApiSamples() {
  return (tree, file) => {
    if (!isApiPage(file)) return;
    const walk = (node) => {
      if (!node.children) return;
      const out = [];
      const kids = node.children;
      for (let i = 0; i < kids.length; i++) {
        const c = kids[i];
        const shell = c.type === "code" && (c.lang === "bash" || c.lang === "sh" || c.lang === "shell");
        const tab = shell ? TAB.exec(c.meta || "")?.[1] : undefined;
        if (!shell || (tab && tab !== "curl")) { walk(c); out.push(c); continue; }
        const s = samplesFromCurl(c.value ?? "");
        if (!s) { out.push(c); continue; }
        // the tab labels that already follow this curl block
        const run = [];
        let j = i + 1;
        while (tab && kids[j]?.type === "code" && TAB.test(kids[j].meta || "")) run.push(kids[j++]);
        const labels = new Set(run.map((k) => TAB.exec(k.meta)[1].toLowerCase()));
        out.push(fence(c.lang, "curl", c.value));
        if (!labels.has("python")) out.push(fence("python", "Python", s.python));
        out.push(...run.filter((k) => TAB.exec(k.meta)[1].toLowerCase() === "python"));
        if (!labels.has("node")) out.push(fence("js", "Node", s.node));
        out.push(...run.filter((k) => !["python"].includes(TAB.exec(k.meta)[1].toLowerCase())));
        i = j - 1;
      }
      node.children = out;
    };
    walk(tree);
  };
}
