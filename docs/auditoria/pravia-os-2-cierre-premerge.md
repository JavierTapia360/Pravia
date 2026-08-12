# Auditoría de cierre pre-merge — PRAVIA OS 2

## Alcance y fecha

Revisión estática y funcional de la rama `codex/pravia-os-2-consolidation`. No se hizo merge, push, despliegue, backfill ni conexión a una base operativa. Las coincidencias se clasifican como `ELIMINADO`, `JUSTIFICADO` o `PENDIENTE` según su efecto real, no por el nombre del patrón.

## Patrones residuales

| Patrón | Estado | Evidencia y decisión |
|---|---|---|
| `fetch('/api` / `fetch("/api` | JUSTIFICADO | Solo queda el health público de `PwaStatus`; las operaciones privadas usan el cliente autenticado compartido. |
| `findFirst` | JUSTIFICADO | Son consultas Prisma con filtros de usuario, activo, archivo y alcance de objeto. No representan un usuario por defecto. |
| `defaultUser` | ELIMINADO | Sin coincidencias en runtime. |
| `user_id` | JUSTIFICADO | Persiste como nombre de columna, filtro de equipo autorizado y dato de respuesta. La autoría de mutaciones se deriva de `req.user`; roles sin gestión de equipo ignoran el filtro ajeno. |
| `LOCAL_LEGACY` | PENDIENTE | El lector de proyectos históricos sigue en `proyectos.controller.ts`. Retirarlo sin un dry-run aplicado puede volver inaccesibles binarios y reportes; el entorno bloqueó el cambio hasta migración verificada o aceptación expresa de ese riesgo. |
| `proyectos_db.json` | PENDIENTE | El runtime todavía lo consulta por la misma razón. El script de migración debe conservar esta referencia incluso después del retiro. |
| `alert(` / `confirm(` | ELIMINADO | Sin diálogos nativos en frontend/backend runtime; se usan confirmaciones accesibles de la aplicación. |
| `REVISION_BANCO_CLIENTE`, `EN_CATASTRO`, `EN_REGISTRO`, `EN_ARMADO` | JUSTIFICADO | Estados de dominio visibles en filtros de expedientes; no son reglas duplicadas ni transiciones ocultas. |
| `valor_operacion *` / `valor_operacion*` | ELIMINADO | Sin cálculo porcentual directo residual en runtime. Presupuesto, valor jurídico y honorarios permanecen separados. |
| `bg-slate-900` / `bg-dark` | JUSTIFICADO | Se conserva en sidebar, overlays, editor documental y estados seleccionados; las siete superficies operativas principales son claras. |
| `glass-card` | JUSTIFICADO | Es un alias heredado del sistema de superficies, hoy resuelto a fondo claro, borde y sombra semánticos; no implica glassmorphism oscuro. |

## Interfaz auditada

- Expedientes: superficie clara, KPIs ligeros, filtros separados, tabla con ancho mínimo y scroll contenido.
- Comparecientes: tabla paginada por defecto para catálogos grandes, tarjetas opcionales, RFC/CURP, calidad, domicilio y acciones jerarquizados.
- Notarías: tabla operativa por defecto, tarjetas opcionales, contacto, tiempos, actividad, estado y acciones distribuidos por columna.
- Agenda: toolbar de 42 px, navegación Día/Semana/Mes/Lista, calendario con contenedor horizontal y tareas laterales.
- Finanzas: jerarquía entre resumen, pestañas, filtros y detalle; tipografía funcional mínima corregida mediante reglas del módulo; tablas con scroll horizontal.
- Inteligencia: configuración, métricas, flujo de confirmación, jerarquía documental y vacíos separados en superficies claras.
- Riesgos/UIF: encabezado legible, selector UIF/ISR, métricas y maestro-detalle con contraste corregido.

## Responsive y accesibilidad

- Controles compartidos de al menos 40–42 px en catálogos y asistente; botones de icono con nombre accesible.
- Tablas anchas dentro de wrappers de scroll, sin empujar el layout general.
- Breakpoints de encabezado, métricas, grids, calendarios y paneles revisados estáticamente.
- Arranque verificado en navegador a 375 × 812 sin overflow horizontal ni errores de consola. Las rutas privadas no se inspeccionaron visualmente porque el backend no se levantó y no se utilizaron credenciales.
- `prefers-reduced-motion` desactiva las animaciones del asistente.

## Recursos de PRAVIA IA

- `owl-idle.png` se precarga; los demás estados se solicitan al cambiar de estado.
- Los seis PNG de runtime se redujeron a un máximo de 384 px, suficiente para su render de 40–52 px y pantallas retina.
- La referencia maestra se conserva sin cambios y no hay hashes duplicados entre estados.
- Peso total aproximado de estados: de 12.1 MB a 0.9 MB.

## Validaciones requeridas antes de merge

1. Ejecutar build y tests completos de backend/frontend y auditoría de secretos.
2. Revisar el diff y el historial de commits.
3. Ejecutar E2E autenticado y regresión visual cuando se faciliten credenciales de prueba.
4. Resolver el lector `LOCAL_LEGACY` mediante migración aplicada o autorización expresa de inaccesibilidad.
5. Revisar el dry-run financiero en una base aislada antes de diseñar cualquier backfill.
