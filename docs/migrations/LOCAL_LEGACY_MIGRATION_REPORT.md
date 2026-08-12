# LOCAL_LEGACY_MIGRATION_REPORT

## Estado

**BLOQUEADO_DE_FORMA_SEGURA — no se ejecutó inventario ni migración.**

El reader `LOCAL_LEGACY` permanece intacto. No se hicieron conexiones, lecturas ni escrituras sobre PostgreSQL/Supabase; no se subieron, modificaron o eliminaron archivos.

## Preflight identificado

- El único `.env` disponible declara `NODE_ENV=production`.
- `DATABASE_URL`, `DIRECT_URL` y `SUPABASE_URL` identifican el mismo proyecto cloud `mkiwijbampubccrpvgga`.
- No existe `proyectos_db.json` en el repositorio principal ni en el worktree aislado.
- No existen directorios locales accesibles `uploads/proyectos` o `uploads/reportes_ia` con los binarios históricos.
- Por la instrucción “NO TOQUES PRODUCCIÓN”, no se ejecutaron consultas de inventario contra ese entorno.

## Totales

| Métrica | Resultado |
|---|---:|
| TOTAL | NO CALCULADO — inventario legacy no disponible |
| MIGRADOS_VERIFICADOS | 0 |
| YA_MIGRADOS | NO CALCULADO |
| ARCHIVOS_NO_DISPONIBLES | NO CALCULADO |
| INCONSISTENTES | NO CALCULADO |
| REQUIEREN_REVISION | NO CALCULADO |

Estos valores no se sustituyen por ceros porque hacerlo inventaría un inventario inexistente.

## Preparación completada

La herramienta ahora exige:

1. árbol legacy real y contenido bajo `--legacy-root`;
2. copia aislada de PostgreSQL y bucket Supabase correspondiente;
3. `NODE_ENV` distinto de producción;
4. etiqueta de entorno y project ref esperados;
5. coincidencia entre el proyecto de base y Storage;
6. actor activo y doble confirmación para `--apply`;
7. reporte JSON/Markdown/CSV obligatorio;
8. idempotencia por origen, SHA-256, clave de Storage y lock transaccional;
9. conservación de archivo legacy, fechas, autor y procedencia;
10. verificación automática del 100 % mediante Storage, DB, vínculo y `ProjectRepository` moderno.

## Insumos necesarios para continuar

- Copia aislada y validada de la base que contiene los expedientes históricos.
- Bucket de staging correspondiente a esa copia.
- Copia íntegra del directorio `uploads` histórico, incluyendo `proyectos_db.json`, `proyectos/` y `reportes_ia/`.
- UUID de un actor técnico activo en la copia aislada.
- Nombre y project ref del entorno de staging.

Cuando esos insumos estén disponibles se ejecutará primero el dry-run. El modo apply solo se considerará después de revisar su clasificación completa. Este documento no autoriza retirar el reader.
