# Fase 3 — Flujo comercial y conversión a expediente

## Resultado

El flujo comercial queda gobernado por reglas explícitas y por una única transacción de conversión:

`Prospecto → Cotización → Aceptación → Anticipo validado → Expediente`

Una cotización no puede convertirse por el solo hecho de existir. La conversión exige simultáneamente:

1. estado `ACEPTADA`;
2. al menos una versión aprobada;
3. al menos un pago `ANTICIPO_NOTARIA` con estado `VALIDADO` y monto positivo;
4. prospecto vinculado;
5. ausencia de un expediente previo.

## Reglas de estado

Las transiciones válidas se definen en `backend/src/domain/cotizacionWorkflow.ts` y son compartidas por la API y la interfaz. La API rechaza saltos de estado, estados desconocidos y la conversión manual a `CONVERTIDA_EXPEDIENTE`.

| Estado actual | Siguientes estados permitidos |
| --- | --- |
| `BORRADOR` | `ENVIADA_NOTARIA` |
| `ENVIADA_NOTARIA` | `PRESUPUESTO_RECIBIDO`, `VENCIDA` |
| `PRESUPUESTO_RECIBIDO` | `EN_REVISION_ABOGADO` |
| `EN_REVISION_ABOGADO` | `ENVIADA_CLIENTE` |
| `ENVIADA_CLIENTE` | `EN_NEGOCIACION`, `ACEPTADA`, `RECHAZADA`, `VENCIDA` |
| `EN_NEGOCIACION` | `ENVIADA_CLIENTE`, `ACEPTADA`, `RECHAZADA`, `VENCIDA` |
| `ACEPTADA` | conversión transaccional únicamente |
| `RECHAZADA`, `VENCIDA`, `CONVERTIDA_EXPEDIENTE` | terminales |

Enviar a notaría requiere una notaría asignada. Enviar o aceptar una propuesta requiere una versión aprobada.

## Versiones y aprobación

- La numeración se calcula a partir de la última versión persistida y se protege con un bloqueo transaccional.
- La primera versión es la número 1, aun cuando la cotización recién creada tenga `version_actual = 1` por compatibilidad con el esquema existente.
- Solo una versión puede quedar aprobada por cotización desde la aplicación.
- Al aprobar una versión se sincronizan en la cotización los totales y la versión activa.
- Se validan importes finitos, total positivo y honorarios PRAVIA dentro del total notarial.
- Las versiones históricas no se eliminan ni se sobrescriben.

## Anticipo

- Solo se puede registrar después de aceptar la cotización y antes de convertirla.
- La validación confirma que el pago esté vinculado a la cotización y sea de categoría `ANTICIPO_NOTARIA`.
- Validar nuevamente un pago ya validado es idempotente.
- La API exige un usuario activo con rol de Dirección o Administración para validar.
- La interfaz muestra el historial, el total validado y los requisitos faltantes antes de habilitar la conversión.

## Conversión canónica

Las dos rutas históricas de conversión delegan en `CotizacionConversionService`; ya no mantienen implementaciones divergentes.

La operación usa una transacción de base de datos y bloqueos consultivos para:

- impedir conversiones y folios duplicados bajo concurrencia;
- devolver el expediente existente si la solicitud se repite;
- crear el expediente con referencias a cotización, prospecto, notaría y versiones configuradas;
- vincular documentos existentes mediante tablas de relación, sin duplicar ni mover archivos;
- vincular los pagos existentes al expediente;
- actualizar cotización y prospecto;
- registrar actividad, auditoría y evento de salida con el mismo identificador de correlación.

Si la cotización figura como convertida pero no existe la relación con un expediente, la operación se detiene con un error de integridad en vez de crear otro registro.

El tipo de acto se resuelve desde el catálogo activo. Se acepta una coincidencia exacta o una coincidencia inequívoca con el tipo registrado en el prospecto; si hay ambigüedad, la API exige una selección explícita y no inventa un tipo.

## Experiencia de operación

- Prospectos incorpora búsqueda instantánea, filtros por estado y prioridad, estados de carga y tabla adaptable.
- Un prospecto con cotización abre el registro existente; uno sin cotización abre el asistente con el prospecto precargado.
- El asistente excluye prospectos que ya tienen cotización, respetando la relación uno-a-uno actual.
- Cotizaciones muestra la siguiente acción real según estado y disponibilidad de anticipo.
- El detalle obtiene de la API las transiciones permitidas y la elegibilidad de conversión; no replica reglas aproximadas.
- La API del frontend usa `/api` en el mismo origen por defecto y mantiene la posibilidad de configurar otra URL por entorno.

## Verificación realizada

- 10 pruebas unitarias de matriz de estados y elegibilidad: aprobadas.
- Compilación TypeScript de backend: aprobada.
- Compilación de producción de frontend: aprobada.
- Verificación visual y funcional de listas y detalles con datos existentes: aprobada.
- Verificación del enlace Prospecto → asistente de Cotización con precarga: aprobada.
- Verificación del detalle de una cotización aceptada con versión y anticipo válidos: conversión habilitada correctamente.

Las verificaciones sobre datos reales fueron de solo lectura. No se ejecutó la conversión ni se creó, modificó o eliminó información de negocio durante las pruebas.

## Límite de seguridad pendiente

La aplicación aún no tiene autenticación real. Las comprobaciones de usuario activo y rol en estas operaciones reducen el riesgo lógico, pero `user_id` todavía llega en la solicitud. La autorización confiable debe tomar la identidad de una sesión validada; esto se completa en la fase de Auth/RBAC/RLS antes de considerar el sistema listo para producción.
