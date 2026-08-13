'use client'

import { useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Field, Input, RadioGroup, Select, Spinner, Textarea } from '@/components/ui'
import { Check, Trash, X } from '@phosphor-icons/react'
import { createOption } from '@/lib/actions/options'
import { inquiryItemSchema } from '@/lib/validations/inquiryItem'
import type { OptionRow } from '@/lib/supabase/types'

// Shared by InquiryForm.tsx (admin create) and InquiryDetailForm.tsx (admin edit) — the
// repeating "one item" unit inside a multi-item order (see supabase/migrations/
// 034_multi_item_inquiries.sql). Both forms build their outer schema as
// `inquirySchema.and(z.object({ address_... }))`, so `items` is always
// `z.array(inquiryItemSchema)` underneath — this component only ever touches paths under
// `items.${index}`, so it's safe to type its form-context access against just that slice
// rather than either form's full (and slightly different) input type.
export type ItemInput = z.input<typeof inquiryItemSchema>
type ItemsFormShape = { items: ItemInput[] }

// A single default item, matching what the single-item form used to seed before multi-item
// support (quantity 1, normal cake, no size/flavor/theme selected yet).
export function defaultItem(): ItemInput {
  return {
    cake_size: '',
    flavor: '',
    occasion: '',
    cake_type: 'normal',
    theme: '',
    message_on_cake: '',
    quantity: 1,
    special_requirements: '',
    order_type: 'cake',
    item_name: '',
  }
}

// Sentinel value for the "+ Add new item" entry appended to the item <Select>.
// Never a real option — intercepted in the onChange handler before it reaches form state.
const NEW_ITEM_OPTION = '__add_new_item__'

interface ItemFieldsProps {
  index: number
  options: {
    flavors: OptionRow[]
    sizes: OptionRow[]
    occasions: OptionRow[]
  }
  /** Item catalog rows ("Other Item" dropdown) — kept at the parent so a newly-created
   *  option is instantly visible in every row's dropdown, not just the row that added it. */
  itemOptions: OptionRow[]
  onItemOptionCreated: (option: OptionRow) => void
  /** Only true once there's more than one item — shows the "Item N" label + remove button.
   *  A single-item order renders exactly as it always did, with no extra chrome. */
  showChrome: boolean
  onRemove: () => void
  /** 'gap-4' (InquiryForm) vs 'gap-3' (InquiryDetailForm, tighter card layout). */
  gapClassName?: string
}

export function ItemFields({
  index,
  options,
  itemOptions,
  onItemOptionCreated,
  showChrome,
  onRemove,
  gapClassName = 'gap-4',
}: ItemFieldsProps) {
  const {
    register,
    watch,
    setValue,
    clearErrors,
    formState: { errors },
  } = useFormContext<ItemsFormShape>()

  // Inline "add new item" affordance for the Item dropdown (Other Item order type) — per-row
  // local state, since two rows could independently be mid-add at once.
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [itemError, setItemError] = useState<string | null>(null)
  const [itemPending, setItemPending] = useState(false)
  const itemSelectRef = useRef<HTMLSelectElement>(null)

  const orderType = watch(`items.${index}.order_type`)
  const cakeType = watch(`items.${index}.cake_type`)
  const watchedItemName = watch(`items.${index}.item_name`)
  const itemErrors = errors.items?.[index]

  const cancelAddItem = () => {
    setIsAddingItem(false)
    setNewItemName('')
    setItemError(null)
  }

  const handleCreateItem = async () => {
    const trimmed = newItemName.trim()
    if (!trimmed || itemPending) return
    setItemPending(true)
    setItemError(null)
    const result = await createOption('item_options', {
      name: trimmed,
      sort_order: itemOptions.length,
      is_active: true,
    })
    setItemPending(false)
    if (result.error !== null) {
      setItemError(result.error)
      return
    }
    if (result.fieldErrors !== null) {
      setItemError(result.fieldErrors.name?.[0] ?? 'Could not add item')
      return
    }
    const created = result.data
    onItemOptionCreated(created)
    setValue(`items.${index}.item_name`, created.name, { shouldDirty: true, shouldValidate: true })
    setIsAddingItem(false)
    setNewItemName('')
    toast.success('Item added')
    requestAnimationFrame(() => itemSelectRef.current?.focus())
  }

  return (
    <div className={showChrome ? 'pt-4 mt-4 border-t' : undefined} style={showChrome ? { borderColor: 'var(--color-border)' } : undefined}>
      {showChrome && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>
            Item {index + 1}
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[color:var(--color-surface-raised)]"
            style={{ color: 'var(--color-ink-muted)' }}
            title="Remove item"
            aria-label={`Remove item ${index + 1}`}
          >
            <Trash size={14} />
          </button>
        </div>
      )}
      <div className={`grid grid-cols-2 ${gapClassName}`}>
        <Field label="Order Type" error={itemErrors?.order_type?.message} required className="col-span-2">
          <RadioGroup
            value={orderType}
            onChange={(v) => setValue(`items.${index}.order_type`, v, { shouldDirty: true, shouldValidate: true })}
            options={[
              { value: 'cake', label: 'Cake' },
              { value: 'other_item', label: 'Other Item' },
            ]}
            aria-label="Order type"
          />
        </Field>
        {orderType === 'other_item' ? (
          <Field label="Item" error={itemErrors?.item_name?.message} required>
            <Select
              ref={itemSelectRef}
              value={isAddingItem ? NEW_ITEM_OPTION : watchedItemName ?? ''}
              onChange={(e) => {
                const val = e.target.value
                if (val === NEW_ITEM_OPTION) {
                  setIsAddingItem(true)
                  setItemError(null)
                  return
                }
                setIsAddingItem(false)
                setNewItemName('')
                setItemError(null)
                setValue(`items.${index}.item_name`, val, { shouldDirty: true, shouldValidate: true })
              }}
              required
              aria-invalid={itemErrors?.item_name ? true : undefined}
            >
              <option value="">Select item</option>
              {itemOptions.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
              <option value={NEW_ITEM_OPTION}>+ Add new item…</option>
            </Select>
            {isAddingItem && (
              <div className="mt-2 flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    autoFocus
                    value={newItemName}
                    onChange={(e) => {
                      setNewItemName(e.target.value)
                      setItemError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handleCreateItem()
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        cancelAddItem()
                      }
                    }}
                    placeholder="New item name…"
                    disabled={itemPending}
                    aria-invalid={itemError ? true : undefined}
                  />
                  {itemError && (
                    <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{itemError}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleCreateItem()}
                  disabled={itemPending || !newItemName.trim()}
                  className="shrink-0 p-2.5 rounded-lg border transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-teal-light)',
                    color: 'var(--color-teal-deep)',
                  }}
                  title="Add item"
                >
                  {itemPending ? <Spinner size={14} /> : <Check size={14} weight="bold" />}
                </button>
                <button
                  type="button"
                  onClick={cancelAddItem}
                  disabled={itemPending}
                  className="shrink-0 p-2.5 rounded-lg border transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface-raised)',
                    color: 'var(--color-ink-secondary)',
                  }}
                  title="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </Field>
        ) : (
          <Field label="Flavor" error={itemErrors?.flavor?.message} required>
            <Select {...register(`items.${index}.flavor`)} required aria-invalid={itemErrors?.flavor ? true : undefined}>
              <option value="">Select flavor</option>
              {options.flavors.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </Select>
          </Field>
        )}
        {orderType === 'other_item' ? (
          <Field label="Size" error={itemErrors?.cake_size?.message} hint="Optional — free text">
            <Input {...register(`items.${index}.cake_size`)} placeholder="500ml, 1kg, small jar…" aria-invalid={itemErrors?.cake_size ? true : undefined} />
          </Field>
        ) : (
          <Field label="Size" error={itemErrors?.cake_size?.message} required>
            <Select {...register(`items.${index}.cake_size`)} required aria-invalid={itemErrors?.cake_size ? true : undefined}>
              <option value="">Select size</option>
              {options.sizes.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </Select>
          </Field>
        )}
        {orderType === 'cake' && (
          <Field label="Occasion" error={itemErrors?.occasion?.message}>
            <Select {...register(`items.${index}.occasion`)}>
              <option value="">— Optional —</option>
              {options.occasions.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Quantity" error={itemErrors?.quantity?.message} required>
          <Input
            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
            type="number"
            min={1}
            max={50}
            required
            aria-invalid={itemErrors?.quantity ? true : undefined}
          />
        </Field>
        {orderType === 'cake' && (
          <Field label="Cake Type" error={itemErrors?.cake_type?.message} required className="col-span-2">
            <RadioGroup
              value={cakeType}
              onChange={(v) => {
                setValue(`items.${index}.cake_type`, v, { shouldDirty: true })
                if (v === 'normal') clearErrors(`items.${index}.theme`)
              }}
              options={[
                { value: 'normal', label: 'Normal cake' },
                { value: 'theme', label: 'Theme cake' },
              ]}
              aria-label="Cake type"
            />
          </Field>
        )}
        {orderType === 'cake' && cakeType === 'theme' && (
          <Field label="Theme" error={itemErrors?.theme?.message} required className="col-span-2">
            <Input
              {...register(`items.${index}.theme`)}
              placeholder="e.g. Butterfly garden, football, unicorn…"
              required
              aria-invalid={itemErrors?.theme ? true : undefined}
            />
          </Field>
        )}
        {orderType === 'cake' && (
          <Field label="Message on Cake" error={itemErrors?.message_on_cake?.message} className="col-span-2">
            <Input {...register(`items.${index}.message_on_cake`)} placeholder="Happy Birthday…" />
          </Field>
        )}
        <Field
          label="Cake Details"
          error={itemErrors?.special_requirements?.message}
          hint="Tiers, colours, decoration, toppers — everything the bake needs."
          className="col-span-2"
        >
          <Textarea
            {...register(`items.${index}.special_requirements`)}
            rows={3}
            placeholder="Two tiers, sage green palette, gold leaf accents…"
          />
        </Field>
      </div>
    </div>
  )
}
