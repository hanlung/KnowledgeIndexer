import { Command } from 'commander';
import { join } from 'node:path';
import { loadConfig } from '../../config/loader.js';
import { createJsonStore } from '../../storage/json-store.js';
import { exportMarkdown } from '../../output/markdown-generator.js';
import { exportToYaml } from '../../storage/yaml-exporter.js';
import { runAction } from '../run-action.js';

type ExportFormat = 'md' | 'yaml' | 'both';

interface ExportOptions {
  readonly format: ExportFormat;
  readonly output: string;
}

export function createExportCommand(): Command {
  return new Command('export')
    .description('Export indexed knowledge to KNOWLEDGE.md or YAML')
    .argument('[source-id]', 'Source ID to export (exports all if omitted)')
    .option('-f, --format <format>', 'Output format (md, yaml, both)', 'md')
    .option('-o, --output <path>', 'Output directory', '.')
    .action(
      runAction(async (sourceId: string | undefined, opts: ExportOptions) => {
        const config = loadConfig();
        const store = createJsonStore(config.dataDir);

        const ids = sourceId ? [sourceId] : await store.list();

        if (ids.length === 0) {
          console.log('No indexed sources to export.');
          return;
        }

        for (const id of ids) {
          const index = await store.load(id);
          if (!index) {
            console.warn(`Source not found: ${id}`);
            continue;
          }

          const basePath = join(opts.output, index.source.name);

          if (opts.format === 'md' || opts.format === 'both') {
            const mdPath = `${basePath}.KNOWLEDGE.md`;
            await exportMarkdown(index, mdPath);
            console.log(`Exported: ${mdPath}`);
          }

          if (opts.format === 'yaml' || opts.format === 'both') {
            const yamlPath = `${basePath}.knowledge.yaml`;
            await exportToYaml(index, yamlPath);
            console.log(`Exported: ${yamlPath}`);
          }
        }
      }),
    );
}
