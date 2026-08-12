# Fase 0 — Auditoría técnica de PRAVIA OS

Fecha de corte: 2026-08-11  
Proyecto Supabase: `NOTARYPROY` (`mkiwijbampubccrpvgga`)  
PostgreSQL: 17.6  
Rama de trabajo: `codex/pravia-os-professionalization`

## Alcance verificado

- Checkout local y repositorio remoto `JavierTapia360/Pravia`.
- Prisma, migraciones disponibles, servicios, controladores, rutas, frontend y variables esperadas.
- Esquemas `public`, `pravia_os`, `auth` y `storage` de Supabase.
- Conteos de tablas y objetos, permisos, RLS, buckets y asesores de seguridad/rendimiento.
- Compilaciones y auditorías de dependencias de frontend y backend.

No se ejecutaron `db push`, resets, DDL remoto ni migraciones destructivas.

## Arquitectura de datos encontrada

### Esquema operativo `pravia_os`

- 61 tablas de negocio.
- Datos existentes: 25 prospectos, 14 cotizaciones, 7 expedientes, 65 documentos, 4 notarías, 2 comparecientes, 86 registros de auditoría y 89 actividades de expediente, entre otros.
- `anon` y `authenticated` no tienen `USAGE` sobre el esquema ni grants directos sobre sus tablas.
- El backend accede por conexión PostgreSQL directa mediante Prisma.
- RLS está desactivado. No es una exposición inmediata por Data API mientras el esquema permanezca privado, pero debe añadirse como defensa en profundidad después de definir autenticación y permisos.

### Esquema legado `public`

- 8 tablas: `_prisma_migrations`, `tipos_acto`, `documentos_requeridos`, `expedientes`, `documentos_cargados`, `fichas_datos_generales`, `proyectos_escritura` y `hallazgos`.
- Conserva 6 expedientes, 36 documentos cargados, un proyecto de escritura y catálogos existentes.
- `anon` y `authenticated` tienen `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` y `TRIGGER` sobre las ocho tablas.
- RLS está desactivado y el asesor de seguridad lo clasifica como error.

Este es el riesgo de datos más urgente. No se activó RLS a ciegas porque bloquearía accesos sin políticas. Antes de producción se debe confirmar que ningún consumidor externo usa estas tablas y, preferentemente, revocar los grants públicos o crear políticas explícitas.

Referencia del asesor: <https://supabase.com/docs/guides/database/postgres/row-level-security>

### Storage

- Bucket `documents`: privado, 37 objetos.
- Bucket `pravia_documentos`: privado, límite de 20 MiB, 119 objetos.
- El código genera URLs firmadas temporales y no depende de URLs públicas permanentes.
- El cliente backend ahora exige `SUPABASE_SERVICE_ROLE_KEY`; ya no cae silenciosamente a una clave pública.

### Auth

- `auth.users`: 0 registros.
- `pravia_os.users`: 1 registro.
- La aplicación usa actualmente su tabla propia `users`; Supabase Auth no está integrado.
- El frontend sigue teniendo bypass de desarrollo. El endpoint backend que emitía `dummy_token` fue deshabilitado para evitar una falsa garantía de autenticación.

## Matriz Prisma ↔ Supabase

| Categoría | Resultado |
|---|---|
| Modelos Prisma y tablas `pravia_os` | 61 modelos/tablas; nombres funcionalmente correspondientes |
| Solo en `public` | Cinco tablas legadas de documentos/proyectos/hallazgos y una versión distinta de expedientes/catálogos |
| Solo en Prisma/local | No se detectaron modelos operativos completos ausentes en `pravia_os` |
| Tipos/nullable/defaults | Deriva relevante en comparecientes: tipos `varchar/text`, nullability y defaults UUID/timestamps |
| Índices/constraints | Varias diferencias son nombres; otras son índices o constraints previstos por Prisma pero no idénticos a la base |
| Enum solo en DB | `ComparecePor` existe en DB y no en el esquema Prisma actual |
| Migraciones registradas en DB | `20260714025925_init`, `20260716025113_simplify_docs_add_groups` |
| Migraciones presentes localmente | Tres paquetes SQL de julio de 2026, no registrados en `_prisma_migrations` |

La historia de migraciones está desviada. No se debe ejecutar `prisma migrate dev`, `migrate deploy` ni `db push` hasta crear una línea base que represente la base actual y revisar datos antes de endurecer nullability/defaults.

## Asesores Supabase

Seguridad:

- 8 errores `rls_disabled_in_public` en las tablas legadas públicas.
- 1 advertencia `function_search_path_mutable` en `pravia_os.fn_check_compareciente_perfil`.

Rendimiento:

- 111 claves foráneas sin índice de cobertura.
- 15 índices todavía sin uso registrado.

Los índices sin uso no deben eliminarse solo por este aviso: el proyecto es reciente y aún tiene poco tráfico. Las FK se priorizarán según rutas reales y consultas medidas.

Referencia: <https://supabase.com/docs/guides/database/database-linter>

## Estado funcional y de UI

- Backend: compila.
- Frontend: compila después de instalar el lockfile.
- Agenda, Reportes, Inteligencia y Riesgos son placeholders.
- Login y sesión siguen siendo de desarrollo en frontend.
- `ComparecienteNuevo`, `ExpedienteDetail`, `CotizacionDetail`, Finanzas y varios controladores son componentes/archivos excesivamente grandes.
- Health dependía de `prisma.user.findFirst()` y fallaba si Prisma consultaba `public`.
- La configuración local omitía `schema=pravia_os`, aunque todo el modelo operativo reside en ese esquema.

## Riesgos y siguientes decisiones

1. Proteger las tablas legadas de `public` sin perder acceso operativo.
2. Crear baseline de migraciones antes de cualquier DDL.
3. Implementar autenticación real y permisos antes de habilitar RLS en `pravia_os`.
4. Dividir componentes grandes gradualmente, con pruebas de regresión.
5. No ejecutar IA real durante desarrollo salvo casos medidos; usar fixtures/mocks.

