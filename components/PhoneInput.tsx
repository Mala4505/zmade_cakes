'use client'
import { useState, useEffect, useRef, useId } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const COUNTRIES = [
  { code: '+965', label: 'Kuwait', flag: '🇰🇼' },
  { code: '+966', label: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+971', label: 'UAE', flag: '🇦🇪' },
  { code: '+973', label: 'Bahrain', flag: '🇧🇭' },
  { code: '+974', label: 'Qatar', flag: '🇶🇦' },
  { code: '+968', label: 'Oman', flag: '🇴🇲' },
  { code: '+20', label: 'Egypt', flag: '🇪🇬' },
  { code: '+962', label: 'Jordan', flag: '🇯🇴' },
  { code: '+961', label: 'Lebanon', flag: '🇱🇧' },
  { code: '+964', label: 'Iraq', flag: '🇮🇶' },
  { code: '+963', label: 'Syria', flag: '🇸🇾' },
  { code: '+967', label: 'Yemen', flag: '🇾🇪' },
  { code: '+91', label: 'India', flag: '🇮🇳' },
  { code: '+92', label: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', label: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', label: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+977', label: 'Nepal', flag: '🇳🇵' },
  { code: '+63', label: 'Philippines', flag: '🇵🇭' },
  { code: '+62', label: 'Indonesia', flag: '🇮🇩' },
  { code: '+44', label: 'UK', flag: '🇬🇧' },
  { code: '+1', label: 'USA', flag: '🇺🇸' },
]

const DEFAULT_COUNTRY = COUNTRIES[0]

function parseValue(value: string): { country: typeof COUNTRIES[0]; local: string } {
  if (!value) return { country: DEFAULT_COUNTRY, local: '' }

  // Normalise before matching: drop spaces/dashes, treat a leading "00" IDD
  // prefix like a "+", and remember whether the value was explicitly
  // international (leading "+" or "00") vs. a bare local number.
  let s = value.replace(/[\s-]/g, '')
  const international = s.startsWith('+') || s.startsWith('00')
  if (s.startsWith('00')) s = s.slice(2)
  const hadPlus = s.startsWith('+')
  const digits = s.replace(/\D/g, '')

  // Only pull a country code off a bare number when it's clearly longer than a
  // local subscriber number (Kuwait numbers are 8 digits). Otherwise an
  // 8-digit local starting "20" would be misread as Egypt.
  if (international || digits.length > 8) {
    const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length)
    for (const c of sorted) {
      const codeDigits = c.code.slice(1) // strip the leading "+"
      if (digits.startsWith(codeDigits)) {
        return { country: c, local: digits.slice(codeDigits.length) }
      }
    }
    // Explicit "+" but no known code: keep "+<code>" in the country slot as an
    // unknown code rather than pasting it into the local-number field.
    if (hadPlus && digits) {
      const n = Math.min(3, digits.length)
      const code = `+${digits.slice(0, n)}`
      return { country: { code, label: code, flag: '🌐' }, local: digits.slice(n) }
    }
  }

  return { country: DEFAULT_COUNTRY, local: digits || value }
}

type PhoneInputSize = 'sm' | 'base'

interface PhoneInputProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  /** Text size variant. Defaults to 'sm' (14px, admin default). Pass 'base' on customer routes to prevent iOS zoom. */
  size?: PhoneInputSize
}

export default function PhoneInput({
  value,
  onChange,
  placeholder = 'XXXX XXXX',
  disabled,
  className,
  id,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  size = 'sm',
}: PhoneInputProps) {
  const textSizeClass = size === 'base' ? 'text-base' : 'text-sm'
  const parsed = parseValue(value ?? '')
  const [country, setCountry] = useState(parsed.country)
  const [local, setLocal] = useState(parsed.local)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, COUNTRIES.findIndex(c => c.code === parsed.country.code))
  )
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const typeaheadRef = useRef<{ query: string; timer: ReturnType<typeof setTimeout> | null }>({
    query: '',
    timer: null,
  })
  const listboxId = useId()

  useEffect(() => {
    const p = parseValue(value ?? '')
    setCountry(p.country)
    setLocal(p.local)
  }, [value])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  // Keep the highlighted option scrolled into view as it changes via keyboard.
  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  function selectedIndex() {
    const idx = COUNTRIES.findIndex(c => c.code === country.code)
    return idx === -1 ? 0 : idx
  }

  function openDropdown() {
    setActiveIndex(selectedIndex())
    setOpen(true)
  }

  function selectCountry(c: typeof COUNTRIES[0]) {
    setCountry(c)
    setOpen(false)
    onChange(c.code + local)
    // Return focus to the trigger — matches native <select> behavior and keeps
    // keyboard users anchored after Enter/Space or a mouse click on an option.
    triggerRef.current?.focus()
  }

  function handleLocalChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Sanitise to digits only so a mis-parsed value can never re-emit an
    // embedded "+" (e.g. "+965+964…"), which would fail KUWAIT_PHONE_REGEX.
    const clean = e.target.value.replace(/[^\d]/g, '')
    setLocal(clean)
    onChange(country.code + clean)
  }

  // Typeahead: jump to (or cycle through) countries whose name starts with the
  // typed letters, same behavior as a native <select>. When the listbox is open
  // this only moves the highlight; when closed it selects immediately.
  function handleTypeahead(char: string) {
    const state = typeaheadRef.current
    if (state.timer) clearTimeout(state.timer)
    state.query += char.toLowerCase()
    state.timer = setTimeout(() => {
      state.query = ''
    }, 500)

    const n = COUNTRIES.length
    const start = open ? activeIndex : selectedIndex()

    let match = -1
    for (let i = 1; i <= n; i++) {
      const idx = (start + i) % n
      if (COUNTRIES[idx].label.toLowerCase().startsWith(state.query)) {
        match = idx
        break
      }
    }
    // Fall back to a single-character match if the accumulated buffer has no hits
    // (e.g. user is typing quickly toward a country that doesn't share a prefix).
    if (match === -1 && state.query.length > 1) {
      const single = char.toLowerCase()
      for (let i = 1; i <= n; i++) {
        const idx = (start + i) % n
        if (COUNTRIES[idx].label.toLowerCase().startsWith(single)) {
          match = idx
          state.query = single
          break
        }
      }
    }
    if (match === -1) return
    if (open) setActiveIndex(match)
    else selectCountry(COUNTRIES[match])
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const n = COUNTRIES.length
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) openDropdown()
        else setActiveIndex(i => Math.min(i + 1, n - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!open) openDropdown()
        else setActiveIndex(i => Math.max(i - 1, 0))
        break
      case 'Home':
        if (open) {
          e.preventDefault()
          setActiveIndex(0)
        }
        break
      case 'End':
        if (open) {
          e.preventDefault()
          setActiveIndex(n - 1)
        }
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (open) selectCountry(COUNTRIES[activeIndex])
        else openDropdown()
        break
      case 'Escape':
        if (open) {
          e.preventDefault()
          e.stopPropagation()
          setOpen(false)
          // Focus already lives on the trigger (keydown fired here), so it
          // stays put — no extra .focus() call needed.
        }
        break
      case 'Tab':
        if (open) setOpen(false)
        break
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && /[a-z]/i.test(e.key)) {
          e.preventDefault()
          handleTypeahead(e.key)
        }
    }
  }

  const focusRing =
    'focus:border-[var(--color-teal)] focus-visible:border-[var(--color-teal)] focus:shadow-[0_0_0_2px_var(--color-teal-light)] focus-visible:shadow-[0_0_0_2px_var(--color-teal-light)]'

  return (
    <div className={cn('relative flex min-w-0', className)} ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
        className={cn(
          'flex min-h-11 min-w-0 shrink-0 items-center gap-1.5 rounded-l-lg border px-3 py-2.5 outline-none transition-all',
          textSizeClass,
          'font-medium bg-[var(--color-surface)] text-[var(--color-ink)] border-r-0',
          ariaInvalid ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]',
          focusRing,
          'disabled:opacity-60 disabled:cursor-not-allowed'
        )}
      >
        <span>{country.flag}</span>
        <span className="hidden text-[var(--color-ink-muted)] sm:inline">{country.code}</span>
        <CaretDown size={12} className="shrink-0 text-[var(--color-ink-muted)]" />
      </button>

      <input
        id={id}
        type="tel"
        value={local}
        onChange={handleLocalChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedBy}
        className={cn(
          'min-h-11 flex-1 min-w-0 rounded-r-lg border px-3.5 py-2.5 outline-none transition-all',
          textSizeClass,
          'bg-[var(--color-surface)] text-[var(--color-ink)]',
          ariaInvalid ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]',
          focusRing,
          'disabled:opacity-60 disabled:cursor-not-allowed'
        )}
      />

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Country code"
          tabIndex={-1}
          className="absolute top-full left-0 z-50 mt-1 max-h-60 overflow-auto rounded-lg border shadow-lg"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            minWidth: '200px',
          }}
        >
          {COUNTRIES.map((c, index) => {
            const isSelected = c.code === country.code
            const isActive = index === activeIndex
            return (
              <button
                key={c.code}
                ref={el => {
                  optionRefs.current[index] = el
                }}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectCountry(c)}
                className={cn(
                  'flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--color-ink)] transition-colors',
                  isSelected
                    ? 'bg-[var(--color-teal-light)]'
                    : isActive
                      ? 'bg-[var(--color-cream)]'
                      : 'bg-transparent'
                )}
              >
                <span>{c.flag}</span>
                <span className="flex-1">{c.label}</span>
                <span className="text-[var(--color-ink-muted)]">{c.code}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
