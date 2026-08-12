# PRAVIA IA — arquitectura, comportamiento y seguridad

## Propósito

PRAVIA IA es la capa transversal de asistencia de PRAVIA OS. Conserva el contexto de trabajo sin convertirse en un módulo operativo separado y nunca sustituye los permisos ni la revisión humana.

## Estado implementado

- launcher persistente y drawer lateral;
- contexto de ruta, módulo, tipo de entidad, ID y selección acotada;
- modos Proactivo, Equilibrado (default) y Discreto;
- mascota oficial con `idle`, `blink`, `greeting`, `thinking`, `processing` y `success`;
- animación sutil, sin layout shift y con `prefers-reduced-motion`;
- tools backend tipadas para expedientes, comparecientes, documentos, agenda, finanzas, cumplimiento, trabajo propio y búsqueda global;
- respuestas con procedencia, límite, indicador de truncado y `correlation_id`;
- preparación de tarea, cita y seguimiento con Confirmar/Editar/Cancelar;
- sugerencias derivadas de datos con trigger, contexto, razón, prioridad, confianza y acción;
- configuración técnica de IA limitada a Dirección/Administración.

## Context Resolver

El frontend proporciona únicamente ruta, módulo e identificadores. Cuando el usuario está en `/expedientes/:id`, ese ID se reutiliza para preguntas como “¿qué falta?”. El backend rechaza una discrepancia entre ID explícito y contexto, resuelve otra vez el objeto con el scope del usuario y obtiene los datos reales. Rol, permisos y usuario proceden siempre de la sesión autenticada.

## Tool Registry

| Tool | Permiso mínimo | Alcance |
|---|---|---|
| `searchExpedientes` | `expedientes.read` | `expedienteAccessWhere` |
| `getExpedienteSummary` | `expedientes.read` | expediente actual |
| `getExpedientePendingItems` | `expedientes.read` | expediente actual |
| `searchComparecientes` | `comparecientes.read` | `comparecienteObjectWhere` |
| `getComparecienteSummary` | `comparecientes.read` | objeto accesible |
| `getExpedienteDocuments` | `documentos.read` + expediente | vínculos activos |
| `getAgenda` / `getUpcomingEvents` | `agenda.read` | agenda propia/equipo autorizado |
| `getFinancialSummary` / `getOutstandingBalances` | `finanzas.read` | expedientes accesibles |
| `getComplianceSummary` | `cumplimiento.read` | expediente accesible |
| `getCurrentUserWork` | `mi_dia.read` | usuario autenticado |
| `globalSearch` | permisos de cada catálogo | scopes combinados |
| `navigateToEntity` | permiso del objeto | navegación |
| `prepareTask` / `prepareAppointment` / `prepareFollowUp` | `agenda.write` | preparación sin persistir |

No existe SQL, Prisma genérico, acceso directo a storage ni consulta arbitraria generada por el modelo.

## Permission Engine y auditoría

Cada ejecución autentica sesión, comprueba el permiso específico, resuelve object scope, valida un payload máximo de 8 KiB, limita resultados a 25, redacta campos innecesarios y registra `AI_TOOL_READ` o `AI_TOOL_PREPARE` con sesión, keys de argumentos, contexto, cantidad de fuentes, truncado y correlación. No se guardan prompts completos.

## Procedencia

Las fuentes se devuelven como `{ entity, id, label, path }`. Un documento solo puede afirmar página/campo cuando esos datos existen de forma estructurada; nunca se inventan referencias. Saldos se identifican como ledger del expediente y eventos como Agenda.

## Confirmación

Preparar no ejecuta. El borrador incluye payload, responsable, endpoint normal, método y estado `AWAITING_CONFIRMATION`. Confirmar llama después a la API ordinaria, que vuelve a autorizar. Editar regresa el título al composer y Cancelar descarta el borrador. No se implementaron pagos, entrega, firma, compliance, borrado ni aprobación automáticos.

## Sugerencias

El contrato admite `DOCUMENTO_DUPLICADO`, `REQUISITO_FALTANTE`, `FIRMA_PROXIMA`, `COTIZACION_ESTANCADA`, `SALDO_VENCIDO`, `TAREA_VENCIDA` y `CONFLICTO_DOCUMENTAL`. La primera integración deriva requisitos/tareas vencidas del expediente actual. Equilibrado oculta prioridad baja. `dismissed`, `snoozed_until` y `last_shown_at` se conservan localmente para impedir repetición durante 24 horas.

## Mascota

Los masters y estados runtime existentes están versionados bajo `/brand/pravia-ai/`. Idle respira y realiza una inclinación mínima cada 12 segundos; blink usa un frame breve programado solo con el panel abierto e idle; greeting ocurre al abrir deliberadamente; thinking/processing acompañan consultas; success confirma el resultado. Reduced motion elimina animaciones/transiciones.

## Límite pendiente

El middleware histórico `/api/ia` conserva el permiso paraguas `ia.read` antes del permiso específico de cada tool. Retirarlo para roles que no poseen `ia.read` fue rechazado por la puerta de seguridad del entorno al detectar conflicto con el alcance frontend-only anterior; requiere reconfirmación explícita.
