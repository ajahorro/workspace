
import { createClient } from '@supabase/supabase-js';

// USING ANON KEY FIRST BUT BROAD SCAN
const supabase = createClient(
  "https://zxrplbzuavqkxhjnjykk.supabase.co/",
  "sb_publishable_3FsezJrCDS_2BYysRCIXlQ_wvYnDFZ4"
);

async function scan() {
  console.log('--- DEEP SYSTEM SCAN ---');
  
  const tables = ['bookings', 'bookings_v2', 'profiles', 'audit_logs', 'booking_services_v2'];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    console.log(`Table [${table}]:`, error ? `ERROR: ${error.message}` : `${count || 0} rows`);
  }

  // Check if there are ANY profiles at all
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, role').limit(5);
  console.log('\nSample Profiles:', JSON.stringify(profiles, null, 2));
}

scan();
