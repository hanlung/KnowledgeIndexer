import { dirname, relative, sep } from 'node:path';
import type { RawFeature, RawFunctionUnit } from '../../types/connector.js';
import type { ParsedFile } from './git-types.js';

function getFeatureGroup(filePath: string, basePath: string): string {
  const rel = relative(basePath, filePath);
  const parts = rel.split(sep);

  // If file is in a src/ directory, use the next level
  if (parts[0] === 'src' && parts.length > 2) {
    return parts[1];
  }

  // If file is in a lib/ directory, use the next level
  if (parts[0] === 'lib' && parts.length > 2) {
    return parts[1];
  }

  // If file is in a package (monorepo), use package name
  if (parts[0] === 'packages' && parts.length > 2) {
    return parts[1];
  }

  // Use the first directory as the feature group
  if (parts.length > 1) {
    return parts[0];
  }

  // Root-level files go into a "root" feature
  return 'root';
}

function parsedFileToRawUnits(
  parsed: ParsedFile,
): readonly RawFunctionUnit[] {
  return parsed.elements.map((element) => ({
    name: element.name,
    kind: element.kind,
    filePath: parsed.filePath,
    lineStart: element.lineStart,
    lineEnd: element.lineEnd,
    content: element.content,
    signature: element.signature,
  }));
}

export function groupIntoFeatures(
  parsedFiles: readonly ParsedFile[],
  basePath: string,
): readonly RawFeature[] {
  const featureMap = new Map<
    string,
    { units: RawFunctionUnit[]; paths: Set<string> }
  >();

  for (const parsed of parsedFiles) {
    const group = getFeatureGroup(parsed.filePath, basePath);
    const existing = featureMap.get(group) ?? {
      units: [],
      paths: new Set<string>(),
    };

    const units = parsedFileToRawUnits(parsed);
    const updatedUnits = [...existing.units, ...units];
    const updatedPaths = new Set([
      ...existing.paths,
      dirname(relative(basePath, parsed.filePath)),
    ]);

    featureMap.set(group, { units: updatedUnits, paths: updatedPaths });
  }

  return [...featureMap.entries()]
    .filter(([, data]) => data.units.length > 0)
    .map(([name, data]) => ({
      name,
      path: [...data.paths].sort().join(', '),
      rawFunctionUnits: data.units,
    }));
}
