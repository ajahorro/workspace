
import fetch from 'node-fetch';

async function seed() {
  const siegId = "a1cc500e-8b74-4eac-a4ac-0b4dccf1aa73";
  const url = "https://zxrplbzuavqkxhjnjykk.supabase.co/functions/v1/manage-staff";
  
  console.log('--- SEEDING HISTORY VIA EDGE FUNCTION ---');

  const bookings = [
    {
      status: 'completed',
      start_datetime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_datetime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      total_price: 2500
    },
    {
      status: 'scheduled',
      start_datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      end_datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
      total_price: 4500
    },
    {
      status: 'cancelled',
      start_datetime: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      end_datetime: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(),
      total_price: 1500
    }
  ];

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer sb_publishable_3FsezJrCDS_2BYysRCIXlQ_wvYnDFZ4` // Using anon key for auth, the function uses service_role internally
      },
      body: JSON.stringify({
        action: 'seed-history',
        userId: siegId,
        bookings: bookings
      })
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error);
    
    console.log('Successfully seeded 3 bookings for Sieg Gaerlan.');
    console.log('Results:', result.results?.length);
  } catch (err) {
    console.error('Seeding failed:', err.message);
  }

  console.log('--- SEEDING COMPLETE ---');
}

seed();
