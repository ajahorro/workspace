const { Client } = require('pg');

const runCheck = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres.zxrplbzuavqkxhjnjykk:hY61ODE6tB1ROSU0@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'
  });

  try {
    await client.connect();
    
    // Get the ID of the admin user from auth.users
    const adminRes = await client.query("SELECT id FROM auth.users WHERE email = 'admin@speed.way'");
    if (adminRes.rows.length > 0) {
      const adminId = adminRes.rows[0].id;
      
      const roleRes = await client.query(`SELECT role FROM public.profiles WHERE id = $1`, [adminId]);
      console.log('Role for Admin:', roleRes.rows[0]);
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
};

runCheck();
