# UrgeWise Deployment Notes

## GitHub

This repository is safe to push publicly because `.env`, `data/`, `dist/`, `node_modules/`, and logs are ignored.

Do not commit real API keys. Use `.env` locally and hosted environment variables in deployment platforms.

## Local Demo With Gemini

Create `C:\Users\USER\Documents\Main\.env`:

```text
PORT=4000
DATABASE_PATH=./data/urgewise.sqlite
JWT_SECRET=make-a-long-random-secret
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-flash-latest
DEMO_EMAIL=demo@urgewise.local
DEMO_PASSWORD=PromptWars2026!
```

Then run:

```bash
npm run dev
```

## Vercel Environment Variables

If deploying through Vercel, add these in:

```text
Project -> Settings -> Environment Variables
```

Required:

```text
JWT_SECRET=make-a-long-random-secret
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-flash-latest
DEMO_EMAIL=demo@urgewise.local
DEMO_PASSWORD=PromptWars2026!
```

Optional alternatives:

```text
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
```

```text
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-5.6-luna
```

## Persistence Warning

UrgeWise currently uses SQLite for fast local/demo persistence. Vercel serverless functions do not provide a normal durable local filesystem for SQLite data. For a reliable judged deployment, use one of these paths:

1. Demo locally with SQLite and a real Gemini key.
2. Deploy the full Express app to Render, Railway, Fly, or another Node host with durable disk.
3. Migrate the DB layer to managed Postgres, such as Neon or Supabase, before using Vercel for the full app.

For the hackathon anti-disqualification rule, the safest route is a local or full Node-hosted demo where the app can prove real persisted rows, real auth, and real backend LLM calls.
