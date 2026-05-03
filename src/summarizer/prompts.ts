import type { RawFunctionUnit, RawFeature } from '../types/connector.js';

export function buildFunctionUnitPrompt(unit: RawFunctionUnit): string {
  const parts = [
    'Describe the following code element in 1-2 concise sentences.',
    'Focus on what it does, its purpose, and any notable behavior.',
    'Do not include code snippets in your response.',
    '',
    `Name: ${unit.name}`,
    `Kind: ${unit.kind}`,
  ];

  if (unit.signature) {
    parts.push(`Signature: ${unit.signature}`);
  }

  parts.push('', 'Source:', '```', unit.content, '```');

  return parts.join('\n');
}

export function buildFeaturePrompt(
  feature: RawFeature,
  unitSummaries: readonly string[],
): string {
  const parts = [
    'Summarize the following feature/module in 2-3 concise sentences.',
    'Describe its purpose, main capabilities, and how its components work together.',
    '',
    `Feature: ${feature.name}`,
    `Path: ${feature.path}`,
    '',
    'Components:',
  ];

  for (const summary of unitSummaries) {
    parts.push(`- ${summary}`);
  }

  if (feature.content) {
    parts.push('', 'Additional context:', feature.content);
  }

  return parts.join('\n');
}

export function buildSourcePrompt(
  sourceName: string,
  featureSummaries: readonly string[],
): string {
  const parts = [
    'Provide a high-level summary of this project/repository in 2-4 sentences.',
    'Describe its purpose, main capabilities, and target audience.',
    '',
    `Project: ${sourceName}`,
    '',
    'Features:',
  ];

  for (const summary of featureSummaries) {
    parts.push(`- ${summary}`);
  }

  return parts.join('\n');
}
