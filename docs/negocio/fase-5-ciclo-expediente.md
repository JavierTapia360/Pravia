# Fase 5 — Proyecto, firma, postfirma y entrega

## Flujo secuencial

El expediente expone un panel operativo único para sus cuatro fases:

1. Proyecto
2. Firma
3. Postfirma
4. Entrega

Las transiciones se validan en el backend mediante una máquina de estados determinística. No es posible saltar de `ABIERTO` a `FIRMADO`, entrar a `POST_FIRMA` sin firma previa ni marcar `ENTREGADO` sin pasar por `LISTO_ENTREGA`.

La pantalla recibe del backend únicamente los estados y la siguiente etapa permitidos para el expediente, según su tipo de acto y etapa actual. Las etapas obligatorias intermedias no pueden omitirse. La suspensión, cancelación y entrega requieren observaciones; la entrega solicita contexto sobre receptor y evidencia.

## Firma y entrega

Programar firma requiere:

- fecha y hora;
- lugar;
- comparecientes vinculados;
- identidades validadas;
- documentos obligatorios de firma validados.

La autorización operativa de saldo pendiente, cuando se registra, queda como evidencia y no crea, liquida ni modifica movimientos financieros. La firma real y la entrega guardan sus fechas efectivas.

Cada cambio confirmado genera, dentro de la misma transacción:

- nueva versión optimista del expediente;
- cierre e inicio de etapa cuando corresponde;
- historial de estatus;
- actividad visible;
- auditoría técnica;
- evento de dominio para procesos posteriores.

## Versiones del proyecto

Las nuevas versiones `.docx` del proyecto dejaron de depender de un archivo JSON y del disco local:

- el binario se guarda en el bucket privado de Supabase;
- el documento y su vínculo se registran transaccionalmente en PostgreSQL;
- la versión anterior se conserva como `SUSTITUIDO`;
- restaurar una versión no elimina las demás;
- una falla de base de datos compensa la carga del objeto nuevo;
- visualización y descarga pasan por el backend;
- carga y restauración generan actividad y auditoría.

Los proyectos heredados que todavía están en almacenamiento local siguen disponibles en modo compatible. No se borraron ni migraron automáticamente. La generación y los reportes asistidos por IA se consolidarán en la fase documental de IA.

## Verificación

| Caso | Resultado |
| --- | --- |
| Reglas de estados | 7 pruebas nuevas aprobadas |
| Total automatizado backend | 24 pruebas aprobadas |
| Compilación backend | Correcta |
| Compilación frontend | Correcta |
| Panel en expediente real | Estado, fase y transiciones permitidas visibles |
| Escrituras sobre datos reales | Ninguna transición ni carga ejecutada durante la verificación |
