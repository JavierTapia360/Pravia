# Fase 12 — Arquitectura cloud, local e híbrida

## Estado operativo

El modo vigente continúa siendo `cloud`: PostgreSQL/Supabase para datos y Supabase Storage privado para archivos. No se activó replicación, no se movieron archivos y no se ejecutó backup o restore durante esta fase.

El código de negocio ya no decide dónde vive la infraestructura. Dos puntos únicos resuelven el modo:

- `config/runtime.ts` selecciona URL de base, primario, esquema y Storage;
- `storage/storage.service.ts` expone subir, descargar, eliminar, firmar URL y comprobar salud mediante un proveedor.

Los controladores conservan el mismo contrato y siguen almacenando `storage_key`; cambiar de proveedor no cambia expedientes, documentos ni relaciones.

## Modos

### Cloud

Usa `CLOUD_DATABASE_URL`/`CLOUD_DIRECT_URL` y el proveedor `supabase-cloud`. `DATABASE_URL`/`DIRECT_URL` siguen disponibles para Prisma CLI y compatibilidad. Es el modo predeterminado y probado contra el proyecto actual.

### Local

Usa PostgreSQL 17 mediante `LOCAL_DATABASE_URL`/`LOCAL_DIRECT_URL` y el proveedor `filesystem-local`. El directorio `LOCAL_STORAGE_PATH` debe:

- ser absoluto y acotado;
- existir antes de iniciar el servicio;
- ser legible/escribible por el usuario del backend;
- residir en volumen con respaldo;
- no apuntar a `/` ni aceptar traversal mediante `storage_key`.

Los archivos locales se crean con permiso `0600` y sin sobrescritura. Las visualizaciones usan enlaces HMAC de hasta una hora, firmados con `LOCAL_STORAGE_SIGNING_SECRET`; no exponen el directorio físico.

### Hybrid

Exige configuración completa de ambos lados y un primario explícito:

- `PRAVIA_PRIMARY_DATABASE=cloud|local`;
- `PRAVIA_PRIMARY_STORAGE=cloud|local`.

Solo el primario atiende solicitudes. `replication_enabled` permanece `false` en health checks. Esta entrega no inventa sincronización bidireccional, resolución de conflictos ni escrituras dobles sin un servidor local real y un protocolo operativo aprobado.

## Comandos preparados

| Comando | Función | Seguridad por defecto |
| --- | --- | --- |
| `npm run db:verify` | Comprueba esquema, acceso a tablas, conteos, ubicación del historial y Storage | Solo lectura |
| `npm run storage:verify` | Comprueba proveedor y salud del Storage seleccionado | Solo lectura |
| `npm run db:backup` | Crea un dump custom de `pravia_os` | Exige `BACKUP_FILE` absoluto; no sobrescribe salvo confirmación |
| `npm run db:restore` | Restaura un dump en un destino explícito | Exige `RESTORE_DATABASE_URL`, frase de confirmación y destino con cero tablas |

Las utilidades pasan la contraseña a `pg_dump`, `psql` y `pg_restore` mediante entorno, no como argumento ni salida. Restore nunca usa `--clean`, no borra objetos y rechaza destinos no vacíos.

## Procedimiento futuro de migración

1. declarar ventana de mantenimiento y detener nuevas escrituras;
2. ejecutar `db:verify` y `storage:verify` en el origen;
3. crear respaldo de base en una ruta cifrada y con espacio verificado;
4. provisionar PostgreSQL 17 vacío y Storage destino;
5. restaurar solo en el destino vacío;
6. copiar objetos por inventario preservando cada `storage_key` y comprobar tamaño/hash;
7. configurar el modo y primario nuevos mediante secretos;
8. ejecutar verificaciones de base, Storage y una prueba de lectura de documentos;
9. mantener el origen intacto durante el periodo de reversa;
10. habilitar escrituras únicamente después de aprobación operativa.

La copia de objetos se mantiene como procedimiento controlado y todavía no como replicador automático. Un futuro implementador debe añadir inventario paginado, checksums, reanudación idempotente y reporte de faltantes antes de usarla con información real.

## Verificación actual

La verificación de solo lectura sobre cloud confirmó:

- esquema activo `pravia_os`;
- 1 usuario, 7 expedientes y 65 documentos accesibles;
- historial Prisma heredado localizado en `public`, sin moverlo;
- Storage cloud disponible;
- `replication_enabled=false`;
- 58 pruebas aprobadas en 11 archivos para modos, selección de primario, traversal, firmas y el resto del dominio;
- backend compilado correctamente.
