const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const resetPassword = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres.zxrplbzuavqkxhjnjykk:hY61ODE6tB1ROSU0@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'
  });

  try {
    await client.connect();
    
    const email = 'ajahorro@gmail.com';
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const res = await client.query(`
      UPDATE auth.users 
      SET encrypted_password = $1, 
          email_confirmed_at = NOW(),
          confirmation_sent_at = NOW(),
          updated_at = NOW()
      WHERE email = $2
      RETURNING id
    `, [hashedPassword, email]);
    
    if (res.rows.length > 0) {
      console.log(`Password for ${email} has been reset to ${newPassword}`);
    } else {
      console.log(`User ${email} not found.`);
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
};

resetPassword();
