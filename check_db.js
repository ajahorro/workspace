import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://zxrplbzuavqkxhjnjykk.supabase.co',
  'sb_publishable_3FsezJrCDS_2BYysRCIXlQ_wvYnDFZ4'
)

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (data && data[0]) {
    console.log('Columns:', Object.keys(data[0]));
  } else if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Table is empty, trying to fetch schema info...');
    const { data: cols, error: cError } = await supabase.rpc('get_table_columns', { table_name: 'profiles' });
    if (cError) console.log('RPC Error (probably missing):', cError.message);
    else console.log('Columns from RPC:', cols);
  }
}

check()
