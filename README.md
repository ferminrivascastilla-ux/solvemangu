# SolveMangu Vision

Extensión local de Chrome (Manifest V3) que extrae texto de capturas con Tesseract.js local y resuelve ejercicios usando OpenRouter.

## Instalar en modo desarrollador

1. Descarga o clona este repositorio y ejecuta `npm install` en su carpeta para instalar Tesseract.js y los datos OCR en español.
2. En Chrome, abre `chrome://extensions`.
3. Activa **Modo de desarrollador**.
4. Selecciona **Cargar descomprimida** y elige la carpeta del repositorio que contiene `manifest.json`.
5. Abre la extensión desde el icono de extensiones de Chrome. Puedes fijarla a la barra para acceder más fácilmente.

## Usar

1. Pulsa el icono de la extensión y guarda tu API Key de OpenRouter.
2. En una página compatible, pulsa el botón del borde izquierdo para resolver el ejercicio y copiar la respuesta.
3. Pulsa el botón del borde derecho para mostrar brevemente la opción correcta tipo test.
4. Pulsa el logotipo del popup para elegir si los botones laterales están apagados, camuflados o visibles.
5. Abre el popup para revisar las capturas y respuestas guardadas, cambiar la clave o borrarla.

La extensión realiza el OCR en el dispositivo y envía la captura y el texto detectado a `https://openrouter.ai/api/v1/chat/completions` usando el modelo gratuito `openrouter/free`. Necesita una clave válida y conexión a Internet. Chrome bloquea la inyección en páginas internas como `chrome://` y en algunas páginas protegidas.

## Almacenamiento de la clave

La clave, las capturas y las respuestas se guardan en `chrome.storage.local`. Este almacenamiento es local al perfil, pero no cifra los datos ni los protege de otras personas o programas con acceso a ese perfil. Usa la extensión solo en un perfil de confianza y no compartas la carpeta de datos del navegador.