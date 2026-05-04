
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://zxrplbzuavqkxhjnjykk.supabase.co/",
  "sb_publishable_3FsezJrCDS_2BYysRCIXlQ_wvYnDFZ4"
);

async function seed() {
  const siegId = "a1cc500e-8b74-4eac-a4ac-0b4dccf1aa73";
  console.log('--- SEEDING HISTORY FOR SIEG GAERLAN ---');

  // 1. Get a service to link
  const { data: service } = await supabase.from('services_v2').select('id').limit(1).single();
  if (!service) {
    console.error('No services found to link to bookings.');
    return;
  }

  // 2. Create 3 professional test bookings
  const testBookings = [
    {
      customer_id: siegId,
      status: 'completed',
      start_datetime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      end_datetime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      total_price: 2500
    },
    {
      customer_id: siegId,
      status: 'scheduled',
      start_datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      end_datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
      total_price: 4500
    },
    {
      customer_id: siegId,
      status: 'cancelled',
      start_datetime: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
      end_datetime: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(),
      total_price: 1500
    }
  ];

  for (const b of testBookings) {
    const { data: booking, error } = await supabase.from('bookings_v2').insert(b).select().single();
    if (error) {
      console.error('Error creating booking:', error.message);
      continue;
    }
    
    // Link service
    await supabase.from('booking_services_v2').insert({
      booking_id: booking.id,
      service_id: service.id,
      price_at_booking: b.total_price
    });
    
    console.log(`Created [${b.status}] booking for Sieg.`);
  }

  console.log('--- SEEDING COMPLETE ---');
}

seed();
