/**
 * Link ingestion — articles, PBS, YouTube (title + description), with readable text.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  let url: string;
  try {
    ({ url } = (await req.json()) as { url: string });
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  url = normalizeUrl(url);
  if (!/^https?:\/\//i.test(url)) {
    return Response.json({ error: "invalid url" }, { status: 400 });
  }

  // YouTube: oEmbed gives title + author; page gives description.
  if (/youtube\.com|youtu\.be/i.test(url)) {
    try {
      const [oembedRes, pageRes] = await Promise.all([
        fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
          signal: AbortSignal.timeout(8000),
        }),
        fetch(url, {
          headers: { "User-Agent": "LearnAnythingBot/0.1" },
          signal: AbortSignal.timeout(10000),
        }),
      ]);
      const oembed = oembedRes.ok ? ((await oembedRes.json()) as { title?: string; author_name?: string }) : {};
      const html = pageRes.ok ? await pageRes.text() : "";
      const desc =
        matchAttr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
        matchAttr(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
        "";
      const title = oembed.title ?? "YouTube video";
      const text = [
        `Video: ${title}`,
        oembed.author_name ? `Channel: ${oembed.author_name}` : "",
        desc,
        "",
        "Tip: paste the transcript or your notes below this video capture for richer atoms and tutor answers.",
      ]
        .filter(Boolean)
        .join("\n\n");
      return Response.json({
        title,
        text,
        meta: { siteName: "YouTube", url, kind: "youtube", fetchedAt: Date.now() },
        hint: desc.length < 80 ? "youtube-transcript" : undefined,
      });
    } catch {
      return Response.json({
        title: "YouTube video",
        text: url,
        meta: { url, kind: "youtube", fetchFailed: true },
        hint: "youtube-transcript",
      });
    }
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LearnAnythingBot/0.1; +https://learn-anything-silk.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    const html = await res.text();
    const { title, text, siteName, description } = extractReadable(html);
    const body = [description, text].filter(Boolean).join("\n\n");
    return Response.json({
      title,
      text: body || description || title,
      meta: { siteName, url, fetchedAt: Date.now() },
      hint: body.length < 120 ? "thin-content" : undefined,
    });
  } catch {
    return Response.json({ error: "fetch failed" }, { status: 502 });
  }
}

function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

function extractReadable(html: string): {
  title: string;
  text: string;
  siteName?: string;
  description?: string;
} {
  const title =
    matchAttr(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    matchTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ||
    "Untitled";
  const siteName =
    matchAttr(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
    undefined;
  const description =
    matchAttr(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
    matchAttr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    undefined;

  const region =
    matchTag(html, /<article[^>]*>([\s\S]*?)<\/article>/i) ||
    matchTag(html, /<div[^>]+class=["'][^"']*article[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
    matchTag(html, /<main[^>]*>([\s\S]*?)<\/main>/i) ||
    matchTag(html, /<body[^>]*>([\s\S]*?)<\/body>/i) ||
    html;

  const text = region
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
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

  return { title: decodeEntities(title.trim()), text, siteName, description: description ? decodeEntities(description) : undefined };
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
