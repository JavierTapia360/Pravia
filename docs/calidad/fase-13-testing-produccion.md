# Fase 13 — Calidad, rendimiento y preparación de producción

## Resultado implementado

La fase incorpora controles ejecutables, no únicamente una lista de recomendaciones:

- formato uniforme de errores con `code`, `error` y `correlation_id`;
- ocultamiento de detalle y stack en respuestas 5xx de producción;
- bitácora HTTP JSON con nivel, método, ruta, duración, usuario, correlación y código de error, sin cuerpo ni datos personales;
- captura final de errores no controlados;
- suite unitaria separada de la integración con base;
- contrato de integración de solo lectura para esquema, datos preservados, Storage, RLS e índices críticos;
- smoke E2E de interfaz y autenticación;
- recorrido E2E mutante de los once flujos críticos, bloqueado por defecto y permitido solo en base aislada;
- ocho fixtures IA sintéticos para INE, pasaporte, CURP, CSF, comprobante, Word/múltiples, conflicto y mala calidad;
- evaluación offline nano/mini con exactitud, errores, tokens, latencia y costo estimado claramente etiquetados como sintéticos;
- presupuestos máximos de bundle comprimido;
- escaneo de secretos en árbol e historial, sin imprimir valores;
- imágenes de contenedor endurecidas y composición cloud de referencia.

## Pruebas y comandos

Desde `backend`:

```text
npm run build
npm test
npm run test:integration
npm run eval:ai
npm run check:secrets
npm run e2e:critical
```

Desde `frontend`:

```text
npm run build
npm run check:bundle
npm run check:pwa
npm run e2e:smoke
```

`npm test` excluye deliberadamente `src/integration`: una prueba unitaria nunca debe pasar o fallar según la red. `test:integration` es de solo lectura y requiere una URL autorizada. `e2e:critical` crea información sintética y se niega a arrancar salvo que se declare `E2E_ALLOW_MUTATIONS=isolated-database-confirmed`; además rechaza hosts externos que no estén marcados como rama efímera.

La prueba crítica recorre:

1. login real;
2. prospecto → cotización;
3. presupuesto versionado → envío → aceptación;
4. anticipo → validación administrativa → conversión idempotente;
5. compareciente maestro → reutilización en dos expedientes → validación humana;
6. carga binaria y `storage_key` privado;
7. guardado conjunto de cabecera, rubros y participación PRAVIA, seguido de recarga;
8. movimiento financiero;
9. integración → firma → postfirma → listo → entrega;
10. fechas finales persistidas;
11. IA pagada opcional con archivo autorizado, propuesta trazable y confirmación humana.

La IA pagada está apagada por defecto para proteger el presupuesto. Solo se ejecuta con `E2E_RUN_PAID_AI=true` y `E2E_AI_FIXTURE_PATH`; las pruebas ordinarias usan el dataset offline.

## Evidencia local de esta entrega

- backend compilado;
- frontend compilado;
- 65 pruebas unitarias aprobadas en 13 archivos;
- 31/31 comprobaciones offline aprobadas para cada modelo sobre ocho casos;
- costo sintético agregado de referencia: USD 0.0018 para nano y USD 0.0097 para mini;
- entrada principal: 67.74 KiB gzip, debajo del presupuesto de 90 KiB;
- mayor chunk: reportes, 108.68 KiB gzip, debajo del presupuesto de 140 KiB;
- CSS: 18.57 KiB gzip, debajo del presupuesto de 30 KiB;
- PWA verificada;
- smoke público aprobado: rutas privadas redirigen a login y recuperación es accesible; tramo autenticado queda pendiente de credenciales válidas;
- imágenes de backend (Node 22 + OpenSSL) y frontend/Nginx construidas correctamente con Docker;
- escaneo actual sin secretos no reconocidos; existe una huella histórica reconocida de un antiguo valor de desarrollo y se exige no reutilizarlo/rotarlo.

Las cifras IA son mediciones del contrato con salidas sintéticas, no afirmaciones sobre precisión real del proveedor. La integración remota y el E2E autenticado/mutante requieren acceso a red, una contraseña de prueba válida y una base aislada; no se ejecutan contra los 7 expedientes y 65 documentos existentes.

## Rendimiento PostgreSQL

Se añadió un primer lote de índices para rutas de documentos, expedientes, cotizaciones, finanzas, agenda, cumplimiento y comunicaciones. Después se preparó un segundo lote que completa las llaves foráneas de `pravia_os`. No se eliminó ningún índice marcado como “unused”: con una base pequeña esa señal no justifica una acción destructiva.

El Performance Advisor pasó de 118 a 49 llaves foráneas sin índice tras el primer lote. De las 49 restantes, 43 son del esquema operativo y están cubiertas por la segunda migración; las otras seis pertenecen a tablas legadas de `public`, bloqueadas y sin consumidores. La aplicación remota del segundo lote debe verificarse antes del corte final.

## Criterios de salida a producción

La salida queda bloqueada hasta cumplir todos:

- aplicar las migraciones pendientes y volver a ejecutar Security/Performance Advisors;
- configurar una clave JWT nueva de al menos 32 caracteres;
- activar una cuenta Dirección con hash bcrypt válido;
- ejecutar integración de solo lectura con resultado verde;
- ejecutar smoke autenticado;
- ejecutar E2E crítico en una base aislada y conservar el reporte;
- ejecutar backup y verificarlo antes de migrar;
- servir por HTTPS y confirmar cookies `Secure`;
- confirmar webhook de recuperación;
- documentar responsable de rotación de secretos y de restauración.

No se considera válido “probar” los flujos críticos creando o eliminando filas en la base cloud vigente.
