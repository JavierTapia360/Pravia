# Fase 3B — Expediente y guardado integral

## Resultado

La ficha de Expediente usa una sola línea base para detectar cambios en:

- alias o identificación;
- tipo de acto;
- abogado;
- número de escritura;
- notaría;
- nombres, importes, altas y bajas de rubros;
- Participación PRAVIA.

El botón **Guardar Cambios** se activa cuando el borrador difiere de la línea base y solo vuelve a deshabilitarse después de una respuesta exitosa del backend.

## Persistencia

`PATCH /api/expedientes/:id` guarda la ficha y el presupuesto operativo dentro de una sola transacción. La operación:

1. serializa las ediciones pendientes;
2. valida catálogos activos e importes;
3. obtiene un bloqueo por expediente;
4. comprueba la versión esperada;
5. actualiza ficha, número de escritura y `datos_operacion.presupuesto`;
6. incrementa la versión del expediente;
7. registra actividad y auditoría con correlación;
8. confirma el resultado al frontend.

Un conflicto de versión devuelve `409 EXPEDIENTE_VERSION_CONFLICT` y obliga a recargar, evitando que una sesión sobrescriba silenciosamente a otra.

El presupuesto operativo del expediente ya no modifica la versión aceptada de la cotización. Esa versión permanece como evidencia histórica. El total cliente es el total notarial; la Participación PRAVIA es una distribución interna y no se suma como un cargo adicional.

No se crean rubros ni importes de ejemplo cuando faltan datos. El estado vacío permite agregar el primer rubro desde el catálogo visible.

## Protección frente a pérdida de cambios

- Recargar o cerrar usa la protección nativa `beforeunload`.
- Los enlaces internos del shell y las acciones programáticas del expediente abren el aviso de cambios pendientes.
- El usuario puede cancelar, salir sin guardar o guardar y salir.
- Guardar y salir navega únicamente si el guardado devolvió éxito.
- Ante un error del backend, el borrador y el estado dirty permanecen intactos.

## Información operativa visible

La cabecera muestra datos editables reales y catálogos activos de usuarios, notarías y tipos de acto. Se añadió un resumen visible con progreso documental, operativo, financiero y general, siguiente acción, etapa, fecha límite, gestor y subtipo.

El catálogo `/api/users` expone únicamente los campos operativos necesarios; no devuelve hashes ni atributos de autenticación.

## Pruebas ejecutadas

Se utilizó un expediente identificado explícitamente como registro de prueba. Los importes de negocio se restauraron al valor original al terminar.

| Caso | Resultado |
| --- | --- |
| Cambiar monto | `Guardar Cambios` se activó inmediatamente |
| Guardar monto y recargar | el nuevo monto persistió y el botón quedó deshabilitado |
| Cambiar Participación PRAVIA | `Guardar Cambios` se activó inmediatamente |
| Guardar participación y recargar | el importe persistió y el botón quedó deshabilitado |
| Error de validación del backend | los valores editados permanecieron y el botón siguió activo |
| Navegar con cambios | apareció “Hay cambios sin guardar. ¿Deseas salir sin guardar?” y la ruta no cambió |
| Restauración final | monto y Participación PRAVIA volvieron a sus valores originales |

También pasaron la compilación TypeScript del backend, la compilación de producción del frontend y las 10 pruebas automatizadas existentes del flujo comercial.

Durante la primera prueba se detectó que `pg_advisory_xact_lock` se estaba invocando como una consulta con retorno. PostgreSQL devuelve `void`, que Prisma no deserializa. La transacción hizo rollback completo. Todos los bloqueos consultivos del flujo comercial y de Expediente se cambiaron a ejecución de comando y la prueba posterior confirmó la persistencia atómica.
