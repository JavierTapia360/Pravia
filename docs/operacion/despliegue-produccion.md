# Despliegue de producción

## Principios

Producción usa API same-origin detrás de Nginx, PostgreSQL/Supabase cloud y Storage privado. El frontend nunca recibe `DATABASE_URL`, service role ni `OPENAI_API_KEY`. La composición incluida es una referencia reproducible; los secretos deben provenir del gestor del proveedor, no del repositorio.

Las migraciones son un paso explícito anterior al backend. Nunca usar `db push`, `migrate reset`, `--clean` ni restaurar sobre la base actual.

## Preparación

1. Crear `backend/.env.production` fuera de Git a partir de `.env.example`.
2. Generar `AUTH_JWT_SECRET` aleatorio nuevo, con al menos 32 caracteres.
3. Configurar URLs cloud normales/directas con `schema=pravia_os`.
4. Configurar Supabase URL y service role únicamente en backend.
5. Configurar origen HTTPS exacto en `CORS_ALLOWED_ORIGINS` y `PRAVIA_PUBLIC_ORIGIN`.
6. Configurar `PASSWORD_RECOVERY_WEBHOOK_URL` privado.
7. Dejar `AUTH_ALLOW_DEV_RECOVERY_TOKEN=false`.
8. Ejecutar los controles de Fase 13.

## Respaldo previo

Con PostgreSQL client instalado y una ruta absoluta cifrada:

```text
BACKUP_FILE=/ruta/segura/pravia-predeploy.dump npm run db:backup
npm run db:verify
npm run storage:verify
```

El comando no sobrescribe un archivo existente. Conserva el respaldo y el inventario de Storage fuera del host de aplicación.

## Construcción y migración

Desde `deploy`:

```text
docker compose -f docker-compose.cloud.example.yml build
docker compose -f docker-compose.cloud.example.yml --profile maintenance run --rm migrate
docker compose -f docker-compose.cloud.example.yml up -d backend frontend
```

La migración debe terminar antes de iniciar la imagen nueva. Las migraciones de esta fase son aditivas (`CREATE INDEX IF NOT EXISTS` y columnas de validación con valor predeterminado); no eliminan filas ni cambian IDs.

## Activación de la primera cuenta

Una persona autorizada inyecta temporalmente:

```text
PRAVIA_ADMIN_EMAIL=... PRAVIA_ADMIN_PASSWORD=... npm run auth:set-password
```

No colocar esas variables en Compose ni en historial de shell compartido. Tras la activación, comprobar login, cambio de contraseña, logout, renovación y recuperación. Revocar la credencial temporal si existía.

## Verificación posterior

1. `/health` y `/api/health` reportan API, database y storage `ok`.
2. Las respuestas contienen `x-correlation-id`.
3. Una ruta privada redirige a login sin sesión.
4. Los roles no autorizados reciben 403 del backend.
5. Un documento se visualiza mediante URL temporal/streaming y no mediante URL pública permanente.
6. `npm run test:integration` pasa.
7. `E2E_REQUIRE_AUTH=true npm run e2e:smoke` pasa.
8. Security Advisor queda en cero hallazgos relevantes.
9. Performance Advisor no reporta llaves foráneas operativas sin índice.
10. Se conserva una captura del conteo de usuarios, expedientes y documentos antes/después.

## HTTPS y proxy

El Nginx incluido añade cabeceras de seguridad, evita cachear `sw.js`/manifest, conserva assets versionados y limita la carga a 30 MB. El terminador TLS puede estar delante del contenedor, pero debe enviar `X-Forwarded-Proto=https`. No publicar directamente el puerto del backend.

Si se usan enlaces de Supabase en el visor, la política CSP permite únicamente `https://*.supabase.co` además del origen propio. Cualquier nuevo proveedor necesita revisión explícita de CSP.

## Reversa

- Conservar la imagen anterior y el origen cloud intacto durante la ventana.
- Ante fallo de interfaz/backend, volver a la imagen anterior; las columnas e índices aditivos son compatibles y no requieren borrarse.
- No “revertir” eliminando columnas o índices en una emergencia.
- Si la base estuviera dañada, provisionar un destino vacío y usar `db:restore` con `RESTORE_DATABASE_URL` y `RESTORE_CONFIRMATION=RESTORE_INTO_EMPTY_VERIFIED_TARGET`.
- Verificar el destino restaurado y cambiar el primario solo después de aprobación.

El restore rechaza una base que ya contenga tablas y nunca ejecuta limpieza destructiva.
