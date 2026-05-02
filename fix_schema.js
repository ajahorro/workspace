const { Client } = require('pg');
const run = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres.zxrplbzuavqkxhjnjykk:hY61ODE6tB1ROSU0@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'
  });
  await client.connect();
  try {
    console.log('Adding email column to profiles...');
    await client.query(`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;`);
    
    console.log('Populating email column from auth.users...');
    await client.query(`
      UPDATE public.profiles p
      SET email = u.email
      FROM auth.users u
      WHERE p.id = u.id AND p.email IS NULL;
    `);
    
    console.log('Schema fix completed successfully.');
  } catch (err) {
    console.error('Error fixing schema:', err);
  } finally {
    await client.end();
  }
};
run();
