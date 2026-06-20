# Contributing to Uznir

Thanks for your interest in contributing! This guide will help you get started.

## Getting started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally.
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Set up environment:**
   ```bash
   cp .env.example .env.local
   # Fill in your Supabase credentials
   ```
5. **Push database schema:**
   ```bash
   npx supabase db push
   ```
6. **Run the dev server:**
   ```bash
   npm run dev
   ```

## Development workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes.
3. Run type-check and lint:
   ```bash
   npm run type-check
   npm run lint
   ```
4. If you changed the database, create a migration:
   ```bash
   npm run db:generate "your change description"
   ```
5. Commit with a descriptive message:
   ```
   feat: add worker profile bio field
   fix: correct RLS policy for messages
   docs: update roadmap with M1 timeline
   ```
6. Push and open a Pull Request.

## Commit message format

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style (formatting, no logic change)
- `refactor:` Code restructuring (no behavior change)
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Tooling, configs, dependencies

## Code style

- **TypeScript strict mode** — no `any`, no type assertions unless absolutely necessary.
- **Server Components by default** — add `'use client'` only when needed (interactivity, hooks, browser APIs).
- **RLS on every table** — never bypass RLS with service-role key on the client.
- **Shared zod schemas** — validate on both client and server with the same schema.
- **Import alias** — use `@/` for all imports.

Read [AGENTS.md](./AGENTS.md) for the full set of architecture rules and conventions.

## Database changes

- All schema changes go through Supabase migrations.
- Use `npm run db:generate "description"` to create a new migration file.
- Include RLS policies for any new or modified tables.
- After pushing migrations, regenerate types: `npm run db:types`.
- Seed data for dev/testing goes in `supabase/seed.sql`.

## Pull request checklist

- [ ] Code compiles (`npm run type-check` passes)
- [ ] Lint passes (`npm run lint` passes)
- [ ] Database migrations are included if needed
- [ ] RLS policies are tested if tables were modified
- [ ] Documentation is updated if needed
- [ ] No secrets or `.env.local` committed

## Reporting issues

Use GitHub Issues with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment info (OS, browser, Node version)

## Questions?

Open a GitHub Discussion or reach out to the maintainers.
