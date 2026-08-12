import { Font } from '@react-pdf/renderer'

let fontsRegistered = false

// Registers the same typefaces the website uses (see app/globals.css) so
// generated invoices/receipts don't fall back to react-pdf's Helvetica/Courier.
// Runs client-side (these PDFs are built in the browser), so `src` must be a
// fetchable URL — same self-hosted convention as Open Sauce Sans in globals.css.
export function registerPdfFonts() {
  if (fontsRegistered) return
  fontsRegistered = true

  // .ttf, not .woff2 — react-pdf's bundled fontkit can't parse woff2 here (throws
  // "Unknown font format"), confirmed by rendering a test PDF against both.
  Font.register({
    family: 'Open Sauce Sans',
    fonts: [
      { src: '/fonts/open-sauce-sans/OpenSauceSans-400.ttf', fontWeight: 400 },
      { src: '/fonts/open-sauce-sans/OpenSauceSans-500.ttf', fontWeight: 500 },
      { src: '/fonts/open-sauce-sans/OpenSauceSans-600.ttf', fontWeight: 600 },
      { src: '/fonts/open-sauce-sans/OpenSauceSans-700.ttf', fontWeight: 700 },
    ],
  })

  Font.register({
    family: 'Fraunces',
    fonts: [{ src: '/fonts/fraunces/Fraunces-700.ttf', fontWeight: 700 }],
  })

  Font.register({
    family: 'Geist Mono',
    fonts: [{ src: '/fonts/geist-mono/GeistMono-400.ttf', fontWeight: 400 }],
  })
}
