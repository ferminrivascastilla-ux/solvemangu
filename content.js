(async () => {
  const buttons = [
    { id: "solvemangu-left", mode: "detailed", label: "Resolver ejercicio y copiar respuesta", symbol: "L" },
    { id: "solvemangu-right", mode: "quick", label: "Mostrar respuesta rápida tipo test", symbol: "R" },
  ];
  let operationInProgress = false;

  async function initializeAssistant() {
    const { buttonVisibility } = await chrome.storage.local.get("buttonVisibility");

    function applyButtonVisibility(visibility) {
      const selectedVisibility = ["off", "invisible", "camouflaged", "visible"].includes(visibility)
        ? visibility
        : "invisible";
      buttons.forEach(({ id }) => {
        const button = document.getElementById(id);
        if (button) {
          button.dataset.visibility = selectedVisibility;
          button.hidden = selectedVisibility === "off";
        }
      });
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
      let button = document.getElementById(config.id);
      if (!button) {
        button = document.createElement("button");
        button.id = config.id;
        button.type = "button";
        button.className = "solvemangu-touch-zone";
        button.textContent = config.symbol;
        button.title = config.label;
        button.setAttribute("aria-label", config.label);
        button.addEventListener("click", async () => {
          if (operationInProgress) {
            return;
          }

          operationInProgress = true;
          showIndicator("...");
          try {
            const capture = await chrome.runtime.sendMessage({ type: "CAPTURE_VISIBLE_TAB" });
            if (capture?.error) {
              throw new Error(capture.error);
            }

            let ocrText = "";
            let worker;
            try {
              worker = await Tesseract.createWorker("spa", 1, {
                workerPath: chrome.runtime.getURL("node_modules/tesseract.js/dist/worker.min.js"),
                corePath: chrome.runtime.getURL("node_modules/tesseract.js-core"),
                langPath: chrome.runtime.getURL("node_modules/@tesseract.js-data/spa/4.0.0"),
                gzip: true,
                workerBlobURL: false,
              });
              const recognition = await worker.recognize(capture.imageDataUrl);
              ocrText = recognition.data.text || "";
            } catch (error) {
              console.warn("SolveMangu: OCR local no disponible; se enviará la captura para analizarla.", error);
            } finally {
              if (worker) {
                try {
                  await worker.terminate();
                } catch (error) {
                  console.warn("SolveMangu: no se pudo cerrar el trabajador OCR.", error);
                }
              }
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
          } finally {
            operationInProgress = false;
          }
        });
        document.documentElement.append(button);
      }
    }

    applyButtonVisibility(buttonVisibility);
    if (!window.__solveManguVisibilityListenerAdded) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local" && changes.buttonVisibility) {
          applyButtonVisibility(changes.buttonVisibility.newValue);
        }
      });
      window.__solveManguVisibilityListenerAdded = true;
    }
  }

  initializeAssistant().catch((error) => console.error("SolveMangu: no se pudieron crear o actualizar los botones laterales.", error));
})();