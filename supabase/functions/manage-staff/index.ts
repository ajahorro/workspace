import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, email, password, fullName, secondaryEmail, userId, staffId, bookings } = await req.json()

    // --- Schema Initialization Check ---
    // If we're doing an action, let's ensure was_staff exists first
    // Note: We only do this once or per request if we suspect it's missing
    try {
      await supabaseAdmin.rpc('exec_sql', {
        sql_string: `
          ALTER TABLE profiles ADD COLUMN IF NOT EXISTS was_staff BOOLEAN DEFAULT FALSE;
          UPDATE profiles SET was_staff = true WHERE role = 'STAFF' AND was_staff = false;
        `
      })
    } catch (e) {
      // If exec_sql RPC doesn't exist, we fallback to just trying the operation
      // or we can ignore if we don't have the RPC defined.
    }
 
    if (action === 'create-staff') {
      // 1. Check if user already exists in auth or profiles
      const { data: existingProfile, error: searchError } = await supabaseAdmin
        .from('profiles')
        .select('id, role, email')
        .eq('email', email)
        .single()

      if (!searchError && existingProfile) {
        // Promote or Restore
        const { error: promoError } = await supabaseAdmin
          .from('profiles')
          .upsert({ 
            id: existingProfile.id,
            email: email,
            role: 'STAFF', 
            full_name: fullName,
            secondary_email: null // Use null to avoid unique constraint issues with empty strings
          })

        if (promoError) throw promoError

        return new Response(JSON.stringify({ success: true, message: 'Account assigned to staff role.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      // 2. Otherwise, create new user in auth.users
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      })

      if (authError) throw authError

      // 3. Force creation/update of profile with STAFF role
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({ 
          id: authUser.user.id,
          email: email,
          role: 'STAFF', 
          full_name: fullName,
          secondary_email: null
        })

      if (profileError) throw profileError

      return new Response(JSON.stringify({ success: true, user: authUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'deactivate-staff') {
      if (!staffId) throw new Error('Staff ID is required')

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'CUSTOMER' }) 
        .eq('id', staffId)

      if (profileError) throw profileError

      return new Response(JSON.stringify({ success: true, message: 'Staff deactivated successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'list-staff') {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .or('role.eq.STAFF,email.ilike.%@speed.way%,email.ilike.%@speedway.com%')
        .order('full_name', { ascending: true })

      if (error) throw error

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'reactivate-staff') {
      if (!staffId) throw new Error('Staff ID is required')

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'STAFF' })
        .eq('id', staffId)

      if (profileError) throw profileError

      return new Response(JSON.stringify({ success: true, message: 'Staff reactivated successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'list-history') {
      if (!userId) throw new Error('userId is required')
      
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .select(`
          *,
          booking_services:booking_vehicle_services(
            service_price_snapshot,
            service_name_snapshot
          )
        `)
        .eq('customer_id', userId)
        .order('start_datetime', { ascending: false })

      if (error) throw error

      // Flatten services for the frontend
      const formattedData = (data || []).map(b => ({
        ...b,
        services: b.booking_services.map(bs => ({ service_name: bs.service_name_snapshot || 'Unknown Service' }))
      }))

      return new Response(JSON.stringify({ success: true, data: formattedData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'seed-history') {
      if (!userId || !bookings) throw new Error('userId and bookings required')
      
      const results = []
      for (const b of bookings) {
        // Insert booking
        const { data: booking, error: bErr } = await supabaseAdmin
          .from('bookings')
          .insert({
            customer_id: userId,
            status: b.status,
            start_datetime: b.start_datetime,
            end_datetime: b.end_datetime,
            total_amount: b.total_amount
          })
          .select()
          .single()

        if (bErr) throw bErr

        // In production we'd link to booking_vehicles but for seeding history we just insert the booking
        results.push(booking)
      }
      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'recover-staff') {
      // ... existing recover-staff logic ...
      // 1. Find user by secondary email
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('secondary_email', email)
        .single()

      if (profileError || !profile) {
        throw new Error('Account associated with this personal email not found.')
      }

      // 2. Get the primary email from auth.users
      const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      
      if (userError || !user) throw new Error('Auth user not found.')

      // 3. Trigger reset password for the primary email 
      const oldEmail = user.email;
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
        email: email, // Set to secondary
        email_confirm: true
      });

      if (updateError) throw updateError;

      // Now trigger reset
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.headers.get('origin')}/login?reset=true`,
      });

      if (resetError) throw resetError;

      return new Response(JSON.stringify({ success: true, message: 'Recovery link sent to personal email.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'delete-user') {
      if (!userId) throw new Error('User ID is required')
      
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError) throw deleteError

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId)
      
      if (profileError) throw profileError

      return new Response(JSON.stringify({ success: true, message: 'User deleted successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
