# Fase 6 — Finanzas y libro de movimientos

## Objetivo

PRAVIA OS separa expresamente cuatro conceptos que antes podían confundirse:

- fondos recibidos del cliente;
- honorarios PRAVIA efectivamente recibidos;
- pagos a notaría, impuestos y terceros;
- gastos internos y utilidad de PRAVIA.

Recibir dinero del cliente no lo convierte automáticamente en ingreso de PRAVIA. Los honorarios solo se reconocen cuando el movimiento usa la categoría `HONORARIOS_PRAVIA`.

## Categorías controladas

| Categoría | Naturaleza | Uso |
| --- | --- | --- |
| `CLIENTE_FONDOS` | Ingreso | Fondos recibidos del cliente y mantenidos bajo control del expediente |
| `HONORARIOS_PRAVIA` | Ingreso | Honorarios que ya son ingreso real de PRAVIA |
| `NOTARIA` | Egreso | Pago a notaría |
| `IMPUESTOS_DERECHOS` | Egreso | Impuestos, derechos y contribuciones |
| `TERCEROS` | Egreso | Gestores, proveedores y otros terceros |
| `PRAVIA` | Egreso | Gasto interno atribuible a PRAVIA |
| `DEVOLUCION` | Egreso | Devolución al cliente |
| `REVERSO` | Sistema | Contramovimiento técnico; no puede capturarse manualmente |

El servidor rechaza montos no positivos, categorías libres, naturalezas incompatibles, usuarios inactivos y expedientes archivados. La captura se protege con bloqueo transaccional y una ventana de idempotencia.

## Saldos calculados

- **Saldo del cliente:** presupuesto total menos fondos netos recibidos.
- **Saldo a terceros:** componente presupuestado para terceros menos egresos efectivamente validados.
- **Fondos retenidos:** fondos netos del cliente menos honorarios reconocidos y pagos a terceros.
- **Utilidad PRAVIA:** honorarios PRAVIA recibidos menos gastos internos PRAVIA.

Los tableros global y por expediente muestran estos conceptos de forma independiente.

## Reversos y trazabilidad

Los movimientos validados o recibidos no se eliminan. La acción disponible es **Revertir**, exige motivo y usuario activo, y crea un contramovimiento vinculado. El movimiento original conserva:

- estado `REVERTIDO`;
- motivo, usuario y fecha de reversión;
- actividad del expediente;
- registro en auditoría.

Los contramovimientos técnicos no pueden volver a revertirse y se excluyen de los saldos operativos porque el original ya dejó de estar activo.

## Comprobantes y facturas

Los comprobantes, facturas PDF y XML se guardan en el almacenamiento privado y también se registran como `Documento`, vinculados por `MovimientoDocumento`.

Al sustituir un archivo, el vínculo anterior pasa a `SUSTITUIDO`; al archivarlo pasa a `INACTIVO`. El objeto almacenado y el documento histórico no se borran. Si una carga nueva falla antes de completar su transacción, únicamente se retira ese objeto incompleto como compensación técnica.

## Compatibilidad

Los movimientos históricos conservan sus categorías originales y siguen siendo legibles. Cuando un expediente aún no tiene libro financiero, los reportes pueden usar los pagos heredados como fuente de compatibilidad. Toda captura nueva usa el catálogo controlado.

## Validación realizada

- compilación de backend y frontend;
- 30 pruebas de dominio aprobadas, incluidas 6 del libro financiero;
- revisión visual del resumen global con siete expedientes reales;
- revisión de un expediente con movimiento existente, saldos separados, formulario catalogado, archivos archivables y modal de reversión obligatoria;
- ninguna captura, reversión, sustitución o archivo fue ejecutado durante la comprobación visual.

