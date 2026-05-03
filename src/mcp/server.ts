import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools.js';
import { logger } from '../utils/logger.js';

export async function startStdioServer(): Promise<void> {
  const mcp = new McpServer(
    { name: 'knowledge-indexer', version: '1.0.0' },
    {
      capabilities: { tools: {} },
      instructions:
        'Use index_source to ingest a repository, then query/show/export to retrieve the resulting summaries. Indexing is performed by the server using its own configured LLM (Anthropic or any OpenAI-compatible endpoint, including self-hosted Ollama/vLLM/LM Studio). Configure via ANTHROPIC_API_KEY, or OPENAI_BASE_URL + OPENAI_MODEL_ID (+ OPENAI_API_KEY for hosted providers).',
    },
  );

  registerTools(mcp);

  const transport = new StdioServerTransport();
  await mcp.connect(transport);
  logger.info('Knowledge Indexer MCP server listening on stdio');
}
