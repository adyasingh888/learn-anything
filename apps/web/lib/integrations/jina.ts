/**
 * Jina Reader / Search — free URL→markdown and web search (no key; 20 RPM).
 * Optional JINA_API_KEY for higher limits.
 */

export async function fetchArticleMarkdown(url: string): Promise<{ title: string; text: string } | null> {
  const apiKey = process.env.JINA_API_KEY;
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        Accept: "text/plain",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    const raw = await res.text();
    return parseJinaReaderResponse(raw, url);
  } catch {
    return null;
  }
}

/** Web search → markdown bundle (related pages beyond your library). */
export async function searchWeb(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  const apiKey = process.env.JINA_API_KEY;
  try {
    const res = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
      headers: {
        Accept: "text/plain",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    return parseJinaSearchResults(text);
  } catch {
    return [];
  }
}

function parseJinaReaderResponse(raw: string, fallbackUrl: string): { title: string; text: string } {
  const lines = raw.split("\n");
  let title = "Untitled";
  let start = 0;
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    if (lines[i].startsWith("Title:")) {
      title = lines[i].replace(/^Title:\s*/, "").trim();
      start = i + 1;
    }
    if (lines[i].startsWith("URL Source:")) start = i + 1;
    if (lines[i].trim() === "---" || lines[i].startsWith("Markdown Content:")) {
      start = i + 1;
      break;
    }
  }
  const text = lines.slice(start).join("\n").trim() || raw;
  if (title === "Untitled") {
    const h1 = text.match(/^#\s+(.+)/m);
    if (h1) title = h1[1].trim();
  }
  return { title, text: text || fallbackUrl };
}

function parseJinaSearchResults(text: string): { title: string; url: string; snippet: string }[] {
  const results: { title: string; url: string; snippet: string }[] = [];
  const blocks = text.split(/\n(?=\[\d+\]\s)/);
  for (const block of blocks) {
    const titleMatch = block.match(/Title:\s*(.+)/);
    const urlMatch = block.match(/URL:\s*(https?:\/\/\S+)/);
    if (!titleMatch || !urlMatch) continue;
    const snippet = block
      .replace(/Title:.+/, "")
      .replace(/URL:.+/, "")
      .trim()
      .slice(0, 280);
    results.push({ title: titleMatch[1].trim(), url: urlMatch[1], snippet });
  }
  if (results.length === 0) {
    const urls = [...text.matchAll(/https?:\/\/[^\s)]+/g)].slice(0, 5);
    for (const m of urls) {
      results.push({ title: m[0], url: m[0], snippet: "" });
    }
  }
  return results.slice(0, 8);
}
