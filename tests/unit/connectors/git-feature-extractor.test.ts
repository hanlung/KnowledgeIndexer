import { describe, it, expect } from 'vitest';
import { groupIntoFeatures } from '../../../src/connectors/git/git-feature-extractor.js';
import type { ParsedFile } from '../../../src/connectors/git/git-types.js';

describe('groupIntoFeatures', () => {
  const basePath = '/project';

  it('should group files by src/ subdirectory', () => {
    const files: ParsedFile[] = [
      {
        filePath: '/project/src/auth/login.ts',
        language: 'typescript',
        elements: [
          {
            name: 'login',
            kind: 'function',
            signature: 'function login()',
            content: 'function login() {}',
            lineStart: 1,
            lineEnd: 5,
          },
        ],
      },
      {
        filePath: '/project/src/auth/token.ts',
        language: 'typescript',
        elements: [
          {
            name: 'validateToken',
            kind: 'function',
            signature: 'function validateToken()',
            content: 'function validateToken() {}',
            lineStart: 1,
            lineEnd: 10,
          },
        ],
      },
      {
        filePath: '/project/src/db/connection.ts',
        language: 'typescript',
        elements: [
          {
            name: 'connect',
            kind: 'function',
            signature: 'function connect()',
            content: 'function connect() {}',
            lineStart: 1,
            lineEnd: 8,
          },
        ],
      },
    ];

    const features = groupIntoFeatures(files, basePath);

    expect(features).toHaveLength(2);
    const names = features.map((f) => f.name);
    expect(names).toContain('auth');
    expect(names).toContain('db');

    const authFeature = features.find((f) => f.name === 'auth');
    expect(authFeature?.rawFunctionUnits).toHaveLength(2);
  });

  it('should put root-level files in "root" feature', () => {
    const files: ParsedFile[] = [
      {
        filePath: '/project/index.ts',
        language: 'typescript',
        elements: [
          {
            name: 'main',
            kind: 'function',
            signature: 'function main()',
            content: 'function main() {}',
            lineStart: 1,
            lineEnd: 3,
          },
        ],
      },
    ];

    const features = groupIntoFeatures(files, basePath);
    expect(features).toHaveLength(1);
    expect(features[0].name).toBe('root');
  });

  it('should skip files with no code elements', () => {
    const files: ParsedFile[] = [
      {
        filePath: '/project/src/empty/file.ts',
        language: 'typescript',
        elements: [],
      },
    ];

    const features = groupIntoFeatures(files, basePath);
    expect(features).toHaveLength(0);
  });
});
