import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testRpc() {
  console.log('Fetching a booking to test with...');
  
  // Login as admin or find any booking
  // We need the admin login to bypass RLS or just use the first booking
  const { data: bookings, error: bErr } = await supabase.from('bookings_v2').select('id, total_price').limit(1);
  
  if (bErr || !bookings || bookings.length === 0) {
    console.error('Could not fetch bookings:', bErr);
    return;
  }
  
  const booking = bookings[0];
  console.log('Testing RPC for booking:', booking.id);
  
  const payload = {
    p_booking_id: booking.id,
    p_amount: booking.total_price || 4500,
    p_method: 'GCASH',
    p_reference: null,
    p_receipt_url: 'https://test.com/receipt.jpg',
    p_ocr_text: 'TEST OCR'
  };
  
  console.log('Payload:', payload);
  
  const { data, error } = await supabase.rpc('record_payment_v2', payload);
  
  if (error) {
    console.error('RPC Error Output:', JSON.stringify(error, null, 2));
  } else {
    console.log('RPC Success! Payment ID:', data);
  }
}

testRpc();
