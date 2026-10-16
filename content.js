(async () => {
  const buttons = [
    { id: "nvidia-assistant-left", mode: "detailed", label: "Resolver ejercicio y copiar respuesta", symbol: "L" },
    { id: "nvidia-assistant-right", mode: "quick", label: "Mostrar respuesta rápida tipo test", symbol: "R" },
  ];

  async function initializeAssistant() {
    const { nvidiaApiKey } = await chrome.storage.local.get("nvidiaApiKey");
    if (!nvidiaApiKey || document.getElementById(buttons[0].id)) {
      return;
    }

    function showResult(text, quick) {
      document.getElementById("nvidia-assistant-result")?.remove();
      const result = document.createElement("div");
      result.id = "nvidia-assistant-result";
      result.textContent = text;
      result.className = quick ? "nvidia-assistant-result-quick" : "nvidia-assistant-result-detail";
      document.documentElement.append(result);
      window.setTimeout(() => result.remove(), quick ? 400 : 2200);
    }

    for (const config of buttons) {
      const button = document.createElement("button");
      button.id = config.id;
      button.type = "button";
      button.className = "nvidia-assistant-button";
      button.textContent = config.symbol;
      button.title = config.label;
      button.setAttribute("aria-label", config.label);
      button.addEventListener("click", async () => {
        button.disabled = true;
        button.classList.add("nvidia-assistant-working");
        showResult("…", config.mode === "quick");
        try {
          const result = await chrome.runtime.sendMessage({ type: "SOLVE_VISIBLE_TAB", mode: config.mode });
          if (result?.error) {
            throw new Error(result.error);
          }
          if (config.mode === "detailed") {
            await navigator.clipboard.writeText(result.answer);
            showResult("Respuesta copiada", false);
          } else {
            showResult(result.answer, true);
          }
        } catch (error) {
          showResult(error.message || "No se pudo analizar la pantalla", false);
        } finally {
          button.disabled = false;
          button.classList.remove("nvidia-assistant-working");
        }
      });
      document.documentElement.append(button);
    }
  }

  initializeAssistant().catch(() => {});
})();