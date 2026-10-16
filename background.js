const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openrouter/free";
const HISTORY_LIMIT = 50;
const PROMPTS = {
  detailed: "Resuelve este ejercicio de forma concisa y directa",
  quick: "Devuelve ÚNICAMENTE la letra u opción correcta (ejemplo: A, B, C, D o 1, 2, 3, 4) sin ninguna palabra adicional",
};

async function reconcileTab(tabId) {
  const target = { tabId };
  try {
    await chrome.scripting.insertCSS({ target, files: ["styles.css"] });
    await chrome.scripting.executeScript({
      target,
      files: ["node_modules/tesseract.js/dist/tesseract.min.js", "content.js"],
    });
  } catch (error) {
    console.warn(`SolveMangu: no se pudo activar en la pestaña ${tabId}.`, error);
  }
}

async function reconcileAllTabs() {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.filter((tab) => Number.isInteger(tab.id)).map((tab) => reconcileTab(tab.id)));
}

async function saveHistory(entry) {
  const { queryHistory = [] } = await chrome.storage.local.get("queryHistory");
  const entries = Array.isArray(queryHistory) ? queryHistory : [];
  await chrome.storage.local.set({ queryHistory: [entry, ...entries].slice(0, HISTORY_LIMIT) });
}

async function captureVisibleTab(tab) {
  if (!tab || !Number.isInteger(tab.windowId)) {
    throw new Error("No se encontró la pestaña activa.");
  }
  const { openrouterApiKey } = await chrome.storage.local.get("openrouterApiKey");
  if (!openrouterApiKey) {
    throw new Error("Configura primero tu API Key de OpenRouter desde el popup.");
  }

  const imageDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  return { imageDataUrl };
}

async function solveWithOpenRouter(mode, imageDataUrl, ocrText) {
  const { openrouterApiKey } = await chrome.storage.local.get("openrouterApiKey");
  if (!openrouterApiKey) {
    throw new Error("Configura primero tu API Key de OpenRouter desde el popup.");
  }

  const prompt = PROMPTS[mode] || PROMPTS.detailed;
  const textContent = ocrText.trim()
    ? `${prompt}\n\nTexto extraído localmente de la captura:\n${ocrText.trim()}`
    : `${prompt}\n\nNo se pudo extraer texto con OCR; analiza la captura adjunta.`;
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openrouterApiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Title": "SolveMangu Vision",
    },
    body: JSON.stringify({
      messages: [{
        role: "user",
        content: [
          { type: "text", text: textContent },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      }],
      model: MODEL,
      max_tokens: mode === "quick" ? 64 : 512,
      temperature: mode === "quick" ? 0.1 : 0.3,
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
    throw new Error(data?.error?.message || `Error de OpenRouter (HTTP ${response.status})`);
  }

  const answer = data?.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("OpenRouter no devolvió una respuesta.");
  }

  await saveHistory({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    mode,
    prompt,
    answer: answer.trim(),
    imageDataUrl,
    ocrText: ocrText.trim(),
  });
  return { answer: answer.trim() };
}

chrome.runtime.onInstalled.addListener(() => reconcileAllTabs());
chrome.runtime.onStartup.addListener(() => reconcileAllTabs());
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    reconcileTab(tabId);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "KEY_UPDATED" || message?.type === "BUTTON_VISIBILITY_UPDATED") {
    reconcileAllTabs().then(() => sendResponse({ ok: true }), (error) => sendResponse({ error: error.message }));
    return true;
  }
  if (message?.type === "CAPTURE_VISIBLE_TAB") {
    captureVisibleTab(sender.tab)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }
  if (message?.type === "SOLVE_OCR_CAPTURE") {
    solveWithOpenRouter(message.mode, message.imageDataUrl, message.ocrText || "")
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }
  return false;
});