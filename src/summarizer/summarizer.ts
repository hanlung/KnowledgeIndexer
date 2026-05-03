import pLimit from 'p-limit';
import type { ConnectorScanResult, RawFeature, RawFunctionUnit } from '../types/connector.js';
import type { Source, SourceMetadata } from '../types/source.js';
import type { Feature } from '../types/feature.js';
import type { FunctionUnit } from '../types/function-unit.js';
import type { LlmClient } from './llm-client.js';
import type { RateLimiter } from './rate-limiter.js';
import {
  buildFunctionUnitPrompt,
  buildFeaturePrompt,
  buildSourcePrompt,
} from './prompts.js';
import { generateId } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

export interface SummarizationResult {
  readonly source: Source;
  readonly features: readonly Feature[];
  readonly functionUnits: readonly FunctionUnit[];
}

export interface SummarizerOptions {
  readonly client: LlmClient;
  readonly rateLimiter: RateLimiter;
  readonly maxConcurrent: number;
}

interface FeatureSummary {
  readonly feature: Feature;
  readonly units: readonly FunctionUnit[];
}

async function summarizeFunctionUnit(
  raw: RawFunctionUnit,
  featureId: string,
  client: LlmClient,
  rateLimiter: RateLimiter,
): Promise<FunctionUnit> {
  await rateLimiter.acquire();
  const description = await client.summarize(buildFunctionUnitPrompt(raw));

  return {
    id: generateId(`${featureId}-${raw.name}-${raw.filePath ?? ''}`),
    name: raw.name,
    description: description.trim(),
    signature: raw.signature,
    metadata: {
      featureId,
      filePath: raw.filePath,
      lineStart: raw.lineStart,
      lineEnd: raw.lineEnd,
      kind: raw.kind,
    },
  };
}

async function summarizeFeature(
  raw: RawFeature,
  sourceId: string,
  client: LlmClient,
  rateLimiter: RateLimiter,
  limit: ReturnType<typeof pLimit>,
): Promise<FeatureSummary> {
  const featureId = generateId(`${sourceId}-${raw.name}`);

  const units = await Promise.all(
    raw.rawFunctionUnits.map((rawUnit) =>
      limit(() => summarizeFunctionUnit(rawUnit, featureId, client, rateLimiter)),
    ),
  );

  const unitSummaries = units.map((u) => `${u.name}: ${u.description}`);

  await rateLimiter.acquire();
  const summary = await client.summarize(buildFeaturePrompt(raw, unitSummaries));

  const feature: Feature = {
    id: featureId,
    name: raw.name,
    summary: summary.trim(),
    metadata: { sourceId, path: raw.path },
    functionUnits: units.map((u) => u.id),
  };

  logger.info(`Summarized feature: ${feature.name}`, { units: units.length });

  return { feature, units };
}

export async function summarize(
  scanResult: ConnectorScanResult,
  sourceMetadata: SourceMetadata,
  sourceName: string,
  options: SummarizerOptions,
): Promise<SummarizationResult> {
  const { client, rateLimiter, maxConcurrent } = options;
  const limit = pLimit(maxConcurrent);
  const sourceId = generateId(`${sourceMetadata.url}-${sourceMetadata.type}`);

  logger.info('Starting summarization', {
    features: scanResult.rawFeatures.length,
    totalUnits: scanResult.rawFeatures.reduce(
      (sum, f) => sum + f.rawFunctionUnits.length,
      0,
    ),
  });

  // Sequential per feature so we can build a composite prompt for the source
  // summary using already-summarized features.
  const featureResults: FeatureSummary[] = [];
  for (const rawFeature of scanResult.rawFeatures) {
    featureResults.push(
      await summarizeFeature(rawFeature, sourceId, client, rateLimiter, limit),
    );
  }

  const features = featureResults.map((r) => r.feature);
  const functionUnits = featureResults.flatMap((r) => [...r.units]);
  const featureSummaries = features.map((f) => `${f.name}: ${f.summary}`);

  await rateLimiter.acquire();
  const sourceSummary = await client.summarize(
    buildSourcePrompt(sourceName, featureSummaries),
  );

  const source: Source = {
    id: sourceId,
    name: sourceName,
    summary: sourceSummary.trim(),
    metadata: sourceMetadata,
    features: features.map((f) => f.id),
  };

  logger.info('Summarization complete', {
    features: features.length,
    functionUnits: functionUnits.length,
  });

  return { source, features, functionUnits };
}
