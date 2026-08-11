# Fase 9 — Cumplimiento UIF e ISR versionado

## Alcance

PRAVIA OS incorpora un motor de revisión de cumplimiento ligado al expediente, a una versión normativa concreta y a evidencia documental existente. El sistema explica cada resultado y exige una decisión humana; no emite dictámenes jurídicos ni fiscales.

La implementación es aditiva: crea reglas, revisiones y vínculos de evidencia sin modificar ni eliminar información operativa previa.

## UIF

La referencia operativa `LFPIORPI-2025-07-16+UMA-2026-02-01` se basa en:

- [LFPIORPI vigente, última reforma publicada el 16 de julio de 2025](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPIORPI.pdf), en especial los artículos 17 y 18;
- [UMA 2026 publicada por INEGI](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/uma/uma2026.pdf), con valor diario de MXN 117.31 a partir del 1 de febrero de 2026.

La evaluación configurable considera:

- como base inmobiliaria, el mayor valor entre precio pactado, catastral, comercial y garantizado;
- umbral de aviso de 8,000 UMA para transmisión o constitución de derechos reales sobre inmuebles;
- acumulación de operaciones relacionadas durante seis meses;
- aviso obligatorio en poderes irrevocables de administración o dominio;
- aviso obligatorio en constitución, modificaciones patrimoniales, fusión, escisión y compraventa de acciones o partes sociales;
- umbral de 4,000 UMA para fideicomisos;
- aviso obligatorio en préstamos o créditos no financieros;
- identificación, actividad u ocupación, beneficiario controlador, documentación y conservación como controles de debida diligencia.

Cada explicación conserva los valores utilizados, el umbral calculado, las reglas activadas, alertas de información incompleta y la fuente oficial. Una actualización legal o de UMA debe publicarse como una nueva versión; las revisiones históricas no cambian retroactivamente.

## ISR

La referencia `LISR-2024-04-01+RMF-2026` usa como fuentes:

- [Ley del Impuesto sobre la Renta](https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf);
- [Resolución Miscelánea Fiscal 2026](https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/RMF_2026-DOF-28122025.pdf);
- [regla 3.15.5 del SAT](https://wwwmat.sat.gob.mx/cs/Satellite?c=Articulo&childpagename=SatTyR%2FArticulo%2FSAT_LandingArticulo&cid=1462228883993&packedargs=d%3DTouch&pagename=TySWrapper).

La calculadora queda deliberadamente en estado `PREPARADO_SIN_CALCULO`. Solo valida que existan los insumos necesarios —valores de terreno y construcción, fechas, costos históricos y actualizados, deducciones, partes gravadas o exentas, ISR causado/retenido y procedimiento aplicable—. No calcula impuesto hasta que un especialista fiscal apruebe y publique una versión completa de parámetros, INPC y procedimiento.

## Revisión y evidencia

El flujo implementado es:

1. seleccionar expediente, fecha de operación y versión aplicable;
2. guardar un borrador versionado;
3. contestar el cuestionario y ejecutar reglas explicables;
4. adjuntar documentos ya vinculados al expediente como evidencia, sin duplicarlos;
5. solicitar ajustes o confirmar la revisión con usuario, fecha y notas;
6. conservar el resultado y la auditoría sin sobrescribir revisiones anteriores.

## Validación realizada

- dos migraciones remotas aditivas aplicadas y reflejadas localmente;
- dos reglas verificadas en base de datos, con cero revisiones y cero evidencias creadas durante las pruebas;
- esquema Prisma generado, formateado y válido;
- 42 pruebas aprobadas en siete archivos, incluidas reglas de umbral, supuestos de aviso obligatorio, debida diligencia incompleta y bloqueo del cálculo ISR;
- backend y frontend compilados para producción;
- pantalla `/riesgos` comprobada en UIF e ISR, incluido el formulario con siete expedientes, sin crear registros;
- revisión de seguridad posterior sin hallazgos nuevos: permanecen un aviso heredado de `search_path` y ocho tablas públicas heredadas sin RLS, reservados para la Fase 10 tras verificar sus consumidores.
