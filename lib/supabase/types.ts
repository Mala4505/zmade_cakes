export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type DeliveryType = 'pickup' | 'delivery'
export type PaymentMethod = '' | 'cash' | 'wamd'
export type Priority = 0 | 1 | 2
export type InquiryStatus =
  | 'pending'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'in_progress'
  | 'ready'
  | 'delivered'
  | 'cancelled'
export type OrderStatus = 'confirmed' | 'in_progress' | 'ready' | 'delivered' | 'cancelled'
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
  allergen_other: string
  balance_paid: boolean
  balance_paid_at: string | null
  event_date: string
  pickup_time: string | null
  delivery_type: DeliveryType
  status: InquiryStatus
  admin_price: string | null
  advance_amount: string | null
  advance_paid: boolean
  payment_method: PaymentMethod
  admin_notes: string
  priority: Priority
  confirmation_token: string
  customer_confirmed: boolean
  customer_confirmed_at: string | null
  customer_comments: string
  created_at: string
  updated_at: string
  delivery_address?: DeliveryAddress | null
}

export interface Order {
  id: string
  inquiry_id: string
  tracking_token: string
  status: OrderStatus
  final_price: string
  delivery_type: DeliveryType
  created_at: string
  updated_at: string
  inquiry?: Inquiry
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

export type AllergenFlags = Pick<Inquiry,
  | 'allergen_nut_free'
  | 'allergen_gluten_free'
  | 'allergen_dairy_free'
  | 'allergen_egg_free'
  | 'allergen_halal'
  | 'allergen_other'
>

export function hasAllergens(inq: AllergenFlags): boolean {
  return inq.allergen_nut_free || inq.allergen_gluten_free || inq.allergen_dairy_free || inq.allergen_egg_free || inq.allergen_halal || inq.allergen_other.length > 0
}

export const ALLERGEN_LABELS: Record<keyof Omit<AllergenFlags, 'allergen_other'>, string> = {
  allergen_nut_free: 'Nut-free',
  allergen_gluten_free: 'GF',
  allergen_dairy_free: 'Dairy-free',
  allergen_egg_free: 'Egg-free',
  allergen_halal: 'Halal',
}

export interface Database {
  public: {
    Tables: {
      flavor_options: { Row: OptionRow; Insert: Omit<OptionRow, 'id' | 'created_at'>; Update: Partial<Omit<OptionRow, 'id' | 'created_at'>> }
      size_options: { Row: OptionRow; Insert: Omit<OptionRow, 'id' | 'created_at'>; Update: Partial<Omit<OptionRow, 'id' | 'created_at'>> }
      occasion_options: { Row: OptionRow; Insert: Omit<OptionRow, 'id' | 'created_at'>; Update: Partial<Omit<OptionRow, 'id' | 'created_at'>> }
      theme_options: { Row: OptionRow; Insert: Omit<OptionRow, 'id' | 'created_at'>; Update: Partial<Omit<OptionRow, 'id' | 'created_at'>> }
      decoration_style_options: { Row: OptionRow; Insert: Omit<OptionRow, 'id' | 'created_at'>; Update: Partial<Omit<OptionRow, 'id' | 'created_at'>> }
      delivery_addresses: { Row: DeliveryAddress; Insert: Omit<DeliveryAddress, 'id' | 'created_at'>; Update: Partial<Omit<DeliveryAddress, 'id' | 'created_at'>> }
      inquiries: { Row: Inquiry; Insert: Omit<Inquiry, 'id' | 'confirmation_token' | 'customer_confirmed' | 'customer_confirmed_at' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Inquiry, 'id' | 'created_at'>> }
      orders: { Row: Order; Insert: Omit<Order, 'id' | 'tracking_token' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Order, 'id' | 'created_at'>> }
      notifications: { Row: Notification; Insert: Omit<Notification, 'id' | 'created_at'>; Update: Partial<Omit<Notification, 'id' | 'created_at'>> }
    }
  }
}
