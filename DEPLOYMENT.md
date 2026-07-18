# UrgeWise Deployment

## Vercel First Pass

The GitHub repository is connected to the Vercel project. A push to `main` starts a production deployment.

In Vercel, open `Project -> Settings -> Environment Variables` and configure all environments used by the deployment.

Required for authentication:

```text
JWT_SECRET=at-least-32-random-characters
SEED_USER_EMAIL=reviewer@example.com
SEED_USER_PASSWORD=a-strong-unique-password-at-least-12-characters
```

Required for Gemini:

```text
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-current-gemini-key
GEMINI_MODEL=gemini-2.5-flash
```

After changing environment variables, redeploy the latest production deployment. Environment changes do not alter an already-built deployment.

Verify these URLs after deployment:

```text
https://YOUR-DOMAIN/api/health
https://YOUR-DOMAIN/
```

`/api/health` should return JSON with `"ok": true`. The root page should show the UrgeWise sign-in screen.

## Secret Handling

- Never commit `.env` files or API keys.
- Use a unique production `JWT_SECRET` and reviewer password.
- Rotate any API key that has been pasted into chat, source code, screenshots, or logs.
- Restrict the Gemini key to the intended API and quota where possible.

## Persistence Limitation

The current first-pass Vercel deployment uses SQLite in the function's temporary filesystem. Authentication and all application logic are real, but newly created accounts and behavior data can reset when Vercel replaces a function instance.

For durable production accounts and history, migrate the database layer to managed Postgres (for example Neon, Supabase, or Vercel Postgres), or deploy the Node server to a host with a persistent disk. Do not claim durable persistence from this Vercel first pass until that migration is complete.
