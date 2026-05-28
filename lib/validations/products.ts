import { z } from 'zod'

export const flavorPriceSchema = z.object({
  sizeId: z.string().uuid(),
  price: z.number().min(0).max(9999.999),
})

export const flavorFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  prices: z.array(flavorPriceSchema),
})
