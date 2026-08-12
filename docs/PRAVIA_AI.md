# PRAVIA IA — arquitectura, comportamiento y seguridad

## Propósito

PRAVIA IA es la capa transversal de asistencia de PRAVIA OS. Conserva el contexto de trabajo sin convertirse en un módulo operativo separado y nunca sustituye los permisos ni la revisión humana.

## Estado implementado

- mascota cerrada discreta, sugerencia compacta y panel lateral abierto solo por decisión del usuario;
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

## Tool Registry y doble autorización

Cada tool requiere `ai.use`, una capacidad `ai.*` propia de su dominio y el permiso normal del sistema. La capacidad de IA nunca concede el permiso de negocio. Por ejemplo, `ai.finanzas.read` sin `finanzas.read` no puede consultar un importe; `ai.cumplimiento.read` sin `cumplimiento.read` no puede consultar una revisión.

| Tool | Permiso normal adicional | Alcance |
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

El registro declara para cada tool: capacidad, permisos normales, estrategia de object-scope, tipo de resultado, máximo de resultados, sensibilidad y modo (`READ`, `NAVIGATE` o `PREPARE_ONLY`). El catálogo que recibe el frontend solo muestra tools utilizables y metadatos operativos; no expone nombres internos de permisos.

## Permission Engine y auditoría

Cada ejecución autentica sesión, comprueba capacidad y permiso normal, resuelve object scope, valida un payload máximo de 8 KiB, limita resultados a 25 y redacta campos innecesarios. La auditoría registra `AI_TOOL_STARTED`, `AI_TOOL_COMPLETED`, `AI_TOOL_FAILED`, `AI_TOOL_PREPARED` y `AI_TOOL_CONFIRMED`, con usuario, sesión, tool, contexto, duración, resultado y correlación. No se guardan prompts completos: solo las claves de argumentos.

`/api/ia` ya no usa `ia.read` como permiso paraguas. Las rutas del asistente exigen `ai.use`, la tool vuelve a aplicar su doble autorización y el dashboard técnico exige `ai.admin.read` además de su validación administrativa.

## Procedencia

Las fuentes se devuelven como `{ entity, id, label, path }`. Un documento solo puede afirmar página/campo cuando esos datos existen de forma estructurada; nunca se inventan referencias. Saldos se identifican como ledger del expediente y eventos como Agenda.

## Confirmación

Preparar no ejecuta. El borrador incluye payload, responsable, endpoint normal, método y estado `AWAITING_CONFIRMATION`. Confirmar llama primero a la API ordinaria, que vuelve a autorizar, y después registra una constancia enlazada con la correlación de la preparación. Si falla esa constancia, la interfaz aclara que la acción sí se registró para evitar una ejecución duplicada. Editar regresa el título al composer y Cancelar descarta el borrador. No se implementaron pagos, entrega, firma, compliance, borrado ni aprobación automáticos.

## Sugerencias

El contrato admite `DOCUMENTO_DUPLICADO`, `REQUISITO_FALTANTE`, `FIRMA_PROXIMA`, `COTIZACION_ESTANCADA`, `SALDO_VENCIDO`, `TAREA_VENCIDA` y `CONFLICTO_DOCUMENTAL`. La primera integración deriva requisitos/tareas vencidas del expediente actual. Equilibrado oculta prioridad baja. `dismissed`, `snoozed_until` y `last_shown_at` se conservan localmente para impedir repetición durante 24 horas.

## Mascota

Los masters y estados runtime existentes están versionados bajo `/brand/pravia-ai/`. Idle respira y realiza una inclinación mínima cada 12 segundos; blink usa un frame breve programado solo con el panel abierto e idle; greeting ocurre al abrir deliberadamente; thinking/processing acompañan consultas; success confirma el resultado. Reduced motion elimina animaciones/transiciones.

## Experiencia contextual

El panel muestra el folio cuando el contexto es un expediente. Sus accesos rápidos cambian por módulo: pendientes/resumen/documentos/próximos pasos en Expedientes; por cobrar/vencidos/resumen en Finanzas; hoy/buscar espacio/pendientes en Agenda; y resumen documental/expedientes relacionados en el detalle de Compareciente. La configuración técnica permanece bajo Sistema para roles administrativos; no existe un módulo operativo separado de “Inteligencia”.
