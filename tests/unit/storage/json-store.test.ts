import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createJsonStore } from '../../../src/storage/json-store.js';
import type { KnowledgeIndex } from '../../../src/types/index-schema.js';

function createTestIndex(sourceId: string): KnowledgeIndex {
  return {
    version: '1.0.0',
    createdAt: '2026-05-02T10:00:00Z',
    updatedAt: '2026-05-02T10:00:00Z',
    source: {
      id: sourceId,
      name: 'test-project',
      summary: 'A test project',
      metadata: {
        url: '/test',
        type: 'git',
        lastIndexedAt: '2026-05-02T10:00:00Z',
      },
      features: ['feat-1'],
    },
    features: [
      {
        id: 'feat-1',
        name: 'Feature',
        summary: 'A feature',
        metadata: { sourceId },
        functionUnits: ['fu-1'],
      },
    ],
    functionUnits: [
      {
        id: 'fu-1',
        name: 'testFn',
        description: 'A test function',
        metadata: { featureId: 'feat-1', kind: 'function' },
      },
    ],
  };
}

describe('JsonStore', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'ki-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('should save and load an index', async () => {
    const store = createJsonStore(tmpDir);
    const index = createTestIndex('src-1');

    await store.save(index);
    const loaded = await store.load('src-1');

    expect(loaded).not.toBeNull();
    expect(loaded!.source.name).toBe('test-project');
    expect(loaded!.features).toHaveLength(1);
    expect(loaded!.functionUnits).toHaveLength(1);
  });

  it('should return null for non-existent source', async () => {
    const store = createJsonStore(tmpDir);
    const loaded = await store.load('nonexistent');
    expect(loaded).toBeNull();
  });

  it('should list saved indices', async () => {
    const store = createJsonStore(tmpDir);
    await store.save(createTestIndex('src-1'));
    await store.save(createTestIndex('src-2'));

    const ids = await store.list();
    expect(ids).toHaveLength(2);
    expect(ids).toContain('src-1');
    expect(ids).toContain('src-2');
  });

  it('should return empty list for empty directory', async () => {
    const store = createJsonStore(join(tmpDir, 'empty'));
    const ids = await store.list();
    expect(ids).toHaveLength(0);
  });

  it('should remove an index', async () => {
    const store = createJsonStore(tmpDir);
    await store.save(createTestIndex('src-1'));
    await store.remove('src-1');

    const loaded = await store.load('src-1');
    expect(loaded).toBeNull();
  });
});
