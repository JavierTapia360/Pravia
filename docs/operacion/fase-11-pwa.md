# Fase 11 — PWA instalable y segura sin conexión

## Instalación

La compilación web incluye un manifest válido con:

- nombre e icono PRAVIA;
- modos normal y `maskable` en 192 y 512 píxeles;
- `display: standalone` para abrir sin barra del navegador;
- colores de inicio y tema coordinados con el shell;
- alcance y URL inicial en la raíz de la aplicación;
- metadatos compatibles con instalación en escritorio, Android e iOS.

Cuando el navegador emite `beforeinstallprompt`, PRAVIA muestra una acción de instalación. En navegadores que gestionan la instalación desde su propio menú, el manifest y los iconos quedan disponibles igualmente.

## Service worker

El service worker mantiene únicamente el shell básico:

- página principal y shell sin conexión;
- manifest e iconos;
- recursos estáticos ya visitados;
- navegación con prioridad a la red y fallback al shell.

Las respuestas de `/api` nunca se guardan en caché. Las solicitudes de escritura tampoco son capturadas ni encoladas. Si el servidor no responde, el cliente muestra **“Sin conexión al servidor”** y bloquea `POST`, `PUT`, `PATCH` y `DELETE` antes de enviarlos.

Esto evita una falsa experiencia offline: no existen borradores remotos, sincronización ni reintentos silenciosos capaces de duplicar expedientes, pagos, documentos o decisiones jurídicas.

## Actualizaciones

Una nueva versión se instala en espera. La interfaz avisa al usuario y solo activa la actualización cuando el usuario elige **Actualizar**; después recarga una vez que el nuevo worker toma control. Los cachés antiguos con prefijo PRAVIA se eliminan al activar.

## Validación realizada

- build de producción completado;
- manifest servido y comprobado con `standalone`, alcance raíz y tres iconos;
- iconos PNG verificados en 192×192 y 512×512;
- shell `/offline.html` comprobado visualmente con el aviso correcto;
- `sw.js` incluido en la compilación y con exclusión explícita de API/escrituras;
- comprobador `npm run check:pwa` añadido para repetir estas validaciones en CI;
- no se habilitó edición offline compleja.
