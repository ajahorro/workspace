const { Client } = require('pg');
const run = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres.zxrplbzuavqkxhjnjykk:hY61ODE6tB1ROSU0@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'
  });
  await client.connect();
  const res = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payment_intents';
  `);
  console.log('Payment Intents columns:');
  console.log(res.rows.map(r => r.column_name).join(', '));
  await client.end();
};
run();
