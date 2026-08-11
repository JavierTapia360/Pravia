# Fase 4 — Comparecientes y expediente electrónico

## Resultado

El catálogo de comparecientes funciona como maestro reutilizable para personas físicas y morales. La ficha consolida identidad, datos fiscales, actividad, alias, condición PEP, domicilios, identificaciones, contactos, documentos y expedientes relacionados sin inventar valores cuando la fuente no tiene información.

La retirada de un compareciente es exclusivamente un archivado reversible. No existe una opción de borrado físico en la interfaz ni en el servicio de negocio; se conservan identidad, relaciones, documentos y trazabilidad.

## Identidad y duplicados

Las altas directas y la sesión guiada aplican las mismas reglas:

- normalización de CURP y RFC;
- validación estructural de CURP;
- validación de RFC según persona física o moral;
- validación de fechas de nacimiento y constitución;
- rechazo de nombres o folios ficticios;
- bloqueo transaccional por identidad antes de buscar duplicados activos;
- conservación de alias, PEP, contactos y domicilios capturados.

La ampliación del esquema se aplicó mediante una migración aditiva y reversible: se agregaron país de nacimiento, escolaridad y giro a personas físicas, así como evidencia de comprobación y documento comprobante a domicilios. No se eliminó ni sobrescribió información existente.

## Archivo documental privado

El archivo maestro acepta PDF, JPEG, PNG, DOC y DOCX. Antes de guardar valida categoría, tipo MIME, compareciente activo y usuario operativo. Los nombres y rutas se sanejan y se vuelven únicos.

Los documentos se registran inicialmente como `PENDIENTE` y conservan fechas de emisión, vencimiento y observaciones. El almacenamiento sigue en buckets privados; la visualización y descarga utiliza enlaces firmados de corta duración, limitados a diez minutos por defecto y nunca superiores a una hora.

La carga coordina almacenamiento y base de datos: si falla el registro transaccional, el objeto recién cargado se retira del bucket para evitar archivos huérfanos.

## Verificación

Se ejecutaron sin crear, archivar ni modificar comparecientes reales:

| Caso | Resultado |
| --- | --- |
| Compilación backend | Correcta |
| Pruebas de flujo e identidad | 17 pruebas aprobadas |
| Validación Prisma | Esquema válido |
| Compilación frontend | Correcta |
| Catálogo real en lectura | Cargó el registro activo sin valores ficticios |
| Ficha maestra | Mostró identidad, PEP, domicilios, identificaciones y contactos |
| Archivo documental | Mostró carpetas y estado vacío real |
| Archivado | La interfaz solo ofrece la acción reversible |

La revisión de seguridad posterior a la migración mantuvo sin cambios las advertencias ya inventariadas sobre el esquema público heredado. Su corrección queda en la fase de autenticación y RLS, después de confirmar los consumidores de esas tablas.
