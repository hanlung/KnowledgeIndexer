import type { ParsedCodeElement, ParsedFile } from './git-types.js';
import { readTextFile } from '../../utils/filesystem.js';
import { SUPPORTED_LANGUAGES } from '../../config/defaults.js';
import { extname } from 'node:path';

function detectLanguage(filePath: string): string | null {
  const ext = extname(filePath);
  for (const [language, extensions] of SUPPORTED_LANGUAGES) {
    if (extensions.includes(ext)) {
      return language;
    }
  }
  return null;
}

const TS_JS_PATTERNS: readonly RegExp[] = [
  // export function name(...)
  /^(export\s+)?(async\s+)?function\s+(\w+)\s*\([^)]*\)/gm,
  // export const name = (...) =>
  /^(export\s+)?const\s+(\w+)\s*=\s*(async\s+)?\([^)]*\)\s*=>/gm,
  // export class Name
  /^(export\s+)?(abstract\s+)?class\s+(\w+)/gm,
  // export interface Name (TypeScript)
  /^(export\s+)?interface\s+(\w+)/gm,
];

const PYTHON_PATTERNS: readonly RegExp[] = [
  /^(async\s+)?def\s+(\w+)\s*\([^)]*\)/gm,
  /^class\s+(\w+)/gm,
];

const GO_PATTERNS: readonly RegExp[] = [
  /^func\s+(\([^)]*\)\s+)?(\w+)\s*\([^)]*\)/gm,
  /^type\s+(\w+)\s+struct/gm,
];

const DART_PATTERNS: readonly RegExp[] = [
  // class declarations with optional modifiers (abstract/sealed/final/base/interface/mixin)
  /^(?:abstract\s+|sealed\s+|final\s+|base\s+|interface\s+|mixin\s+)*class\s+(\w+)/gm,
  /^mixin\s+(\w+)/gm,
  /^enum\s+(\w+)/gm,
  /^extension\s+(\w+)/gm,
  /^typedef\s+(\w+)/gm,
  // Top-level functions: return type first, then identifier, then `(`.
  // The type group must end in whitespace, separating it from the name.
  /^(?:[A-Za-z_][\w?<>,.\s]*\s+)([a-z_]\w*)\s*\(/gm,
];

function getPatterns(
  language: string,
): readonly RegExp[] {
  switch (language) {
    case 'typescript':
    case 'javascript':
      return TS_JS_PATTERNS;
    case 'python':
      return PYTHON_PATTERNS;
    case 'go':
      return GO_PATTERNS;
    case 'dart':
      return DART_PATTERNS;
    default:
      return TS_JS_PATTERNS;
  }
}

const KEYWORDS: ReadonlySet<string> = new Set([
  'export',
  'async',
  'function',
  'const',
  'class',
  'interface',
  'abstract',
  'def',
  'func',
  'type',
  'struct',
  'mixin',
  'enum',
  'extension',
  'typedef',
  'sealed',
  'final',
  'base',
]);

function extractElementName(match: RegExpMatchArray): string {
  // Walk capture groups in reverse to find the identifier; the rightmost
  // word-only, non-keyword group is the declared name across all patterns.
  for (let i = match.length - 1; i >= 1; i--) {
    const group = match[i];
    if (group && /^\w+$/.test(group) && !KEYWORDS.has(group)) {
      return group;
    }
  }
  return match[0].trim();
}

function classifyKind(matchStr: string): ParsedCodeElement['kind'] {
  if (/\b(class|interface|struct|mixin|enum|extension|typedef)\b/.test(matchStr))
    return 'class';
  return 'function';
}

function extractBlockContent(
  lines: readonly string[],
  startLine: number,
): { content: string; endLine: number } {
  let braceCount = 0;
  let found = false;
  let endLine = startLine;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
      if (char === '{' || char === '(') {
        braceCount++;
        found = true;
      } else if (char === '}' || char === ')') {
        braceCount--;
      }
    }

    // Python: use indentation
    if (!found && i > startLine && lines[i].trim() !== '' && !/^\s/.test(lines[i])) {
      endLine = i - 1;
      break;
    }

    if (found && braceCount <= 0) {
      endLine = i;
      break;
    }

    endLine = i;
  }

  // Cap content at 100 lines to avoid huge prompts
  const maxEnd = Math.min(endLine, startLine + 99);
  const content = lines.slice(startLine, maxEnd + 1).join('\n');
  return { content, endLine: maxEnd };
}

export async function parseFile(filePath: string): Promise<ParsedFile | null> {
  const language = detectLanguage(filePath);
  if (!language) return null;

  const source = await readTextFile(filePath);
  const lines = source.split('\n');
  const patterns = getPatterns(language);
  const elements: ParsedCodeElement[] = [];
  const seenNames = new Set<string>();

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(source)) !== null) {
      const name = extractElementName(match);
      if (seenNames.has(name)) continue;
      seenNames.add(name);

      const lineStart =
        source.substring(0, match.index).split('\n').length;
      const signature = match[0].trim();
      const kind = classifyKind(match[0]);

      const { content, endLine } = extractBlockContent(lines, lineStart - 1);

      elements.push({
        name,
        kind,
        signature,
        content,
        lineStart,
        lineEnd: endLine + 1,
      });
    }
  }

  return { filePath, language, elements };
}
