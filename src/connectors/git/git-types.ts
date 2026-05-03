import type { FunctionUnitKind } from '../../types/function-unit.js';

export interface ParsedCodeElement {
  readonly name: string;
  readonly kind: FunctionUnitKind;
  readonly signature: string;
  readonly content: string;
  readonly lineStart: number;
  readonly lineEnd: number;
}

export interface ParsedFile {
  readonly filePath: string;
  readonly language: string;
  readonly elements: readonly ParsedCodeElement[];
}
