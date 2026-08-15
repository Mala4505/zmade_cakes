import type { CustomerEditDiffEntry } from '../format'
import { BRAND_NAME } from '../brand'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type DeliveryType = 'pickup' | 'delivery'
export type PaymentMethod = '' | 'cash' | 'wamd'
export type Priority = 0 | 1 | 2
export type InquiryStatus =
  | 'pending'
  | 'confirmed'
  | 'delivered'
  | 'cancelled'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid'
export type OrderStatus = 'confirmed' | 'delivered' | 'cancelled'
export type NotificationType = 'inquiry_created' | 'customer_confirmed' | 'order_update' | 'general'
export type Governorate =
  | 'capital'
  | 'hawalli'
  | 'farwaniyah'
  | 'ahmadi'
  | 'jahra'
  | 'mubarak_al_kabeer'

export interface OptionRow {
  id: string
  name: string
  sort_order: number
  is_active: boolean
  image_url: string | null
  created_at: string
}

export interface DeliveryAddress {
  id: string
  inquiry_id: string
  governorate: Governorate
  area: string
  block: string
  street: string
  house_no: string
  extra_notes: string
  location_link: string
  created_at: string
}

// One row per distinct item within an inquiry/order (see supabase/migrations/034_multi_item_
// inquiries.sql). The matching nine flat columns still live on Inquiry too (removal deferred
// to migration 035) — items is populated only on joined reads, same optionality pattern as
// delivery_address below.
export interface InquiryItem {
  id: string
  inquiry_id: string
  sort_order: number
  order_type: 'cake' | 'other_item'
  item_name: string
  cake_size: string
  flavor: string
  occasion: string
  theme: string
  message_on_cake: string
  quantity: number
  special_requirements: string
  created_at: string
}

export interface Inquiry {
  id: string
  customer_name: string
  customer_phone: string
  cake_size: string
  flavor: string
  occasion: string
  theme: string
  decoration_style: string
  message_on_cake: string
  quantity: number
  special_requirements: string
  allergen_nut_free: boolean
  allergen_gluten_free: boolean
  allergen_dairy_free: boolean
  allergen_egg_free: boolean
  allergen_halal: boolean
  allergen_raw_sugar: boolean
  allergen_other: string
  fully_paid: boolean
  event_date: string
  pickup_time: string | null
  delivery_type: DeliveryType
  status: InquiryStatus
  admin_price: string | null
  discount: string
  delivery_charge: string
  order_type: 'cake' | 'other_item'
  item_name: string
  deposit_amount: string | null
  amount_paid: string | null
  payment_method: PaymentMethod
  // Generated column (see supabase/migrations/015_unified_payment_model.sql) — Row-only,
  // never settable on Insert/Update. Derive client-side via lib/payments.ts#derivePaymentStatus.
  payment_status: PaymentStatus
  admin_notes: string
  // DB column stays (untouched, unused) — Priority/priority is removed from all UI/validation
  // per the plan, but the Row type still mirrors the live DB column.
  priority: Priority
  confirmation_token: string
  confirmation_sent_at: string | null
  customer_confirmed: boolean
  customer_confirmed_at: string | null
  customer_id: string | null
  source: 'admin' | 'public_form'
  customer_comments: string
  customer_edit_diff: CustomerEditDiffEntry[] | null
  created_at: string
  updated_at: string
  delivery_address?: DeliveryAddress | null
  // Populated only on joined reads (see supabase/migrations/034_multi_item_inquiries.sql) —
  // the nine matching flat fields above still live on this row too until migration 035 drops
  // them; do not assume both are populated simultaneously.
  items?: InquiryItem[]
}

export interface Order {
  id: string
  inquiry_id: string
  tracking_token: string
  status: OrderStatus
  final_price: string
  deposit_amount: string | null
  amount_paid: string | null
  delivery_charge: string
  delivery_type: DeliveryType
  eta_date: string | null
  eta_time: string | null
  eta_note: string
  created_at: string
  updated_at: string
  inquiry?: Inquiry
}

export interface Payment {
  id: string
  order_id: string
  amount: string
  method: PaymentMethod
  receipt_token: string
  note: string | null
  paid_at: string
  created_at: string
}

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  is_read: boolean
  inquiry_id: string | null
  order_id: string | null
  created_at: string
}

// Halal + Gluten-free are dropped from the UI/validation set (owner-requested change); the
// underlying allergen_gluten_free / allergen_halal DB columns stay in place, untouched, just
// no longer surfaced here. Raw sugar is the new UI-facing flag.
export type AllergenFlags = Pick<Inquiry,
  | 'allergen_nut_free'
  | 'allergen_dairy_free'
  | 'allergen_egg_free'
  | 'allergen_raw_sugar'
  | 'allergen_other'
>

export function hasAllergens(inq: AllergenFlags): boolean {
  return inq.allergen_nut_free || inq.allergen_dairy_free || inq.allergen_egg_free || inq.allergen_raw_sugar || inq.allergen_other.length > 0
}

export const ALLERGEN_LABELS: Record<keyof Omit<AllergenFlags, 'allergen_other'>, string> = {
  allergen_nut_free: 'Nut-free',
  allergen_dairy_free: 'Dairy-free',
  allergen_egg_free: 'Egg-free',
  allergen_raw_sugar: 'Raw sugar',
}

export interface Customer {
  id: string
  phone: string
  name: string
  notes: string
  vip: boolean
  created_at: string
  updated_at: string
}

export interface InquiryImage {
  id: string
  inquiry_id: string
  uploaded_by: 'customer' | 'admin'
  image_type: 'reference' | 'finished'
  url_original: string
  url_medium: string
  url_thumb: string
  caption: string
  created_at: string
}

export interface BlackoutDate {
  id: string
  date_from: string
  date_to: string
  reason: string
  created_at: string
}

export type BusinessSettingKey =
  | 'min_lead_days'
  | 'business_phone'
  | 'business_instagram'
  | 'whatsapp_templates'
  | 'pricing_matrix'
  | 'min_price_guard'
  | 'rush_multiplier'
  | 'notification_prefs'

export interface BusinessSetting {
  key: BusinessSettingKey
  value: unknown
  updated_at: string
}

export interface WhatsAppTemplates {
  confirmationLink: string
  orderDelivered: string
  balanceDue: string
  trackingLink: string
  myOrdersLink: string
}

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplates = {
  confirmationLink: `Hi {name}! Here is your ${BRAND_NAME} confirmation link: {link}`,
  orderDelivered: "Hi {name}! Great news — your order has been delivered. We hope you enjoy every bite!\n\n{link}",
  balanceDue: 'Hi {name}! A reminder that your balance of KWD {amount} is due on delivery.\n\n{link}',
  trackingLink: `Hi {name}! Track your ${BRAND_NAME} order here: {link}`,
  myOrdersLink: `Hi {name}! You can view all your ${BRAND_NAME} orders anytime here: {link}`,
}

export interface NotificationPrefs {
  push_enabled: boolean
  types: Record<NotificationType, boolean>
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  push_enabled: true,
  types: {
    inquiry_created: true,
    customer_confirmed: true,
    order_update: true,
    general: true,
  },
}

export interface PushSubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string
  created_at: string
  last_seen_at: string
}

export interface FlavorSizePrice {
  id: string
  flavor_id: string
  size_id: string
  price: number
  created_at: string
  updated_at: string
}

export interface FlavorWithPrices extends OptionRow {
  theme_available: boolean
  prices: FlavorSizePrice[]
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      blackout_dates: {
        Row: { created_at: string; date_from: string; date_to: string; id: string; reason: string }
        Insert: { created_at?: string; date_from: string; date_to: string; id?: string; reason?: string }
        Update: { created_at?: string; date_from?: string; date_to?: string; id?: string; reason?: string }
        Relationships: []
      }
      business_settings: {
        Row: { key: string; updated_at: string; value: Json }
        Insert: { key: string; updated_at?: string; value: Json }
        Update: { key?: string; updated_at?: string; value?: Json }
        Relationships: []
      }
      customers: {
        Row: { created_at: string; id: string; name: string; notes: string; phone: string; updated_at: string; vip: boolean }
        Insert: { created_at?: string; id?: string; name: string; notes?: string; phone: string; updated_at?: string; vip?: boolean }
        Update: { created_at?: string; id?: string; name?: string; notes?: string; phone?: string; updated_at?: string; vip?: boolean }
        Relationships: []
      }
      decoration_style_options: {
        Row: { created_at: string; id: string; image_url: string | null; is_active: boolean; name: string; sort_order: number }
        Insert: { created_at?: string; id?: string; image_url?: string | null; is_active?: boolean; name: string; sort_order?: number }
        Update: { created_at?: string; id?: string; image_url?: string | null; is_active?: boolean; name?: string; sort_order?: number }
        Relationships: []
      }
      delivery_addresses: {
        Row: { area: string; block: string; created_at: string; extra_notes: string; governorate: string; house_no: string; id: string; inquiry_id: string; location_link: string; street: string }
        Insert: { area: string; block: string; created_at?: string; extra_notes?: string; governorate: string; house_no: string; id?: string; inquiry_id: string; location_link?: string; street: string }
        Update: { area?: string; block?: string; created_at?: string; extra_notes?: string; governorate?: string; house_no?: string; id?: string; inquiry_id?: string; location_link?: string; street?: string }
        Relationships: [{ foreignKeyName: 'delivery_addresses_inquiry_id_fkey'; columns: ['inquiry_id']; isOneToOne: true; referencedRelation: 'inquiries'; referencedColumns: ['id'] }]
      }
      flavor_options: {
        Row: { created_at: string; id: string; image_url: string | null; is_active: boolean; name: string; sort_order: number; theme_available: boolean }
        Insert: { created_at?: string; id?: string; image_url?: string | null; is_active?: boolean; name: string; sort_order?: number; theme_available?: boolean }
        Update: { created_at?: string; id?: string; image_url?: string | null; is_active?: boolean; name?: string; sort_order?: number; theme_available?: boolean }
        Relationships: []
      }
      flavor_size_prices: {
        Row: { created_at: string; flavor_id: string; id: string; price: number; size_id: string; updated_at: string }
        Insert: { created_at?: string; flavor_id: string; id?: string; price: number; size_id: string; updated_at?: string }
        Update: { created_at?: string; flavor_id?: string; id?: string; price?: number; size_id?: string; updated_at?: string }
        Relationships: [
          { foreignKeyName: 'flavor_size_prices_flavor_id_fkey'; columns: ['flavor_id']; isOneToOne: false; referencedRelation: 'flavor_options'; referencedColumns: ['id'] },
          { foreignKeyName: 'flavor_size_prices_size_id_fkey'; columns: ['size_id']; isOneToOne: false; referencedRelation: 'size_options'; referencedColumns: ['id'] },
        ]
      }
      inquiries: {
        // Row mirrors the live DB exactly: allergen_gluten_free/allergen_halal and priority
        // stay as real, populated columns (untouched by the Phase B migrations) even though
        // they're no longer settable via Insert/Update or surfaced in UI/validation.
        // payment_status is a STORED generated column (015_unified_payment_model.sql) — Row
        // only, never on Insert/Update.
        Row: { admin_notes: string; admin_price: number | null; discount: string; delivery_charge: string; order_type: 'cake' | 'other_item'; item_name: string; deposit_amount: number | null; amount_paid: number | null; allergen_dairy_free: boolean; allergen_egg_free: boolean; allergen_gluten_free: boolean; allergen_halal: boolean; allergen_nut_free: boolean; allergen_other: string; allergen_raw_sugar: boolean; fully_paid: boolean; cake_size: string; confirmation_token: string; confirmation_sent_at: string | null; created_at: string; customer_comments: string; customer_confirmed: boolean; customer_confirmed_at: string | null; customer_edit_diff: Json | null; customer_id: string | null; customer_name: string; customer_phone: string; decoration_style: string; delivery_type: string; event_date: string; flavor: string; id: string; message_on_cake: string; occasion: string; payment_method: string; payment_status: string; pickup_time: string | null; priority: number; quantity: number; source: string; special_requirements: string; status: string; theme: string; updated_at: string }
        // cake_size/flavor are optional here (unlike Row, which mirrors the live NOT NULL
        // columns): migration 034 gives both a DEFAULT '' — same staged-deprecation pattern
        // as decoration_style in 017_cake_details_consolidation.sql — since new inserts no
        // longer set them at all (that data lives in inquiry_items now).
        Insert: { admin_notes?: string; admin_price?: number | null; discount?: number; delivery_charge?: number; order_type?: 'cake' | 'other_item'; item_name?: string; deposit_amount?: number | null; amount_paid?: number | null; allergen_dairy_free?: boolean; allergen_egg_free?: boolean; allergen_nut_free?: boolean; allergen_other?: string; allergen_raw_sugar?: boolean; fully_paid?: boolean; cake_size?: string; confirmation_token?: string; confirmation_sent_at?: string | null; created_at?: string; customer_comments?: string; customer_confirmed?: boolean; customer_confirmed_at?: string | null; customer_edit_diff?: Json | null; customer_id?: string | null; customer_name: string; customer_phone: string; decoration_style?: string; delivery_type?: string; event_date: string; flavor?: string; id?: string; message_on_cake?: string; occasion?: string; payment_method?: string; pickup_time?: string | null; quantity?: number; source?: string; special_requirements?: string; status?: string; theme?: string; updated_at?: string }
        Update: { admin_notes?: string; admin_price?: number | null; discount?: number; delivery_charge?: number; order_type?: 'cake' | 'other_item'; item_name?: string; deposit_amount?: number | null; amount_paid?: number | null; allergen_dairy_free?: boolean; allergen_egg_free?: boolean; allergen_nut_free?: boolean; allergen_other?: string; allergen_raw_sugar?: boolean; fully_paid?: boolean; cake_size?: string; confirmation_token?: string; confirmation_sent_at?: string | null; created_at?: string; customer_comments?: string; customer_confirmed?: boolean; customer_confirmed_at?: string | null; customer_edit_diff?: Json | null; customer_id?: string | null; customer_name?: string; customer_phone?: string; decoration_style?: string; delivery_type?: string; event_date?: string; flavor?: string; id?: string; message_on_cake?: string; occasion?: string; payment_method?: string; pickup_time?: string | null; quantity?: number; source?: string; special_requirements?: string; status?: string; theme?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: 'inquiries_customer_id_fkey'; columns: ['customer_id']; isOneToOne: false; referencedRelation: 'customers'; referencedColumns: ['id'] }]
      }
      inquiry_images: {
        Row: { caption: string; created_at: string; id: string; image_type: string; inquiry_id: string; uploaded_by: string; url_medium: string; url_original: string; url_thumb: string }
        Insert: { caption?: string; created_at?: string; id?: string; image_type?: string; inquiry_id: string; uploaded_by: string; url_medium: string; url_original: string; url_thumb: string }
        Update: { caption?: string; created_at?: string; id?: string; image_type?: string; inquiry_id?: string; uploaded_by?: string; url_medium?: string; url_original?: string; url_thumb?: string }
        Relationships: [{ foreignKeyName: 'inquiry_images_inquiry_id_fkey'; columns: ['inquiry_id']; isOneToOne: false; referencedRelation: 'inquiries'; referencedColumns: ['id'] }]
      }
      inquiry_items: {
        Row: { cake_size: string; created_at: string; flavor: string; id: string; inquiry_id: string; item_name: string; message_on_cake: string; occasion: string; order_type: 'cake' | 'other_item'; quantity: number; sort_order: number; special_requirements: string; theme: string }
        Insert: { cake_size?: string; created_at?: string; flavor?: string; id?: string; inquiry_id: string; item_name?: string; message_on_cake?: string; occasion?: string; order_type?: 'cake' | 'other_item'; quantity?: number; sort_order?: number; special_requirements?: string; theme?: string }
        Update: { cake_size?: string; created_at?: string; flavor?: string; id?: string; inquiry_id?: string; item_name?: string; message_on_cake?: string; occasion?: string; order_type?: 'cake' | 'other_item'; quantity?: number; sort_order?: number; special_requirements?: string; theme?: string }
        Relationships: [{ foreignKeyName: 'inquiry_items_inquiry_id_fkey'; columns: ['inquiry_id']; isOneToOne: false; referencedRelation: 'inquiries'; referencedColumns: ['id'] }]
      }
      notifications: {
        Row: { body: string; created_at: string; id: string; inquiry_id: string | null; is_read: boolean; order_id: string | null; title: string; type: string }
        Insert: { body: string; created_at?: string; id?: string; inquiry_id?: string | null; is_read?: boolean; order_id?: string | null; title: string; type: string }
        Update: { body?: string; created_at?: string; id?: string; inquiry_id?: string | null; is_read?: boolean; order_id?: string | null; title?: string; type?: string }
        Relationships: [
          { foreignKeyName: 'notifications_inquiry_id_fkey'; columns: ['inquiry_id']; isOneToOne: false; referencedRelation: 'inquiries'; referencedColumns: ['id'] },
          { foreignKeyName: 'notifications_order_id_fkey'; columns: ['order_id']; isOneToOne: false; referencedRelation: 'orders'; referencedColumns: ['id'] },
        ]
      }
      item_options: {
        Row: { created_at: string; id: string; image_url: string | null; is_active: boolean; name: string; sort_order: number }
        Insert: { created_at?: string; id?: string; image_url?: string | null; is_active?: boolean; name: string; sort_order?: number }
        Update: { created_at?: string; id?: string; image_url?: string | null; is_active?: boolean; name?: string; sort_order?: number }
        Relationships: []
      }
      occasion_options: {
        Row: { created_at: string; id: string; image_url: string | null; is_active: boolean; name: string; sort_order: number }
        Insert: { created_at?: string; id?: string; image_url?: string | null; is_active?: boolean; name: string; sort_order?: number }
        Update: { created_at?: string; id?: string; image_url?: string | null; is_active?: boolean; name?: string; sort_order?: number }
        Relationships: []
      }
      orders: {
        Row: { created_at: string; delivery_type: string; deposit_amount: number | null; amount_paid: number | null; delivery_charge: number; eta_date: string | null; eta_note: string; eta_time: string | null; final_price: number; id: string; inquiry_id: string; status: string; tracking_token: string; updated_at: string }
        Insert: { created_at?: string; delivery_type: string; deposit_amount?: number | null; amount_paid?: number | null; delivery_charge?: number; eta_date?: string | null; eta_note?: string; eta_time?: string | null; final_price: number; id?: string; inquiry_id: string; status?: string; tracking_token?: string; updated_at?: string }
        Update: { created_at?: string; delivery_type?: string; deposit_amount?: number | null; amount_paid?: number | null; delivery_charge?: number; eta_date?: string | null; eta_note?: string; eta_time?: string | null; final_price?: number; id?: string; inquiry_id?: string; status?: string; tracking_token?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: 'orders_inquiry_id_fkey'; columns: ['inquiry_id']; isOneToOne: true; referencedRelation: 'inquiries'; referencedColumns: ['id'] }]
      }
      payments: {
        Row: { amount: number; created_at: string; id: string; method: string; note: string | null; order_id: string; paid_at: string; receipt_token: string }
        Insert: { amount: number; created_at?: string; id?: string; method: string; note?: string | null; order_id: string; paid_at?: string; receipt_token: string }
        Update: { amount?: number; created_at?: string; id?: string; method?: string; note?: string | null; order_id?: string; paid_at?: string; receipt_token?: string }
        Relationships: [{ foreignKeyName: 'payments_order_id_fkey'; columns: ['order_id']; isOneToOne: false; referencedRelation: 'orders'; referencedColumns: ['id'] }]
      }
      push_subscriptions: {
        Row: { auth: string; created_at: string; endpoint: string; id: string; last_seen_at: string; p256dh: string; user_agent: string }
        Insert: { auth: string; created_at?: string; endpoint: string; id?: string; last_seen_at?: string; p256dh: string; user_agent?: string }
        Update: { auth?: string; created_at?: string; endpoint?: string; id?: string; last_seen_at?: string; p256dh?: string; user_agent?: string }
        Relationships: []
      }
      size_options: {
        Row: { created_at: string; id: string; image_url: string | null; is_active: boolean; name: string; sort_order: number }
        Insert: { created_at?: string; id?: string; image_url?: string | null; is_active?: boolean; name: string; sort_order?: number }
        Update: { created_at?: string; id?: string; image_url?: string | null; is_active?: boolean; name?: string; sort_order?: number }
        Relationships: []
      }
      theme_options: {
        Row: { created_at: string; id: string; image_url: string | null; is_active: boolean; name: string; sort_order: number }
        Insert: { created_at?: string; id?: string; image_url?: string | null; is_active?: boolean; name: string; sort_order?: number }
        Update: { created_at?: string; id?: string; image_url?: string | null; is_active?: boolean; name?: string; sort_order?: number }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      sync_order_status: {
        Args: { p_order_id: string; p_new_status: string }
        Returns: void
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
