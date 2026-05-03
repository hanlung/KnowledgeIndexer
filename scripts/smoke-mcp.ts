/**
 * End-to-end smoke test for the Knowledge Indexer MCP server.
 *
 * Spawns `node dist/index.js mcp` as a child, connects an MCP Client over
 * stdio, registers a deterministic local sampling handler (so no real LLM is
 * required), then exercises the tool surface against a real repository.
 *
 *   npx tsx scripts/smoke-mcp.ts <target-path>
 */

import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CreateMessageRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const TARGET = process.argv[2];
if (!TARGET) {
  console.error('Usage: tsx scripts/smoke-mcp.ts <target-path>');
  process.exit(2);
}

// Honor stable paths from the environment when set; fall back to scratch
// directories under the OS tmp dir so quick smoke runs don't litter the disk.
const dataDir = process.env.KI_DATA_DIR
  ? (mkdirSync(process.env.KI_DATA_DIR, { recursive: true }), process.env.KI_DATA_DIR)
  : mkdtempSync(join(tmpdir(), 'ki-smoke-'));
const outDir = process.env.KI_OUT_DIR
  ? (mkdirSync(process.env.KI_OUT_DIR, { recursive: true }), process.env.KI_OUT_DIR)
  : mkdtempSync(join(tmpdir(), 'ki-smoke-out-'));

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['dist/index.js', 'mcp'],
  env: {
    ...process.env,
    KI_DATA_DIR: dataDir,
    // Force the sampling path even though we have no real key here.
    ANTHROPIC_API_KEY: '',
  },
  stderr: 'inherit',
});

const client = new Client(
  { name: 'ki-smoke', version: '1.0.0' },
  { capabilities: { sampling: {} } },
);

// Mock LLM: return a deterministic pseudo-summary derived from the prompt's
// last 80 chars. Good enough to exercise the pipeline end-to-end.
let samplingCalls = 0;
client.setRequestHandler(CreateMessageRequestSchema, async (request) => {
  samplingCalls += 1;
  const last = request.params.messages.at(-1);
  const promptText =
    last?.content && 'text' in last.content ? last.content.text : '';
  const head = promptText.slice(0, 64).replace(/\s+/g, ' ').trim();
  return {
    model: 'mock-llm',
    role: 'assistant',
    content: {
      type: 'text',
      text: `[mock summary] ${head.slice(0, 64)}`,
    },
  };
});

async function main(): Promise<void> {
  await client.connect(transport);

  const tools = await client.listTools();
  console.log(
    `\n[smoke] connected. ${tools.tools.length} tools:`,
    tools.tools.map((t) => t.name).join(', '),
  );

  console.log(`\n[smoke] index_source ${TARGET}`);
  const t0 = Date.now();
  const indexResult = await client.callTool(
    {
      name: 'index_source',
      arguments: { target: TARGET, force: true },
    },
    undefined,
    { timeout: 5 * 60 * 1000 },
  );
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[smoke] indexed in ${elapsed}s, sampling calls: ${samplingCalls}`);
  printToolResult(indexResult);

  console.log('\n[smoke] list_sources');
  printToolResult(await client.callTool({ name: 'list_sources', arguments: {} }));

  // Pull the source id back out of the listing for show_source.
  const list = await client.callTool({ name: 'list_sources', arguments: {} });
  const sourceId = extractFirstSourceId(list);
  if (sourceId) {
    console.log(`\n[smoke] show_source ${sourceId}`);
    printToolResult(
      await client.callTool({
        name: 'show_source',
        arguments: { sourceId },
      }),
    );
  }

  console.log('\n[smoke] query "class"');
  printToolResult(
    await client.callTool({ name: 'query', arguments: { term: 'class' } }),
  );

  console.log(`\n[smoke] export_source format=md output=${outDir}`);
  printToolResult(
    await client.callTool({
      name: 'export_source',
      arguments: { format: 'md', output: outDir },
    }),
  );

  await client.close();
  console.log(`\n[smoke] done. data=${dataDir} out=${outDir}`);
}

interface ToolResult {
  readonly content: ReadonlyArray<{ readonly type: string; readonly text?: string }>;
}

function printToolResult(result: unknown): void {
  const r = result as ToolResult;
  for (const part of r.content) {
    if (part.type === 'text' && part.text) {
      const lines = part.text.split('\n');
      const preview = lines.slice(0, 30).join('\n');
      console.log(preview);
      if (lines.length > 30) console.log(`... (+${lines.length - 30} lines)`);
    }
  }
}

function extractFirstSourceId(result: unknown): string | null {
  const r = result as ToolResult;
  const text = r.content[0]?.text ?? '';
  const firstLine = text.split('\n')[0] ?? '';
  const id = firstLine.split(/\s+/)[0];
  return id && id !== 'No' ? id : null;
}

main().catch((err) => {
  console.error('[smoke] failed:', err);
  process.exit(1);
});
