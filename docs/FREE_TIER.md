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
| DOI / arXiv paste | **Crossref** + **arXiv** metadata → sources + atoms |
| BibTeX / Zotero import | Paste or upload `.bib` in Sources tab |
| Related papers | **Semantic Scholar** + **OpenAlex** + **arXiv** (merged search) |
| Web suggestions | **Jina Search** |
| Spaced resurfacing | Home dashboard surfaces stale atoms & sources |
| Claim ↔ evidence map | Research brains: tag cross-source supports/contradicts |
| Concept map | Graph clusters from confirmed links |
| Card-kind review | Learn tab: teach-back, free-recall, cloze, problem modes |
| Mock exam + error drill | Exam studio: timed mode, drill missed questions |
| Code drills | Procedural brains: in-browser JS sandbox + tests |
| Language dictation | Listen & type (Web Speech API, no key) |
| Mastery objectives | Auto from brain goal; tracked via mock exams |
| Vault import | Settings → merge exported JSON |
| PWA + extension | Install on phone; Chrome capture extension |

## Free external APIs we use (server-side, no user key)

| API | Purpose | Key required? | Limits (typical) |
|-----|---------|---------------|------------------|
| [Semantic Scholar Graph API](https://api.semanticscholar.org/) | Find real papers, abstracts, citations | No (optional key for 1 RPS) | ~100 req / 5 min anonymous |
| [OpenAlex](https://openalex.org/) | Scholarly catalog, abstracts, OA links | No (optional key for higher limits) | Generous free tier |
| [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/) | DOI → title, abstract, authors | No | Polite pool |
| [arXiv API](https://arxiv.org/help/api) | Preprint metadata + PDF links | No | Reasonable use |
| [Jina Reader](https://jina.ai/reader) | Clean markdown from URLs (PBS, blogs) | No (optional key → 500 RPM) | 20 RPM anonymous |
| [Jina Search](https://jina.ai/reader) | Web search → readable results | No | Same pool as Reader |
| YouTube Innertube | Captions / transcripts | No | Unofficial; may break |

## Optional keys (you add in Vercel → Environment Variables)

| Variable | Unlocks |
|----------|---------|
| `LLM_API_KEY` | Rich tutor, LLM flashcards, synthesis |
| `JINA_API_KEY` | Faster/heavier URL reading & search |
| `SEMANTIC_SCHOLAR_API_KEY` | Higher paper search rate limits |
| `OPENALEX_API_KEY` | Higher OpenAlex rate limits |
| `OLLAMA_BASE_URL` + `OLLAMA_MODEL` | Local LLM (e.g. `http://127.0.0.1:11434`, `llama3.2`) — no cloud key |

## Local LLM (Ollama)

For fully local generation, run [Ollama](https://ollama.com/) and set:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
```

The `/api/llm` route tries cloud first (if `LLM_API_KEY` is set), then Ollama, then falls back to on-device heuristics. Ollama works best in local dev or self-hosted deploys — Vercel cannot reach your laptop.

## What still needs an LLM (honest)

- Nuanced Socratic dialogue across many sources  
- High-quality paraphrased flashcards for subtle arguments  
- Literature synthesis that compares 10+ papers fluently  

The free tier is designed to be **useful for capture, connection, and recall**; LLM keys add **generation quality**, not core storage.
