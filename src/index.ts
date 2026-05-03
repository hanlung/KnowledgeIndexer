#!/usr/bin/env node

import { Command } from 'commander';
import { createIndexCommand } from './cli/commands/index-command.js';
import { createListCommand } from './cli/commands/list-command.js';
import { createQueryCommand } from './cli/commands/query-command.js';
import { createExportCommand } from './cli/commands/export-command.js';
import { createShowCommand } from './cli/commands/show-command.js';
import { createMcpCommand } from './cli/commands/mcp-command.js';

const program = new Command();

program
  .name('ki')
  .description('Knowledge Indexer - Index knowledge sources for AI agents')
  .version('1.0.0');

program.addCommand(createIndexCommand());
program.addCommand(createListCommand());
program.addCommand(createQueryCommand());
program.addCommand(createExportCommand());
program.addCommand(createShowCommand());
program.addCommand(createMcpCommand());

program.parse();
