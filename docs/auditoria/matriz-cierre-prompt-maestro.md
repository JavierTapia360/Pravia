# Matriz de cierre del prompt maestro

Esta matriz evita declarar terminado el proyecto solo porque compila. “Verificado” exige evidencia actual; “Preparado” significa que existe el artefacto pero falta ejecutar un gate externo; “Pendiente” bloquea producción.

| Área solicitada | Estado | Evidencia principal |
| --- | --- | --- |
| Auditoría código/Prisma/Supabase/Storage/datos | Verificado | `fase-0-auditoria.md`, conteos cloud y matriz de discrepancias |
| Preservación de IDs, relaciones, archivos y filas | Verificado | Solo migraciones aditivas; 1 usuario, 7 expedientes y 65 documentos conservados en última verificación remota |
| Health independiente de tablas | Verificado | `SELECT 1`, estado DB/Storage/modo sin secretos |
| Prospecto → cotización | Verificado por dominio/API; E2E preparado | Controladores reales, transición y `e2e:critical` |
| Aceptación + anticipo validado → expediente | Verificado por unidad/dominio; E2E preparado | Conversión transaccional, auditoría e idempotencia |
| Guardado dirty-state de expediente | Verificado por implementación; E2E preparado | Cabecera/rubros/participación atómicos, baseline tras éxito y navegación protegida |
| Compareciente maestro reutilizable | Verificado por implementación; E2E preparado | Entidad independiente, vínculo contextual y prevención de duplicados |
| Validación humana antes de firma | Preparado; migración remota pendiente | Migración aditiva `add_compareciente_link_validation`, auditoría, evento y acción UI |
| Documentos privados y firmados | Verificado | Storage privado, streaming/firmas cortas, trazabilidad y vínculos |
| Proyecto de escritura/versiones/IA | Verificado | Versiones, vigente/aprobada protegida, análisis y leyenda de revisión profesional |
| Firma → postfirma → entrega | Verificado por dominio; E2E preparado | Máquina de estados, requisitos de firma y evidencia obligatoria de entrega |
| Notarías | Verificado | Ficha, contactos, tiempos, ámbitos y relaciones |
| Finanzas y comprobantes | Verificado | Ledger inmutable, reversos, adjuntos PDF/XML y separación recibido/honorario |
| Agenda, Mi Día y reportes | Verificado | CRUD/cancelación/movimiento, vistas día-semana-mes-lista, KPIs y filtros |
| IA nano/mini y costo | Verificado offline; corrida real opcional | Modelo barato por defecto, escalamiento selectivo, métricas y ocho fixtures |
| No invención/confirmación humana | Verificado | Propuestas trazables, conflictos sin elección silenciosa y persistencia solo al confirmar |
| UIF/ISR versionados con fuentes | Verificado | Dos rule sets, fuentes oficiales y revisión humana; no dictamen automático |
| Login, sesiones, recuperación y roles | Implementado; activación pendiente | JWT corto, refresh rotatorio, bcrypt, lockout, RBAC y pantallas |
| RLS/Data API | Verificado | Ocho tablas legadas cerradas; Security Advisor en cero tras Fase 10 |
| Auditoría y observabilidad | Verificado | audit log, outbox, correlación y logs JSON sin cuerpos |
| PWA | Verificado | Manifest, iconos, SW, shell offline y bloqueo de escrituras offline |
| Cloud/local/hybrid | Verificado a nivel arquitectura | Selectores centrales, proveedores Storage y herramientas backup/restore/verify |
| Unit tests | Verificado | 65 pruebas en 13 archivos |
| Integración DB | Preparado; ejecución final pendiente | Suite read-only creada; última ejecución bloqueada por conectividad del entorno |
| E2E UI autenticado | Preparado; ejecución final pendiente | Smoke Playwright creado; requiere cuenta de prueba válida |
| E2E 11 flujos críticos | Preparado; ejecución final pendiente | Driver completo con guardas de base aislada; no se permite sobre datos actuales |
| Performance frontend | Verificado | Presupuestos gzip verdes y lazy chunks medidos |
| Performance PostgreSQL | Parcial | Primer lote aplicado; segundo lote operativo preparado pero pendiente de aplicación/verificación remota |
| Secretos | Verificado con acción operativa | Cero hallazgos actuales; valor histórico de desarrollo identificado por huella y rotación obligatoria |
| Contenedores/despliegue/reversa | Preparado | Dockerfiles, Nginx, Compose y runbook |
| README y documentación técnica | Verificado | Guías por fase, arquitectura, seguridad, PWA, calidad y producción |

## Bloqueadores reales para declarar producción

1. Aplicar remotamente las migraciones `20260811051000` y `20260811052000` y verificar asesores.
2. Configurar secretos finales y activar deliberadamente una cuenta Dirección; la cuenta preservada no tiene hash bcrypt válido.
3. Ejecutar integración remota de solo lectura con acceso autorizado.
4. Ejecutar smoke autenticado.
5. Ejecutar el recorrido crítico en una base local/efímera, nunca en NOTARYPROY.

Hasta cerrar esos cinco puntos, el código está preparado para el corte pero la instalación no debe etiquetarse como producción aprobada.
