# Migración de proyectos `LOCAL_LEGACY`

## Objetivo

Retirar `uploads/proyectos_db.json`, proyectos generados, reportes IA y plantillas locales del runtime. El destino único es PostgreSQL para metadata y el storage cloud configurado para binarios. Nunca se fabrica un `.docx` para cubrir una referencia ausente.

## Clasificaciones

- `YA_MIGRADO`: existe un `Documento` persistente con el mismo `legacy_source_id`.
- `MIGRABLE`: expediente, archivo, tamaño, hash y versión permiten preparar la carga.
- `ARCHIVO_LOCAL_NO_DISPONIBLE`: la metadata existe, pero el binario no; se conserva la incidencia en el reporte.
- `REFERENCIA_INCONSISTENTE`: ruta insegura, identificadores incompletos o expediente inexistente.
- `REQUIERE_REVISION`: hay una colisión de versión, diferencia de tamaño o evidencia insuficiente.

## Dry-run obligatorio

Desde `backend/`:

```bash
npm run projects:migrate-legacy -- \
  --legacy-root=/ruta/verificada/uploads \
  --output-dir=/ruta/segura/reporte
```

El comando es de solo lectura sobre PostgreSQL y los archivos locales. Produce JSON por stdout y, al indicar `--output-dir`, genera:

- `legacy-projects.json`
- `legacy-projects.md`
- `legacy-projects.csv`

Cada fila conserva la referencia, clasificación, razón, tamaño, SHA-256 y clave de storage propuesta. Si el archivo no existe, no se crea ningún sustituto.

## Aplicación controlada

El modo de escritura no debe ejecutarse hasta revisar y firmar el dry-run, respaldar la base, verificar el bucket y resolver todos los `REQUIERE_REVISION` relevantes. Requiere simultáneamente:

```bash
LEGACY_PROJECT_MIGRATION_APPLY=I_UNDERSTAND_THIS_WRITES_POSTGRES_AND_STORAGE \
npm run projects:migrate-legacy -- \
  --apply \
  --actor-user-id=<UUID_ACTOR_AUDITABLE> \
  --legacy-root=/ruta/verificada/uploads \
  --output-dir=/ruta/segura/reporte-aplicado
```

El script se niega a escribir si el storage primario no es cloud. Para cada registro migrable carga primero el binario, crea `Documento` y `ExpedienteDocumento` en transacción y elimina el objeto subido si falla PostgreSQL. El hash y `legacy_source_id` quedan en metadata para idempotencia.

## Cierre

La retirada del lector runtime solo es válida cuando el reporte aplicado muestra que las referencias necesarias son `YA_MIGRADO` o que las incidencias no recuperables fueron aceptadas expresamente. `ARCHIVO_LOCAL_NO_DISPONIBLE` no debe reinterpretarse como migrado.

## Plantillas persistentes

La generación ya no admite una plantilla fija del filesystem. Cada expediente conserva un `plantilla_documental_version_id`; esa versión debe identificar tipo de acto, notaría opcional, versión, nombre, clave de Storage, MIME, tamaño y SHA-256.

El registro de una plantilla tiene dry-run por defecto:

```bash
npm run projects:register-template -- \
  --file=/ruta/plantilla-aprobada.docx \
  --tipo-acto-id=<UUID> \
  --notaria-id=<UUID_OPCIONAL> \
  --actor-user-id=<UUID>
```

La aplicación requiere `--apply` y `PROJECT_TEMPLATE_REGISTRATION_APPLY=I_UNDERSTAND_THIS_REGISTERS_A_PERSISTENT_TEMPLATE`. El script valida la estructura Word, calcula SHA-256, exige storage cloud y compensa la carga si falla PostgreSQL.
