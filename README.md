# Scholia

Scholia is a private workspace for translating and annotating Latin and Ancient
Greek texts. It keeps source text, translation, grammar, commentary, and a
project-wide lemma index together.

## Features

- Clerk authentication and user-scoped projects
- Latin and Ancient Greek project types
- Editable chapters with UTF-8 `.txt` import and line numbering
- Debounced autosave with manual and keyboard save controls
- Word- and passage-level grammatical annotations and commentary
- Dynamic morphology fields based on part of speech
- Reusable base forms with a searchable occurrence index
- Annotation re-anchoring when source text changes
- Responsive desktop and mobile workspaces

## Local setup

Install dependencies:

```bash
pnpm install
```

Create `.env.local` with the keys from a Clerk application and a server-only
`NETLIFY_DB_URL` for Postgres. The Clerk CLI can configure the authentication
keys automatically with `clerk init`.

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). To run against Netlify's
local database environment instead, use `pnpm dlx netlify-cli dev` and apply
the migration in `netlify/database/migrations` with the Netlify CLI.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm build
```

The architecture, data flow, pseudocode, and edge-case decisions are documented
in [`docs/architecture.md`](docs/architecture.md).

## Deployment

The server-only data layer uses Netlify Database (managed Postgres). The schema
in `netlify/database/migrations` is applied by Netlify during deployment.

The database connection string must remain a Functions-scoped server variable.
Do not prefix it with `NEXT_PUBLIC_`, expose it to Client Components, or add it
to `SECRETS_SCAN_OMIT_KEYS`.
