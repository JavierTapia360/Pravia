# Auditoría dry-run de finanzas legacy

## Alcance

`finance:audit-legacy` solo lee `Pago` y `MovimientoFinanciero`. No crea movimientos, no cambia estados, no valida pagos y no hace backfill. Clasifica cada pago como `MIGRACION_SEGURA`, `YA_REPRESENTADO`, `DUPLICADO_PROBABLE`, `AMBIGUO` o `REQUIERE_REVISION`.

## Condición previa

Ejecutar únicamente contra una base aislada de desarrollo o pruebas cuya URL y contenido se hayan verificado. No usar contra la base cloud vigente ni contra una copia que otros procesos estén modificando.

Comando exacto desde `backend/`:

```bash
npm run finance:audit-legacy -- \
  --limit=10000 \
  --output-dir=/ruta/segura/reporte-finanzas
```

La salida JSON también se imprime en stdout. Con `--output-dir` se crean `legacy-finance.json`, `legacy-finance.md` y `legacy-finance.csv` para revisión contable.

## Interpretación

- `MIGRACION_SEGURA` es una propuesta, no una autorización para escribir.
- `YA_REPRESENTADO` señala un movimiento activo equivalente.
- `DUPLICADO_PROBABLE` exige revisión de objeto, importe y ventana temporal.
- `AMBIGUO` carece de equivalencia contable determinista.
- `REQUIERE_REVISION` contiene datos, estados o vínculos insuficientes.

Este repositorio no incluye un comando de aplicación. Cualquier backfill futuro necesita respaldo, conciliación firmada, idempotencia por `legacy:pago:<id>`, transacción, auditoría y autorización separada.

## Estado de esta rama

El dry-run no se ejecutó: el worktree aislado no dispone de una `DATABASE_URL`/`DIRECT_URL` demostrablemente dirigida a una base de desarrollo o pruebas. Se evitó cualquier conexión o mutación sobre la base operativa.
