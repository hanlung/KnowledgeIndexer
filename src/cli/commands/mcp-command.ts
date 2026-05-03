import { Command } from 'commander';
import { startStdioServer } from '../../mcp/server.js';
import { runAction } from '../run-action.js';

export function createMcpCommand(): Command {
  return new Command('mcp')
    .description(
      'Start the Knowledge Indexer as an MCP server over stdio. ' +
        'Connect from Claude Code or another MCP-aware host.',
    )
    .action(
      runAction(async () => {
        await startStdioServer();
        // The server runs until the transport closes; resolve when it does.
      }),
    );
}
