import {
  Buildings,
  Clock,
  CalendarX,
  WhatsappLogo,
  Confetti,
} from '@phosphor-icons/react/dist/ssr'
import type { Icon } from '@phosphor-icons/react'

export interface SettingsSection {
  href: string
  title: string
  description: string
  Icon: Icon
}

/** Single source of truth for the settings nav — consumed by the desktop
 *  sidebar, the mobile card index, and the mobile back bar. Product data
 *  (flavors, items, sizes, prices) lives under /admin/products, not here. */
export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { href: '/admin/settings/business', title: 'Business Info', description: 'Phone number, Instagram handle', Icon: Buildings },
  { href: '/admin/settings/operating-rules', title: 'Operating Rules', description: 'Minimum booking lead time', Icon: Clock },
  { href: '/admin/settings/blackout-dates', title: 'Blackout Dates', description: 'Blocked date ranges for holidays', Icon: CalendarX },
  { href: '/admin/settings/whatsapp-templates', title: 'WhatsApp Templates', description: 'Message templates for customer notifications', Icon: WhatsappLogo },
  { href: '/admin/settings/options', title: 'Occasions', description: 'Occasions offered on the inquiry form', Icon: Confetti },
]
