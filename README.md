# UrgeWise

UrgeWise is a full-stack GenAI habit recovery coach for the PromptWars habit/addiction challenge. It uses real persisted habit logs, computes behavior patterns from those logs, and sends that structured context to an LLM from the backend only.

## What Is Implemented

- React + Vite + TypeScript + Tailwind frontend
- Express + TypeScript backend
- Persisted SQLite database using Node's built-in SQLite module
- Open demo mode with clearly labeled seeded history
- Habit creation and behavior logging with status, mood, urge level, trigger, context, note, and timezone
- Dashboard with streak, trend, trigger summary, and logs-over-time chart
- Anthropic, OpenAI, or Gemini-backed insight generation with context hashing, audit logging, and safe cache reuse
- Coaching chat with recent habit context injected server-side
- Safety boundary for crisis, severe withdrawal, overdose, emergency, or self-harm language
- Quick coaching prompts, Urge Surfing reset, and a compact behavioral Skills Library
- Tests for insight computation, demo API routes, and safety detection

## Demo Mode

UrgeWise opens directly into the seeded demo workspace for judging. The demo history is intentionally labeled as seeded data, while new logs, habits, AI insights, and coach messages still go through the real backend.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env
```

3. Add an API key to `.env`.

For Anthropic:

```text
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_key_here
```

For OpenAI:

```text
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6-luna
```

For Gemini:

```text
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-flash-latest
```

ChatGPT Plus is not enough by itself for OpenAI API calls. OpenAI API usage is billed separately from ChatGPT subscriptions, so you need an API key from the OpenAI platform account with API billing enabled. If no key is configured, the app still runs, logging/dashboard still work, and AI routes show a friendly real error instead of faking AI output.

## Run Locally

```bash
npm run dev
```

Open the Vite URL shown in the terminal. The API runs on `http://127.0.0.1:4000` and the frontend proxies `/api` requests to it.

## Verify

```bash
npm test
npm run build
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for GitHub, Gemini API key, and Vercel environment-variable notes.

## Judge Demo Flow

1. Open the app directly into the seeded demo workspace.
2. Open the existing habit and show its logged relapse/resisted history.
3. Generate an AI insight.
4. Add a new log entry.
5. Regenerate the insight and show that it is based on changed user data.
6. Ask the coach chat about the latest pattern.

## Safety Boundary

UrgeWise is not medical care, therapy, diagnosis, detox support, or emergency help. Crisis, severe withdrawal, overdose, immediate danger, or self-harm language triggers a professional-help response instead of normal coaching.
