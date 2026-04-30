const { Client } = require('pg');
const fs = require('fs');

const runSeed = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres.zxrplbzuavqkxhjnjykk:hY61ODE6tB1ROSU0@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'
  });

  try {
    await client.connect();
    console.log('Connected to database.');
    
    const seedSql = fs.readFileSync('supabase/seed.sql', 'utf8');
    await client.query(seedSql);
    
    console.log('Seed executed successfully.');
  } catch (err) {
    console.error('Failed to run seed:', err);
  } finally {
    await client.end();
  }
};

runSeed();
