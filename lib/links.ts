export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export function confirmationLink(token: string): string {
  return `${appUrl}/confirm/${token}`
}

export function trackingLink(token: string): string {
  return `${appUrl}/track/${token}`
}

export function myOrdersLink(portalToken: string): string {
  return `${appUrl}/my-orders?token=${portalToken}`
}

export function receiptLink(token: string): string {
  return `${appUrl}/receipt/${token}`
}
