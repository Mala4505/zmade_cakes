'use client'
import { useState, useEffect, useRef } from 'react'
import { CaretDown } from '@phosphor-icons/react'

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
  { code: '+91', label: 'India', flag: '🇮🇳' },
  { code: '+92', label: 'Pakistan', flag: '🇵🇰' },
  { code: '+44', label: 'UK', flag: '🇬🇧' },
  { code: '+1', label: 'USA', flag: '🇺🇸' },
]

const DEFAULT_COUNTRY = COUNTRIES[0]

function parseValue(value: string): { country: typeof COUNTRIES[0]; local: string } {
  if (!value) return { country: DEFAULT_COUNTRY, local: '' }
  const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length)
  for (const c of sorted) {
    if (value.startsWith(c.code)) {
      return { country: c, local: value.slice(c.code.length) }
    }
  }
  return { country: DEFAULT_COUNTRY, local: value }
}

interface PhoneInputProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function PhoneInput({ value, onChange, placeholder = 'XXXX XXXX', disabled, className }: PhoneInputProps) {
  const parsed = parseValue(value ?? '')
  const [country, setCountry] = useState(parsed.country)
  const [local, setLocal] = useState(parsed.local)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  function handleCountrySelect(c: typeof COUNTRIES[0]) {
    setCountry(c)
    setOpen(false)
    onChange(c.code + local)
  }

  function handleLocalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setLocal(val)
    onChange(country.code + val)
  }

  const borderColor = 'var(--color-border)'
  const bg = 'var(--color-surface)'
  const ink = 'var(--color-ink)'
  const inkMuted = 'var(--color-ink-muted)'

  return (
    <div className={`relative flex${className ? ' ' + className : ''}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        onKeyDown={(e) => { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false) } }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 shrink-0 border rounded-l-lg px-3 py-2.5 text-sm font-medium outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          borderColor,
          backgroundColor: bg,
          color: ink,
          borderRight: 'none',
          minWidth: '88px',
        }}
      >
        <span>{country.flag}</span>
        <span style={{ color: inkMuted }}>{country.code}</span>
        <CaretDown size={12} style={{ color: inkMuted }} />
      </button>

      <input
        type="tel"
        value={local}
        onChange={handleLocalChange}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 border rounded-r-lg px-3.5 py-2.5 text-sm outline-none transition-all"
        style={{
          borderColor,
          backgroundColor: bg,
          color: ink,
        }}
        onFocus={e => {
          e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-teal)'
          e.currentTarget.style.borderColor = 'var(--color-teal)'
        }}
        onBlur={e => {
          e.currentTarget.style.boxShadow = ''
          e.currentTarget.style.borderColor = borderColor
        }}
      />

      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 z-50 mt-1 rounded-lg border shadow-lg overflow-auto"
          style={{
            borderColor,
            backgroundColor: bg,
            minWidth: '200px',
            maxHeight: '240px',
          }}
        >
          {COUNTRIES.map(c => (
            <button
              key={c.code}
              type="button"
              role="option"
              aria-selected={c.code === country.code}
              onClick={() => handleCountrySelect(c)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors"
              style={{
                color: ink,
                backgroundColor: c.code === country.code ? 'var(--color-teal-light)' : 'transparent',
              }}
              onMouseEnter={e => { if (c.code !== country.code) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-cream)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = c.code === country.code ? 'var(--color-teal-light)' : 'transparent' }}
            >
              <span>{c.flag}</span>
              <span className="flex-1">{c.label}</span>
              <span style={{ color: inkMuted }}>{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
