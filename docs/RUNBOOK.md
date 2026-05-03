# Runbook

Operational guide for deploying, monitoring, and troubleshooting Knowledge Indexer.

## Deployment

### As a CLI tool

```bash
npm install
npm run build
npm link          # installs `ki` globally
ki index ./repo   # verify it works
```

### As an MCP server

Register in your MCP host's config (e.g. Claude Code `settings.json`):

```json
{
  "mcpServers": {
    "knowledge-indexer": {
      "command": "node",
      "args": ["<path-to>/dist/index.js", "mcp"],
      "env": {
        "OPENAI_BASE_URL": "http://localhost:11434/v1",
        "OPENAI_MODEL_ID": "llama3.1"
      }
    }
  }
}
```

The MCP server uses its own LLM — the host's LLM is not invoked.

### Self-hosted LLM configurations

**Ollama (OpenAI-compatible path):**
```bash
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL_ID=llama3.1
```

**Anthropic-compatible proxy (e.g. LiteLLM proxy, custom gateway):**
```bash
export ANTHROPIC_BASE_URL=http://your-proxy:4000
export ANTHROPIC_AUTH_TOKEN=your-proxy-token
export KI_ANTHROPIC_MODEL_ID=your-model-id
```

**vLLM / LM Studio:**
```bash
export OPENAI_BASE_URL=http://localhost:8000/v1
export OPENAI_MODEL_ID=your-model-name
```

## Monitoring

### Logs

The tool logs to stderr via the built-in logger (`src/utils/logger.ts`). Key log events:

| Level | Event | Meaning |
| --- | --- | --- |
| `INFO` | `Index saved` | A source was successfully indexed and persisted |
| `INFO` | `Index removed` | A stale index was cleaned up |
| `WARN` | `OpenAI-compatible attempt N failed` | Retryable LLM call failure |
| `WARN` | `Claude API attempt N failed` | Retryable Anthropic call failure |
| `ERROR` | `NoLlmAvailableError` | No valid credentials configured |

### Health checks

```bash
ki list              # should return indexed sources (or empty list)
ki index . --dry-run # validates scanning without LLM calls
```

## Common Issues

### `NoLlmAvailableError: No LLM available`

**Cause:** Neither provider has valid credentials.

**Fix:**
- For Anthropic: set `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN`
- For OpenAI-compatible: set `OPENAI_BASE_URL`
- Check `.env` is loaded (or export vars in shell)

### `OpenAI-compatible endpoint 429: rate limited`

**Cause:** Too many concurrent requests to the LLM endpoint.

**Fix:**
- Reduce `KI_MAX_CONCURRENT` (default 5)
- If self-hosted, increase model server capacity

### `OpenAI-compatible endpoint failed after 3 attempts`

**Cause:** LLM server unreachable or returning errors.

**Fix:**
- Verify `OPENAI_BASE_URL` is correct and server is running
- Check network/firewall between indexer and LLM server
- Test with: `curl $OPENAI_BASE_URL/models`

### `Anthropic provider selected but neither ANTHROPIC_API_KEY nor ANTHROPIC_AUTH_TOKEN is set`

**Cause:** Provider inferred as `anthropic` but no credentials provided.

**Fix:**
- Set `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN`
- Or switch to OpenAI-compatible by setting `OPENAI_BASE_URL`

### Index not updating on re-run

**Cause:** Diff detection found no changes since last index.

**Fix:**
- Use `ki index <target> --force` to bypass diff detection
- Check that the source files actually changed (git status)

### `ENOENT` or path errors

**Cause:** `KI_DATA_DIR` directory doesn't exist or path is wrong.

**Fix:**
- The tool creates `KI_DATA_DIR` automatically; check permissions
- Verify `KI_DATA_DIR` is writable

## Rollback

### Reverting a bad index

Index files are JSON stored in `KI_DATA_DIR` (default `.data/indices/`). Each source gets one file named `<source-id>.json`.

```bash
# List what's indexed
ki list

# Remove a specific source index
rm .data/indices/<source-id>.json

# Re-index cleanly
ki index <target> --force
```

### Reverting generated output

`KNOWLEDGE.md` (or custom `KI_MARKDOWN_PATH`) is regenerated on every `ki index` or `ki export` run. To revert:

```bash
git checkout -- KNOWLEDGE.md
```

Or re-export from existing (good) index data without re-running the pipeline:

```bash
ki export <source-id>
```

## Performance Tuning

| Knob | Effect |
| --- | --- |
| `KI_MAX_CONCURRENT` | Higher = faster indexing, more LLM load |
| Model choice | Smaller models (haiku, llama3.1-8b) are faster but less accurate |
| `--exclude` patterns | Skip test files, generated code to reduce volume |
| `--dry-run` | Validate scanning pipeline without LLM cost |
