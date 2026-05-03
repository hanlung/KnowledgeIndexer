import { z } from 'zod';
import { sourceSchema } from './source.js';
import { featureSchema } from './feature.js';
import { functionUnitSchema } from './function-unit.js';

export const knowledgeIndexSchema = z.object({
  version: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  source: sourceSchema,
  features: z.array(featureSchema).readonly(),
  functionUnits: z.array(functionUnitSchema).readonly(),
});

export type KnowledgeIndex = z.infer<typeof knowledgeIndexSchema>;
