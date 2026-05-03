import { z } from 'zod';

export const functionUnitKindSchema = z.enum([
  'function',
  'class',
  'endpoint',
  'section',
  'ticket',
  'other',
]);

export const functionUnitMetadataSchema = z.object({
  featureId: z.string().min(1),
  filePath: z.string().optional(),
  lineStart: z.number().int().positive().optional(),
  lineEnd: z.number().int().positive().optional(),
  url: z.string().optional(),
  language: z.string().optional(),
  kind: functionUnitKindSchema,
});

export const functionUnitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  signature: z.string().optional(),
  metadata: functionUnitMetadataSchema,
});

export type FunctionUnitKind = z.infer<typeof functionUnitKindSchema>;
export type FunctionUnitMetadata = z.infer<typeof functionUnitMetadataSchema>;
export type FunctionUnit = z.infer<typeof functionUnitSchema>;
