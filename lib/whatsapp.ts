export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

export function whatsappUrl(phone: string, text: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const number = cleaned.startsWith('965') ? cleaned : `965${cleaned}`
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

export function whatsappUrlNoText(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const number = cleaned.startsWith('965') ? cleaned : `965${cleaned}`
  return `https://wa.me/${number}`
}
