import { z } from 'zod'
import { deliveryAddressSchema } from './inquiry'

export const customerConfirmSchema = z.object({
  pickup_time: z.string().optional().nullable(),
  message_on_cake: z.string().max(255, 'Message must be under 255 characters').optional().default(''),
  special_requirements: z.string().max(1000).optional().default(''),
  customer_comments: z
    .string()
    .max(2000, 'Comments must be under 2000 characters')
    .optional()
    .default(''),
  delivery_address: deliveryAddressSchema.optional(),
  action: z.enum(['confirm', 'request_changes']),
})

export type CustomerConfirmData = z.infer<typeof customerConfirmSchema>
