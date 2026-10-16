# NVIDIA Multimodal Assistant

Extensión local de Chrome (Manifest V3) para resolver ejercicios visibles en una página con el modelo multimodal de NVIDIA.

## Instalar en modo desarrollador

1. Descarga o clona este repositorio en tu computadora.
2. En Chrome, abre `chrome://extensions`.
3. Activa **Modo de desarrollador**.
4. Selecciona **Cargar descomprimida** y elige la carpeta del repositorio que contiene `manifest.json`.
5. Abre la extensión desde el icono de extensiones de Chrome. Puedes fijarla a la barra para acceder más fácilmente.

## Usar

1. Pulsa el icono de la extensión y guarda tu NVIDIA API Key.
2. En una página compatible, pulsa el control tenue del borde izquierdo para resolver el ejercicio y copiar la respuesta.
3. Pulsa el control del borde derecho para mostrar brevemente la opción correcta tipo test.
4. Abre el popup para revisar las capturas y respuestas guardadas, cambiar la clave o borrarla.

La extensión llama a `https://integrate.api.nvidia.com/v1/chat/completions` usando el modelo `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`. Necesita una clave válida y conexión a Internet. Chrome bloquea la inyección en páginas internas como `chrome://` y en algunas páginas protegidas.

## Almacenamiento de la clave

La clave, las capturas y las respuestas se guardan en `chrome.storage.local`. Este almacenamiento es local al perfil, pero no cifra los datos ni los protege de otras personas o programas con acceso a ese perfil. Usa la extensión solo en un perfil de confianza y no compartas la carpeta de datos del navegador.