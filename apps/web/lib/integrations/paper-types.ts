/** Shared paper shape across Semantic Scholar, OpenAlex, Crossref, arXiv. */

export interface PaperRecord {
  id: string;
  title: string;
  abstract?: string;
  year?: number;
  citationCount?: number;
  url?: string;
  authors?: string[];
  openAccessPdf?: string;
  venue?: string;
  source: "semantic-scholar" | "openalex" | "crossref" | "arxiv";
  doi?: string;
}
