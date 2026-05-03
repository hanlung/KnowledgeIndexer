import { Command } from 'commander';
import { loadConfig } from '../../config/loader.js';
import { createJsonStore } from '../../storage/json-store.js';
import { runAction } from '../run-action.js';

export function createShowCommand(): Command {
  return new Command('show')
    .description('Show details of an indexed source')
    .argument('<source-id>', 'Source ID to show')
    .action(
      runAction(async (sourceId: string) => {
        const config = loadConfig();
        const store = createJsonStore(config.dataDir);
        const index = await store.load(sourceId);

        if (!index) {
          throw new Error(`Source not found: ${sourceId}`);
        }

        const { source } = index;
        console.log(`\nSource: ${source.name} (${source.id})`);
        console.log(`Summary: ${source.summary}`);
        console.log(`Type: ${source.metadata.type}`);
        console.log(`URL: ${source.metadata.url}`);
        console.log(`Version: ${source.metadata.version ?? 'N/A'}`);
        console.log(`Last Indexed: ${source.metadata.lastIndexedAt}`);
        console.log(`\nFeatures (${index.features.length}):`);

        for (const feature of index.features) {
          const unitCount = feature.functionUnits.length;
          console.log(`\n  ${feature.name} (${unitCount} elements)`);
          console.log(`    ${feature.summary}`);

          if (feature.metadata.path) {
            console.log(`    Path: ${feature.metadata.path}`);
          }
        }

        console.log(
          `\nTotal: ${index.features.length} features, ${index.functionUnits.length} code elements`,
        );
      }),
    );
}
