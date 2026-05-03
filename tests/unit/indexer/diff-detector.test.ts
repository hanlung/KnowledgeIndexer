import { describe, it, expect } from 'vitest';
import { detectChanges } from '../../../src/indexer/diff-detector.js';
import type { KnowledgeIndex } from '../../../src/types/index-schema.js';
import type { SourceMetadata } from '../../../src/types/source.js';

function createMetadata(version?: string): SourceMetadata {
  return {
    url: '/test',
    type: 'git',
    lastIndexedAt: '2026-05-02T10:00:00Z',
    version,
  };
}

function createIndex(version?: string): KnowledgeIndex {
  return {
    version: '1.0.0',
    createdAt: '2026-05-02T10:00:00Z',
    updatedAt: '2026-05-02T10:00:00Z',
    source: {
      id: 'test',
      name: 'test',
      summary: 'test',
      metadata: createMetadata(version),
      features: [],
    },
    features: [],
    functionUnits: [],
  };
}

describe('detectChanges', () => {
  it('should detect changes when no existing index', () => {
    const result = detectChanges(null, createMetadata('abc'));
    expect(result.hasChanges).toBe(true);
  });

  it('should detect no changes when versions match', () => {
    const result = detectChanges(createIndex('abc'), createMetadata('abc'));
    expect(result.hasChanges).toBe(false);
  });

  it('should detect changes when versions differ', () => {
    const result = detectChanges(createIndex('abc'), createMetadata('def'));
    expect(result.hasChanges).toBe(true);
    expect(result.reason).toContain('abc');
    expect(result.reason).toContain('def');
  });

  it('should re-index when version info unavailable', () => {
    const result = detectChanges(createIndex(undefined), createMetadata('abc'));
    expect(result.hasChanges).toBe(true);
  });
});
