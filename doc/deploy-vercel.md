# Deploy golf-note to Vercel

This application uses Analog (Angular SSR/API routes), Prisma 7, and PostgreSQL. Analog's Vercel/Nitro preset is detected during a Vercel build, so a custom `vercel.json` is not required for this repository.

## 1. Prepare the database

Create a PostgreSQL database and keep its connection URL private. Use a pooled connection URL if the provider offers one; this app uses Prisma's Neon serverless adapter.

Before deploying against a production database:

1. Review the pending SQL migrations and take a backup or confirm point-in-time recovery is available.
2. Set `DATABASE_URL` in a trusted local shell or CI environment to the intended database.
3. Apply migrations with `npm run db:deploy`.
4. On a new database only, create the initial administrator as described in [Create the initial administrator](#create-the-initial-administrator).

Do not run schema-changing migrations automatically in every Vercel build: Preview and Production deployments may use different databases.

## 2. Import and configure the Vercel project

Import the Git repository into Vercel and use the repository root as the project root.

| Setting          | Value                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Framework preset | Analog, if detected automatically; otherwise use the default/Other preset without overriding Analog's build output |
| Install command  | `npm ci` (default is also acceptable)                                                                              |
| Build command    | `npm run build`                                                                                                    |
| Output directory | Leave unset; Analog writes Vercel's Build Output API output                                                        |
| Node.js version  | `24.x` for both build and server functions                                                                         |

Analog normally detects Vercel automatically. If the build does not produce `.vercel/output`, add `BUILD_PRESET=vercel` to the Vercel project's environment variables and redeploy. Do not set a static output directory such as `dist/analog/public`; that would omit SSR and API routes.

## 3. Configure environment variables

In **Project Settings → Environment Variables**, add:

| Variable       | Required                            | Environments                                  | Purpose                                                                                        |
| -------------- | ----------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Yes                                 | Every environment that builds or runs the app | PostgreSQL URL used when Analog loads server/API modules during build and by Prisma at runtime |
| `BUILD_PRESET` | Only if preset auto-detection fails | Environments where the build runs             | Set to `vercel` as a preset-detection fallback                                                 |

Use a separate database/branch for Preview where possible. The Vercel build needs this value too; a missing value causes server module loading to fail. Do not use a Vite-prefixed variable for database credentials, and never commit real environment values. `.env.example` contains placeholders only.

## 4. Create the initial administrator

The seed command requires explicit credentials; it does not use a built-in default password. From a trusted machine, configure `DATABASE_URL`, `INITIAL_ADMIN_USERNAME`, and `INITIAL_ADMIN_PASSWORD` in an uncommitted local `.env`, then run:

```sh
npm ci
npm run db:seed
```

Optionally set `INITIAL_ADMIN_FULL_NAME`. The seed uses upserts and is safe to rerun for the same username, but it does not reset an existing user's password. Do not add the initial administrator password to Vercel unless there is a specific operational reason; the seed is not part of the deploy build.

## 5. Deploy and smoke-test

Deploy first to Preview, verify login and the main application flows, then promote/deploy to Production. After deployment, check:

- `https://<deployment-domain>/api/v1/health/database` returns `{"status":"ok","database":"connected"}`.
- Login sets the session cookie and protected pages load over HTTPS.
- Vercel function logs contain no database connection or native `argon2` loading errors.

If the database health check returns 503, verify the `DATABASE_URL` value and database network/access settings for that Vercel environment.

## Local preparation

Copy `.env.example` to `.env`, fill in the database URL, then run `npm ci`, `npm run db:deploy`, and `npm run build`. Keep `.env` out of version control.

## References

- [Analog deployment providers](https://analogjs.org/docs/features/deployment/providers)
- [Vercel environment variables](https://vercel.com/docs/projects/environment-variables)
