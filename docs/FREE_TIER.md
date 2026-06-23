# Learn Anything — Free tier (no API keys)

Everything below works **without** `LLM_API_KEY`, OpenAI, or paid subscriptions. Optional keys only raise rate limits.

## Works today (no keys)

| Feature | How |
|---------|-----|
| Brains, capture, local vault | Browser localStorage; optional passphrase encryption |
| Auto-distill → atoms | On-device chunking + embeddings |
| Knowledge graph | Cross-source links only; concept extraction |
| FSRS-6 review | `ts-fsrs` runs entirely client-side |
| On-device tutor | Extractive explanations from **your** captured text |
| Heuristic flashcards | Teach-back, why/how, cloze from source chunks |
| Link capture | Direct fetch + **Jina Reader** fallback (PBS, news, etc.) |
| YouTube capture | Title + description + **auto transcript** when captions exist |
| Related papers | **Semantic Scholar** search (200M+ papers, no key) |
| Scholar search links | Google Scholar / Semantic Scholar query links |
| PWA + extension | Install on phone; Chrome capture extension |

## Free external APIs we use (server-side, no user key)

| API | Purpose | Key required? | Limits (typical) |
|-----|---------|---------------|------------------|
| [Semantic Scholar Graph API](https://api.semanticscholar.org/) | Find real papers, abstracts, citations | No (optional key for 1 RPS) | ~100 req / 5 min anonymous |
| [Jina Reader](https://jina.ai/reader) | Clean markdown from URLs (PBS, blogs) | No (optional key → 500 RPM) | 20 RPM anonymous |
| [Jina Search](https://jina.ai/reader) | Web search → readable results | No | Same pool as Reader |
| YouTube Innertube | Captions / transcripts | No | Unofficial; may break |
| Crossref (planned) | DOI → metadata | No | Polite pool |

## Optional keys (you add in Vercel → Environment Variables)

| Variable | Unlocks |
|----------|---------|
| `LLM_API_KEY` | Rich tutor, LLM flashcards, synthesis |
| `JINA_API_KEY` | Faster/heavier URL reading & search |
| `SEMANTIC_SCHOLAR_API_KEY` | Higher paper search rate limits |

## Roadmap (still free-tier friendly)

1. **One-click “Save paper”** from Semantic Scholar results into Sources  
2. **Crossref** DOI lookup when user pastes a DOI  
3. **OpenAlex** when user adds free `OPENALEX_API_KEY` (optional)  
4. **ArXiv** PDF text for preprints  
5. **Local LLM** via Ollama in Privacy Mode (fully on-device, user runs model)  
6. **Spaced resurfacing** — resurface old atoms without review session  
7. **BibTeX / Zotero import** for research brains  

## What still needs an LLM (honest)

- Nuanced Socratic dialogue across many sources  
- High-quality paraphrased flashcards for subtle arguments  
- Literature synthesis that compares 10+ papers fluently  

The free tier is designed to be **useful for capture, connection, and recall**; LLM keys add **generation quality**, not core storage.
