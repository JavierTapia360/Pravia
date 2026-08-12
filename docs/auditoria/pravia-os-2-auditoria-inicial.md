# PRAVIA OS 2.0 — Auditoría integral inicial

Fecha: 2026-08-11

Rama: `codex/pravia-os-2-consolidation`
Base verificada: `main` (`5234a42`)

## Alcance inspeccionado

Se revisaron la estructura completa del monorepo, el shell y las rutas del frontend, los servicios de acceso a API, autenticación y estado de sesión, los controladores y servicios del backend, el modelo Prisma y sus migraciones, permisos y middleware, documentos y storage, expedientes y workflow, finanzas, comparecientes, agenda, IA, eventos/outbox, PWA, pruebas, CI y documentación operativa existente.

Esta auditoría es la línea base de PRAVIA OS 2.0. No sustituye la segunda pasada manual exigida al cierre.

## Diagnóstico ejecutivo

El producto contiene una base funcional amplia y varios dominios ya modelados, pero aún no cumple las invariantes de seguridad, identidad, consistencia operacional y resiliencia necesarias para consolidarlo. La prioridad inmediata no es visual: primero deben cerrarse los P0. El rediseño se realizará sobre contratos estables y permisos unificados.

## Hallazgos P0

### Identidad y sesión

- Existen llamadas protegidas con `fetch` fuera del cliente autenticado compartido en páginas de expedientes, comparecientes, proyecto documental y cargas.
- Varias mutaciones aceptan `user_id`, `creado_por_id` o equivalentes enviados por el navegador.
- Hay fallbacks backend al primer usuario activo o al primer usuario de la base de datos.
- En frontend existe un UUID fijo usado para subir documentos y un fallback a `localStorage` para identidad.
- El cliente autenticado reintenta un `401`, pero todavía no normaliza de forma completa cancelación, correlación, tipos de contenido y errores seguros para humanos.

Invariante objetivo: toda acción autenticada deriva la identidad exclusivamente de `req.user`; el navegador nunca selecciona al actor de una mutación.

### Autorización y acceso por objeto

- El middleware global aplica permisos por método, pero la matriz no coincide con todos los flujos operativos: Recepción y Gestoría quedan bloqueados en acciones que el workflow sí contempla.
- El workflow aplica una segunda política interna distinta, lo que crea dos fuentes de verdad.
- Las URLs firmadas de documentos se generan por UUID sin demostrar acceso al expediente, cotización, prospecto o compareciente relacionado.
- Las rutas de documentos dependen principalmente del permiso funcional y no de una política uniforme de acceso al objeto.
- Reportes, finanzas e IA requieren filtros de alcance más estrictos antes de devolver payloads.

Invariante objetivo: permiso funcional + alcance del objeto + estado del recurso, evaluados por una política central y reutilizable.

### Integridad operacional

- La creación directa de expedientes calcula folio con `count + 1`; la conversión desde cotización usa otra estrategia con bloqueo. Son dos fuentes de folio y una de ellas no es segura ante concurrencia.
- El workflow consulta etapas vivas del catálogo en lugar de operar sólo con la versión congelada asociada al expediente.
- Cambiar estado puede escribir la fecha efectiva de firma o entrega con la hora de registro, sin distinguir ambos conceptos.
- Existen estados de expediente históricos/legacy en consumidores del frontend.

Invariante objetivo: una única emisión transaccional de folios y workflows versionados, congelados y auditables.

### Progreso y finanzas

- La ausencia de requisitos documentales o presupuesto produce avances de `100%`, aunque signifique configuración faltante.
- El presupuesto operativo puede caer a `cotizacion.total_cliente` y después a `valor_operacion`; este último representa el valor jurídico/económico de la operación y nunca debe usarse como presupuesto.
- El ledger moderno coexiste con el modelo legado de pagos y algunos endpoints todavía cambian semántica según la disponibilidad de datos.
- Algunos listados financieros cargan conjuntos amplios y filtran después, aumentando exposición y costo.

Invariante objetivo: estados `no configurado`, `sin datos`, `en progreso` y `completo` diferenciados; ledger único y semántica financiera explícita.

### Documentos y almacenamiento

- `Documento` conserva llaves foráneas directas mientras también existen tablas de vínculo maestras, creando dos representaciones para una misma relación.
- La eliminación física puede ocurrir antes que el borrado lógico/transaccional y los fallos de storage sólo se registran como advertencia en algunos caminos.
- Existe `StorageCompensationJob`, pero no se encontró un procesador operativo completo y observable.
- La carga de documentos contiene mensajes heredados de “presupuesto” aun para documentos genéricos.

Invariante objetivo: documento maestro + vínculos activos/inactivos como fuente canónica, borrado seguro y compensación durable.

### Eventos y automatización

- El outbox implementa reclamación con `SKIP LOCKED` e idempotencia por handler, una buena base.
- Si un tipo de evento no tiene handlers registrados, actualmente puede marcarse como procesado.
- No se encontró un bootstrap completo de handlers ni una ejecución operativa continua del worker.
- Las automatizaciones de SLA, recordatorios, notificaciones y mantenimiento aún no forman un sistema coherente.

Invariante objetivo: ningún evento sin handler se marca procesado; workers idempotentes, reintentables, observables y con dead-letter efectiva.

### PWA y despliegue frontend

- El service worker usa una versión fija (`pravia-shell-v1`) y cache-first para activos, lo que puede conservar bundles incompatibles después de un despliegue.
- Falta una política robusta de actualización, activación y limpieza que evite mezclar HTML y chunks de distintas versiones.
- Los activos de marca indicados por el encargo no forman parte de `main`; existen sólo como archivos no versionados en el workspace previo y deberán incorporarse de manera explícita y trazable.

## Hallazgos de consolidación P1

- `openExpediente` no es todavía una única primitiva compartida para navegación y acciones contextuales.
- Hay duplicación entre estado global, etapa actual y snapshots de etapas.
- Comparecientes cuenta con modelos modernos de representación, identificación, domicilio y fuentes, pero la experiencia todavía mezcla flujos y contratos antiguos.
- Agenda, comunicaciones, tareas y fechas efectivas necesitan una semántica temporal común.
- La extracción IA procesa lotes amplios de documentos y necesita segmentación, límites, estado por documento, procedencia y confirmación humana.
- Existen proveedores/prototipos locales de filesystem que deben quedar fuera de rutas productivas.
- El frontend contiene `alert`/`confirm`, estilos oscuros heredados, tamaños funcionales pequeños y overrides acumulados.

## Aspectos aprovechables

- Modelo de dominio extenso con versiones de formulario/flujo/plantilla.
- Outbox, bitácoras de procesamiento e índices de idempotencia ya iniciados.
- Ledger financiero y vínculos documentales modernos ya modelados.
- Middleware de correlación y normalización de errores existente.
- CI con build, pruebas, verificación PWA y control de bundle.
- Documentación previa por fases que sirve como evidencia histórica, aunque no como prueba de cierre.

## Secuencia de ejecución aprobada

1. Seguridad e integridad: cliente autenticado único, identidad de sesión, errores, políticas y acceso por objeto, folios.
2. Consolidación de dominio: expedientes/workflow, documentos, progreso, finanzas, comparecientes y fechas efectivas.
3. Operación backend: outbox, handlers, workers, compensación, notificaciones, SLA, búsqueda y paginación.
4. Design System 2: tokens, primitivas, accesibilidad y eliminación de overrides conflictivos.
5. Reconstrucción UX transversal de módulos, responsive y estados vacíos/error/carga.
6. PRAVIA AI contextual con permisos, procedencia, confirmación y auditoría.
7. Pruebas, hardening, regresión visual, PWA y segunda pasada manual.

## Regla de cierre

Una fase sólo se considerará cerrada con código real, pruebas proporcionales al riesgo y evidencia verificable. La existencia de modelos, documentos o interfaces parciales no se considerará implementación completa.

## Segunda pasada — estado al cierre de esta rama

### Corregido y verificado

- Cliente API privado centralizado; los `fetch` restantes son autenticación pública, health PWA o descarga desde URL firmada.
- Actor de mutación resuelto desde sesión en los flujos auditados.
- Alcance por objeto en prospectos, cotizaciones, comparecientes, documentos y altas temporales.
- Emisión de folios compartida y protegida frente a concurrencia.
- Workflow y progreso basados en versión congelada; fecha efectiva separada de fecha de registro.
- Ausencia de configuración ya no se presenta como 100 %.
- `valor_operacion` dejó de operar como presupuesto y la conversión ya no lo llena con el total de cotización.
- Vínculos documentales creados transaccionalmente; eliminación contextual convertida en desvinculación no física.
- Eventos sin handler quedan fallidos y observables.
- Estrategia PWA sin mezcla de HTML y chunks; checks de PWA y bundle verdes.
- Siete pantallas críticas migradas a superficies claras, tipografía funcional legible y composición responsive.
- Cero `alert()` y `confirm()` nativos en frontend; existe `ConfirmDialog` compartido.
- PRAVIA IA integrada transversalmente para contexto y navegación segura.
- Navegación del sidebar contrastada contra las rutas declaradas.

### No cerrado

- La matriz RBAC final de transición/firma/postfirma/entrega necesita aprobación funcional explícita.
- El ledger histórico y su backfill necesitan un mapeo contable autorizado; no se aplicaron inferencias.
- Las tools backend de PRAVIA IA fueron bloqueadas hasta aprobar expresamente el nuevo alcance de lectura sensible.
- Los binarios de marca siguen como archivos no versionados en el workspace original y no se copiaron mediante una vía no trazable.
- La compensación integral de storage, workers, notificaciones y SLA sigue pendiente.
- No se ejecutó E2E autenticado ni captura de las pantallas privadas: no existe una cuenta E2E en el entorno local y no se crearon usuarios/datos para forzar la evidencia.
- La revisión responsive de módulos privados se limita a reglas CSS, compilación y estructura; falta comprobación visual real a 1440/1280/1024/768/390 con sesión de prueba.

Por estas razones no corresponde declarar PRAVIA OS 2.0 terminado.
