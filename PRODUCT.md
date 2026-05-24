# Product

## Register

product

## Users

**Zainab (admin)** — The sole operator of ZMade Cakes. Uses the admin panel primarily on her phone between baking sessions: checking new inquiries, updating order status, copying confirmation links to share via WhatsApp. Fast, glanceable interactions matter more than elaborate desktop layouts. She doesn't sit at a desk to manage orders; she checks in from the kitchen.

**Customers (public pages)** — Kuwait-based individuals who receive a WhatsApp link from Zainab. They open it once or twice: to review and confirm their cake order, and optionally to track its status. No account needed, no app to install. The experience must feel trustworthy and premium in a single link click.

## Product Purpose

ZMade Cakes is Zainab's order management system, replacing a fully manual WhatsApp workflow. Zainab creates all inquiries herself (fills in customer details, cake specs, price), sends a confirmation link to the customer, and manages the order through to delivery. Customers confirm via link and track progress without logging in or creating an account. Success looks like Zainab spending zero time managing order confusion over chat, while customers feel they're dealing with a professional studio.

## Brand Personality

Artisanal, bespoke, elegant. A small Kuwait home bakery that operates with the precision and care of a high-end studio. Every detail is intentional: the same care that goes into each cake should be legible in the interface. Warm without being playful. Refined without being cold.

Reference sites for the customer-facing aesthetic: Tuileries Patisserie, Bakes by Tiss, Ista Bake Studio — the editorial-bakery lane: clean type, warm atmosphere, premium product presentation. ZMade has its own visual identity; these capture the quality level and register, not the exact look.

## Anti-references

- Generic SaaS dashboards (Linear, Notion clones) — functional but cold; no warmth, no brand presence in the UI
- Food-delivery apps (Talabat, Careem) — busy, promotional, marketplacey; feels like a catalog, not a bespoke studio
- Over-designed "aesthetic" bakery sites — cursive fonts everywhere, pastel photo overlays, Pinterest-core; beautiful but slow and hard to use daily
- Flat corporate forms — plain white, no visual hierarchy, government-portal energy

## Design Principles

1. **Admin is a tool, customer is a moment.** The admin panel is used daily, fast, on a phone: density and speed matter. Customer-facing pages are used once or twice: they should feel considered, unhurried, and reassuring.
2. **Warm precision.** Every element earns its place, but the sum should feel warm, not clinical. Measurements, dates, and prices are displayed with care, not stuffed into generic forms.
3. **Mobile-first at every step.** Zainab runs this on her phone between baking sessions. Any layout that only works on desktop is a failed layout for this product.
4. **Quiet confidence.** No loud promotional energy. ZMade doesn't need to sell: it's already booked. The interface should feel like a well-run operation, not a storefront competing for attention.
5. **The link is the brand.** The customer's entire interaction happens in a single WhatsApp link. That page carries ZMade's identity. It must look and feel like something Zainab would be proud to send.

## Accessibility & Inclusion

- WCAG AA minimum. Touch targets minimum 44px (critical for phone-first admin use).
- Arabic names and Kuwaiti numbers are common in customer data: text must render correctly with mixed LTR input, though the UI is fully LTR.
- KWD amounts displayed in Geist Mono for numeric alignment and clarity.
- Reduced motion: all Framer Motion animations respect `useReducedMotion`.
