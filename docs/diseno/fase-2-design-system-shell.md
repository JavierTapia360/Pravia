# Fase 2 — Design system y shell de aplicación

Fecha: 11 de agosto de 2026

## Resultado

PRAVIA OS dispone de una base visual orientada a operación jurídica: superficie de trabajo clara, navegación institucional azul marino, acento cobre para acciones y estados de atención, densidad alta y movimiento discreto. El cambio mantiene alias para los tokens anteriores, por lo que los módulos existentes pueden migrarse de manera gradual sin una reescritura destructiva.

## Arquitectura de tokens

La hoja global utiliza tres capas:

1. **Primitivos:** colores base, espacios, radios, sombras y duraciones.
2. **Semánticos:** fondo, superficie, texto, borde, éxito, advertencia, error y foco.
3. **Componentes:** botón, entrada, tarjeta y shell.

La recomendación generada se conserva en `design-system/pravia-os/MASTER.md`. La adaptación específica del producto autenticado está en `design-system/pravia-os/pages/app-shell.md`.

## Shell y navegación

- Sidebar de 264 px, contraíble a 76 px en escritorio.
- Drawer de 304 px con fondo de cierre en pantallas de hasta 900 px.
- Barra superior de 64 px con contexto del módulo, búsqueda rápida y accesos a agenda/riesgos.
- Grupos: Inicio, Operación, Gestión y Herramientas.
- Búsqueda de módulos por nombre o descripción, con atajo `Ctrl/Cmd + K`.
- Navegación activa mediante superficie, peso tipográfico e indicador cobre; el color no es el único indicador.

La visibilidad actual se filtra en cliente por los roles existentes en Prisma (`DIRECCION`, `ADMINISTRACION`, `ABOGADO`, `RECEPCION`, `GESTORIA`). Este filtrado mejora la interfaz, pero **no sustituye autorización de servidor**. La autorización real y las políticas se implementarán en la fase de autenticación/RBAC.

## Componentes compartidos

- `Button` con variantes, tamaños y estado de carga.
- `Input` y `Select` con etiqueta, ayuda, error y atributos ARIA.
- `EmptyState`, `LoadingState` y `ErrorState`.
- `DataTable` con controles de ordenamiento accesibles, `aria-sort`, navegación por teclado y paginación etiquetada.
- `Modal` y `SlideOver` con `role=dialog`, título accesible, Escape, bloqueo de scroll y restitución del foco.

## Compatibilidad

Los módulos más grandes todavía combinan utilidades Tailwind claras y oscuras. En esta fase no se hizo un reemplazo mecánico de cientos de clases porque podría alterar formularios críticos. Cada módulo se normalizará al completar su flujo funcional en las fases 3–7.

Los accesos a Agenda, Reportes, Inteligencia y Riesgos muestran estados vacíos honestos en lugar de encabezados que aparentaban módulos terminados.

## Verificación

- TypeScript y build de producción: correcto.
- Navegación rápida: correcta; selección de “Expedientes” cambia ruta y estado activo.
- Sidebar contraído: 76 px, sin etiquetas visibles ni desbordamiento.
- Viewports comprobados: 375×812, 768×900, 1024×800 y 1440×900.
- Ancho de documento igual al viewport en todos los tamaños comprobados.
- Drawer móvil y búsqueda móvil: correctos.
- Consola del navegador: sin errores ni advertencias durante la prueba.
- `prefers-reduced-motion`: definido globalmente.

## Pendientes deliberados

- Migrar estilos incrustados y emojis históricos dentro de módulos de negocio durante su fase funcional.
- Implementar autorización real en backend; no considerar la ocultación de menú una barrera de seguridad.
- Añadir tema oscuro completo sólo después de normalizar todos los módulos; la fase actual prioriza el modo claro operativo.
