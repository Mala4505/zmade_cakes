'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

export interface RadioOption<T extends string> {
  value: T
  label: React.ReactNode
  /** Optional second line rendered under the label (turns the chip card-like). */
  description?: React.ReactNode
  disabled?: boolean
}

export interface RadioGroupProps<T extends string> {
  value: T | null | undefined
  onChange: (value: T) => void
  options: RadioOption<T>[]
  disabled?: boolean
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

/**
 * Segmented control that replaces bare native radios.
 * Selected chip uses the teal-wash active treatment (same vocabulary as
 * active nav items and the confirmed badge). Fully keyboard navigable:
 * arrow keys move selection, skipping disabled options.
 */
export function RadioGroup<T extends string>({
  value,
  onChange,
  options,
  disabled = false,
  className,
  ...aria
}: RadioGroupProps<T>) {
  const buttonRefs = useRef(new Map<T, HTMLButtonElement>())

  const enabled = options.filter((o) => !o.disabled && !disabled)

  const moveSelection = (dir: 1 | -1) => {
    if (enabled.length === 0) return
    const idx = enabled.findIndex((o) => o.value === value)
    const next = enabled[(idx + dir + enabled.length) % enabled.length]
    if (next && next.value !== value) {
      onChange(next.value)
      buttonRefs.current.get(next.value)?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      moveSelection(1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      moveSelection(-1)
    }
  }

  // Roving tabindex: the selected option is tabbable; if nothing is
  // selected yet, the first enabled option is.
  const tabbableValue = enabled.some((o) => o.value === value)
    ? value
    : enabled[0]?.value

  return (
    <div
      role="radiogroup"
      onKeyDown={handleKeyDown}
      className={cn(
        'flex gap-1 rounded-lg border p-1',
        'bg-[var(--color-surface-raised)] border-[var(--color-border)]',
        className
      )}
      {...aria}
    >
      {options.map((option) => {
        const selected = option.value === value
        const isDisabled = disabled || option.disabled
        return (
          <button
            key={option.value}
            ref={(el) => {
              if (el) buttonRefs.current.set(option.value, el)
              else buttonRefs.current.delete(option.value)
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={isDisabled}
            tabIndex={option.value === tabbableValue ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 min-h-11 rounded-md px-3 py-2 text-sm transition-colors text-left',
              option.description ? 'flex flex-col justify-center gap-0.5' : 'flex items-center justify-center text-center',
              selected
                ? 'bg-[var(--color-teal-light)] text-[var(--color-teal-deep)] font-semibold'
                : 'font-medium text-[var(--color-ink-muted)] enabled:hover:text-[var(--color-ink-secondary)] enabled:hover:bg-[var(--color-surface)]',
              isDisabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            <span className="block">{option.label}</span>
            {option.description && (
              <span
                className={cn(
                  'block text-xs font-normal',
                  selected
                    ? 'text-[var(--color-teal-deep)]'
                    : 'text-[var(--color-ink-muted)]'
                )}
              >
                {option.description}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
