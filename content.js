(async () => {
  const buttons = [
    { id: "solvemangu-left", mode: "detailed", label: "Resolver ejercicio y copiar respuesta", symbol: "L" },
    { id: "solvemangu-right", mode: "quick", label: "Mostrar respuesta rápida tipo test", symbol: "R" },
  ];

  async function initializeAssistant() {
    const { openrouterApiKey } = await chrome.storage.local.get("openrouterApiKey");
    if (!openrouterApiKey || document.getElementById(buttons[0].id)) {
      return;
    }

    let indicatorTimeout;
    function showIndicator(text, duration = 0) {
      window.clearTimeout(indicatorTimeout);
      let indicator = document.getElementById("solvemangu-indicator");
      if (!indicator) {
        indicator = document.createElement("div");
        indicator.id = "solvemangu-indicator";
        document.documentElement.append(indicator);
      }
      indicator.textContent = text;
      if (duration) {
        indicatorTimeout = window.setTimeout(() => indicator.remove(), duration);
      }
    }

    for (const config of buttons) {
      const button = document.createElement("button");
      button.id = config.id;
      button.type = "button";
      button.className = "solvemangu-touch-zone";
      button.textContent = config.symbol;
      button.title = config.label;
      button.setAttribute("aria-label", config.label);
      button.addEventListener("click", async () => {
        showIndicator("...");
        try {
          const capture = await chrome.runtime.sendMessage({ type: "CAPTURE_VISIBLE_TAB" });
          if (capture?.error) {
            throw new Error(capture.error);
          }

          const worker = await Tesseract.createWorker("spa", 1, {
            workerPath: chrome.runtime.getURL("node_modules/tesseract.js/dist/worker.min.js"),
            corePath: chrome.runtime.getURL("node_modules/tesseract.js-core"),
            langPath: chrome.runtime.getURL("node_modules/@tesseract.js-data/spa/4.0.0"),
            gzip: true,
            workerBlobURL: false,
          });
          let ocrText = "";
          try {
            const recognition = await worker.recognize(capture.imageDataUrl);
            ocrText = recognition.data.text || "";
          } finally {
            await worker.terminate();
          }

          const result = await chrome.runtime.sendMessage({
            type: "SOLVE_OCR_CAPTURE",
            mode: config.mode,
            imageDataUrl: capture.imageDataUrl,
            ocrText,
          });
          if (result?.error) throw new Error(result.error);

          if (config.mode === "detailed") {
            await navigator.clipboard.writeText(result.answer);
            showIndicator("⬛", 400);
          } else {
            showIndicator(result.answer, 400);
          }
        } catch (error) {
          console.error("SolveMangu:", error);
          showIndicator("🔺", 1600);
        }
      });
      document.documentElement.append(button);
    }
  }

  initializeAssistant().catch(() => {});
})();