const { Client } = require('pg');

const runCreate = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres.zxrplbzuavqkxhjnjykk:hY61ODE6tB1ROSU0@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'
  });

  try {
    await client.connect();
    
    await client.query(`
      ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
    `);
    console.log('Added action_url column to notifications table.');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
};

runCreate();
