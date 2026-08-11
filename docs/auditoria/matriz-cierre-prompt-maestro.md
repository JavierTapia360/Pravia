# Matriz de cierre del prompt maestro

Esta matriz evita declarar terminado el proyecto solo porque compila. “Verificado” exige evidencia actual; “Preparado” significa que existe el artefacto pero falta ejecutar un gate externo; “Pendiente” bloquea producción.

| Área solicitada | Estado | Evidencia principal |
| --- | --- | --- |
| Auditoría código/Prisma/Supabase/Storage/datos | Verificado | `fase-0-auditoria.md`, conteos cloud y matriz de discrepancias |
| Preservación de IDs, relaciones, archivos y filas | Verificado | Solo migraciones aditivas; 1 usuario, 7 expedientes y 65 documentos conservados en última verificación remota |
| Health independiente de tablas | Verificado | `SELECT 1`, estado DB/Storage/modo sin secretos |
| Prospecto → cotización | Verificado | Controladores reales y recorrido E2E aislado aprobado |
| Aceptación + anticipo validado → expediente | Verificado | Conversión transaccional, auditoría, idempotencia y E2E aislado aprobado |
| Guardado dirty-state de expediente | Verificado | Cabecera/rubros/participación atómicos y persistencia tras recarga comprobada |
| Compareciente maestro reutilizable | Verificado | Alta, reutilización en dos expedientes y vínculo contextual aprobados en E2E |
| Validación humana antes de firma | Preparado; migración remota pendiente | Migración aditiva `add_compareciente_link_validation`, auditoría, evento y acción UI |
| Documentos privados y firmados | Verificado | Storage privado, streaming/firmas cortas, trazabilidad y vínculos |
| Proyecto de escritura/versiones/IA | Verificado | Versiones, vigente/aprobada protegida, análisis y leyenda de revisión profesional |
| Firma → postfirma → entrega | Verificado | Máquina de estados y fechas finales aprobadas en recorrido E2E aislado |
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
| E2E UI autenticado | Verificado local | Smoke Playwright aprobado en siete módulos privados con cuenta sintética aislada |
| E2E 11 flujos críticos | Verificado local | Recorrido completo aprobado en PostgreSQL 17 + Storage local aislados; IA pagada permanece opcional |
| Performance frontend | Verificado | Presupuestos gzip verdes y lazy chunks medidos |
| Performance PostgreSQL | Parcial | Primer lote aplicado; segundo lote operativo preparado pero pendiente de aplicación/verificación remota |
| Secretos | Verificado con acción operativa | Cero hallazgos actuales; valor histórico de desarrollo identificado por huella y rotación obligatoria |
| Base local nueva | Verificado | Bootstrap transaccional probado, 15 migraciones baselined, cero pendientes y rechazo sobre destino no vacío |
| Contenedores/despliegue/reversa | Preparado y construido localmente | Imágenes backend/frontend, Nginx, Compose y runbook |
| README y documentación técnica | Verificado | Guías por fase, arquitectura, seguridad, PWA, calidad y producción |

## Bloqueadores reales para declarar producción

1. Aplicar remotamente las migraciones `20260811051000` y `20260811052000` y verificar asesores.
2. Configurar secretos finales y activar deliberadamente una cuenta Dirección; la cuenta preservada no tiene hash bcrypt válido.
3. Ejecutar integración remota de solo lectura con acceso autorizado.
4. Aprobar, si se desea como gate contractual, una única llamada real de IA con documento inequívocamente sintético; el resto del flujo IA ya está validado offline y esta llamada no es necesaria para operar sin IA.

Los smoke autenticados y el recorrido crítico ya fueron cerrados localmente, siempre fuera de NOTARYPROY. Hasta resolver los bloqueadores remotos, el código está preparado para el corte pero la instalación no debe etiquetarse como producción aprobada.
