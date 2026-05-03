import { Command } from 'commander';
import { loadConfig } from '../../config/loader.js';
import { createJsonStore } from '../../storage/json-store.js';
import { runAction } from '../run-action.js';

export function createListCommand(): Command {
  return new Command('list')
    .description('List all indexed knowledge sources')
    .action(
      runAction(async () => {
        const config = loadConfig();
        const store = createJsonStore(config.dataDir);
        const sourceIds = await store.list();

        if (sourceIds.length === 0) {
          console.log('No indexed sources found.');
          return;
        }

        console.log('Indexed sources:\n');

        for (const sourceId of sourceIds) {
          const index = await store.load(sourceId);
          if (!index) continue;

          const { source } = index;
          console.log(`  ${source.id}  ${source.name}`);
          console.log(`    Type: ${source.metadata.type}`);
          console.log(`    URL: ${source.metadata.url}`);
          console.log(`    Last indexed: ${source.metadata.lastIndexedAt}`);
          console.log(
            `    Features: ${index.features.length}, Functions: ${index.functionUnits.length}`,
          );
          console.log();
        }
      }),
    );
}
