import { GROUP_ORDER, type SectionId } from "../config/nav.ts";

// The order the sidebar shows pages in — section, then group, then `order` —
// so /llms.txt and /llms-full.txt read the way the site does.

export const SECTION_ORDER: SectionId[] = ["start", "api", "sdk", "guides", "examples", "performance", "resources", "legal"];

/** The same order the sidebar shows: section, then group, then `order`. */
export function inSidebarOrder(docs: any[]): any[] {
  const groupRank = (sec: SectionId, g: string) => {
    const i = (GROUP_ORDER[sec] ?? []).indexOf(g);
    return i === -1 ? 999 : i;
  };
  return [...docs].sort(
    (a, b) =>
      SECTION_ORDER.indexOf(a.data.section) - SECTION_ORDER.indexOf(b.data.section) ||
      groupRank(a.data.section, a.data.group) - groupRank(b.data.section, b.data.group) ||
      (a.data.order ?? 100) - (b.data.order ?? 100) ||
      a.id.localeCompare(b.id),
  );
}

