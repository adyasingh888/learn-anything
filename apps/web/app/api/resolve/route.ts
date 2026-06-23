/**
 * Resolve DOI or arXiv ID → metadata for capture. Free APIs, no keys.
 * Optional fetchFullText: pull arXiv PDF body via Jina Reader.
 */
export const runtime = "nodejs";

import { arxivToCaptureText, fetchByArxivId } from "@/lib/integrations/arxiv";
import { crossrefToCaptureText, fetchByDoi } from "@/lib/integrations/crossref";
import { fetchArticleMarkdown } from "@/lib/integrations/jina";

export async function POST(req: Request) {
  let body: { doi?: string; arxivId?: string; fetchFullText?: boolean };
  try {
    body = (await req.json()) as { doi?: string; arxivId?: string; fetchFullText?: boolean };
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  if (body.doi) {
    const paper = await fetchByDoi(body.doi);
    if (!paper) return Response.json({ error: "doi not found" }, { status: 404 });
    let text = crossrefToCaptureText(paper);
    let fullText = false;
    if (body.fetchFullText && paper.url) {
      const full = await fetchArticleMarkdown(paper.url);
      if (full && full.text.length > text.length) {
        text = `${text}\n\n---\n\n${full.text}`;
        fullText = true;
      }
    }
    return Response.json({
      title: paper.title,
      text,
      url: paper.url,
      meta: { doi: paper.doi, source: "crossref", authors: paper.authors, year: paper.year, fullText },
    });
  }

  if (body.arxivId) {
    const paper = await fetchByArxivId(body.arxivId);
    if (!paper) return Response.json({ error: "arxiv not found" }, { status: 404 });
    let text = arxivToCaptureText(paper);
    let fullText = false;
    if (body.fetchFullText && paper.openAccessPdf) {
      const full = await fetchArticleMarkdown(paper.openAccessPdf);
      if (full && full.text.length > 200) {
        text = `${text}\n\n---\n\n## Full text (PDF)\n\n${full.text}`;
        fullText = true;
      }
    }
    return Response.json({
      title: paper.title,
      text,
      url: paper.url,
      meta: { arxivId: body.arxivId, source: "arxiv", openAccessPdf: paper.openAccessPdf, fullText },
    });
  }

  return Response.json({ error: "doi or arxivId required" }, { status: 400 });
}
