# Delta posterior a `bdabb07`

## Implementado

- clasificador determinista y auditoría read-only de `Pago` legacy, sin usar `valor_operacion` y sin ejecutar backfill;
- 13 tools backend de lectura y cuatro de navegación/preparación, con permisos, scope, límites, procedencia, correlación y AuditLog;
- contexto global revalidado en backend y rechazo de context spoofing;
- sugerencias con triggers cerrados, modo Balanced, no repetición, dismiss y snooze;
- mascota oficial con seis estados, blink, movimiento sutil y reduced motion;
- Configuración IA limitada a Dirección/Administración;
- worker de compensación con lock optimista, recuperación de jobs obsoletos, retry/backoff, máximo, fallo terminal, logs, métricas y ownership estricto;
- assets existentes de PRAVIA OS/IA versionados sin generar variantes;
- E2E/visual preparados para credenciales externas, sin alta ni reset de cuentas;
- retirada de inferencias de honorarios/presupuesto desde `valor_operacion` en métricas, Mi Día, Reportes y detalle financiero;
- object scope reforzado al vincular Agenda y crear revisiones de cumplimiento.

## No ejecutado

- backfill financiero, escritura/lectura contra producción, borrado de storage, E2E autenticado, capturas visuales, merge o push.

## Bloqueos conservados

- RBAC específico `expediente.entregar`/postfirma y disponibilidad de tools para roles sin `ia.read`: rechazados por la puerta de seguridad debido al alcance frontend-only anterior;
- `Pago` sigue como fallback legacy hasta revisar y autorizar el backfill;
- `proyectos_db.json`/`LOCAL_LEGACY` sigue como compatibilidad hasta migrarlo a Documento/Storage.
