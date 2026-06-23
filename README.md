# Learn Anything

A privacy-first **second brain that teaches you**. Capture links, notes, and files into topic **Brains**, auto-connect them into a knowledge graph, and learn through a pedagogy engine that adapts to what you're studying (language, research, instruments, exams, and more).

**Live app:** [https://learn-anything-silk.vercel.app](https://learn-anything-silk.vercel.app)

**GitHub:** [https://github.com/adyasingh888/learn-anything](https://github.com/adyasingh888/learn-anything)

## Features

- **Capture** — links, notes, files, audio; browser extension + mobile share target (PWA)
- **Knowledge graph** — atoms, concepts, auto-suggested connections
- **FSRS-6 spaced repetition** — review sessions with interleaving
- **Grounded AI tutor** — answers cite your captured material (optional cloud LLM)
- **10 learning modes** — language, concept mastery, research, exam prep, practice studio, etc.
- **Privacy** — local-first storage; optional AES-256 vault encryption on-device

## Free tier (no API keys)

See [docs/FREE_TIER.md](docs/FREE_TIER.md) for everything that works without keys: Semantic Scholar paper search, Jina Reader for PBS/articles, YouTube transcripts, on-device tutor, FSRS review, and more.

Optional env vars (`LLM_API_KEY`, `JINA_API_KEY`) only improve quality/limits — see `.env.example`.

## Quick start (local)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Browser extension

1. Open `chrome://extensions` → Developer mode → **Load unpacked**
2. Select `apps/extension`
3. Set the app URL to [https://learn-anything-silk.vercel.app](https://learn-anything-silk.vercel.app) (pre-filled by default)

## Monorepo layout

| Package | Description |
|---------|-------------|
| `packages/core` | Domain model, learning modes, FSRS, RAG, generation |
| `apps/web` | Next.js PWA |
| `apps/extension` | Chrome capture extension |

## Deploy

The web app is configured for [Vercel](https://vercel.com) (free tier). Root directory: `apps/web`.

## License

MIT
