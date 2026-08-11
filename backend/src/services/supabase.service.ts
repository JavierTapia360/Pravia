import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
    }
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseInstance;
}

export const BUCKET_NAME = 'pravia_documentos';

/**
 * Sube un archivo a Supabase Storage
 */
export async function uploadFile(buffer: Buffer, fileName: string, mimeType: string) {
  // Use octet-stream as safe fallback to avoid bucket MIME restrictions during upload
  const safeMime = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    .includes(mimeType) ? mimeType : 'application/octet-stream';

  const { data, error } = await getSupabaseClient().storage
    .from(BUCKET_NAME)
    .upload(fileName, buffer, {
      contentType: safeMime,
      upsert: false
    });

  if (error) {
    throw new Error(`Error subiendo archivo a Supabase: ${error.message}`);
  }

  return data.path;
}

/**
 * Obtiene una URL firmada temporal. Diez minutos por defecto y una hora como máximo.
 */
export async function getSignedUrl(path: string, expiresInSeconds = 600) {
  const safeExpiry = Math.max(60, Math.min(3600, Math.floor(expiresInSeconds)));
  const { data, error } = await getSupabaseClient().storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, safeExpiry);

  if (error) {
    throw new Error(`Error generando URL firmada: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Elimina un archivo físico de Supabase Storage
 */
export async function deleteFile(path: string) {
  const { error } = await getSupabaseClient().storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    throw new Error(`Error eliminando archivo: ${error.message}`);
  }
}

/**
 * Descarga el Buffer binario de un archivo desde Supabase Storage
 */
export async function downloadFile(path: string): Promise<Buffer> {
  const { data, error } = await getSupabaseClient().storage
    .from(BUCKET_NAME)
    .download(path);

  if (error || !data) {
    throw new Error(`Error descargando archivo de Supabase: ${error?.message || 'No data'}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
