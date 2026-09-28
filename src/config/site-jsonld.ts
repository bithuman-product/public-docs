// The site-wide structured data: the SoftwareApplication that
// src/layouts/Base.astro puts in the JSON-LD graph of every page. The
// Organization is bitHuman's one node on www.bithuman.ai; the docs only
// reference its @id (publisher, author), so there is one logo and one
// description for the company, not a second definition here. Search
// engines and AI agents read this block first, so it says only what the pages
// say, read from the same data the pages render:
//
//   the promise under the home H1 and the model cards  src/data/home.ts
//   where the avatar renders (the deployment modes)     src/data/deployments.ts
//   what reaches bitHuman (the privacy lines)           src/data/dataflows.ts
//   speed, as times real time                           public/performance.json and the
//                                                       generated headline (src/lib/perf-headline.ts)
//   plans and per-minute rates                          plans.json and pricing.json, through
//                                                       calcData(), the /pricing calculator's source
//   the offline license                                 src/data/offline.ts, verbatim
//
// No number, price, plan name or offline wording is typed here
// (check-jsonld-facts refuses one). The built graph is graded like prose:
// check-claims, check-offline-copy, check-internal-vocabulary,
// check-perf-literals and check-jsonld-facts (rates, plan prices and names,
// platforms) read it out of dist/.
import { HERO, MODELS } from "../data/home";
import { DEPLOYMENTS, CPU_ONLY } from "../data/deployments";
import { PLATFORM_PAGES, QUICKSTART } from "../data/platforms";
import { DEVICE_METERING_ONLY, WEB_EMBED_CONVERSATION } from "../data/dataflows";
import { OFFLINE_LICENSE_COPY } from "../data/offline";
import plansData from "../data/plans.json";
import { calcData, explorerClaim } from "../lib/doc-blocks";
import { headlineData } from "../lib/perf-headline";
import { perfRow } from "../lib/perf";

export const ORGANIZATION_ID = "https://www.bithuman.ai/#organization";
export const SOFTWARE_ID = "https://www.bithuman.ai/#software";

/** The operating systems the SDKs run on. Each name is held to what the site
 *  publishes for it: its platform page, and a published performance.json row
 *  where one is measured. A qualifier in parentheses is a requirement the
 *  platform's /start panel lists under "needs" (the Mac panel: Apple silicon;
 *  Intel Macs are not supported). When any of these is gone the build fails,
 *  so the metadata cannot keep a platform or a looser requirement the pages
 *  dropped. There is no Windows entry: the docs send Windows users to WSL2. */
const RUNS_ON: { os: string; page: string; row?: string }[] = [
  { os: "iOS", page: "ios", row: "iphone-15" },
  { os: "iPadOS", page: "ios" },
  { os: "Android", page: "android", row: "android-s25plus" },
  { os: "macOS (Apple silicon)", page: "macos", row: "macos-sdk" },
  { os: "Linux", page: "cli", row: "linux-cpu" },
  { os: "Web browser", page: "web", row: "web" },
];

function operatingSystems(): string {
  for (const r of RUNS_ON) {
    const p = PLATFORM_PAGES.find((x) => x.id === r.page);
    const word = r.os.split(" ")[0];
    if (!p || !`${p.title} ${p.line}`.includes(word)) throw new Error(`site-jsonld: no platform page "${r.page}" naming ${word}`);
    const needs = /\(([^)]+)\)/.exec(r.os)?.[1];
    if (needs && !QUICKSTART.find((q) => q.id === r.page)?.needs.includes(needs)) throw new Error(`site-jsonld: the "${r.page}" /start panel does not list "${needs}" under needs`);
    if (r.row) perfRow(r.row); // throws on an unknown or unpublished row
  }
  return RUNS_ON.map((r) => r.os).join(", ");
}

/** "The CLI…" → "the CLI…", "A photoreal…" → "a photoreal…". Only a leading
 *  plain English word is lowercased; any other first word (an acronym such as
 *  "REST", or a name such as "LiveKit", "WebGPU", "Python") stays as written. */
const lower = (s: string) => (/^(?:A|An|Any|The|Both|Each|Every|Inside|In|On|Your)\b/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const perMinute = (n: number) => `${n} credit${n === 1 ? "" : "s"}/min`;

interface Plan { id: string; name: string; monthly_usd: number; credits_per_month: number }

function offers(site: URL) {
  const d = calcData();
  const plans = plansData.plans as Plan[];
  const entry = plans.find((p) => p.id === "creator");
  if (!entry || !plans.length) throw new Error("site-jsonld: plans.json has no creator plan");
  const prices = plans.map((p) => p.monthly_usd);
  const url = new URL("/pricing#plans", site).href;
  const models = MODELS.map((m) => m.title).join(" and ");
  return {
    "@type": "AggregateOffer",
    url,
    priceCurrency: "USD",
    lowPrice: Math.min(...prices),
    highPrice: Math.max(...prices),
    offerCount: plans.length,
    description:
      `From ${plansData.api_plan_required_from}, API and SDK use requires the ${entry.name} plan or higher. ` +
      `Credits pay for active session time, talking or idle, by the exact second: ${models} use ${perMinute(d.rates.device)} ` +
      `on the device or your servers and ${perMinute(d.rates.cloud)} in the bitHuman cloud; a managed agent's voice chat is ` +
      `${perMinute(d.rates.chat)}, all-inclusive. Credit top-ups: $1 = ${d.credits_per_usd} credits.`,
    offers: plans.map((p) => ({
      "@type": "Offer",
      name: `${p.name} plan`,
      price: p.monthly_usd,
      priceCurrency: "USD",
      priceSpecification: { "@type": "UnitPriceSpecification", price: p.monthly_usd, priceCurrency: "USD", unitText: "month", billingDuration: "P1M" },
      description: `${p.credits_per_month.toLocaleString("en-US")} credits a month`,
      url,
    })),
  };
}

function features(): string[] {
  // The online modes, then the CPU-only note (Your servers on a PC with no GPU);
  // the offline license closes the list in its approved words.
  const modes = [...DEPLOYMENTS.filter((m) => m.id !== "offline"), CPU_ONLY].map((m) => `${m.name} — ${lower(m.line)}`);
  // Speed as times real time from the generated headline; the claim over every
  // published configuration words itself down when a cell falls under 1.0×.
  const speed = (headlineData() ?? []).map((r) => `${r.model}, × real time: ${r.cells.map((c) => `${c.platform} ${c.multiple}`).join(", ")}`);
  return [
    ...MODELS.map((m) => `${m.title} — ${lower(m.line)}`),
    ...modes,
    DEVICE_METERING_ONLY,
    WEB_EMBED_CONVERSATION,
    explorerClaim(),
    ...speed,
    OFFLINE_LICENSE_COPY,
  ];
}

/** The site-wide node, for the page's @graph. The Organization is referenced by
 *  ORGANIZATION_ID only; www.bithuman.ai defines it. */
export function siteGraph(site: URL): Record<string, unknown>[] {
  return [
    {
      "@type": "SoftwareApplication",
      "@id": SOFTWARE_ID,
      name: "bitHuman",
      applicationCategory: "DeveloperApplication",
      operatingSystem: operatingSystems(),
      url: "https://www.bithuman.ai",
      publisher: { "@id": ORGANIZATION_ID },
      description: `${HERO.title}. ${HERO.line}`,
      featureList: features(),
      offers: offers(site),
    },
  ];
}
