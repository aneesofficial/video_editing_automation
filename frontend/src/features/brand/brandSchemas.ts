import { z } from 'zod';

export const brandKitSchema = z.object({
  brandName: z.string(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code'),
  fontFamily: z.string().min(1, 'Font family is required'),
  watermarkPosition: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']),
  watermarkOpacity: z.number().min(10).max(100),
});

export type BrandKitFormValues = z.infer<typeof brandKitSchema>;

