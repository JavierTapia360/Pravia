# Fase 7 — Agenda, Mi Día y reportes operativos

## Objetivo

PRAVIA OS incorpora una vista diaria que responde qué requiere atención, una agenda operativa vinculada con el negocio y reportes construidos sobre datos reales. No se generan indicadores ficticios ni eventos de demostración.

## Agenda operativa

La Agenda admite vistas diaria, semanal, mensual y de lista, además de búsqueda y filtros por tipo y responsable. Los tipos controlados son:

- personal;
- despacho;
- firma;
- audiencia;
- vencimiento;
- cita;
- notaría;
- seguimiento;
- otro.

Cada evento puede vincular un expediente y un compareciente, definir responsable, rango horario o día completo, y preparar uno o varios recordatorios en minutos. Los recordatorios quedan persistidos y listos para que una integración posterior entregue notificaciones; esta fase no afirma que exista envío externo.

Crear, modificar, mover, completar y cancelar eventos produce trazabilidad. Cancelar exige un motivo y conserva el registro, la fecha y el usuario que ejecutó la acción. No existe eliminación física de eventos.

Las tareas personales u operativas se crean, asignan, priorizan y completan desde el mismo módulo. Sus cambios generan auditoría y, cuando corresponda, actividad en el expediente.

## Mi Día

Mi Día integra en una sola pantalla:

- tareas de hoy y vencidas;
- citas y eventos próximos;
- vencimientos y firmas de los siguientes siete días;
- expedientes suspendidos o bloqueados por gestiones externas;
- pendientes del cliente y de notaría;
- cotizaciones que requieren seguimiento;
- documentos obligatorios faltantes, rechazados o vencidos;
- cobros pendientes calculados con el libro financiero;
- alertas importantes con acceso directo a su contexto.

El filtro por usuario limita tareas, agenda, cotizaciones y expedientes donde participa como abogado o gestor. Mientras la autenticación de la Fase 10 se integra, la interfaz usa el usuario operativo seleccionado; el servidor ya acepta el actor autenticado cuando exista sesión.

## Reportes

El resumen acepta filtros de periodo, abogado, gestor, notaría, tipo de acto y estado. Presenta:

- expedientes nuevos, abiertos, cerrados, firmados y entregados;
- tiempo promedio hasta entrega;
- distribución por tipo de acto, notaría, abogado, gestor y estado;
- tendencia de aperturas, firmas y entregas;
- honorarios esperados e ingresos PRAVIA efectivamente recibidos;
- saldo pendiente de clientes, participación PRAVIA, egresos y fondos retenidos;
- conversión de prospecto a cotización y de cotización a expediente.

Las métricas financieras respetan la separación de fondos definida en la Fase 6. Los filtros de abogado y notaría también se aplican a las conversiones comerciales para evitar mezclar universos diferentes.

## API

| Ruta | Uso |
| --- | --- |
| `GET /api/agenda` | Consultar eventos por rango y filtros |
| `POST /api/agenda` | Crear un evento idempotente |
| `PATCH /api/agenda/:id` | Modificar o mover un evento |
| `POST /api/agenda/:id/cancelar` | Cancelar con motivo y auditoría |
| `GET /api/agenda/catalogos` | Usuarios, expedientes, comparecientes y tipos |
| `GET/POST /api/agenda/tareas` | Consultar o crear tareas |
| `PATCH /api/agenda/tareas/:id` | Modificar o completar tareas |
| `GET /api/mi-dia` | Resumen operativo personal o global |
| `GET /api/reportes/resumen` | Indicadores y desgloses filtrados |
| `GET /api/reportes/catalogos` | Catálogos para filtros |

## Persistencia y compatibilidad

Las migraciones `extend_operational_agenda_fields` y `extend_agenda_event_types` son aditivas. Incorporan estado, compareciente, recordatorios y datos de cancelación, más los cuatro tipos adicionales. No renombran tablas, no eliminan columnas, no borran eventos y mantienen compatibles los cinco tipos anteriores.

La verificación posterior confirmó los 19 campos esperados, los tres estados, los nueve tipos y cero eventos previos; por tanto, el despliegue no alteró información operativa existente.

## Validación realizada

- esquema Prisma formateado, generado y validado;
- compilación de backend y frontend;
- 34 pruebas aprobadas, incluidas las reglas de rango, tipo y recordatorios de Agenda;
- revisión visual de Agenda y su formulario con catálogos reales;
- revisión visual de Mi Día con cobranza y alertas calculadas desde los siete expedientes existentes;
- revisión visual de Reportes para el mes actual y para todo el histórico;
- revisión posterior de seguridad en Supabase: no aparecieron hallazgos nuevos; permanecen los nueve hallazgos heredados ya inventariados para la Fase 10;
- ninguna tarea, evento, cancelación o movimiento se guardó durante la comprobación visual.
