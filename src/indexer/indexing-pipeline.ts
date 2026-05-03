import { basename } from 'node:path';
import type { Connector, ConnectorScanResult, ScanOptions } from '../types/connector.js';
import type { KnowledgeIndex } from '../types/index-schema.js';
import type { SourceMetadata } from '../types/source.js';
import type { JsonStore } from '../storage/json-store.js';
import type { LlmClient } from '../summarizer/llm-client.js';
import type { RateLimiter } from '../summarizer/rate-limiter.js';
import { summarize } from '../summarizer/summarizer.js';
import { detectChanges } from './diff-detector.js';
import { generateId } from '../utils/validation.js';
import { INDEX_VERSION } from '../config/defaults.js';
import { logger } from '../utils/logger.js';

export interface PipelineOptions {
  readonly connector: Connector;
  readonly store: JsonStore;
  readonly client: LlmClient;
  readonly rateLimiter: RateLimiter;
  readonly maxConcurrent: number;
  readonly scanOptions: ScanOptions;
  readonly force: boolean;
  readonly dryRun: boolean;
}

export interface PipelineResult {
  readonly index: KnowledgeIndex;
  readonly stats: {
    readonly features: number;
    readonly functionUnits: number;
    readonly skipped: boolean;
  };
}

function buildResult(index: KnowledgeIndex, skipped: boolean): PipelineResult {
  return {
    index,
    stats: {
      features: index.features.length,
      functionUnits: index.functionUnits.length,
      skipped,
    },
  };
}

function buildDryRunIndex(
  target: string,
  sourceId: string,
  metadata: SourceMetadata,
  scanResult: ConnectorScanResult,
): KnowledgeIndex {
  const now = new Date().toISOString();
  return {
    version: INDEX_VERSION,
    createdAt: now,
    updatedAt: now,
    source: {
      id: sourceId,
      name: basename(target),
      summary: '[dry-run] No summary generated',
      metadata,
      features: [],
    },
    features: scanResult.rawFeatures.map((f) => ({
      id: generateId(`${sourceId}-${f.name}`),
      name: f.name,
      summary: `[dry-run] ${f.rawFunctionUnits.length} code elements`,
      metadata: { sourceId, path: f.path },
      functionUnits: [],
    })),
    functionUnits: [],
  };
}

function totalUnits(scanResult: ConnectorScanResult): number {
  return scanResult.rawFeatures.reduce(
    (sum, f) => sum + f.rawFunctionUnits.length,
    0,
  );
}

export async function runPipeline(
  target: string,
  options: PipelineOptions,
): Promise<PipelineResult> {
  const { connector, store, client, rateLimiter, maxConcurrent, scanOptions } =
    options;

  const validation = await connector.validate(target);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  const metadata = await connector.getSourceMetadata(target);
  const sourceId = generateId(`${metadata.url}-${metadata.type}`);

  if (!options.force) {
    const existing = await store.load(sourceId);
    const diff = detectChanges(existing, metadata);
    if (existing && !diff.hasChanges) {
      logger.info(`Skipping: ${diff.reason}`);
      return buildResult(existing, true);
    }
    logger.info(diff.reason);
  }

  logger.info(`Scanning ${target}...`);
  const scanResult = await connector.scan(target, scanOptions);
  logger.info(
    `Found ${scanResult.rawFeatures.length} features with ${totalUnits(scanResult)} code elements`,
  );

  if (options.dryRun) {
    return buildResult(
      buildDryRunIndex(target, sourceId, metadata, scanResult),
      false,
    );
  }

  const sourceName = basename(target);
  const result = await summarize(scanResult, metadata, sourceName, {
    client,
    rateLimiter,
    maxConcurrent,
  });

  const now = new Date().toISOString();
  const index: KnowledgeIndex = {
    version: INDEX_VERSION,
    createdAt: now,
    updatedAt: now,
    source: result.source,
    features: result.features,
    functionUnits: result.functionUnits,
  };

  await store.save(index);
  return buildResult(index, false);
}
