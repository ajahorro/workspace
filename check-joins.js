const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zxrplbzuavqkxhjnjykk.supabase.co';
const supabaseKey = 'sb_publishable_3FsezJrCDS_2BYysRCIXlQ_wvYnDFZ4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_status,
      service_status,
      scheduled_start,
      staff_id,
      customer:profiles!bookings_customer_id_fkey(full_name),
      payments:payment_intents(status, total_amount, amount_paid)
    `)
    .limit(5);
    
  console.log(error || data);
}

checkData();
