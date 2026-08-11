import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const required = [
  'DATABASE_URL',
  'DIRECT_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
] as const;

const optional = [
  'PRAVIA_DATABASE_SCHEMA',
  'SUPABASE_PUBLISHABLE_KEY',
  'OPENAI_API_KEY',
  'OPENAI_DOCUMENT_MODEL',
  'OPENAI_ESCALATION_MODEL',
  'OPENAI_REASONING_EFFORT',
] as const;

let hasErrors = false;

for (const key of required) {
  const configured = Boolean(process.env[key]?.trim());
  console.log(`${configured ? 'OK' : 'FALTA'} ${key}`);
  hasErrors ||= !configured;
}

for (const key of optional) {
  console.log(`${process.env[key]?.trim() ? 'OK' : 'OPCIONAL'} ${key}`);
}

for (const key of ['DATABASE_URL', 'DIRECT_URL'] as const) {
  const value = process.env[key];
  if (!value) continue;
  try {
    const parsed = new URL(value);
    const schema = parsed.searchParams.get('schema') || process.env.PRAVIA_DATABASE_SCHEMA;
    if (!schema) {
      console.warn(`AVISO ${key}: el runtime usará el esquema seguro predeterminado pravia_os.`);
    } else if (schema !== 'pravia_os') {
      console.error(`INVALIDA ${key}: el esquema configurado es ${schema}; se esperaba pravia_os.`);
      hasErrors = true;
    }
  } catch {
    console.error(`INVALIDA ${key}`);
    hasErrors = true;
  }
}

if (hasErrors) process.exitCode = 1;
