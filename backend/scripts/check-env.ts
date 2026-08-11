import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'CONFIGURADA (' + process.env.GEMINI_API_KEY.slice(0, 5) + '...)' : 'NO ENCONTRADA EN .ENV');
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'CONFIGURADA (' + process.env.GOOGLE_API_KEY.slice(0, 5) + '...)' : 'NO ENCONTRADA EN .ENV');
console.log('GEMINI_DOCUMENT_MODEL:', process.env.GEMINI_DOCUMENT_MODEL || 'NO CONFIGURADO (Usando gemini-1.5-flash por defecto)');
