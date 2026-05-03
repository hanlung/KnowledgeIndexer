import { z } from 'zod';

export const sourceTypeSchema = z.enum(['git', 'confluence', 'jira', 'custom']);

export const sourceMetadataSchema = z.object({
  url: z.string(),
  type: sourceTypeSchema,
  lastIndexedAt: z.string().datetime(),
  version: z.string().optional(),
  tags: z.array(z.string()).readonly().optional(),
});

export const sourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  summary: z.string(),
  metadata: sourceMetadataSchema,
  features: z.array(z.string()).readonly(),
});

export type SourceType = z.infer<typeof sourceTypeSchema>;
export type SourceMetadata = z.infer<typeof sourceMetadataSchema>;
export type Source = z.infer<typeof sourceSchema>;
