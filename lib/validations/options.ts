import { z } from 'zod'

export const OPTION_TABLES = [
  'flavor_options',
  'size_options',
  'occasion_options',
  'theme_options',
  'decoration_style_options',
] as const

export type OptionTable = (typeof OPTION_TABLES)[number]

export const optionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
})

export type OptionFormData = z.infer<typeof optionSchema>
