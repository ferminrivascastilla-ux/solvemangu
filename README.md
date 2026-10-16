# NVIDIA Multimodal Assistant

Extensión local de Chrome (Manifest V3) para enviar una imagen y una pregunta al modelo multimodal de NVIDIA.

## Instalar en modo desarrollador

1. Descarga o clona este repositorio en tu computadora.
2. En Chrome, abre `chrome://extensions`.
3. Activa **Modo de desarrollador**.
4. Selecciona **Cargar descomprimida** y elige la carpeta del repositorio que contiene `manifest.json`.
5. Abre la extensión desde el icono de extensiones de Chrome. Puedes fijarla a la barra para acceder más fácilmente.

## Usar

1. En el popup, introduce tu clave de API de NVIDIA.
2. Selecciona una imagen desde tu computadora y escribe la pregunta.
3. Pulsa **Analizar imagen**. La respuesta aparecerá en el popup.

La extensión llama a `https://integrate.api.nvidia.com/v1/chat/completions` usando el modelo `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`. Necesita una clave válida y conexión a Internet.

## Almacenamiento de la clave

La clave se guarda en `chrome.storage.local` para volver a cargarla al abrir el popup. Este almacenamiento es local al perfil, pero no cifra la clave ni la protege de otras personas o programas con acceso a ese perfil. Usa la extensión solo en un perfil de confianza y no compartas la carpeta de datos del navegador.