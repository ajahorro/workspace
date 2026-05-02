const { Client } = require('pg');

const runCreate = async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres.zxrplbzuavqkxhjnjykk:hY61ODE6tB1ROSU0@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres'
  });

  try {
    await client.connect();
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
        action_type TEXT NOT NULL,
        details TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

      CREATE POLICY "Enable read access for all authenticated users"
        ON public.audit_logs FOR SELECT
        TO authenticated
        USING (true);

      CREATE POLICY "Enable insert for authenticated users"
        ON public.audit_logs FOR INSERT
        TO authenticated
        WITH CHECK (true);
    `);
    console.log('Created audit_logs table.');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
};

runCreate();
