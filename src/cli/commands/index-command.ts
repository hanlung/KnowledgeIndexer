import { Command } from 'commander';
import { resolve } from 'node:path';
import { loadConfig } from '../../config/loader.js';
import { createJsonStore } from '../../storage/json-store.js';
import { pickClient } from '../../summarizer/llm-factory.js';
import { createRateLimiter } from '../../summarizer/rate-limiter.js';
import { createGitConnector } from '../../connectors/git/git-connector.js';
import { runPipeline } from '../../indexer/indexing-pipeline.js';
import { exportMarkdown } from '../../output/markdown-generator.js';
import { exportToYaml } from '../../storage/yaml-exporter.js';
import { setLogLevel } from '../../utils/logger.js';
import { runAction } from '../run-action.js';
import type { Connector } from '../../types/connector.js';
import type { SourceType } from '../../types/source.js';

const REQUESTS_PER_MINUTE = 50;

interface IndexOptions {
  readonly type: SourceType;
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
  readonly output?: string;
  readonly dryRun: boolean;
  readonly force: boolean;
  readonly verbose: boolean;
}

function getConnector(type: SourceType): Connector {
  switch (type) {
    case 'git':
      return createGitConnector();
    default:
      throw new Error(`Unsupported source type: ${type}`);
  }
}

export function createIndexCommand(): Command {
  return new Command('index')
    .description('Index a knowledge source')
    .argument('<target>', 'Path or URL to the knowledge source')
    .option('-t, --type <type>', 'Source type (git, confluence, jira)', 'git')
    .option('--include <patterns...>', 'Glob patterns to include')
    .option('--exclude <patterns...>', 'Glob patterns to exclude')
    .option('-o, --output <path>', 'Output path for KNOWLEDGE.md')
    .option('--dry-run', 'Scan without calling Claude API', false)
    .option('--force', 'Re-index even if no changes detected', false)
    .option('-v, --verbose', 'Enable verbose logging', false)
    .action(
      runAction(async (target: string, opts: IndexOptions) => {
        if (opts.verbose) setLogLevel('debug');

        const config = loadConfig();
        const connector = getConnector(opts.type);
        const store = createJsonStore(config.dataDir);
        const client = pickClient(config.llm);
        const rateLimiter = createRateLimiter(REQUESTS_PER_MINUTE);

        const result = await runPipeline(resolve(target), {
          connector,
          store,
          client,
          rateLimiter,
          maxConcurrent: config.maxConcurrentSummarizations,
          scanOptions: { include: opts.include, exclude: opts.exclude },
          force: opts.force,
          dryRun: opts.dryRun,
        });

        if (result.stats.skipped) {
          console.log('No changes detected. Use --force to re-index.');
          return;
        }

        const mdPath = opts.output ?? config.markdownOutputPath;
        await exportMarkdown(result.index, mdPath);
        console.log(`KNOWLEDGE.md written to ${mdPath}`);

        if (config.outputFormat === 'yaml' || config.outputFormat === 'both') {
          const yamlPath = mdPath.replace(/\.md$/, '.yaml');
          await exportToYaml(result.index, yamlPath);
          console.log(`YAML exported to ${yamlPath}`);
        }

        console.log(
          `Indexed ${result.stats.features} features, ${result.stats.functionUnits} code elements`,
        );
      }),
    );
}
