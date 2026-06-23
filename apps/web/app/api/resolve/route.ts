/**
 * Resolve DOI or arXiv ID → metadata for capture. Free APIs, no keys.
 */
export const runtime = "nodejs";

import { arxivToCaptureText, fetchByArxivId } from "@/lib/integrations/arxiv";
import { crossrefToCaptureText, fetchByDoi } from "@/lib/integrations/crossref";

export async function POST(req: Request) {
  let body: { doi?: string; arxivId?: string };
  try {
    body = (await req.json()) as { doi?: string; arxivId?: string };
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  if (body.doi) {
    const paper = await fetchByDoi(body.doi);
    if (!paper) return Response.json({ error: "doi not found" }, { status: 404 });
    return Response.json({
      title: paper.title,
      text: crossrefToCaptureText(paper),
      url: paper.url,
      meta: { doi: paper.doi, source: "crossref", authors: paper.authors, year: paper.year },
    });
  }

  if (body.arxivId) {
    const paper = await fetchByArxivId(body.arxivId);
    if (!paper) return Response.json({ error: "arxiv not found" }, { status: 404 });
    return Response.json({
      title: paper.title,
      text: arxivToCaptureText(paper),
      url: paper.url,
      meta: { arxivId: body.arxivId, source: "arxiv", openAccessPdf: paper.openAccessPdf },
    });
  }

  return Response.json({ error: "doi or arxivId required" }, { status: 400 });
}
