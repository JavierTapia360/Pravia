# PRAVIA OS

Sistema operativo jurídico-notarial para prospectos, cotizaciones, expedientes, comparecientes, documentos, proyectos de escritura, finanzas, agenda, cumplimiento e inteligencia documental.

## Componentes

- `frontend`: React, TypeScript, Vite y PWA instalable.
- `backend`: Node.js, Express, TypeScript, Prisma y PostgreSQL 17.
- `backend/prisma/migrations`: historial incremental; no usar `db push` ni reset sobre la base existente.
- `docs`: auditorías, decisiones de negocio, seguridad, operación y arquitectura.

## Inicio local de desarrollo

1. Copia los `.env.example` de backend y frontend a archivos `.env` privados.
2. Configura URLs, Supabase Storage y `AUTH_JWT_SECRET` de al menos 32 caracteres.
3. Instala dependencias con `npm ci` en `backend` y `frontend`.
4. Comprueba configuración con `npm run check:env` y acceso con `npm run db:verify`.
5. Inicia backend y frontend con `npm run dev` en cada carpeta.

La cuenta heredada debe activarse deliberadamente con `npm run auth:set-password`; el comando exige correo/contraseña mediante variables privadas y nunca imprime la contraseña.

## Calidad

Backend:

```text
npm run build
npm test
npm run db:verify
npm run storage:verify
```

Frontend:

```text
npm run build
npm run check:pwa
```

## Infraestructura

`PRAVIA_DATABASE_MODE` y `STORAGE_MODE` aceptan `cloud`, `local` o `hybrid`. El modo híbrido exige primarios explícitos y no habilita replicación. Consulta [la guía cloud/local/hybrid](docs/arquitectura/fase-12-cloud-local-hybrid.md) antes de cambiar infraestructura.

## Seguridad operativa

- No publicar `.env`, claves de Supabase/OpenAI ni respaldos.
- No ejecutar `prisma db push`, `prisma migrate reset` ni restaurar sobre una base con datos.
- Las tablas públicas heredadas tienen RLS y denegación explícita para Data API.
- Los documentos son privados y se entregan mediante enlaces temporales o streaming autorizado.
- La IA propone y explica; una persona confirma los datos y decisiones jurídicas/fiscales.

La matriz y el procedimiento completos están en [autenticación, RBAC y RLS](docs/seguridad/fase-10-auth-rbac-rls.md).
