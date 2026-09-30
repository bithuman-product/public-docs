// WHERE EACH MAVEN GROUP THE PAGES NAME IS SERVED FROM. One fact, one place.
//
// bitHuman publishes its Android packages (group `ai.bithuman`) to its own Maven
// repository, https://maven.bithuman.ai, and no longer to Maven Central (owner
// decision 2026-09-30). The pages tell a reader to resolve `ai.bithuman` from that
// repository ONLY (Gradle `exclusiveContent`), so it is the registry every gate here
// asks about `ai.bithuman`: what a reader's build resolves, not where an older copy
// also lives. The versions published to Central before the switch stay there
// (Central is immutable) and are served by maven.bithuman.ai as well.
//
// Every other group a page names (com.qualcomm.qti, org.jetbrains.kotlin, the
// extractor's own jars) is still Central's.
//
// maven.bithuman.ai is a Cloudflare Worker in front of a public-read bucket. It caches
// maven-metadata.xml at the edge for about 5 minutes, so a check run in the first
// minutes after a publish can still read the previous <release>.

export const BITHUMAN_GROUP = "ai.bithuman";
export const BITHUMAN_MAVEN = "https://maven.bithuman.ai";
export const CENTRAL = "https://repo1.maven.org/maven2";
export const CENTRAL_MIRROR = "https://repo.maven.apache.org/maven2";

/** The base URLs that serve `group`, in the order to ask. */
export function mavenBases(group) {
  return group === BITHUMAN_GROUP ? [BITHUMAN_MAVEN] : [CENTRAL, CENTRAL_MIRROR];
}

/** `<base>/<group as a path>/<artifact>` for each base that serves the group. */
export function artifactUrls(group, artifact) {
  return mavenBases(group).map((b) => `${b}/${group.replace(/\./g, "/")}/${artifact}`);
}
