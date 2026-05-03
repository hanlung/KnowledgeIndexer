import type { KnowledgeIndex } from '../types/index-schema.js';
import type { SourceMetadata } from '../types/source.js';

export interface DiffResult {
  readonly hasChanges: boolean;
  readonly reason: string;
}

export function detectChanges(
  existing: KnowledgeIndex | null,
  currentMetadata: SourceMetadata,
): DiffResult {
  if (!existing) {
    return { hasChanges: true, reason: 'No existing index found' };
  }

  const existingVersion = existing.source.metadata.version;
  const currentVersion = currentMetadata.version;

  if (!existingVersion || !currentVersion) {
    return { hasChanges: true, reason: 'Version info unavailable, re-indexing' };
  }

  if (existingVersion !== currentVersion) {
    return {
      hasChanges: true,
      reason: `Version changed: ${existingVersion} -> ${currentVersion}`,
    };
  }

  return { hasChanges: false, reason: 'No changes detected' };
}
