/**
 * Detect DOIs, arXiv IDs, and similar identifiers in pasted text.
 */

const DOI_RE = /\b(10\.\d{4,9}\/[^\s"'<>]+)/i;
const DOI_URL_RE = /doi\.org\/(10\.\d{4,9}\/[^\s"'<>]+)/i;
const ARXIV_URL_RE = /arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/i;
const ARXIV_ID_RE = /\barXiv:(\d{4}\.\d{4,5}(?:v\d+)?)\b/i;

export type IdentifierKind = "doi" | "arxiv" | "url" | "text";

export interface ParsedInput {
  kind: IdentifierKind;
  doi?: string;
  arxivId?: string;
  url?: string;
  text?: string;
}

export function parseCaptureInput(raw: string): ParsedInput {
  const s = raw.trim();
  if (!s) return { kind: "text", text: "" };

  const doiUrl = s.match(DOI_URL_RE);
  if (doiUrl) return { kind: "doi", doi: normalizeDoi(doiUrl[1]) };

  if (/^https?:\/\//i.test(s) || /^www\./i.test(s)) {
    const arxivInUrl = s.match(ARXIV_URL_RE);
    if (arxivInUrl) return { kind: "arxiv", arxivId: arxivInUrl[1].replace(/v\d+$/, "") };
    const doiInUrl = s.match(DOI_URL_RE);
    if (doiInUrl) return { kind: "doi", doi: normalizeDoi(doiInUrl[1]) };
    return { kind: "url", url: s.startsWith("http") ? s : `https://${s}` };
  }

  const arxiv = s.match(ARXIV_ID_RE) ?? s.match(/^\d{4}\.\d{4,5}(?:v\d+)?$/);
  if (arxiv) {
    const id = (arxiv[1] ?? arxiv[0]).replace(/v\d+$/, "");
    return { kind: "arxiv", arxivId: id };
  }

  const doi = s.match(DOI_RE);
  if (doi) return { kind: "doi", doi: normalizeDoi(doi[1]) };

  return { kind: "text", text: s };
}

function normalizeDoi(doi: string): string {
  return doi.replace(/[.,;)\]]+$/, "").trim();
}
