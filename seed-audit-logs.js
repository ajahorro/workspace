const { Client } = require('pg');

const runSeed = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres.zxrplbzuavqkxhjnjykk:hY61ODE6tB1ROSU0@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'
  });

  try {
    await client.connect();
    
    // Get bookings joined with payment and customer
    const res = await client.query(`
      SELECT b.id as booking_id, b.created_at, b.scheduled_start, pi.total_amount, p.full_name as actor_name, p.role as actor_role
      FROM bookings b
      LEFT JOIN profiles p ON b.customer_id = p.id
      LEFT JOIN payment_intents pi ON pi.booking_id = b.id
    `);

    for (const row of res.rows) {
      const shortId = row.booking_id.substring(0, 8);
      const amount = row.total_amount ? Number(row.total_amount).toLocaleString() : '0';
      const dateStr = new Date(row.scheduled_start).toLocaleDateString();
      const role = row.actor_role || 'CUSTOMER';
      const name = row.actor_name || 'System User';
      
      const details = "New booking #" + shortId + " created by " + role.toLowerCase() + " for " + dateStr + ". Total: ₱" + amount;
      
      await client.query(`
        INSERT INTO public.audit_logs (booking_id, action_type, details, actor_name, actor_role, created_at)
        VALUES ($1, 'CREATE', $2, $3, $4, $5)
      `, [row.booking_id, details, name, role, row.created_at]);
    }

    console.log('Seeded audit logs for existing bookings.');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
};

runSeed();
