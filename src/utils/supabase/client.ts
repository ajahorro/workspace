import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Storage helper functions
export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export const uploadFile = async (
  bucket: string,
  path: string,
  file: File
): Promise<string> => {
  const { error } = await supabase.storage.from(bucket).upload(path, file);

  if (error) throw error;

  return getPublicUrl(bucket, path);
};

export const deleteFile = async (bucket: string, path: string): Promise<void> => {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) throw error;
};
