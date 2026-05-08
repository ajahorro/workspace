const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testAnalyticsAccuracy() {
  console.log('🚀 Starting Hardening Verification...');

  // 1. Check Identity Splitting
  const { data: profiles } = await supabase.from('profiles').select('full_name, first_name, last_name').limit(5);
  console.log('👤 Identity Split Check:', profiles.map(p => ({
    full: p.full_name,
    first: p.first_name,
    last: p.last_name
  })));

  // 2. Aggregate Fleet Metrics (Manual Check)
  const { data: vehicles } = await supabase.from('booking_vehicles_v2').select('status');
  const completed = vehicles.filter(v => v.status === 'completed').length;
  const inProgress = vehicles.filter(v => v.status === 'in_progress').length;
  
  console.log('📊 Stats Verification:');
  console.log(`- Units Serviced (Expected in Analytics): ${completed}`);
  console.log(`- Units In Progress: ${inProgress}`);

  // 3. Verify Notification Metadata
  const { data: notifications } = await supabase.from('notifications').select('notification_type, action_url').order('created_at', { ascending: false }).limit(5);
  console.log('🔔 Recent Notifications:', notifications);

  console.log('✅ Verification Complete. Check Admin Analytics UI for consistency.');
}

testAnalyticsAccuracy();
