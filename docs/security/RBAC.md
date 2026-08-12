# RBAC operativo de PRAVIA OS

## Principio de autorización

Una operación sobre un expediente solo se autoriza cuando pasan, por separado, estas tres comprobaciones:

1. **Capacidad:** el rol posee el permiso específico de la acción.
2. **Alcance del objeto:** el expediente pertenece a la cola o asignación permitida para la persona autenticada.
3. **Regla de flujo:** el estado actual, el estado destino y los requisitos del expediente admiten la operación.

Conocer un identificador no concede acceso. Las rutas sensibles vuelven a comprobar el alcance dentro del controlador, además del middleware de ruta.

## Capacidades de expediente

| Capacidad | Uso |
| --- | --- |
| `expedientes.read` | Consultar expedientes dentro del alcance del rol. |
| `expedientes.write` | Editar la cabecera y ejecutar operaciones jurídicas generales. |
| `expedientes.deliver` | Registrar una entrega final estructurada. |
| `expedientes.postfirma.manage` | Administrar trámites externos y avances de postfirma. |
| `expedientes.project.read` | Consultar proyectos y reportes documentales. |

Las respuestas HTTP no exponen los nombres internos de permisos; ante una denegación se muestra un mensaje operativo.

## Recepción

Recepción puede consultar únicamente expedientes `LISTO_ENTREGA` o ya `ENTREGADO`. El detalle se reduce a folio, alias, estado, etapa, requisitos, documentos autorizados y datos de la entrega. No incluye identidad detallada, representación, proyecto, cumplimiento ni finanzas.

La operación `POST /api/expedientes/:id/entrega` es la única escritura de expediente autorizada. Exige:

- expediente dentro del alcance y en `LISTO_ENTREGA`;
- versión esperada para control de concurrencia;
- receptor y carácter;
- fecha efectiva no futura y medio;
- al menos un documento, testimonio o copia vigente del expediente;
- acuse o evidencia vigente del mismo expediente.

El registro y la transición `LISTO_ENTREGA → ENTREGADO` se realizan en una sola transacción.

## Gestoría

Gestoría consulta expedientes donde es gestora, tiene una tarea interna activa o ya gestiona un trámite externo. Su detalle omite identidad, representación, proyecto, cumplimiento y finanzas.

Las operaciones dedicadas son:

- `POST /api/expedientes/:id/postfirma/tramites`
- `PATCH /api/expedientes/:id/postfirma/tramites/:taskId`
- `POST /api/expedientes/:id/postfirma/transicion`

Solo se permiten las transiciones `FIRMADO → POST_FIRMA` y `POST_FIRMA → LISTO_ENTREGA`. Para llegar a `LISTO_ENTREGA` debe existir al menos un trámite, todos deben estar concluidos y los requisitos documentales obligatorios deben estar validados u omitidos con justificación. Cerrar un trámite exige resultado y evidencia vinculada al mismo expediente.

## Denegaciones relevantes

Recepción y Gestoría no reciben `expedientes.write`, `expedientes.project.read` ni permisos financieros. Por ello no pueden editar identidad, representación, cabecera, proyecto, importes, movimientos financieros, cumplimiento, archivo, cancelación, suspensión ni transiciones arbitrarias. Las rutas generales no infieren permisos operativos a partir de `documentos.write` u otra capacidad adyacente.

## Verificación

Las pruebas unitarias cubren la matriz de capacidades, la clasificación de rutas, los filtros de alcance, las transiciones permitidas y denegadas, la pertenencia de evidencia, los datos mínimos de entrega y el cierre de postfirma con trámites o requisitos pendientes.
