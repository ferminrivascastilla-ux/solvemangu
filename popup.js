const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const imageInput = document.getElementById("imageInput");
  const promptInput = document.getElementById("prompt");
  const sendButton = document.getElementById("sendBtn");
  const output = document.getElementById("output");

  function showMessage(message, isError = false) {
    output.textContent = message;
    output.classList.toggle("status", !isError);
    output.classList.toggle("error", isError);
  }

  function readImageAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
      reader.readAsDataURL(file);
    });
  }

  chrome.storage.local.get(["nvidiaApiKey"]).then(({ nvidiaApiKey }) => {
    if (nvidiaApiKey) {
      apiKeyInput.value = nvidiaApiKey;
    }
  }).catch(() => {
    showMessage("No se pudo cargar la clave guardada.", true);
  });

  sendButton.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim();
    const image = imageInput.files[0];
    const prompt = promptInput.value.trim();

    if (!apiKey) {
      showMessage("Introduce tu NVIDIA API Key.", true);
      return;
    }
    if (!image) {
      showMessage("Selecciona una imagen primero.", true);
      return;
    }
    if (!image.type.startsWith("image/")) {
      showMessage("El archivo seleccionado no es una imagen válida.", true);
      return;
    }
    if (!prompt) {
      showMessage("Escribe una pregunta para el modelo.", true);
      return;
    }

    sendButton.disabled = true;
    try {
      await chrome.storage.local.set({ nvidiaApiKey: apiKey });
      showMessage("Leyendo imagen...");
      const imageDataUrl = await readImageAsDataUrl(image);
      showMessage("Enviando petición a NVIDIA...");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: imageDataUrl } },
                { type: "text", text: prompt },
              ],
            },
          ],
          model: MODEL,
          max_tokens: 1024,
          temperature: 0.6,
          top_p: 0.95,
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.error?.message || `Error HTTP: ${response.status}`);
      }

      const answer = data?.choices?.[0]?.message?.content;
      showMessage(typeof answer === "string" && answer
        ? answer
        : "No se recibió respuesta del modelo.");
    } catch (error) {
      showMessage(`Error al procesar: ${error.message}`, true);
    } finally {
      sendButton.disabled = false;
    }
  });
});
