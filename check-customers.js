const { Client } = require('pg');

const runCheck = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres.zxrplbzuavqkxhjnjykk:hY61ODE6tB1ROSU0@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'
  });

  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT u.email, p.full_name, p.role 
      FROM public.profiles p 
      JOIN auth.users u ON p.id = u.id
      WHERE p.role = 'CUSTOMER'
      LIMIT 5
    `);
    
    console.log('Sample Customer Accounts:');
    console.table(res.rows);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
};

runCheck();
