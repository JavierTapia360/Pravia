# Fase 10 — Autenticación, autorización y RLS

## Arquitectura de sesión

PRAVIA OS ya no admite autenticación simulada. El flujo implementado usa:

- correo y contraseña con hash bcrypt, factor de costo 12;
- token de acceso JWT de 15 minutos, firmado con `HS256`, emisor y audiencia fijos;
- token de renovación aleatorio de 48 bytes, guardado únicamente como huella SHA-256;
- cookie de renovación `HttpOnly`, `SameSite=Strict`, limitada a `/api/auth` y `Secure` en producción;
- rotación de la cookie en cada renovación, con detección de reutilización concurrente;
- sesión persistida por dispositivo con expiración de siete días, agente, IP, revocación y motivo;
- comprobación en base de datos de sesión, usuario activo y rol en cada solicitud;
- cierre inmediato de sesiones al cerrar sesión, desactivar una cuenta, cambiar un rol o restablecer una contraseña.

`AUTH_JWT_SECRET` es obligatorio y debe contener al menos 32 caracteres aleatorios. El backend falla de forma segura si no está configurado; no usa una clave predeterminada ni reutiliza el antiguo `JWT_SECRET` inseguro.

## Contraseñas y recuperación

Las contraseñas requieren al menos 12 caracteres, mayúscula, minúscula, número y símbolo. Cinco intentos fallidos bloquean temporalmente la cuenta durante 15 minutos, y existe un límite adicional por dirección de red.

Las cuentas creadas por Dirección reciben una contraseña temporal y no pueden usar módulos operativos hasta cambiarla. La interfaz incluye:

- inicio de sesión real;
- cambio obligatorio de contraseña;
- solicitud de recuperación sin revelar si el correo existe;
- enlace de recuperación de 30 minutos y un solo uso;
- restablecimiento que revoca todas las sesiones previas.

La entrega del enlace se conecta mediante `PASSWORD_RECOVERY_WEBHOOK_URL`; debe apuntar a un servicio privado de correo o mensajería. Para desarrollo aislado se puede habilitar explícitamente `AUTH_ALLOW_DEV_RECOVERY_TOKEN=true`, opción ignorada como práctica operativa en producción.

La única cuenta heredada no tenía un hash bcrypt válido. Se conservó intacta y quedó pendiente de activación deliberada. El operador debe configurar primero `AUTH_JWT_SECRET` mediante el gestor de secretos y ejecutar `npm run auth:set-password` con `PRAVIA_ADMIN_EMAIL` y `PRAVIA_ADMIN_PASSWORD` inyectados de forma segura. El comando no imprime la contraseña, revoca sesiones anteriores y registra auditoría.

## Permisos efectivos

El backend valida permisos por acción; ocultar un módulo en la interfaz no se considera autorización.

| Rol | Alcance principal |
| --- | --- |
| Dirección | Operación completa, finanzas, reportes, cumplimiento, usuarios y configuración |
| Administración | Operación, expedientes, documentos, finanzas y reportes; sin administración de usuarios/configuración restringida |
| Abogado | Expedientes asignados o creados, documentos, comparecientes, proyectos, IA y cumplimiento; sin detalle financiero global |
| Recepción | Prospectos, cotizaciones, documentos, notarías y agenda; sin expedientes ni finanzas sensibles |
| Gestoría | Expedientes y tareas asignados, documentos acotados, notarías y agenda; sin edición jurídica ni finanzas |
| Consulta | Lectura de expedientes, documentos, reportes, IA y cumplimiento; sin acciones de escritura |

Además del permiso del módulo:

- abogados solo consultan expedientes donde son responsables o creadores;
- gestoría solo consulta expedientes asignados directamente o mediante una tarea activa;
- los perfiles sin permiso financiero reciben valores y movimientos ocultos;
- la agenda limita tareas y eventos propios salvo Dirección/Administración;
- el motor de cumplimiento hereda el alcance del expediente;
- archivar expedientes, revertir movimientos, desvincular documentos y confirmar cumplimiento tienen permisos específicos.

Dirección cuenta con `/configuracion/usuarios` para crear cuentas, asignar roles, activar/desactivar y establecer contraseñas temporales. La API impide desactivar la propia cuenta y dejar al sistema sin una Dirección activa.

## Supabase y RLS

La auditoría de consumidores confirmó que el frontend no usa Supabase Data API. Toda la información operativa pasa por la API y Prisma sobre `pravia_os`; el cliente Supabase del backend se usa solo para Storage privado con credencial de servidor.

Con ese modelo verificado se aplicó el siguiente endurecimiento:

- RLS habilitado en las ocho tablas heredadas expuestas en `public`;
- privilegios revocados para `anon` y `authenticated`;
- políticas explícitas `legacy_data_api_denied` que deniegan lectura y escritura a ambos roles;
- `search_path` fijo para `pravia_os.fn_check_compareciente_perfil()`;
- sin `FORCE ROW LEVEL SECURITY`, por lo que el propietario usado por Prisma conserva su acceso normal.

El Security Advisor de Supabase pasó de nueve hallazgos heredados a **cero**. El Performance Advisor también se ejecutó; sus avisos informativos de índices se reservan para la fase de rendimiento, sin eliminar índices “no usados” ni hacer cambios masivos sin medición.

## Validación realizada

- tres migraciones remotas aditivas aplicadas: sesiones/recuperación, cierre de tablas públicas y políticas explícitas;
- ocho tablas públicas con RLS y ocho políticas de denegación verificadas;
- cero sesiones y cero tokens de recuperación creados durante la validación;
- 51 pruebas aprobadas en nueve archivos, incluidas matriz RBAC, política de contraseñas, firma/verificación JWT, manipulación de tokens y cookies;
- backend y frontend compilados para producción;
- navegación directa a `/expedientes` redirige a `/login`;
- credenciales inexistentes producen un mensaje genérico y no revelan cuentas;
- no se sustituyó ni eliminó ningún dato operativo o credencial heredada.
