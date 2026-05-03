import { unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { KnowledgeIndex } from '../types/index-schema.js';
import { knowledgeIndexSchema } from '../types/index-schema.js';
import {
  readJsonFile,
  writeJsonFile,
  pathExists,
  listFiles,
} from '../utils/filesystem.js';
import { logger } from '../utils/logger.js';

export interface JsonStore {
  readonly dataDir: string;
  save(index: KnowledgeIndex): Promise<void>;
  load(sourceId: string): Promise<KnowledgeIndex | null>;
  list(): Promise<readonly string[]>;
  remove(sourceId: string): Promise<void>;
}

function indexPath(dataDir: string, sourceId: string): string {
  return join(dataDir, `${sourceId}.json`);
}

export function createJsonStore(dataDir: string): JsonStore {
  return {
    dataDir,

    async save(index: KnowledgeIndex): Promise<void> {
      const validated = knowledgeIndexSchema.parse(index);
      const filePath = indexPath(dataDir, validated.source.id);
      await writeJsonFile(filePath, validated);
      logger.info('Index saved', { sourceId: validated.source.id, path: filePath });
    },

    async load(sourceId: string): Promise<KnowledgeIndex | null> {
      const filePath = indexPath(dataDir, sourceId);
      if (!(await pathExists(filePath))) {
        return null;
      }
      const raw = await readJsonFile<unknown>(filePath);
      return knowledgeIndexSchema.parse(raw);
    },

    async list(): Promise<readonly string[]> {
      if (!(await pathExists(dataDir))) return [];
      const files = await listFiles(dataDir);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => basename(f, '.json'));
    },

    async remove(sourceId: string): Promise<void> {
      const filePath = indexPath(dataDir, sourceId);
      if (await pathExists(filePath)) {
        await unlink(filePath);
        logger.info('Index removed', { sourceId });
      }
    },
  };
}
