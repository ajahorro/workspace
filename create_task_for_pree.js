const { Client } = require('pg');

const run = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres.zxrplbzuavqkxhjnjykk:hY61ODE6tB1ROSU0@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    // 1. Find Pree
    const staffRes = await client.query("SELECT id FROM profiles WHERE email = 'pree@speedway.com'");
    if (staffRes.rows.length === 0) {
      console.log('Staff Pree not found.');
      return;
    }
    const staffId = staffRes.rows[0].id;
    console.log(`Found Pree ID: ${staffId}`);

    // 2. Find a booking (scheduled or ongoing) that is unassigned or just pick the latest one
    const bookingRes = await client.query("SELECT id, customer_id FROM bookings WHERE status != 'completed' ORDER BY created_at DESC LIMIT 1");
    if (bookingRes.rows.length === 0) {
      console.log('No active bookings found to assign.');
      return;
    }
    const bookingId = bookingRes.rows[0].id;
    const customerId = bookingRes.rows[0].customer_id;

    // 3. Assign to Pree
    await client.query("UPDATE bookings SET staff_id = $1 WHERE id = $2", [staffId, bookingId]);
    console.log(`Assigned booking ${bookingId} to Pree.`);

    // 4. Create a notification for the customer so it looks official
    await client.query(`
      INSERT INTO notifications (user_id, title, message, notification_type, action_url)
      VALUES ($1, 'Staff Assigned! 🛠️', 'Your service is being handled by Pree.', 'STAFF_ASSIGNED', $2)
    `, [customerId, `/my-bookings/${bookingId}`]);

    console.log('Task assignment complete.');
  } catch (err) {
    console.error('Operation failed:', err);
  } finally {
    await client.end();
  }
};

run();
