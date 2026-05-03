import { stringify } from 'yaml';
import type { KnowledgeIndex } from '../types/index-schema.js';
import { writeTextFile } from '../utils/filesystem.js';

export function indexToYaml(index: KnowledgeIndex): string {
  return stringify(index, { lineWidth: 120 });
}

export async function exportToYaml(
  index: KnowledgeIndex,
  outputPath: string,
): Promise<void> {
  const content = indexToYaml(index);
  await writeTextFile(outputPath, content);
}
