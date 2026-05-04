
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://zxrplbzuavqkxhjnjykk.supabase.co/",
  "sb_publishable_3FsezJrCDS_2BYysRCIXlQ_wvYnDFZ4"
);

async function scan() {
  console.log('--- SCANNING FOR BOOKINGS ---');
  
  const { count: countLegacy, error: errLegacy } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true });
    
  const { count: countV2, error: errV2 } = await supabase
    .from('bookings_v2')
    .select('*', { count: 'exact', head: true });

  console.log('Legacy Bookings:', countLegacy || 0);
  console.log('V2 Bookings:', countV2 || 0);
  
  if (countLegacy > 0) {
    console.log('\nSample Legacy Booking:');
    const { data } = await supabase.from('bookings').select('*').limit(1);
    console.log(JSON.stringify(data, null, 2));
  }

  if (countV2 > 0) {
    console.log('\nSample V2 Booking:');
    const { data } = await supabase.from('bookings_v2').select('*').limit(1);
    console.log(JSON.stringify(data, null, 2));
  }
}

scan();
