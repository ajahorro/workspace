import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Needs to be run where this is available

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixStaffRoles() {
  console.log('Deep Scan: Fixing staff roles...')
  
  // 1. Find all users with speedway emails or known staff emails
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, role')
    .or('email.ilike.%@speedway.com,email.ilike.%@speed.way%')

  if (error) {
    console.error('Error fetching profiles:', error)
    return
  }

  console.log(`Found ${profiles.length} potential staff profiles.`)

  for (const profile of profiles) {
    if (profile.role !== 'STAFF') {
      console.log(`Fixing role for ${profile.email}: ${profile.role} -> STAFF`)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'STAFF' })
        .eq('id', profile.id)
      
      if (updateError) console.error(`Failed to fix ${profile.email}:`, updateError)
    } else {
      console.log(`${profile.email} is already STAFF.`)
    }
  }

  console.log('Cleanup complete.')
}

fixStaffRoles()
