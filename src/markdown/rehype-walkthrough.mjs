// A recipe's "## Steps" section becomes a walkthrough (docs spec §4.2 #11):
// each "### " under it is one step, numbered (a CSS counter, so the heading's
// text and its entry in "On this page" stay the step's name), deep-linkable as
// #step-n, with a "Done" toggle; a progress line and a finish line wrap the
// list. Everything is static HTML; src/scripts/walkthrough.ts only keeps the
// ticks (browser storage, key bh.walk.<page>) and the progress. With
// JavaScript off the steps read as numbered sections and the toggles hide.

const text = (n) => (n.type === "text" ? n.value : (n.children ?? []).map(text).join(""));
const el = (tagName, properties, children = []) => ({ type: "element", tagName, properties, children });

export default function rehypeWalkthrough() {
  return (tree, file) => {
    const kids = tree.children;
    const start = kids.findIndex((n) => n.type === "element" && n.tagName === "h2" && text(n).trim() === "Steps");
    if (start < 0) return;
    let end = kids.findIndex((n, i) => i > start && n.type === "element" && n.tagName === "h2");
    if (end < 0) end = kids.length;
    const section = kids.slice(start + 1, end);
    const steps = [];
    const intro = [];
    for (const n of section) {
      if (n.type === "element" && n.tagName === "h3") steps.push({ head: n, body: [] });
      else if (steps.length) steps[steps.length - 1].body.push(n);
      else intro.push(n);
    }
    if (steps.length < 2) throw new Error(`${file?.path ?? "a page"}: "## Steps" needs two or more "### " steps`);
    const page = (file?.path ?? "page").split("/").pop().replace(/\.mdx?$/, "");
    const total = steps.length;
    const items = steps.map((s, i) => {
      const n = i + 1;
      s.head.properties = { ...s.head.properties, className: ["walk-h"] };
      const done = el("button", { type: "button", className: ["walk-done"], dataWalkDone: String(n), ariaPressed: "false" }, [
        el("span", { className: ["walk-box"], ariaHidden: "true" }),
        { type: "text", value: "Done" },
        el("span", { className: ["sr"] }, [{ type: "text", value: `: step ${n}` }]),
      ]);
      return el("li", { className: ["walk-step"], id: `step-${n}`, dataStep: String(n) }, [s.head, ...s.body, done]);
    });
    const bar = el("div", { className: ["walk-bar"], dataWalkBar: "", ariaHidden: "true" }, [
      el("span", { className: ["walk-track"] }, [el("span", { className: ["walk-fill"], dataWalkFill: "" })]),
    ]);
    const status = el("p", { className: ["walk-status"], dataWalkStatus: "", ariaLive: "polite" }, [{ type: "text", value: `${total} steps` }]);
    const own = kids.some((n, i) => i > start && n.type === "element" && n.tagName === "h2" && text(n).trim() === "Make it your own");
    const finish = el("p", { className: ["walk-finish"], dataWalkFinish: "", hidden: true }, [
      { type: "text", value: "All steps done." },
      ...(own ? [{ type: "text", value: " Next: " }, el("a", { href: "#make-it-your-own" }, [{ type: "text", value: "make it your own" }]), { type: "text", value: "." }] : []),
    ]);
    const walk = el("div", { className: ["walk"], dataWalk: page, dataWalkTotal: String(total) }, [bar, status, ...intro, el("ol", { className: ["walk-steps"] }, items), finish]);
    tree.children = [...kids.slice(0, start + 1), walk, ...kids.slice(end)];
  };
}
