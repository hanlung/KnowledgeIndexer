import { describe, it, expect } from 'vitest';
import { generateId } from '../../../src/utils/validation.js';
import { sourceSchema } from '../../../src/types/source.js';
import { featureSchema } from '../../../src/types/feature.js';
import { functionUnitSchema } from '../../../src/types/function-unit.js';
import { knowledgeIndexSchema } from '../../../src/types/index-schema.js';

describe('generateId', () => {
  it('should produce a consistent ID for the same input', () => {
    const id1 = generateId('test-input');
    const id2 = generateId('test-input');
    expect(id1).toBe(id2);
  });

  it('should produce different IDs for different inputs', () => {
    const id1 = generateId('input-a');
    const id2 = generateId('input-b');
    expect(id1).not.toBe(id2);
  });

  it('should return a non-empty string', () => {
    expect(generateId('anything').length).toBeGreaterThan(0);
  });
});

describe('sourceSchema', () => {
  it('should validate a valid source', () => {
    const source = {
      id: 'abc123',
      name: 'my-project',
      summary: 'A project',
      metadata: {
        url: '/path/to/repo',
        type: 'git',
        lastIndexedAt: '2026-05-02T10:00:00Z',
        version: 'abc123',
      },
      features: ['feat-1'],
    };
    expect(sourceSchema.parse(source)).toEqual(source);
  });

  it('should reject a source with missing name', () => {
    const source = {
      id: 'abc123',
      name: '',
      summary: 'A project',
      metadata: {
        url: '/path',
        type: 'git',
        lastIndexedAt: '2026-05-02T10:00:00Z',
      },
      features: [],
    };
    expect(() => sourceSchema.parse(source)).toThrow();
  });
});

describe('featureSchema', () => {
  it('should validate a valid feature', () => {
    const feature = {
      id: 'feat-1',
      name: 'Auth',
      summary: 'Authentication module',
      metadata: { sourceId: 'abc123', path: 'src/auth' },
      functionUnits: ['fu-1'],
    };
    expect(featureSchema.parse(feature)).toEqual(feature);
  });
});

describe('functionUnitSchema', () => {
  it('should validate a valid function unit', () => {
    const unit = {
      id: 'fu-1',
      name: 'validateToken',
      description: 'Validates a JWT token',
      signature: 'function validateToken(token: string): boolean',
      metadata: {
        featureId: 'feat-1',
        filePath: 'src/auth/token.ts',
        lineStart: 15,
        lineEnd: 42,
        language: 'typescript',
        kind: 'function',
      },
    };
    expect(functionUnitSchema.parse(unit)).toEqual(unit);
  });

  it('should reject invalid kind', () => {
    const unit = {
      id: 'fu-1',
      name: 'test',
      description: 'test',
      metadata: {
        featureId: 'feat-1',
        kind: 'invalid',
      },
    };
    expect(() => functionUnitSchema.parse(unit)).toThrow();
  });
});

describe('knowledgeIndexSchema', () => {
  it('should validate a complete index', () => {
    const index = {
      version: '1.0.0',
      createdAt: '2026-05-02T10:00:00Z',
      updatedAt: '2026-05-02T10:00:00Z',
      source: {
        id: 'src-1',
        name: 'project',
        summary: 'A project',
        metadata: {
          url: '/path',
          type: 'git',
          lastIndexedAt: '2026-05-02T10:00:00Z',
        },
        features: ['feat-1'],
      },
      features: [
        {
          id: 'feat-1',
          name: 'Auth',
          summary: 'Auth module',
          metadata: { sourceId: 'src-1' },
          functionUnits: ['fu-1'],
        },
      ],
      functionUnits: [
        {
          id: 'fu-1',
          name: 'login',
          description: 'Handles login',
          metadata: { featureId: 'feat-1', kind: 'function' },
        },
      ],
    };
    expect(() => knowledgeIndexSchema.parse(index)).not.toThrow();
  });
});
