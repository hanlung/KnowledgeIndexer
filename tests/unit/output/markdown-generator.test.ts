import { describe, it, expect } from 'vitest';
import { generateMarkdown } from '../../../src/output/markdown-generator.js';
import type { KnowledgeIndex } from '../../../src/types/index-schema.js';

function createTestIndex(): KnowledgeIndex {
  return {
    version: '1.0.0',
    createdAt: '2026-05-02T10:00:00Z',
    updatedAt: '2026-05-02T10:00:00Z',
    source: {
      id: 'src-1',
      name: 'test-project',
      summary: 'A test project for unit testing',
      metadata: {
        url: 'https://github.com/test/project',
        type: 'git',
        lastIndexedAt: '2026-05-02T10:00:00Z',
        version: 'abc123',
      },
      features: ['feat-1'],
    },
    features: [
      {
        id: 'feat-1',
        name: 'Authentication',
        summary: 'Handles user authentication',
        metadata: { sourceId: 'src-1', path: 'src/auth' },
        functionUnits: ['fu-1', 'fu-2'],
      },
    ],
    functionUnits: [
      {
        id: 'fu-1',
        name: 'validateToken',
        description: 'Validates a JWT token',
        signature: 'function validateToken(token: string): boolean',
        metadata: {
          featureId: 'feat-1',
          filePath: 'src/auth/token.ts',
          lineStart: 15,
          lineEnd: 42,
          kind: 'function',
        },
      },
      {
        id: 'fu-2',
        name: 'AuthService',
        description: 'Service class for authentication operations',
        metadata: {
          featureId: 'feat-1',
          filePath: 'src/auth/service.ts',
          lineStart: 5,
          lineEnd: 80,
          kind: 'class',
        },
      },
    ],
  };
}

describe('generateMarkdown', () => {
  it('should include the source name in the header', () => {
    const md = generateMarkdown(createTestIndex());
    expect(md).toContain('# Knowledge Index: test-project');
  });

  it('should include the source summary', () => {
    const md = generateMarkdown(createTestIndex());
    expect(md).toContain('A test project for unit testing');
  });

  it('should include feature sections', () => {
    const md = generateMarkdown(createTestIndex());
    expect(md).toContain('### Authentication');
    expect(md).toContain('Handles user authentication');
  });

  it('should include function unit table rows', () => {
    const md = generateMarkdown(createTestIndex());
    expect(md).toContain('`validateToken`');
    expect(md).toContain('Validates a JWT token');
    expect(md).toContain('`src/auth/token.ts`');
    expect(md).toContain('15-42');
  });

  it('should include metadata', () => {
    const md = generateMarkdown(createTestIndex());
    expect(md).toContain('**Type**: git');
    expect(md).toContain('**Version**: abc123');
  });

  it('should include footer with version', () => {
    const md = generateMarkdown(createTestIndex());
    expect(md).toContain('KnowledgeIndexer v1.0.0');
  });
});
