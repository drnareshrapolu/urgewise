# UrgeWise

UrgeWise is a full-stack GenAI habit recovery coach for the PromptWars habit/addiction challenge. It turns user-created behavior logs into computed pattern summaries, live AI insight, and a context-aware coaching conversation.

## What Is Implemented

- React, Vite, TypeScript, and Tailwind frontend
- Express and TypeScript backend
- SQLite persistence using Node's built-in SQLite module
- Email/password authentication with bcrypt and signed HTTP-only cookies
- Signup, login, logout, and protected habit routes
- Habit creation and behavior logging with status, mood, urge, trigger, context, note, and timezone
- Computed streak, trend, trigger summary, and accessible chart totals
- Gemini, Anthropic, or OpenAI-backed insight generation and coach chat
- Context hashing, AI response caching, and LLM audit records
- Safety boundary for crisis, severe withdrawal, overdose, emergency, or self-harm language
- Rate limits, input limits, security headers, and parameterized database queries
- Integration tests for authentication, protected routes, insight computation, and safety detection

UrgeWise does not present canned AI output or placeholder activity as user data. AI routes fail honestly when no provider key is configured.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and set a random `JWT_SECRET`.

3. Configure one AI provider. For Gemini:

```text
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-flash-latest
```

4. Start the app:

```bash
npm run dev
```

The frontend opens on the Vite URL and proxies `/api` to `http://127.0.0.1:4000`.

## Shared Evaluation Login

For a reviewer account, configure these server-side values. The password is hashed before storage and is never sent to the browser unless the reviewer enters it.

```text
SEED_USER_EMAIL=reviewer@example.com
SEED_USER_PASSWORD=use-a-strong-unique-password
```

No starter habits or logs are inserted for this account. All behavior shown in the workspace is created through the real API.

## Verify

```bash
npm test
npm run build
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the required Vercel variables and the current persistence limitation.

## Safety Boundary

UrgeWise is not medical care, therapy, diagnosis, detox support, or emergency help. Crisis, severe withdrawal, overdose, immediate danger, or self-harm language triggers a professional-help response instead of normal coaching.
