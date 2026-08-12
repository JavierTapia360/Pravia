# PRAVIA OS 2 — Arquitectura de consolidación

## Estado de este documento

Este documento describe la arquitectura implementada en la rama `codex/pravia-os-2-consolidation`, sus invariantes y las fronteras que todavía no pueden considerarse terminadas. No representa un merge ni una declaración de que PRAVIA OS 2 esté completo.

## Principios

1. La identidad de una mutación proviene exclusivamente de la sesión autenticada.
2. El rol abre una capacidad; el alcance de objeto decide sobre qué registros puede ejercerse.
3. Un documento es un archivo maestro con vínculos contextuales auditables.
4. Un expediente congela la versión del flujo, formulario y requisitos con los que nació.
5. Presupuesto, valor de operación, cobranza, egresos y honorarios son conceptos distintos.
6. La IA no tiene acceso arbitrario a base de datos ni ejecuta escrituras silenciosas.
7. La PWA nunca debe servir HTML bajo una URL de JavaScript versionado.
8. La interfaz operativa usa superficies claras y conserva navy y cobre/dorado como identidad, no como relleno dominante.

## Capas

### Frontend

- React, React Router y Zustand.
- `services/api.ts` es el único cliente autenticado para API privada: Bearer token, cookie de renovación, correlación, timeout, cancelación y una sola reintento de renovación.
- `authStore.ts` invalida solicitudes y limpia estados privados al cerrar o perder sesión.
- `MainLayout` contiene navegación por rol, topbar, búsqueda de módulos, workspace y presencia transversal de PRAVIA IA.
- El sistema visual se apoya en tokens primitivos, semánticos y de componente, más patrones compartidos para páginas, métricas, toolbars, tablas, modales, drawer, estados y confirmaciones.

### Backend

- Express y Prisma.
- `authenticate` resuelve usuario, sesión, rol y permisos en cada solicitud privada.
- `requirePermission` y `authorizeByMethod` validan capacidad.
- `expedienteAccessWhere` y `objectAccess.service.ts` restringen el alcance de expedientes, prospectos, cotizaciones, comparecientes, documentos y sesiones temporales.
- Los controladores no aceptan identificadores de actor enviados por el cliente para autoría, validación, transición, archivo o carga.

### Persistencia

- PostgreSQL mediante Prisma.
- Los folios de expediente se generan con un único servicio transaccional y bloqueo consultivo por año.
- Las tablas de vínculo documental son la relación canónica; las llaves directas permanecen temporalmente por compatibilidad.
- `DomainEventOutbox` persiste eventos; un evento sin handler queda en `FALLIDO`, nunca en procesado.

## Modelo de dominio

### Comercial

`Prospecto → Cotización → Expediente` conserva procedencia. La conversión usa el mismo motor de apertura y no suplanta el valor jurídico de la operación con el total de la cotización.

### Expediente

El expediente concentra:

- tipo de acto y responsables;
- versión congelada de flujo, formulario y plantilla;
- etapas instanciadas con snapshots;
- comparecientes y representaciones;
- requisitos y documentos;
- movimientos financieros;
- tareas, agenda, comunicaciones, cumplimiento y bitácora.

La fecha de registro de una transición y su fecha efectiva son conceptos separados. Firma y entrega requieren fecha efectiva válida.

### Compareciente

`Compareciente` es el registro maestro. Persona física y moral son especializaciones; expediente, representación, documentos, domicilios e identificaciones se vinculan sin duplicar a la persona.

## Autenticación y sesión

- Access token corto en memoria del frontend.
- Refresh mediante cookie protegida.
- Sesión de servidor comprobada en cada acceso.
- Cierre o renovación fallida cancela solicitudes privadas y limpia stores.
- Los errores 401 provocan una renovación controlada, no ciclos infinitos.
- Las rutas privadas requieren contraseña definitiva.

## Permisos y alcance

La matriz actual conserva los permisos históricos para evitar ampliar acceso sin autorización. Además se aplican filtros de objeto:

- Dirección, Administración y Consulta tienen lectura global en los ámbitos definidos.
- Abogado se limita a registros propios/asignados cuando corresponde.
- Gestoría accede a expedientes asignados o con tareas activas.
- Recepción mantiene alcance comercial, no acceso implícito a expedientes.
- Documentos heredan acceso de su archivo maestro, autor y vínculos activos.
- Sesiones de alta temporal pertenecen al usuario, salvo perfiles elevados.

Pendiente: cerrar con el propietario del producto la matriz exacta de transición, firma, postfirma y entrega para Recepción/Gestoría. No se amplió por inferencia.

## Workflow

- La conversión y la apertura instancian la primera etapa y los requisitos congelados.
- Las transiciones consultan `FlujoVersion.etapas_json`, no el catálogo vivo.
- Las etapas guardan nombre, clave, orden y duración como snapshot.
- La fecha efectiva alimenta firma/entrega real; la bitácora conserva además la fecha de registro.
- El progreso documental no devuelve 100 % cuando no existe configuración.
- El progreso operativo usa el flujo congelado.

## Documentos y storage

- `Documento` es el archivo maestro.
- Prospecto, cotización, expediente y compareciente se relacionan mediante vínculos activos/inactivos.
- La carga crea maestro y vínculo dentro de una transacción de base de datos.
- Las URL firmadas requieren sesión, permiso y alcance del objeto.
- “Eliminar” en los contextos corregidos significa desvincular e inactivar; el binario se conserva.
- La interfaz explica esta semántica antes de confirmar.

Pendiente: worker completo de compensación para fallas entre storage y DB, política de retención física y migración exhaustiva de relaciones directas legacy.

## Finanzas

- El presupuesto operativo proviene del snapshot aprobado de cotización o de `datos_operacion.presupuesto`.
- `valor_operacion` no se usa como presupuesto.
- La conversión no copia `total_cliente` a `valor_operacion`.
- El progreso financiero permanece en 0 cuando no existe presupuesto configurado.
- Movimientos y adjuntos conservan historial; los reversos no reescriben el registro original.

Pendiente: ledger canónico y backfill histórico. No se aplicó una migración inferida porque requiere que el propietario defina el mapeo de conceptos financieros existentes.

## Eventos y automatización

- El outbox es la frontera durable para efectos secundarios.
- Un handler inexistente produce `NO_HANDLER_REGISTERED` y estado `FALLIDO`.
- Esto permite observabilidad y reintento sin reportar trabajo no realizado.

Pendiente: catálogo de handlers, retries/backoff, dead-letter operativo, notificaciones y workers de compensación.

## Arquitectura de interfaz

### Tokens

- Primitivos navy, slate, cobre, estados semánticos, escalas 4–48, radios y sombras.
- Semánticos para superficie, texto, bordes, foco, éxito, advertencia y peligro.
- Componentes para botones, campos, cards, sidebar, modal, drawer y tablas.

### Patrones compartidos

- `module-page`, `module-page-header`, `module-actions`.
- `metric-grid`, `metric-card`.
- `toolbar-card`, `segmented-control`, `control-height`.
- `data-surface`, `data-table`, `data-table-scroll`.
- `entity-grid`, `entity-card`.
- `ConfirmDialog`, `Modal`, `SlideOver`, estados asincrónicos y toasts.

### Módulos intervenidos

- Expedientes: encabezado claro, métricas ligeras, filtros separados y tabla respirable.
- Comparecientes: grid que aprovecha el ancho, identidad y calidad jerarquizadas.
- Notarías: cards de contacto/métricas y grid adaptable.
- Agenda: toolbar de 42 px, navegación visible, calendario y tareas con mayor legibilidad.
- Finanzas: resumen, tabs, filtros y tablas con scroll horizontal controlado.
- Configuración IA: jerarquía de configuración, métricas, flujo y procedencia.
- Riesgos/UIF: encabezado de alto contraste sobre superficie clara, tabs, métricas y panel maestro-detalle.

## PRAVIA IA

PRAVIA IA vive en el shell, no como módulo de trabajo común. Su drawer resuelve usuario, rol, ruta, módulo y entidad de URL; ofrece navegación contextual, tres modos y estados visuales con reducción de movimiento.

La rama incluye un registro backend de tools tipadas, con permisos por tool, object scope, límites, procedencia, correlación y auditoría. El shell reutiliza el ID del expediente visible para preguntas como “¿qué falta?”. Tarea, cita y seguimiento son borradores hasta Confirmar; las acciones sensibles permanecen fuera de alcance.

Véase `docs/PRAVIA_AI.md`.

## PWA

- Navegaciones: network-first sin cache HTTP del documento; fallback a la última shell conocida solo sin red.
- `/api`: network-only con respuesta offline explícita.
- `/assets/*` versionados: cache-first.
- No se precachea `/` ni `/index.html` bajo claves que puedan mezclarse con chunks.
- Un worker en espera solo se activa por decisión del usuario.
- La verificación estática detecta patrones de cache HTML/bundle inseguros.

## Deuda y bloqueos

1. Aplicar la matriz RBAC final de Recepción/Gestoría; el cambio fue rechazado por la puerta de seguridad del entorno al detectar conflicto con el alcance frontend-only anterior.
2. Revisar el informe del clasificador financiero y autorizar por separado cualquier backfill.
3. Migrar proyectos/reportes `LOCAL_LEGACY` antes de retirar el consumer de filesystem.
4. Reconfirmar si las tools deben estar disponibles para roles que hoy no poseen el permiso paraguas `ia.read`.
5. Ejecutar E2E autenticado y regresión visual cuando existan `PRAVIA_E2E_EMAIL`/`PRAVIA_E2E_PASSWORD`.
