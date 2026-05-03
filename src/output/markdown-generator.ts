import type { KnowledgeIndex } from '../types/index-schema.js';
import type { FunctionUnit } from '../types/function-unit.js';
import { renderHeader, renderFeatureSection, renderFooter } from './templates.js';
import { writeTextFile } from '../utils/filesystem.js';

function buildFunctionUnitMap(
  units: readonly FunctionUnit[],
): ReadonlyMap<string, FunctionUnit> {
  return new Map(units.map((u) => [u.id, u]));
}

export function generateMarkdown(index: KnowledgeIndex): string {
  const unitMap = buildFunctionUnitMap(index.functionUnits);
  const sections: string[] = [];

  sections.push(renderHeader(index.source));
  sections.push('## Features\n\n');

  for (const feature of index.features) {
    const featureUnits = feature.functionUnits
      .map((id) => unitMap.get(id))
      .filter((u): u is FunctionUnit => u !== undefined);

    sections.push(renderFeatureSection(feature, featureUnits));
  }

  sections.push(renderFooter(index));

  return sections.join('');
}

export async function exportMarkdown(
  index: KnowledgeIndex,
  outputPath: string,
): Promise<void> {
  const content = generateMarkdown(index);
  await writeTextFile(outputPath, content);
}
