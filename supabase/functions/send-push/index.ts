import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')

serve(async (req) => {
  try {
    const { record } = await req.json()
    
    // 1. Initialize Supabase Admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Get the User's OneSignal ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('onesignal_id')
      .eq('id', record.user_id)
      .single()

    if (!profile?.onesignal_id) {
      return new Response(JSON.stringify({ message: 'No push ID found' }), { status: 200 })
    }

    // 3. Send to OneSignal
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_subscription_ids: [profile.onesignal_id],
        contents: { "en": record.message },
        headings: { "en": record.title },
        url: record.action_url ? `https://speedway-detailing.com${record.action_url}` : undefined
      })
    })

    const result = await response.json()
    return new Response(JSON.stringify(result), { status: 200 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
