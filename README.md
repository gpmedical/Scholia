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

Copy `.env.example` to `.env.local` and add keys from a Clerk application. The
Clerk CLI can configure these automatically with `clerk init`.

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). SQLite data is stored in
`data/scholia.db`, which is intentionally ignored by Git.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The architecture, data flow, pseudocode, and edge-case decisions are documented
in [`docs/architecture.md`](docs/architecture.md).

## Deployment note

The included SQLite adapter is ideal for local or single-server deployments.
Before deploying to an ephemeral or multi-instance platform, replace the adapter
behind `lib/data-access.ts` with a durable SQL service while keeping the same
user-ownership checks.
