import { z } from 'zod'

// Per-item shape, extracted out of what used to be the flat top-level inquiry schema (see
// supabase/migrations/034_multi_item_inquiries.sql — one inquiry now has N inquiry_items).
// Order-level fields (customer, event date, delivery, payment, allergens, admin price, etc.)
// stay in lib/validations/inquiry.ts; everything specific to one cake/item lives here.
const inquiryItemShape = {
  cake_size: z.string().max(100).optional().default(''),
  flavor: z.string().max(150).optional().default(''),
  occasion: z.string().max(150).optional().default(''),
  // UI-only convenience field — 'theme' selection just means theme !== ''. Not a DB column;
  // must be stripped before any insert/update (see lib/actions/inquiries.ts).
  cake_type: z.enum(['normal', 'theme']),
  theme: z.string().max(200).optional().default(''),
  message_on_cake: z.string().max(255, 'Message must be under 255 characters').optional().default(''),
  quantity: z
    .number({ error: 'Quantity must be a number' })
    .int()
    .min(1, 'Minimum 1 cake')
    .max(100000, 'That quantity looks wrong — contact us for very large orders'),
  // "Cake Details" — consolidated free-text field (decoration dropdown folded into this).
  special_requirements: z.string().max(1000).optional().default(''),
  order_type: z.enum(['cake', 'other_item']).default('cake'),
  item_name: z.string().max(150).optional().default(''),
}

// Combines the old cakeTypeRefine + orderTypeRefine (both formerly on the outer inquiry
// schema) into a single per-item refinement, since both are per-item concerns now.
function itemRefine(
  data: {
    cake_type?: 'normal' | 'theme'
    theme?: string
    order_type?: 'cake' | 'other_item'
    cake_size?: string
    flavor?: string
    item_name?: string
  },
  ctx: z.RefinementCtx
) {
  if (data.cake_type === 'theme' && !data.theme?.trim()) {
    ctx.addIssue({
      code: 'custom',
      message: 'Theme is required for a theme cake',
      path: ['theme'],
    })
  }

  if (data.order_type === 'cake') {
    if (!data.cake_size?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Select a size',
        path: ['cake_size'],
      })
    }
    if (!data.flavor?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Select a flavor',
        path: ['flavor'],
      })
    }
  } else if (data.order_type === 'other_item') {
    if (!data.item_name?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Item name is required',
        path: ['item_name'],
      })
    }
  }
}

function clearThemeWhenNormal<T extends { cake_type?: 'normal' | 'theme'; theme?: string }>(
  data: T
): T {
  return data.cake_type === 'normal' ? { ...data, theme: '' } : data
}

export const inquiryItemSchema = z
  .object(inquiryItemShape)
  .superRefine(itemRefine)
  .transform(clearThemeWhenNormal)

export type InquiryItemFormData = z.infer<typeof inquiryItemSchema>
