import { z } from 'zod';

export const featureMetadataSchema = z.object({
  sourceId: z.string().min(1),
  path: z.string().optional(),
  tags: z.array(z.string()).readonly().optional(),
});

export const featureSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  summary: z.string(),
  metadata: featureMetadataSchema,
  functionUnits: z.array(z.string()).readonly(),
});

export type FeatureMetadata = z.infer<typeof featureMetadataSchema>;
export type Feature = z.infer<typeof featureSchema>;
