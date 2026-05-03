import type { SourceMetadata, SourceType } from './source.js';
import type { FunctionUnitKind } from './function-unit.js';

export interface ScanOptions {
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
  readonly maxDepth?: number;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface RawFunctionUnit {
  readonly name: string;
  readonly kind: FunctionUnitKind;
  readonly filePath?: string;
  readonly lineStart?: number;
  readonly lineEnd?: number;
  readonly content: string;
  readonly signature?: string;
}

export interface RawFeature {
  readonly name: string;
  readonly path: string;
  readonly rawFunctionUnits: readonly RawFunctionUnit[];
  readonly content?: string;
}

export interface ConnectorScanResult {
  readonly rawFeatures: readonly RawFeature[];
}

export interface Connector {
  readonly type: SourceType;
  readonly name: string;
  validate(target: string): Promise<ValidationResult>;
  scan(target: string, options: ScanOptions): Promise<ConnectorScanResult>;
  getSourceMetadata(target: string): Promise<SourceMetadata>;
}
