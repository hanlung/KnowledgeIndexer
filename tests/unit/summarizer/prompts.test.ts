import { describe, it, expect } from 'vitest';
import {
  buildFunctionUnitPrompt,
  buildFeaturePrompt,
  buildSourcePrompt,
} from '../../../src/summarizer/prompts.js';

describe('buildFunctionUnitPrompt', () => {
  it('should include the function name and content', () => {
    const prompt = buildFunctionUnitPrompt({
      name: 'calculateTotal',
      kind: 'function',
      content: 'function calculateTotal(items) { return items.reduce((s, i) => s + i.price, 0); }',
      signature: 'function calculateTotal(items: Item[]): number',
    });

    expect(prompt).toContain('calculateTotal');
    expect(prompt).toContain('function');
    expect(prompt).toContain('Signature: function calculateTotal');
    expect(prompt).toContain('items.reduce');
  });

  it('should work without a signature', () => {
    const prompt = buildFunctionUnitPrompt({
      name: 'helper',
      kind: 'function',
      content: 'const helper = () => {}',
    });

    expect(prompt).toContain('helper');
    expect(prompt).not.toContain('Signature:');
  });
});

describe('buildFeaturePrompt', () => {
  it('should include feature name and unit summaries', () => {
    const prompt = buildFeaturePrompt(
      {
        name: 'Authentication',
        path: 'src/auth',
        rawFunctionUnits: [],
      },
      ['validateToken: Validates JWT tokens', 'login: Handles user login'],
    );

    expect(prompt).toContain('Authentication');
    expect(prompt).toContain('src/auth');
    expect(prompt).toContain('validateToken: Validates JWT tokens');
    expect(prompt).toContain('login: Handles user login');
  });
});

describe('buildSourcePrompt', () => {
  it('should include project name and feature summaries', () => {
    const prompt = buildSourcePrompt('my-api', [
      'Authentication: Handles user auth',
      'Database: Data access layer',
    ]);

    expect(prompt).toContain('my-api');
    expect(prompt).toContain('Authentication: Handles user auth');
    expect(prompt).toContain('Database: Data access layer');
  });
});
