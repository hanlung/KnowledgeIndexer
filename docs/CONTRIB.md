# Contributing Guide

## Prerequisites

- Node.js >= 20
- npm (ships with Node)
- One configured LLM provider (see [Environment Variables](#environment-variables))

## Setup

```bash
git clone <repo-url>
cd KnowledgeIndexer
npm install
cp .env.example .env   # edit with your provider credentials
```

## Available Scripts

| Script | Command | Description |
| --- | --- | --- |
| `build` | `tsc` | Compile TypeScript to `dist/` |
| `dev` | `tsx src/index.ts` | Run CLI from source (no build step) |
| `test` | `vitest run` | Run unit tests once |
| `test:watch` | `vitest` | Run tests in watch mode |
| `test:coverage` | `vitest run --coverage` | Run tests with V8 coverage report |
| `lint` | `eslint src/` | Lint source files |
| `format` | `prettier --write 'src/**/*.ts'` | Auto-format source files |

## Development Workflow

1. **Run from source** during development (no build needed):
   ```bash
   npm run dev -- index ./some-repo
   npm run dev -- query "auth"
   ```

2. **Run tests** before committing:
   ```bash
   npm test
   ```

3. **Type-check** without emitting:
   ```bash
   npx tsc --noEmit
   ```

4. **Build** when preparing a release or testing the `ki` binary:
   ```bash
   npm run build
   npm link   # makes `ki` available globally
   ```

## Project Structure

```
src/
  cli/commands/   CLI entrypoints (commander)
  config/         Config loader & defaults
  connectors/     Source adapters (git, future: confluence, jira)
  indexer/        Orchestration & diff detection
  mcp/            MCP server tools
  output/         Markdown/template rendering
  storage/        JSON persistence & YAML export
  summarizer/     LLM client abstraction (Anthropic + OpenAI-compat)
  types/          Zod schemas & derived TypeScript types
  utils/          Logger, filesystem, validation helpers
tests/
  unit/<area>/    Colocated unit tests by module
scripts/
  smoke-mcp.ts    MCP server smoke test
```

## Testing

- Framework: **Vitest** (v2)
- Coverage provider: **V8**
- Coverage includes: `src/**/*.ts` (excludes `src/index.ts` and `src/types/**`)
- Test location: `tests/unit/<module-area>/<file>.test.ts`

Run a specific test file:
```bash
npx vitest run tests/unit/summarizer/llm-factory.test.ts
```

## Environment Variables

### Provider Selection

| Variable | Default | Description |
| --- | --- | --- |
| `KI_LLM_PROVIDER` | _(inferred)_ | `anthropic` or `openai`. Inferred as `openai` if `OPENAI_BASE_URL` or `OPENAI_API_KEY` is set; otherwise `anthropic`. |

### Anthropic Provider

| Variable | Default | Description |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | — | API key for Claude |
| `ANTHROPIC_AUTH_TOKEN` | — | Alternative credential (e.g. for proxy gateways) |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | Override for self-hosted Anthropic-compatible proxy |
| `KI_ANTHROPIC_MODEL_ID` | `claude-sonnet-4-20250514` | Model ID (legacy `KI_MODEL_ID` still honored) |

### OpenAI-Compatible Provider

| Variable | Default | Description |
| --- | --- | --- |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Base URL for chat completions |
| `OPENAI_MODEL_ID` | `gpt-4o-mini` | Model ID (alias: `KI_OPENAI_MODEL_ID`) |
| `OPENAI_API_KEY` | _(empty)_ | Bearer token; omit for auth-free self-hosted servers |

### Pipeline Options

| Variable | Default | Description |
| --- | --- | --- |
| `KI_DATA_DIR` | `.data/indices` | Index JSON storage directory |
| `KI_MAX_CONCURRENT` | `5` | Max concurrent LLM requests |
| `KI_OUTPUT_FORMAT` | `json` | `json`, `yaml`, or `both` |
| `KI_MARKDOWN_PATH` | `KNOWLEDGE.md` | Default markdown output path |

## Code Style

- TypeScript strict mode, ES2022 target
- ESM modules (`"type": "module"` in package.json)
- Prettier for formatting, ESLint for linting
- Zod schemas are the source of truth for types (derived via `z.infer`)
