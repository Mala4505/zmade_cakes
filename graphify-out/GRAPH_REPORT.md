# Graph Report - C:\Users\Lenovo T470s\Desktop\Aliasger\Projects\ZMade\zmade-new  (2026-05-25)

## Corpus Check
- Corpus is ~32,693 words - fits in a single context window. You may not need a graph.

## Summary
- 443 nodes · 757 edges · 54 communities (27 shown, 27 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 69 edges (avg confidence: 0.88)
- Token cost: 320 input · 280 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Settings Module Pages|Settings Module Pages]]
- [[_COMMUNITY_Server Actions Layer|Server Actions Layer]]
- [[_COMMUNITY_Supabase Auth Patterns|Supabase Auth Patterns]]
- [[_COMMUNITY_Settings CRUD Actions|Settings CRUD Actions]]
- [[_COMMUNITY_Customer & Inquiry Actions|Customer & Inquiry Actions]]
- [[_COMMUNITY_Auth & Navigation|Auth & Navigation]]
- [[_COMMUNITY_Customer-Facing Flows|Customer-Facing Flows]]
- [[_COMMUNITY_Inquiry Feature Flags|Inquiry Feature Flags]]
- [[_COMMUNITY_Options CRUD|Options CRUD]]
- [[_COMMUNITY_Product Principles & Users|Product Principles & Users]]
- [[_COMMUNITY_Invoice & Image Utilities|Invoice & Image Utilities]]
- [[_COMMUNITY_Admin UI Components|Admin UI Components]]
- [[_COMMUNITY_Public Submission Flow|Public Submission Flow]]
- [[_COMMUNITY_Login Module|Login Module]]
- [[_COMMUNITY_Rate Limiting Layer|Rate Limiting Layer]]
- [[_COMMUNITY_DB Option Tables|DB Option Tables]]
- [[_COMMUNITY_Order Form Logic|Order Form Logic]]
- [[_COMMUNITY_Design System Rules|Design System Rules]]
- [[_COMMUNITY_Proxy Rate Limiter|Proxy Rate Limiter]]
- [[_COMMUNITY_Settings Layout Shell|Settings Layout Shell]]
- [[_COMMUNITY_Next.js Boilerplate Assets|Next.js Boilerplate Assets]]
- [[_COMMUNITY_Pricing Configuration|Pricing Configuration]]
- [[_COMMUNITY_Agent Config Docs|Agent Config Docs]]
- [[_COMMUNITY_TS Env Reference|TS Env Reference]]
- [[_COMMUNITY_Next Config File|Next Config File]]
- [[_COMMUNITY_PostCSS Tailwind Config|PostCSS Tailwind Config]]
- [[_COMMUNITY_Root Layout File|Root Layout File]]
- [[_COMMUNITY_Order Layout File|Order Layout File]]
- [[_COMMUNITY_Page Header Component|Page Header Component]]
- [[_COMMUNITY_Create Inquiry Action|Create Inquiry Action]]
- [[_COMMUNITY_Update Inquiry Action|Update Inquiry Action]]
- [[_COMMUNITY_Send Confirmation Action|Send Confirmation Action]]
- [[_COMMUNITY_Cancel Order Action|Cancel Order Action]]
- [[_COMMUNITY_Update ETA Action|Update ETA Action]]
- [[_COMMUNITY_Token Schema|Token Schema]]
- [[_COMMUNITY_Option Form Type|Option Form Type]]
- [[_COMMUNITY_Business Info Schema|Business Info Schema]]
- [[_COMMUNITY_Operating Rules Schema|Operating Rules Schema]]
- [[_COMMUNITY_Blackout Date Type|Blackout Date Type]]
- [[_COMMUNITY_Business Info Type|Business Info Type]]
- [[_COMMUNITY_Operating Rules Type|Operating Rules Type]]
- [[_COMMUNITY_Pricing Data Type|Pricing Data Type]]
- [[_COMMUNITY_WhatsApp Templates Type|WhatsApp Templates Type]]
- [[_COMMUNITY_README Boilerplate|README Boilerplate]]
- [[_COMMUNITY_File SVG Icon|File SVG Icon]]
- [[_COMMUNITY_Globe SVG Icon|Globe SVG Icon]]
- [[_COMMUNITY_Next.js Logo SVG|Next.js Logo SVG]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 19 edges
2. `lib/supabase/types — Shared DB types (Inquiry, Order, Customer, BlackoutDate, etc.)` - 17 edges
3. `createServiceClient()` - 15 edges
4. `DB: inquiries table` - 15 edges
5. `lib/supabase/server — createClient() Supabase SSR client factory` - 14 edges
6. `lib/utils — Shared utilities (formatDate, formatKWD, formatTime, cn, GOVERNORATE_LABELS, INQUIRY_STATUS_LABELS, confirmationLink, trackingLink)` - 14 edges
7. `app/admin/inquiries/[id]/page.tsx — Inquiry Detail Page` - 13 edges
8. `InquiryForm — Full inquiry create/edit form with react-hook-form + zod` - 13 edges
9. `components/admin/PageHeader — PageHeader shared component` - 13 edges
10. `lib/actions/settings — getSettings(), getBlackouts() server actions` - 12 edges

## Surprising Connections (you probably didn't know these)
- `WhatsApp-Driven Order Workflow` --conceptually_related_to--> `Tracking Token (UUID per order)`  [INFERRED]
  PRODUCT.md → lib/supabase/types.ts
- `Track Order Page` --conceptually_related_to--> `trackingLink Utility`  [INFERRED]
  app/track/[token]/page.tsx → lib/utils.ts
- `WhatsApp-Driven Order Workflow` --conceptually_related_to--> `WhatsAppTemplates Interface`  [INFERRED]
  PRODUCT.md → lib/supabase/types.ts
- `WhatsApp-Driven Order Workflow` --conceptually_related_to--> `Confirmation Token (UUID per inquiry)`  [INFERRED]
  PRODUCT.md → lib/supabase/types.ts
- `formatDate()` --calls--> `formatTime()`  [INFERRED]
  app/admin/calendar/_components/CalendarView.tsx → lib/utils.ts

## Hyperedges (group relationships)
- **Admin Auth Guard Pattern — Both admin layouts redirect unauthenticated users to /login** — admin_layout_group, admin_layout, lib_supabase_server, proxy_fn_proxy [EXTRACTED 1.00]
- **Inquiry CRUD Flow — Pages, form, and server actions for creating/editing inquiries** — admin_inquiries_page, admin_inquiries_new_page, admin_inquiries_detail_page, inquiry_form, lib_actions_inquiries, db_table_inquiries [EXTRACTED 1.00]
- **Order Lifecycle — Kanban board, detail view, status transitions, ETA, invoice** — admin_orders_page, admin_orders_detail_page, orders_OrderCard, order_detail_actions, order_eta_section, components_admin_InvoicePrint, lib_actions_orders, db_table_orders [EXTRACTED 1.00]
- **WhatsApp Messaging Pattern — Confirmation link, order ready, balance due messages via wa.me URLs** — inquiry_actions, lib_supabase_types [EXTRACTED 1.00]
- **Rate Limiting Middleware — Route-specific sliding window limits via Upstash** — proxy_fn_proxy, proxy_ratelimiters, proxy_fn_checkRateLimit, ext_upstash_redis, ext_upstash_ratelimit [EXTRACTED 1.00]
- **Nav Badge Counts — Admin layout queries pending inquiry + ready order counts for sidebar/bottom nav badges** — admin_layout, components_admin_AdminNav, db_table_inquiries, db_table_orders [EXTRACTED 1.00]
- **Customer Lookup & Pre-fill — InquiryForm debounces phone lookup, shows CustomerHistoryPanel, prefills cake details** — inquiry_form, customer_history_panel, lib_actions_customers, db_table_customers [EXTRACTED 1.00]
- **Admin Settings Sub-pages (Business, Operating Rules, Pricing, Blackout Dates, WhatsApp Templates, Options)** — BusinessInfoPage_component, OperatingRulesPage_component, PricingPage_component, BlackoutDatesPage_component, WhatsAppTemplatesPage_component, OptionsPage_component [EXTRACTED 1.00]
- **Settings Client Forms that call updateSetting/createBlackout/deleteBlackout** — BusinessInfoForm_component, OperatingRulesForm_component, PricingForm_component, WhatsAppTemplatesForm_component, BlackoutDatesManager_component [EXTRACTED 1.00]
- **Public Inquiry Submission Flow (rate-limit → upsert customer → insert inquiry → insert delivery address → notify)** — api_inquiries_route, upstash_ratelimit, supabase_table_customers, supabase_table_inquiries, supabase_table_delivery_addresses, supabase_table_notifications [EXTRACTED 1.00]
- **Image Upload Pipeline (sharp resize → Supabase storage → inquiry_images record)** — api_upload_route, api_upload_public_route, supabase_bucket_cake_references, supabase_table_inquiry_images [EXTRACTED 1.00]
- **Customer Order Confirmation Flow (ConfirmPage → ConfirmForm → confirmInquiry action → redirect to /track)** — ConfirmPage_component, ConfirmForm_component, lib_actions_inquiries, supabase_table_inquiries, supabase_table_orders [EXTRACTED 1.00]
- **Public Order Submission Flow** — order_page, OrderForm_component, api_inquiries_endpoint, order_success_page [EXTRACTED 1.00]
- **Admin Navigation System** — AdminSidebar_component, AdminBottomNav_component [EXTRACTED 1.00]
- **Supabase Client Factory** — supabase_client, supabase_server_createClient, supabase_server_createServiceClient [INFERRED 0.95]
- **Server Actions Suite** — actions_auth, actions_customers, actions_images, actions_inquiries, actions_options, actions_orders, actions_settings [INFERRED 0.95]
- **Inquiry Lifecycle Actions** — createInquiry_action, updateInquiry_action, sendConfirmationLink_action, confirmInquiry_action [EXTRACTED 1.00]
- **Order Lifecycle Actions** — updateOrderStatus_action, cancelOrder_action, updateOrderEta_action [EXTRACTED 1.00]
- **Public Order Tracking Flow** — track_token_page, db_orders, db_inquiry_images, isValidUUID_fn [EXTRACTED 1.00]
- **Status Display Components** — StatusBadge_component, PriorityBadge_component [EXTRACTED 1.00]
- **Formatting Utility Functions** — formatDate_fn, formatKWD_fn, cn_fn, isValidUUID_fn, confirmationLink_fn, trackingLink_fn [EXTRACTED 1.00]
- **Core Database Schema (Inquiries, Orders, Notifications, Customers)** — db_inquiries, db_orders, db_notifications, db_customers, db_delivery_addresses, db_inquiry_images [EXTRACTED 1.00]
- **Dropdown Option Tables (Admin-Managed)** — db_flavor_options, db_size_options, db_occasion_options, db_theme_options, db_decoration_style_options [EXTRACTED 1.00]
- **Business Configuration Tables** — db_business_settings, db_blackout_dates [EXTRACTED 1.00]
- **Zod Validation Layer (All Schemas)** — validation_inquirySchema, validation_deliveryAddressSchema, validation_customerConfirmSchema, validation_optionSchema, validation_blackoutDateSchema, validation_businessInfoSchema, validation_operatingRulesSchema, validation_pricingSchema, validation_whatsappTemplatesSchema, validation_tokenSchema [INFERRED 0.95]
- **Supabase Client Layer (Server + Service)** — server_createClient, server_createServiceClient, types_Database [EXTRACTED 1.00]
- **ZMade Design System Named Rules** — concept_design_one_voice_rule, concept_design_warm_base_rule, concept_design_flat_by_default, concept_design_mono_numbers, concept_design_admin_headline_rule [EXTRACTED 1.00]
- **Token-Based Public Access (no auth required)** — concept_confirmation_token, concept_tracking_token, concept_token_auth_pattern, concept_service_role_pattern, server_createServiceClient [INFERRED 0.95]
- **Migration 006: Allergens + Balance Tracking Extension** — concept_allergen_system, concept_balance_tracking, types_AllergenFlags, types_hasAllergens, types_ALLERGEN_LABELS [EXTRACTED 1.00]

## Communities (54 total, 27 thin omitted)

### Community 0 - "Settings Module Pages"
Cohesion: 0.05
Nodes (71): BlackoutDatesManager, Blackout Dates Page, BusinessInfoForm, Business Info Page, OperatingRulesForm, Operating Rules Page, OptionsManager, Options Page (+63 more)

### Community 1 - "Server Actions Layer"
Cohesion: 0.08
Nodes (21): deleteInquiryImage(), getInquiryImages(), cancelOrder(), updateOrderEta(), updateOrderStatus(), handleDelete(), PriorityBadge(), StatusBadge() (+13 more)

### Community 2 - "Supabase Auth Patterns"
Cohesion: 0.07
Nodes (34): Service Role Pattern (bypass RLS for public routes), Token-Based Public Access (no login needed), createClient (Server Supabase), createServiceClient (Service Role), ALLERGEN_LABELS Constant, AllergenFlags Type, BlackoutDate Interface, BusinessSetting Interface (+26 more)

### Community 3 - "Settings CRUD Actions"
Cohesion: 0.11
Nodes (10): createBlackout(), deleteBlackout(), getBlackouts(), getSettings(), updateSetting(), BlackoutDatesPage(), BusinessInfoPage(), OperatingRulesPage() (+2 more)

### Community 4 - "Customer & Inquiry Actions"
Cohesion: 0.09
Nodes (9): lookupCustomerByPhone(), updateCustomerNotes(), upsertCustomer(), cancelInquiry(), confirmInquiry(), createInquiry(), sendConfirmationLink(), updateInquiry() (+1 more)

### Community 5 - "Auth & Navigation"
Cohesion: 0.11
Nodes (10): signIn(), CalendarPage(), getBlackoutDates(), getCalendarOrders(), getRatelimit(), POST(), OrderPage(), POST() (+2 more)

### Community 6 - "Customer-Facing Flows"
Cohesion: 0.09
Nodes (28): ConfirmForm, Confirm Page, CustomerPhotoUpload, ImageGallery Component, app/admin/layout.tsx — Admin Layout (auth guard + badge counts from DB), app/(admin)/layout.tsx — Admin Layout Group (auth guard, no badge counts), POST /api/inquiries, POST /api/notify (+20 more)

### Community 7 - "Inquiry Feature Flags"
Cohesion: 0.18
Nodes (17): Inquiry Server Actions, Order Server Actions, Allergen Flag System on Inquiries, Balance Paid Tracking on Inquiries, Inquiry Source Tracking (admin vs public_form), Tracking Token (UUID per order), confirmInquiry Server Action, DB: delivery_addresses table (+9 more)

### Community 8 - "Options CRUD"
Cohesion: 0.23
Nodes (7): createOption(), deleteOption(), getAllOptions(), getOptions(), isValidTable(), updateOption(), OptionsPage()

### Community 9 - "Product Principles & Users"
Cohesion: 0.18
Nodes (11): Admin Panel (Zainab's Ledger), Confirmation Token (UUID per inquiry), Customer-Facing Pages (Confirmation + Tracking), User: Customers (Public Link Recipients), Product Principle: Mobile-First Admin (phone between baking), WhatsApp-Driven Order Workflow, User: Zainab (Sole Admin Operator), PRODUCT.md (Product Spec) (+3 more)

### Community 10 - "Invoice & Image Utilities"
Cohesion: 0.24
Nodes (10): GOVERNORATE_LABELS Constant, InvoicePrint Component, Image Server Actions, DB: inquiry_images table, formatDate Utility, formatKWD Utility, isValidUUID Utility, Supabase Storage: cake-references bucket (+2 more)

### Community 11 - "Admin UI Components"
Cohesion: 0.29
Nodes (8): AdminBottomNav Component, AdminSidebar Component, PriorityBadge Component, StatusBadge Component, Customer Server Actions, cn (classnames) Utility, DB: customers table, Supabase Database Types

### Community 12 - "Public Submission Flow"
Cohesion: 0.32
Nodes (8): OrderForm Component, Settings Server Actions, POST /api/inquiries Endpoint, DB: blackout_dates table, DB: business_settings table, DB: flavor/size/occasion/theme/decoration option tables, Order Page, Order Success Page

### Community 13 - "Login Module"
Cohesion: 0.29
Nodes (8): LoginForm Component, Auth Server Actions, Options Server Actions, Login Page, signIn Server Action, signOut Server Action, Supabase Server createClient, Options Validation Schema

### Community 14 - "Rate Limiting Layer"
Cohesion: 0.29
Nodes (7): @supabase/ssr — Supabase SSR client (createServerClient), @upstash/ratelimit — Sliding window rate limiter, Upstash Redis — Rate limiter backing store, checkRateLimit() — Apply Upstash Ratelimit, getIp() — Extract Client IP from Request, proxy() — Main Middleware Handler, Rate Limiters Map (login/confirm/track/notify/admin/global)

### Community 15 - "DB Option Tables"
Cohesion: 0.29
Nodes (7): DB Table: decoration_style_options, DB Table: flavor_options, DB Table: occasion_options, RLS Policy: Option Tables (admin+anon), DB Table: size_options, DB Table: theme_options, OPTION_TABLES Constant

### Community 17 - "Design System Rules"
Cohesion: 0.33
Nodes (6): Design Rule: No Cabinet Grotesk in Admin Panel, Design Rule: Flat By Default (no card shadows), Design Rule: Mono Numbers (Geist Mono for KWD/IDs), Design Rule: One Voice (single teal accent per screen), Design Rule: Warm Base (no pure white backgrounds), DESIGN.md (Design System Document)

### Community 18 - "Proxy Rate Limiter"
Cohesion: 0.83
Nodes (3): checkRateLimit(), getIp(), proxy()

### Community 20 - "Next.js Boilerplate Assets"
Cohesion: 0.83
Nodes (4): Next.js Default Boilerplate, Public Static Assets, Vercel Logo SVG, Browser Window Icon SVG

### Community 21 - "Pricing Configuration"
Cohesion: 0.67
Nodes (3): Pricing Matrix Business Setting, Rush Multiplier Business Setting, pricingSchema (Zod)

## Knowledge Gaps
- **105 isolated node(s):** `next-env.d.ts — Next.js TypeScript Env Reference`, `next.config.ts — Next.js Config`, `postcss.config.mjs — PostCSS Config (Tailwind)`, `getIp() — Extract Client IP from Request`, `app/layout.tsx — Root Layout (Geist + Bricolage fonts)` (+100 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `lib/utils — Shared utilities (formatDate, formatKWD, formatTime, cn, GOVERNORATE_LABELS, INQUIRY_STATUS_LABELS, confirmationLink, trackingLink)` connect `Settings Module Pages` to `Admin UI Components`, `Customer-Facing Flows`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `Supabase Database Types` connect `Admin UI Components` to `Settings Module Pages`, `Invoice & Image Utilities`, `Customer-Facing Flows`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `Customer Server Actions` connect `Admin UI Components` to `Login Module`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `createServiceClient()` (e.g. with `POST()` and `POST()`) actually correct?**
  _`createServiceClient()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `DB: inquiries table` (e.g. with `Inquiry Interface` and `Allergen Flag System on Inquiries`) actually correct?**
  _`DB: inquiries table` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `next-env.d.ts — Next.js TypeScript Env Reference`, `next.config.ts — Next.js Config`, `postcss.config.mjs — PostCSS Config (Tailwind)` to the rest of the system?**
  _105 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Settings Module Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._