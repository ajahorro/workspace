
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, to, data } = await req.json()

    let subject = ''
    let html = ''

    // Role-aware Email Templates
    switch (type) {
      case 'booking_confirmed':
        subject = 'Booking Confirmed! 🚗✨'
        html = `
          <h1>RENEW Auto Detailing</h1>
          <p>Your booking for <strong>${data.serviceName}</strong> has been confirmed.</p>
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Time:</strong> ${data.time}</p>
          <p><strong>Total:</strong> ₱${data.totalPrice}</p>
          <p>See you soon!</p>
        `
        break
      
      case 'staff_assigned':
        subject = 'Staff Assigned to Your Booking 🔧'
        html = `<h1>Staff Assigned</h1><p>A specialist has been assigned to your booking on ${data.date}.</p>`
        break

      case 'booking_cancelled':
        subject = 'Booking Cancelled ⚠️'
        html = `<h1>Booking Cancelled</h1><p>Your booking for ${data.date} has been cancelled.</p>`
        break

      case 'payment_verified':
        subject = 'Payment Verified! 💸'
        html = `<h1>Payment Verified</h1><p>Your payment of ₱${data.amount} for your booking on ${data.date} has been verified. Thank you!</p>`
        break

      default:
        throw new Error('Invalid email type')
    }

    console.log('Sending email request:', { type, to })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RENEW Auto Detailing <onboarding@resend.dev>',
        to,
        subject,
        html,
      }),
    })

    const resData = await res.json()
    console.log('Resend response status:', res.status)
    console.log('Resend response data:', resData)

    return new Response(JSON.stringify(resData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: res.status,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
