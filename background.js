const API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
const PROMPTS = {
  detailed: "Resuelve este ejercicio de forma detallada",
  quick: "Devuelve ÚNICAMENTE la letra u opción correcta (ejemplo: A, B, C, D o 1, 2, 3, 4) sin ningún texto adicional",
};

async function reconcileTab(tabId) {
  const { nvidiaApiKey } = await chrome.storage.local.get("nvidiaApiKey");
  const target = { tabId };
  if (!nvidiaApiKey) {
    try {
      await chrome.scripting.executeScript({
        target,
        func: () => document.querySelectorAll("#nvidia-assistant-left, #nvidia-assistant-right, #nvidia-assistant-result").forEach((element) => element.remove()),
      });
      await chrome.scripting.removeCSS({ target, files: ["styles.css"] });
    } catch {
      // Browser-internal pages cannot be scripted.
    }
    return;
  }

  try {
    await chrome.scripting.insertCSS({ target, files: ["styles.css"] });
    await chrome.scripting.executeScript({ target, files: ["content.js"] });
  } catch {
    // Browser-internal pages and restricted origins cannot be scripted.
  }
}

async function reconcileAllTabs() {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.filter((tab) => Number.isInteger(tab.id)).map((tab) => reconcileTab(tab.id)));
}

async function saveHistory(entry) {
  const { queryHistory = [] } = await chrome.storage.local.get("queryHistory");
  await chrome.storage.local.set({ queryHistory: [entry, ...queryHistory] });
}

async function solveVisibleTab(mode, tab) {
  if (!tab || !Number.isInteger(tab.windowId)) {
    throw new Error("No se encontró la pestaña activa.");
  }
  const { nvidiaApiKey } = await chrome.storage.local.get("nvidiaApiKey");
  if (!nvidiaApiKey) {
    throw new Error("Configura primero tu NVIDIA API Key desde el popup.");
  }

  const imageDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  const prompt = PROMPTS[mode] || PROMPTS.detailed;
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${nvidiaApiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageDataUrl } },
          { type: "text", text: prompt },
        ],
      }],
      model: MODEL,
      max_tokens: mode === "quick" ? 64 : 1024,
      temperature: mode === "quick" ? 0.2 : 0.6,
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
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("NVIDIA no devolvió una respuesta.");
  }

  await saveHistory({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    mode,
    prompt,
    answer: answer.trim(),
    imageDataUrl,
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
  if (message?.type === "KEY_UPDATED") {
    reconcileAllTabs().then(() => sendResponse({ ok: true }), (error) => sendResponse({ error: error.message }));
    return true;
  }
  if (message?.type === "SOLVE_VISIBLE_TAB") {
    solveVisibleTab(message.mode, sender.tab)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }
  return false;
});