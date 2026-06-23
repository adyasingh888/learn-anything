/**
 * Link ingestion. Fetches a URL server-side and extracts readable text + title
 * with a dependency-free readability heuristic. (Production would swap in
 * @mozilla/readability + a headless fetch, but the contract stays the same.)
 *
 * Privacy note: this only runs for explicit link captures. File/note/audio
 * capture never touches the server.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  let url: string;
  try {
    ({ url } = (await req.json()) as { url: string });
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) {
    return Response.json({ error: "invalid url" }, { status: 400 });
  }
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "LearnAnythingBot/0.1 (+capture)" },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    const html = await res.text();
    const { title, text, siteName } = extractReadable(html);
    return Response.json({
      title,
      text,
      meta: { siteName, url, fetchedAt: Date.now() },
    });
  } catch {
    return Response.json({ error: "fetch failed" }, { status: 502 });
  }
}

function extractReadable(html: string): { title: string; text: string; siteName?: string } {
  const title =
    matchTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ||
    matchAttr(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    "Untitled";
  const siteName =
    matchAttr(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
    undefined;

  // Prefer the <article> / <main> region when present.
  const region =
    matchTag(html, /<article[^>]*>([\s\S]*?)<\/article>/i) ||
    matchTag(html, /<main[^>]*>([\s\S]*?)<\/main>/i) ||
    matchTag(html, /<body[^>]*>([\s\S]*?)<\/body>/i) ||
    html;

  const text = region
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();

  return { title: decodeEntities(title.trim()), text, siteName };
}

function matchTag(html: string, re: RegExp): string | undefined {
  const m = html.match(re);
  return m ? m[1].replace(/<[^>]+>/g, " ").trim() : undefined;
}
function matchAttr(html: string, re: RegExp): string | undefined {
  const m = html.match(re);
  return m ? m[1].trim() : undefined;
}
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
