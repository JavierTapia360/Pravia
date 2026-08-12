# Fase 1 — Estabilización inicial

Fecha: 2026-08-11

## Cambios aplicados

- Prisma normaliza en runtime las URL sin `schema` hacia `pravia_os`.
- Se añadió una verificación de DB que confirma `current_schema() = pravia_os` y acceso a `users`.
- `/health` y `/api/health` usan `SELECT 1` y reportan API, DB, Storage, entorno, modo y esquema.
- Se añadieron correlation IDs y logs HTTP estructurados sin cuerpos ni secretos.
- CORS se configura mediante `CORS_ALLOWED_ORIGINS`.
- El endpoint que devolvía `dummy_token` quedó deshabilitado.
- Supabase Storage requiere service role en backend y desactiva persistencia de sesión.
- `.env.example` describe cloud/local/hybrid sin contener secretos.
- Se creó `.env.example` del frontend con solo `VITE_API_URL`.
- El modelo documental predeterminado pasa a `gpt-5.4-nano`; se declara `gpt-5.4-mini` como escalamiento.
- Las solicitudes documentales usan razonamiento configurable y Structured Outputs.
- Se registran tokens, latencia, documentos y costo estimado dentro de la propuesta de alta, sin realizar llamadas adicionales.
- React Router y Vite se actualizaron a versiones corregidas.

## Verificación

- `npm run build` backend: correcto.
- `npm run build` frontend: correcto.
- `npm run check:env`: correcto con avisos seguros sobre el esquema predeterminado.
- `npm run check:db`: conexión correcta a `pravia_os`; tabla `users` accesible.
- Health real: `api=ok`, `database=ok`, `storage=ok`, `database_schema=pravia_os`.
- `npm audit --omit=dev` backend: 0 vulnerabilidades.
- `npm audit --omit=dev` frontend: 0 vulnerabilidades.

## No realizado todavía

- No se aplicaron migraciones remotas.
- No se modificaron ni borraron registros.
- No se implementó todavía el login/JWT real ni autorización por acción.
- No se activó RLS.
- No se consumió crédito de OpenAI durante la verificación.

