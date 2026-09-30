// A fenced block whose language names a generated block (```perf, ```why-on-device,
// ```model-matrix, ```deploy-matrix, ```dataflow, ```price) is replaced, at build
// time, by what src/lib/doc-blocks.ts draws from the site's data files. Tables
// stay real markdown tables (so they get column labels on a phone like every
// other table); the chips inside them are inline HTML with no script.
//
// The .md twins expand the same fences to plain markdown (expandBlocks), so a
// page and its twin never disagree.
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { BLOCK_LANGS, HTML_BLOCKS, WRAP_BLOCKS, blockMarkdown } from "../lib/doc-blocks.ts";

export default function remarkDocBlocks() {
  return (tree, file) => {
    const walk = (node) => {
      if (!node.children) return;
      const out = [];
      for (const child of node.children) {
        if (child.type === "code" && BLOCK_LANGS.has(child.lang)) {
          let md;
          try {
            md = blockMarkdown(child.lang, child.value ?? "", "page");
          } catch (e) {
            throw new Error(`${file?.path ?? "a page"}: ${e.message}`);
          }
          if (HTML_BLOCKS.has(child.lang)) { out.push({ type: "html", value: md }); continue; }
          const parsed = fromMarkdown(md, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
          // a wrapped body (```expected) may hold fences and links of its own: walk it too
          walk(parsed);
          const [open, close] = WRAP_BLOCKS[child.lang] ?? [`<div class="doc-block doc-block-${child.lang}">`, "</div>"];
          out.push(...(open ? [{ type: "html", value: open }] : []), ...parsed.children, ...(close ? [{ type: "html", value: close }] : []));
          continue;
        }
        walk(child);
        out.push(child);
      }
      node.children = out;
    };
    walk(tree);
  };
}
