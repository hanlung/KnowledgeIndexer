import { Command } from 'commander';
import { loadConfig } from '../../config/loader.js';
import { createJsonStore } from '../../storage/json-store.js';
import { runAction } from '../run-action.js';

interface QueryOptions {
  readonly source?: string;
}

export function createQueryCommand(): Command {
  return new Command('query')
    .description('Search across indexed knowledge')
    .argument('<term>', 'Search term')
    .option('-s, --source <id>', 'Limit search to a specific source')
    .action(
      runAction(async (term: string, opts: QueryOptions) => {
        const config = loadConfig();
        const store = createJsonStore(config.dataDir);
        const lowerTerm = term.toLowerCase();

        const ids = opts.source ? [opts.source] : await store.list();

        if (ids.length === 0) {
          console.log('No indexed sources to search.');
          return;
        }

        let totalMatches = 0;

        for (const id of ids) {
          const index = await store.load(id);
          if (!index) continue;

          const matchedFeatures = index.features.filter(
            (f) =>
              f.name.toLowerCase().includes(lowerTerm) ||
              f.summary.toLowerCase().includes(lowerTerm),
          );

          const matchedUnits = index.functionUnits.filter(
            (u) =>
              u.name.toLowerCase().includes(lowerTerm) ||
              u.description.toLowerCase().includes(lowerTerm),
          );

          if (matchedFeatures.length > 0 || matchedUnits.length > 0) {
            console.log(`\n--- ${index.source.name} ---\n`);
          }

          for (const feature of matchedFeatures) {
            console.log(`  [Feature] ${feature.name}`);
            console.log(`    ${feature.summary}`);
            totalMatches++;
          }

          for (const unit of matchedUnits) {
            const file = unit.metadata.filePath ?? '';
            const line = unit.metadata.lineStart
              ? `:${unit.metadata.lineStart}`
              : '';
            console.log(`  [${unit.metadata.kind}] ${unit.name}`);
            console.log(`    ${unit.description}`);
            if (file) console.log(`    ${file}${line}`);
            totalMatches++;
          }
        }

        if (totalMatches === 0) {
          console.log(`No results found for "${term}".`);
        } else {
          console.log(`\n${totalMatches} result(s) found.`);
        }
      }),
    );
}
