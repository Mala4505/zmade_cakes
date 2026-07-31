# Graph Report - .  (2026-08-01)

## Corpus Check
- 189 files · ~81,327 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 997 nodes · 2395 edges · 89 communities (45 shown, 44 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 103 edges (avg confidence: 0.8)
- Token cost: 707,062 input · 124,772 output

## Community Hubs (Navigation)
- Product Pricing & Flavors
- Order Status Actions
- Design System & Brand Tokens
- Admin Analytics Export
- My Orders Lookup Flow
- Admin Calendar & Events
- Inquiry Image Handling
- Admin Loading Skeletons
- Admin Layout & Login Forms
- Business Info & Pricing Panel
- TypeScript / Next.js Config
- Inquiry & Order Status Progression
- Analytics Dashboard Page
- Customer & Order Detail Pages
- Admin Error & Button Component
- Notify & Upload API Routes
- Order ETA & Invoice Admin
- Admin Order List Views
- Inquiries & My-Orders API Routes
- Form Field UI Primitives
- Cancel Inquiry & Customer Changes
- Runtime NPM Dependencies
- Invoice Layout & PDF
- Confirm/Invoice Loading States
- Dev Tooling Dependencies
- Input Component Styling
- Settings Sections Navigation
- Root Layout & Fonts
- New Inquiry & Blackout Dates
- Error Boundaries
- Impeccable Design Critique Workflow
- Inquiries List Page Logic
- PDF Download & Print Buttons
- Settings Validation Schemas
- Customer Lookup Rationale (Phone Matching)
- Package Manifest Scripts
- Orders Table Columns
- Rate Limiting Proxy
- Inquiry Row Actions
- Public Route Entry Pages
- Confirm Page Allergen Selection
- Invoice Print Flow
- Loading Skeleton Layout Rationale
- Analytics Loading Bars
- Motion Easing Curve
- Admin Font Setup
- Agent Instructions & Package Manifest
- Project Instruction Docs
- Customers List & Loading
- Global Error Rationale
- html-to-image Dependency
- lucide-react Dependency
- next Dependency
- Next.js Config Export
- phosphor-icons Dependency
- react Dependency
- react-big-calendar Dependency
- react-dom Dependency
- sharp Dependency
- sonner Dependency
- supabase-ssr Dependency
- upstash-ratelimit Dependency
- upstash-redis Dependency
- PostCSS Config
- Admin Dashboard Loading
- Admin Error Component
- Analytics Bar List
- Analytics Summary Card
- Confirm Error Boundary
- Confirm Page Server Component
- Brand Color Token
- Inquiries Loading Skeleton
- Order Timeline Component
- Levenshtein Distance Helper
- Phone Normalization Helper
- My Orders Error Page
- New Inquiry Page
- Push Notification API
- Order Detail Loading
- Order Error Component
- Order Layout
- Orders Loading Skeleton
- Settings Hub Page
- Track Order Error
- TypeScript Compiler Config
- UI Barrel Exports
- Admin Upload API Route

## God Nodes (most connected - your core abstractions)
1. `createClient (server Supabase client)` - 77 edges
2. `cn()` - 42 edges
3. `formatKWD` - 32 edges
4. `createServiceClient (service-role Supabase client)` - 31 edges
5. `orderSummary` - 30 edges
6. `formatDate` - 29 edges
7. `Skeleton` - 23 edges
8. `derivePaymentStatus` - 23 edges
9. `getSettings` - 22 edges
10. `OptionRow interface` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Phase 5 â€” Polish & Engineering` --references--> `getBusinessContactSettings`  [EXTRACTED]
  ACTION-PLAN-customer-routes.md → lib/supabase/business-settings.ts
- `Flat Corporate Forms Anti-Reference` --semantically_similar_to--> `Do's and Don'ts (Anti-Pattern Rules)`  [INFERRED] [semantically similar]
  PRODUCT.md → DESIGN.md
- `Food-Delivery Apps Anti-Reference (Talabat, Careem)` --semantically_similar_to--> `Do's and Don'ts (Anti-Pattern Rules)`  [INFERRED] [semantically similar]
  PRODUCT.md → DESIGN.md
- `Generic SaaS Dashboards Anti-Reference (Linear, Notion)` --semantically_similar_to--> `Do's and Don'ts (Anti-Pattern Rules)`  [INFERRED] [semantically similar]
  PRODUCT.md → DESIGN.md
- `Over-Designed Pinterest-Core Bakery Anti-Reference` --semantically_similar_to--> `Do's and Don'ts (Anti-Pattern Rules)`  [INFERRED] [semantically similar]
  PRODUCT.md → DESIGN.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Inquiry detail page assembles action, form, image and change-tracking components** — inquirydetailpage_InquiryDetailPage, app_admin_inquiries_id_components_inquiryactions_inquiryactions, app_admin_inquiries_id_components_inquirydetailform_inquirydetailform, app_admin_inquiries_id_components_cancelinquirybutton_cancelinquirybutton, app_admin_inquiries_id_components_collapsibleimages_collapsibleimages, app_admin_inquiries_id_components_customerchangesbanner_customerchangesbanner [EXTRACTED 0.90]
- **Route loading skeletons mirror their page's layout shape** — analyticsloading_AnalyticsLoading, calendarloading_CalendarLoading, customersloading_CustomersLoading, inquirydetailloading_InquiryDetailLoading [INFERRED 0.80]
- **Phone-driven customer lookup, match confirmation, and upsert workflow** — app_admin_inquiries_components_inquiryform_inquiryform, app_admin_inquiries_components_customerhistorypanel_customerhistorypanel, lib_actions_customers_lookupcustomerbyphone, lib_actions_customers_upsertcustomer [EXTRACTED 0.90]
- **Duplicated Order-Status Advance Pattern** — app_admin_orders_id_components_orderdetailactions_orderdetailactions, app_admin_orders_components_orderstatusactions_orderstatusactions, orderspage_OrderCard [INFERRED 0.85]
- **Shared Payment-Status Computation and Display** — inquiriespage_InquiriesPage, app_admin_orders_components_mobileorderlist_mobileordercard, orderspage_OrderCard, dashboardpage_DashboardPage [INFERRED 0.80]
- **Multiple Invoice Output Paths (print page, embedded print, image download)** — admininvoicepage_AdminInvoicePage, orderdetailpage_OrderDetailPage, app_admin_orders_id_components_orderdetailactions_orderdetailactions [INFERRED 0.75]
- **Inline add-new-option UI pattern** — app_admin_products_components_flavorlist_flavorlist, app_admin_products_components_itemlist_itemlist, app_admin_products_components_sizelist_sizelist [INFERRED 0.85]
- **Sizes tab: size catalog + base pricing flow** — app_admin_products_components_productsclient_productsclient, app_admin_products_components_sizelist_sizelist, app_admin_products_components_pricingpanel_pricingpanel [EXTRACTED 0.90]
- **Settings section CRUD forms (updateSetting/option actions + toast)** — app_admin_settings_business_components_businessinfoform_businessinfoform, app_admin_settings_operating_rules_components_operatingrulesform_operatingrulesform, app_admin_settings_options_components_optionsmanager_optionsmanager, app_admin_settings_blackout_dates_components_blackoutdatesmanager_blackoutdatesmanager [INFERRED 0.80]
- **confirmation_token generated, displayed, and validated across inquiry-confirmation flow** — inquiriesRoute_POST, confirmPage_ConfirmPage, app_confirm_token_components_customerphotoupload_customerphotoupload, uploadPublicRoute_POST [INFERRED 0.85]
- **Three-size sharp image resize pipeline (original/medium/thumb) duplicated across upload routes** — uploadOrderRoute_POST, uploadPublicRoute_POST, uploadRoute_POST [INFERRED 0.90]
- **Duplicated WhatsApp Number Normalization Logic** — notfound_NotFound, trackpage_TrackPage, ordersuccesspage_OrderSuccessPage [INFERRED 0.85]
- **Shared Order/Inquiry Data Shape Across Creation, Tracking, and Invoicing** — app_order_components_orderform_orderform, trackpage_TrackPage, components_invoicelayout_invoicelayout [INFERRED 0.75]
- **Login / Forgot Password / Reset Password Flow** — loginpage_LoginPage, forgotpage_ForgotPage, resetpage_ResetPage [INFERRED 0.85]
- **Deferred navigation pending/overlay flow** — components_admin_adminnav_navlinkstatus, components_admin_navpendingcontext_navpendingprovider, components_admin_navpendingcontext_usenavpending, components_admin_navigationoverlay_navigationoverlay [EXTRACTED 0.95]
- **Shared form field primitives (label/control/error wrapper + controls)** — components_ui_field_field, components_ui_input_input, components_ui_checkbox_checkbox, components_phoneinput_phoneinput [INFERRED 0.85]
- **Status badge/select representation pattern for InquiryStatus/OrderStatus** — components_ui_badge_badge, components_admin_statusbadge_statusbadge, components_admin_inquirystatusselect_inquirystatusselect [INFERRED 0.85]
- **Consumers of the sync_order_status RPC** — lib_actions_orders_updateorderstatus, lib_actions_orders_cancelorder, lib_actions_inquiries_updateinquirystatus [EXTRACTED 0.90]
- **Service-role client bypass of RLS for storage/public writes** — lib_actions_images_deleteinquiryimage, lib_actions_products_uploadflavorimage, lib_actions_inquiries_confirminquiry [INFERRED 0.85]
- **Duplicated order/inquiry status transition logic** — lib_actions_orders_valid_transitions, lib_format_order_status_labels, lib_actions_inquiries_updateinquirystatus [INFERRED 0.80]
- **Three-tier Supabase client access pattern (browser, server, service-role)** — lib_supabase_client_createclient, lib_supabase_server_createclient, lib_supabase_server_createserviceclient [INFERRED 0.85]
- **Short-token generation with legacy-UUID-compatible validation** — lib_tokens_generateshorttoken, lib_ui_isvalidtoken, lib_ui_isvaliduuid [EXTRACTED 1.00]
- **WhatsApp template messaging system (defaults, validation, action selection)** — lib_whatsapp_pickwhatsappaction, lib_supabase_types_default_whatsapp_templates, lib_validations_settings_whatsapptemplatesschema [INFERRED 0.85]
- **Admin/Customer Duality Across Product & Design Docs** — designmd_atelier_ledger_concept, productmd_admin_is_tool_customer_is_moment, productmd_zainab_persona, productmd_customer_persona [INFERRED 0.85]
- **Inline Status/Payment Edit Flow** — inquiryredesign_inquiry_status_select, inquiryredesign_inquiry_payment_select, inquiryredesign_payment_status_field, inquiryredesign_update_inquiry_status_action [EXTRACTED 1.00]
- **Shared Anti-References Between PRODUCT.md and DESIGN.md Don'ts** — productmd_generic_saas_anti_ref, productmd_food_delivery_anti_ref, productmd_pinterest_bakery_anti_ref, designmd_donts_section [INFERRED 0.85]

## Communities (89 total, 44 thin omitted)

### Community 0 - "Product Pricing & Flavors"
Cohesion: 0.07
Nodes (56): buildPriceMap(), canonPrices(), FlavorDetail, Props, FlavorImageUpload, Props, FlavorList, FlavorThumb (+48 more)

### Community 1 - "Order Status Actions"
Cohesion: 0.06
Nodes (55): NEXT_STATUS, OrderStatusActions, NEXT_STATUS, OrderDetailActions, Address, ConfirmAction, ConfirmDraft, ConfirmForm component (+47 more)

### Community 2 - "Design System & Brand Tokens"
Cohesion: 0.05
Nodes (55): The Admin Headline Rule, Admin Navigation Component, Amber Bark (#92600f), Artisan Teal (#006860), The Atelier Ledger (Creative North Star), Button Component, Cabinet Grotesk (Customer Heading Font), Cards / List Items Component (+47 more)

### Community 3 - "Admin Analytics Export"
Cohesion: 0.07
Nodes (44): AnalyticsLoading, AnalyticsPage, getAnalyticsData, ExportButton, Props, CustomerDetail, Props, CustomerHistoryPanel (+36 more)

### Community 4 - "My Orders Lookup Flow"
Cohesion: 0.06
Nodes (43): POST /api/inquiries (referenced route), GET /api/my-orders (referenced route), formatEventDate(), MyOrdersContent, MyOrdersPage (Suspense wrapper), OrderResult, Props, MyOrdersServerPage() (+35 more)

### Community 5 - "Admin Calendar & Events"
Cohesion: 0.06
Nodes (34): BaseEvent, BlackoutEvent, CalendarEvent, CalendarView, CalendarViewProps, CustomToolbar, DateCellWrapper, DetailEvent (+26 more)

### Community 6 - "Inquiry Image Handling"
Cohesion: 0.10
Nodes (23): POST /api/upload/order (referenced route), CollapsibleImages, InquiryImageSection, Props, Props, CustomerPhotoUpload component, Props, UploadedPhoto (+15 more)

### Community 7 - "Admin Loading Skeletons"
Cohesion: 0.10
Nodes (7): CELL_WIDTHS, Skeleton, SkeletonCalendar, SkeletonCards, SkeletonForm, SkeletonKanban, SkeletonTable

### Community 8 - "Admin Layout & Login Forms"
Cohesion: 0.12
Nodes (20): AdminLayout(), LoginForm component, ForgotForm component, metadata, LoginPage(), metadata, AdminBottomNav, AdminSidebar (+12 more)

### Community 9 - "Business Info & Pricing Panel"
Cohesion: 0.13
Nodes (21): PricingPanel, toStr(), BusinessInfoForm, BusinessInfoPage(), metadata, OperatingRulesForm, metadata, OperatingRulesPage() (+13 more)

### Community 10 - "TypeScript / Next.js Config"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 11 - "Inquiry & Order Status Progression"
Cohesion: 0.15
Nodes (22): InquiryActions, NEXT_STEP, STATUS_PROGRESSION, OrderWhatsAppActions, EditOrderModal, EditOrderModalProps, ICON_COLORS, PILL_STYLES (+14 more)

### Community 12 - "Analytics Dashboard Page"
Cohesion: 0.14
Nodes (17): AnalyticsPage(), getAnalyticsData(), metadata, CalendarPage(), getBlackoutDates(), getCalendarOrders(), getPendingInquiries(), metadata (+9 more)

### Community 13 - "Customer & Order Detail Pages"
Cohesion: 0.21
Nodes (19): EventDetailBody, CustomerDetailPage(), generateMetadata(), OrderDetailPage(), Props, ConfirmPage(), metadata, Props (+11 more)

### Community 14 - "Admin Error & Button Component"
Cohesion: 0.16
Nodes (15): Button, ButtonProps, ButtonSize, ButtonVariant, SIZE_CLASSES, VARIANT_CLASSES, CakeLoader, T (+7 more)

### Community 15 - "Notify & Upload API Routes"
Cohesion: 0.16
Nodes (13): NotifyBody, POST(), ALLOWED_TYPES, POST(), ALLOWED_TYPES, DELETE(), POST(), ALLOWED_TYPES (+5 more)

### Community 16 - "Order ETA & Invoice Admin"
Cohesion: 0.14
Nodes (14): AdminInvoicePage, OrderEtaSection, Props, OrderImageSection, DashboardPage(), formatPickupTime(), getDashboardData(), metadata (+6 more)

### Community 17 - "Admin Order List Views"
Cohesion: 0.14
Nodes (18): AdminLayout, AnimatedCardList, daysUntil(), MobileOrder, MobileOrderCard, MobileOrderList, OrderInquiry, STATUS_LABELS (+10 more)

### Community 18 - "Inquiries & My-Orders API Routes"
Cohesion: 0.19
Nodes (15): getRatelimit(), POST(), digitWildcardPattern(), fetchOrdersForCustomer(), GET(), getRatelimit(), normalize(), OrderResult (+7 more)

### Community 19 - "Form Field UI Primitives"
Cohesion: 0.18
Nodes (13): Checkbox, CheckboxProps, DetailRowProps, Field, FieldProps, Modal, ModalProps, SIZE_CLASSES (+5 more)

### Community 20 - "Cancel Inquiry & Customer Changes"
Cohesion: 0.17
Nodes (14): CancelInquiryButton, CustomerChangesBanner, Props, generateMetadata(), InquiryDetailPage(), Props, STATUS_ORDER, TIMELINE_STEPS (+6 more)

### Community 21 - "Runtime NPM Dependencies"
Cohesion: 0.12
Nodes (17): date-fns, framer-motion, @hookform/resolvers, dependencies, date-fns, framer-motion, @hookform/resolvers, react-hook-form (+9 more)

### Community 22 - "Invoice Layout & PDF"
Cohesion: 0.24
Nodes (11): InvoiceLayout, Props, InvoicePdfDocument, Props, styles, GOVERNORATE_LABELS, balanceOwed, ALLERGEN_LABELS (+3 more)

### Community 23 - "Confirm/Invoice Loading States"
Cohesion: 0.18
Nodes (5): metadata, NotFound(), metadata, Navbar, Props

### Community 24 - "Dev Tooling Dependencies"
Cohesion: 0.13
Nodes (15): devDependencies, patch-package, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript (+7 more)

### Community 25 - "Input Component Styling"
Cohesion: 0.21
Nodes (9): inputBaseClass, InputProps, InputSize, sizeClass, SelectProps, sizeClass, sizeClass, TextareaProps (+1 more)

### Community 26 - "Settings Sections Navigation"
Cohesion: 0.23
Nodes (6): SETTINGS_SECTIONS, SettingsSection, SettingsMobileBar, SettingsSidebar, metadata, SettingsLayout

### Community 27 - "Root Layout & Fonts"
Cohesion: 0.21
Nodes (10): bricolageGrotesque, geistMono, geistSans, metadata, RootLayout, viewport, metadata, OrderSuccessPage() (+2 more)

### Community 28 - "New Inquiry & Blackout Dates"
Cohesion: 0.26
Nodes (9): metadata, NewInquiryPage(), BlackoutDatesManager, BlackoutDatesPage(), metadata, getOptions, createBlackout, deleteBlackout (+1 more)

### Community 30 - "Impeccable Design Critique Workflow"
Cohesion: 0.20
Nodes (11): Impeccable critique-driven phase workflow, One Voice Rule (single teal accent per screen), Phase 1 â€” Trust & Resilience, Phase 2 â€” Device & Accessibility Mechanics, Phase 3 â€” Copy, Phase 4 â€” Brand Moments, Phase 5 â€” Polish & Engineering, Phase 5.5 â€” One Voice Regression + Wizard Density (+3 more)

### Community 31 - "Inquiries List Page Logic"
Cohesion: 0.24
Nodes (10): getCustomerInquiryCounts(), getInquiries(), InquiriesPage(), isUrgent(), metadata, PAYMENT_OPTIONS, PaymentStatus, selectStyle (+2 more)

### Community 32 - "PDF Download & Print Buttons"
Cohesion: 0.24
Nodes (8): DownloadPdfButton component, Props, sanitizeFileName(), PrintButton component, metadata, Props, PublicInvoicePage(), PublicInvoicePage (server component)

### Community 33 - "Settings Validation Schemas"
Cohesion: 0.22
Nodes (10): BusinessSetting interface, BlackoutDateData, BusinessInfoData, businessInfoSchema, OperatingRulesData, operatingRulesSchema, PricingData, pricingSchema (+2 more)

### Community 34 - "Customer Lookup Rationale (Phone Matching)"
Cohesion: 0.25
Nodes (9): POST /api/inquiries (public inquiry creation), getRatelimit() helper (inquiries route), GET /api/my-orders (token & name+phone lookup), Rationale: digit-wildcard ILIKE fallback for legacy inconsistently formatted phone numbers, Rationale: name check is tolerant edit-distance since phone already uniquely resolved the customer, fetchOrdersForCustomer() helper, getRatelimit() helper (my-orders route), POST /api/upload/order (pre-inquiry reference upload) (+1 more)

### Community 35 - "Package Manifest Scripts"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, postinstall, start, version

### Community 36 - "Orders Table Columns"
Cohesion: 0.32
Nodes (7): BASE_COLUMNS, CANCELLED_COLUMN, daysUntil(), getOrders(), metadata, OrderCard(), OrdersPage()

### Community 37 - "Rate Limiting Proxy"
Cohesion: 0.32
Nodes (7): checkRateLimit, checkRateLimit(), config, getIp, getIp(), limiters (per-route Ratelimit instances), proxy()

### Community 38 - "Inquiry Row Actions"
Cohesion: 0.48
Nodes (6): InquiryRowActions, RowInquiry, setInquiryPaymentFlags, confirmationLink, derivePaymentStatus, 026_add_amount_paid.sql (payment_status generated column)

### Community 39 - "Public Route Entry Pages"
Cohesion: 0.33
Nodes (5): /admin/calendar (referenced route), RootPage, ForgotPage, LoginPage, ResetPage

### Community 41 - "Invoice Print Flow"
Cohesion: 0.50
Nodes (3): PrintButton(), AdminInvoicePage(), Props

### Community 42 - "Loading Skeleton Layout Rationale"
Cohesion: 0.50
Nodes (4): ConfirmLoading skeleton, Rationale: skeleton shape must match ConfirmPage exactly to avoid layout jump, InvoiceLoading skeleton, Rationale: skeleton shape must match InvoiceLayout exactly (previously no loading.tsx caused frozen screen)

### Community 44 - "Motion Easing Curve"
Cohesion: 0.67
Nodes (3): EASE_OUT_QUART Motion Curve, app/globals.css (--ease-out-quart), lib/motion.ts (EASE_OUT_QUART)

### Community 45 - "Admin Font Setup"
Cohesion: 0.67
Nodes (3): Geist (Admin Font), Geist Font (Vercel, via next/font), Next.js Project (create-next-app)

## Ambiguous Edges - Review These
- `FlavorDetail` → `PricingTable`  [AMBIGUOUS]
  app/admin/products/_components/PricingTable.tsx · relation: references
- `InquiryPaymentSelect Component (new)` → `updateInquiryStatus Server Action`  [AMBIGUOUS]
  docs/superpowers/specs/2026-05-29-inquiry-pages-redesign.md · relation: calls

## Knowledge Gaps
- **302 isolated node(s):** `Props`, `BAR_HEIGHTS`, `metadata`, `localizer`, `EventKind` (+297 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `FlavorDetail` and `PricingTable`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `InquiryPaymentSelect Component (new)` and `updateInquiryStatus Server Action`?**
  _Edge tagged AMBIGUOUS (relation: calls) - confidence is low._
- **Why does `createClient (server Supabase client)` connect `Analytics Dashboard Page` to `Product Pricing & Flavors`, `Order Status Actions`, `Admin Analytics Export`, `Orders Table Columns`, `Inquiry Image Handling`, `Inquiry Row Actions`, `Admin Layout & Login Forms`, `Invoice Print Flow`, `Business Info & Pricing Panel`, `Customer & Order Detail Pages`, `Notify & Upload API Routes`, `Order ETA & Invoice Admin`, `Cancel Inquiry & Customer Changes`, `New Inquiry & Blackout Dates`, `Inquiries List Page Logic`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `getBusinessContactSettings` connect `Root Layout & Fonts` to `Confirm Page Allergen Selection`, `Customer & Order Detail Pages`, `Impeccable Design Critique Workflow`, `Notify & Upload API Routes`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `createServiceClient (service-role Supabase client)` connect `Notify & Upload API Routes` to `PDF Download & Print Buttons`, `Order Status Actions`, `Product Pricing & Flavors`, `My Orders Lookup Flow`, `Inquiry Image Handling`, `Confirm Page Allergen Selection`, `Customer & Order Detail Pages`, `Inquiries & My-Orders API Routes`, `Confirm/Invoice Loading States`, `Root Layout & Fonts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `Props`, `BAR_HEIGHTS`, `metadata` to the rest of the system?**
  _302 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Product Pricing & Flavors` be split into smaller, more focused modules?**
  _Cohesion score 0.07453416149068323 - nodes in this community are weakly interconnected._