// Markdown for agents: a page request whose Accept header asks for
// text/markdown is answered with that page's markdown twin (/<page>.md), so
// `curl -H 'Accept: text/markdown' https://docs.bithuman.ai/platforms/python`
// returns markdown. Every other request passes through untouched.
//
// This has to be middleware: vercel.json rewrites run after the static files
// are matched, so a header rewrite never reaches a page that exists. The
// matcher skips assets (any path with an extension), the build's own folders
// and the docs MCP function.
export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_astro/|pagefind/|api/docs-mcp|docs-mcp|.*\\.[A-Za-z0-9]+$).*)"],
};

export default function middleware(request) {
  const accept = request.headers.get("accept") || "";
  if (!/\btext\/markdown\b/i.test(accept)) return new Response(null, { headers: { "x-middleware-next": "1" } });
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/index";
  return new Response(null, { headers: { "x-middleware-rewrite": new URL(`${path}.md`, url).toString(), vary: "Accept" } });
}
