/**
 * Link ingestion — articles (Jina Reader fallback), YouTube transcripts, PBS, etc.
 */
export const runtime = "nodejs";

import { fetchArticleMarkdown } from "@/lib/integrations/jina";
import { fetchYouTubeTranscript } from "@/lib/integrations/youtube";

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

  if (/youtube\.com|youtu\.be/i.test(url)) {
    const transcript = await fetchYouTubeTranscript(url);
    if (transcript) {
      return Response.json({
        title: transcript.title ?? "YouTube video",
        text: [
          transcript.title ? `Video: ${transcript.title}` : "",
          transcript.channelName ? `Channel: ${transcript.channelName}` : "",
          "",
          transcript.text,
        ]
          .filter(Boolean)
          .join("\n"),
        meta: { siteName: "YouTube", url, kind: "youtube", hasTranscript: true, fetchedAt: Date.now() },
      });
    }
    // Fall through to oEmbed + description if no captions
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { signal: AbortSignal.timeout(8000) },
      );
      const oembed = oembedRes.ok ? ((await oembedRes.json()) as { title?: string; author_name?: string }) : {};
      return Response.json({
        title: oembed.title ?? "YouTube video",
        text: `${oembed.title ?? "Video"}\n\n(No captions found — paste transcript as a note, or try another video.)`,
        meta: { siteName: "YouTube", url, kind: "youtube", hasTranscript: false },
        hint: "youtube-transcript",
      });
    } catch {
      return Response.json({ title: url, text: url, meta: { url }, hint: "youtube-transcript" });
    }
  }

  // Try direct fetch first (fast), then Jina Reader (better for PBS, paywalls, JS sites).
  let title = "Untitled";
  let text = "";
  let siteName: string | undefined;
  let via: "direct" | "jina" = "direct";

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LearnAnything/0.1; +https://learn-anything-silk.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    const html = await res.text();
    const extracted = extractReadable(html);
    title = extracted.title;
    text = [extracted.description, extracted.text].filter(Boolean).join("\n\n");
    siteName = extracted.siteName;
  } catch {
    /* try jina */
  }

  if (text.length < 200) {
    const jina = await fetchArticleMarkdown(url);
    if (jina && jina.text.length > text.length) {
      title = jina.title;
      text = jina.text;
      via = "jina";
    }
  }

  if (!text.trim()) {
    return Response.json({ error: "fetch failed" }, { status: 502 });
  }

  return Response.json({
    title,
    text,
    meta: { siteName, url, via, fetchedAt: Date.now() },
    hint: text.length < 120 ? "thin-content" : undefined,
  });
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
  const siteName = matchAttr(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  const description =
    matchAttr(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
    matchAttr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);

  const region =
    matchTag(html, /<article[^>]*>([\s\S]*?)<\/article>/i) ||
    matchTag(html, /<main[^>]*>([\s\S]*?)<\/main>/i) ||
    matchTag(html, /<body[^>]*>([\s\S]*?)<\/body>/i) ||
    html;

  const text = stripHtml(region);
  return { title: decodeEntities(title.trim()), text, siteName, description: description ? decodeEntities(description) : undefined };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
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
  return s.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
}
