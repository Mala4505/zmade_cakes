import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

interface NotifyBody {
  title: string
  body: string
  inquiry_id?: string
  order_id?: string
}

export async function POST(req: NextRequest) {
  // Auth check — only authenticated admins can send notifications
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: NotifyBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.title || !body.body) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  // Get push token from environment (admin's Expo push token)
  const pushToken = process.env.EXPO_PUSH_TOKEN
  if (!pushToken) {
    return NextResponse.json({ error: 'Push token not configured' }, { status: 500 })
  }

  const pushPayload = {
    to: pushToken,
    title: body.title,
    body: body.body,
    sound: 'default',
    data: {
      inquiry_id: body.inquiry_id ?? null,
      order_id: body.order_id ?? null,
    },
  }

  const expoRes = await fetch(env.EXPO_PUSH_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(pushPayload),
  })

  if (!expoRes.ok) {
    const text = await expoRes.text()
    return NextResponse.json({ error: `Expo API error: ${text}` }, { status: 502 })
  }

  const result = await expoRes.json()
  return NextResponse.json({ ok: true, result })
}
