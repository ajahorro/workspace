const { Client } = require('pg');

const runCheck = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres.zxrplbzuavqkxhjnjykk:hY61ODE6tB1ROSU0@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'
  });

  try {
    await client.connect();
    
    const bookings = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'bookings';
    `);
    console.log('Bookings columns:', bookings.rows);

    const payments = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name IN ('payments', 'payment_intents');
    `);
    console.log('Payment columns:', payments.rows);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
};

runCheck();
