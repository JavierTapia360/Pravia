# Fase 4B — Catálogo operativo de Notarías

## Resultado

El catálogo de Notarías concentra en una ficha reutilizable:

- número, denominación, titular, entidad, municipio, demarcación, domicilio y código postal;
- teléfono, WhatsApp, correos, portal y contacto principal;
- múltiples contactos operativos con cargo y canales propios;
- horario, días de atención y tiempos de respuesta, presupuesto y firma;
- instrucciones especiales, requisitos frecuentes y observaciones;
- tipos de acto, municipios atendidos e instituciones;
- cotizaciones y expedientes relacionados.

La lista muestra primero la información necesaria para decidir con qué Notaría trabajar: ubicación, titular, canales, contactos, tiempos y carga relacionada. La ficha usa cuatro secciones progresivas, campos con etiquetas visibles, controles táctiles, estados de carga, error anunciado y protección al cerrar con cambios sin guardar.

## Integridad

- La identidad operativa por número, entidad y demarcación se comprueba dentro de una transacción con bloqueo para evitar duplicados concurrentes.
- Los correos se normalizan y validan.
- Las listas de cobertura aceptan únicamente texto, eliminan vacíos y duplicados.
- Cambiar los contactos ya no ejecuta un borrado masivo: actualiza los existentes, agrega los nuevos e inactiva los retirados.
- La baja de una Notaría es siempre archivado lógico. Se preservan contactos, cotizaciones y expedientes.
- Una Notaría archivada no puede editarse ni establecerse como predeterminada.

## Verificación

La comprobación se realizó en modo lectura sobre las cuatro Notarías existentes. Se abrió una ficha real, se recorrieron identificación y configuración operativa y se cerró sin guardar. No se crearon, editaron, archivaron ni reasignaron registros.

| Caso | Resultado |
| --- | --- |
| Catálogo con datos reales | 4 Notarías visibles |
| Canales y relaciones | teléfono, WhatsApp, correo, contactos, cotizaciones y expedientes visibles |
| Ficha operativa | secciones y campos completos accesibles |
| Compilación backend | Correcta |
| Compilación frontend | Correcta |
| Pruebas automatizadas existentes | Correctas |
