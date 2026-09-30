import { GROUP_ORDER, SIDEBAR_LINKS, HUB_LISTED, type SectionId } from "../config/nav.ts";

// One tab's sidebar (docs v2 SPEC §2, §3): the section's pages plus its
// SIDEBAR_LINKS, grouped in GROUP_ORDER, then by `order`. A page with `parent:`
// sits one level under its parent; a hub-listed parent's children (news posts)
// are left to the hub. The label is the H1 with the group's name removed from
// its front ("Android reference" under Android reads "Reference").

export interface SideItem { href: string; label: string; order: number; external?: boolean; children: SideItem[] }

export const slugOf = (e: any) => "/" + e.id.replace(/\/index$/, "").replace(/\.md$/, "");

export function sideLabel(title: string, group: string, type?: string): string {
  if (!group || !title.toLowerCase().startsWith(group.toLowerCase())) return title;
  // A platform's own page is its quickstart (SPEC §0): "Android", "REST API", "Web: embed and WebGPU".
  if (type === "platform") return "Quickstart";
  const rest = title.slice(group.length).replace(/^[:\s]+/, "");
  if (!rest || !/^[\s:]/.test(title.slice(group.length))) return title;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

export function sidebarGroups(all: any[], section: SectionId): [string, SideItem[]][] {
  const pages = all.filter((e) => e.data.section === section && !e.data.draft);
  const byOrder = (a: SideItem, b: SideItem) => a.order - b.order || a.label.localeCompare(b.label);
  const item = (e: any): SideItem => ({ href: slugOf(e), label: sideLabel(e.data.title, e.data.group || "", e.data.type), order: e.data.order ?? 100, children: [] });
  return (GROUP_ORDER[section] ?? [])
    .map((g) => {
      const top: SideItem[] = [
        ...pages.filter((e) => (e.data.group || "") === g && !e.data.parent).map(item),
        ...(SIDEBAR_LINKS[section] ?? []).filter((l) => l.group === g).map((l) => ({ href: l.href, label: l.label, order: l.order, external: l.external, children: [] })),
      ].sort(byOrder);
      for (const t of top) {
        if (HUB_LISTED.includes(t.href)) continue;
        t.children = pages.filter((e) => e.data.parent === t.href).map(item).sort(byOrder);
      }
      return [g, top] as [string, SideItem[]];
    })
    .filter(([, list]) => list.length > 0);
}

/** The sidebar in reading order (prev/next walk it): each item, then its children. */
export const flatten = (groups: [string, SideItem[]][]): SideItem[] =>
  groups.flatMap(([, list]) => list.flatMap((i) => [i, ...i.children])).filter((i) => !i.external);
