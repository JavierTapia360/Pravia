# PRAVIA IA — arquitectura, comportamiento y seguridad

## Propósito

PRAVIA IA es una segunda forma de utilizar PRAVIA OS. No es un chatbot genérico ni una página obligatoria. Está disponible desde el shell y conserva el contexto del trabajo actual sin ocupar permanentemente el workspace.

## Estado implementado

La rama incluye:

- launcher persistente y drawer lateral;
- sugerencias concretas por ruta;
- contexto visible de módulo, usuario y rol;
- modos Proactivo, Equilibrado y Discreto;
- estado Equilibrado por defecto;
- estados visuales idle, greeting, thinking, processing y success;
- animación sutil y `prefers-reduced-motion`;
- orientación y navegación entre módulos;
- mensajes explícitos cuando una consulta requiere datos no autorizados;
- configuración/observabilidad de IA movida a Sistema para Dirección/Administración.

No está implementada aún la ejecución de tools backend de datos. El intento de añadirlas fue detenido hasta contar con autorización explícita para ampliar acceso a expedientes, comparecientes, agenda, finanzas y cumplimiento. La UI actual no simula esas respuestas.

## Context Resolver

El frontend resuelve:

- usuario y rol autenticado;
- ruta y módulo;
- entidad actual cuando existe en la URL;
- intención básica de navegación;
- modo de intervención preferido.

Cuando el usuario está en `/expedientes/:id`, ese identificador forma parte del contexto visual. La futura tool deberá volver a comprobar permiso y alcance en servidor; nunca se confiará en el contexto enviado por navegador.

## Tool Registry propuesto

Cada herramienta debe ser una función backend específica, tipada y registrada. Catálogo inicial:

| Tool | Permiso mínimo | Alcance | Sensibilidad |
|---|---|---|---|
| `searchExpedientes` | `expedientes.read` | `expedienteAccessWhere` | lectura |
| `getExpedienteSummary` | `expedientes.read` | expediente actual | lectura |
| `getExpedientePendingItems` | `expedientes.read` | expediente actual | lectura |
| `searchComparecientes` | `comparecientes.read` | `comparecienteObjectWhere` | lectura |
| `getDocuments` | `documentos.read` | vínculos accesibles | lectura sensible |
| `getDocumentSources` | `documentos.read` | documento accesible | lectura sensible |
| `getAgenda` | `agenda.read` | agenda propia/asignada | lectura |
| `getFinancialSummary` | `finanzas.read` | política financiera | lectura sensible |
| `getOutstandingPayments` | `finanzas.read` | política financiera | lectura sensible |
| `getComplianceSummary` | `cumplimiento.read` | expedientes accesibles | lectura sensible |
| `createTask` | `agenda.write` | responsable permitido | escritura confirmada |
| `prepareAppointment` | `agenda.write` | contexto permitido | preparación |
| `prepareExpediente` | `expedientes.write` | motor único | preparación sensible |
| `navigateToEntity` | permiso de lectura destino | frontend | navegación |

No se permitirá SQL, Prisma genérico, acceso directo a storage ni consultas arbitrarias generadas por el modelo.

## Permission Engine

La ejecución futura seguirá este orden:

1. autenticar sesión;
2. validar contraseña definitiva;
3. comprobar permiso de la tool;
4. resolver alcance del objeto en servidor;
5. validar parámetros con esquema cerrado;
6. ejecutar consulta mínima;
7. redactar secretos y campos no necesarios;
8. adjuntar procedencia;
9. registrar auditoría y correlación.

La tool no aceptará `user_id`, `actor_id`, rol ni permisos proporcionados por el navegador como fuente de autoridad.

## Procedencia

Toda afirmación operativa o sensible debe incluir una fuente estructurada:

```json
{
  "kind": "document",
  "document_id": "uuid",
  "label": "Constancia de Situación Fiscal",
  "page": 1,
  "field": "RFC",
  "observed_at": "ISO-8601"
}
```

Para datos del sistema:

```json
{
  "kind": "system",
  "entity": "EventoAgenda",
  "record_id": "uuid",
  "label": "Firma",
  "observed_at": "ISO-8601"
}
```

Si no existe fuente, la respuesta debe decir que el dato no está confirmado.

## Confirmaciones

| Tipo | Comportamiento |
|---|---|
| Lectura | responder con fuente |
| Navegación | ofrecer acción directa |
| Preparación | mostrar borrador sin persistir |
| Escritura reversible | resumen + confirmación explícita |
| Acción sensible | resumen completo, consecuencias, permisos y confirmación |
| Destructiva/irreversible | no disponible hasta gobernanza específica |

Una confirmación debe incluir entidad, datos que cambiarán, responsable, consecuencias y opción de cancelar. Nunca se reutiliza una confirmación anterior para una acción diferente.

## Auditoría

Cada ejecución futura registrará:

- sesión y usuario;
- tool y versión;
- permiso evaluado;
- entidad y alcance;
- parámetros redactados;
- procedencias devueltas;
- resultado, error y duración;
- confirmación asociada cuando exista;
- `correlation_id`.

No se guardarán prompts completos cuando puedan contener secretos o datos personales innecesarios.

## Comportamiento del búho

- **Idle:** respiración apenas perceptible.
- **Greeting:** saludo corto solo al abrir deliberadamente.
- **Thinking:** flotación ligera durante interpretación local.
- **Processing:** reservado para ejecución de tools/documentos.
- **Success:** confirmación corta después de una acción exitosa.
- **Alert:** tratamiento contextual sobrio; no rebotes ni interrupciones repetitivas.

Los assets esperados son los existentes bajo `/brand/pravia-ai/`. Mientras los binarios no estén incorporados a esta rama, el componente usa el isotipo PWA como fallback seguro.

## Modos de intervención

- **Proactivo:** muestra sugerencias concretas al cambiar de contexto.
- **Equilibrado:** sugiere solo cuando existe una razón de módulo; valor predeterminado.
- **Discreto:** permanece cerrado hasta invocación deliberada.

La preferencia se guarda localmente; no contiene identidad ni datos del expediente.

## Límites actuales

- Sin tools backend de datos.
- Sin respuestas documentales con página/fuente.
- Sin acciones preparadas ni confirmadas.
- Sin auditoría de consultas porque no hay consultas operativas.
- Binarios de mascota todavía fuera del branch limpio.

Estos límites son deliberados. Hasta aprobar el nuevo alcance, PRAVIA IA se limita a contexto de navegación y no inventa datos.
