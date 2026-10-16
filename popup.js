document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const keyForm = document.getElementById("keyForm");
  const keyLabel = document.getElementById("keyLabel");
  const saveButton = document.getElementById("saveKey");
  const activeKey = document.getElementById("activeKey");
  const deleteButton = document.getElementById("deleteKey");
  const message = document.getElementById("message");
  const historyContainer = document.getElementById("history");
  const logoMenuButton = document.getElementById("logoMenuButton");
  const buttonVisibility = document.getElementById("buttonVisibility");
  const visibilityOptions = document.getElementById("visibilityOptions");
  const visibilityValues = ["off", "camouflaged", "visible"];

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
  }

  function renderHistory(entries = []) {
    historyContainer.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "Todavía no hay consultas guardadas.";
      historyContainer.append(empty);
      return;
    }

    entries.forEach((entry) => {
      const details = document.createElement("details");
      details.className = "entry";
      const summary = document.createElement("summary");
      summary.textContent = entry.mode === "quick" ? "Respuesta rápida tipo test" : "Resolución detallada";
      const time = document.createElement("time");
      time.dateTime = new Date(entry.createdAt).toISOString();
      time.textContent = new Date(entry.createdAt).toLocaleString();
      summary.append(time);
      details.append(summary);

      const prompt = document.createElement("p");
      prompt.className = "prompt";
      prompt.textContent = entry.prompt;
      details.append(prompt);

      if (entry.imageDataUrl) {
        const image = document.createElement("img");
        image.src = entry.imageDataUrl;
        image.alt = "Captura analizada";
        image.loading = "lazy";
        details.append(image);
      }

      const answer = document.createElement("p");
      answer.className = "answer";
      answer.textContent = entry.answer;
      details.append(answer);
      historyContainer.append(details);
    });
  }

  async function refresh() {
    const { openrouterApiKey, queryHistory = [], buttonVisibility: savedVisibility } = await chrome.storage.local.get([
      "openrouterApiKey",
      "queryHistory",
      "buttonVisibility",
    ]);
    const selectedVisibility = visibilityValues.includes(savedVisibility) ? savedVisibility : "camouflaged";
    const configured = Boolean(openrouterApiKey);
    activeKey.hidden = !configured;
    keyForm.hidden = false;
    keyLabel.textContent = configured ? "Cambiar API Key de OpenRouter" : "Configura tu API Key de OpenRouter";
    apiKeyInput.required = !configured;
    apiKeyInput.value = "";
    apiKeyInput.placeholder = configured ? "Dejar vacío para mantenerla" : "sk-or-v1-...";
    saveButton.textContent = configured ? "Actualizar clave" : "Guardar clave";
    visibilityOptions.querySelectorAll('input[name="buttonVisibility"]').forEach((input) => {
      input.checked = input.value === selectedVisibility;
    });
    renderHistory(queryHistory);
  }

  logoMenuButton.addEventListener("click", () => {
    buttonVisibility.hidden = !buttonVisibility.hidden;
    logoMenuButton.setAttribute("aria-expanded", String(!buttonVisibility.hidden));
  });

  visibilityOptions.addEventListener("change", async (event) => {
    const selectedVisibility = event.target.value;
    if (!visibilityValues.includes(selectedVisibility)) {
      return;
    }

    visibilityOptions.querySelectorAll("input").forEach((input) => {
      input.disabled = true;
    });
    try {
      await chrome.storage.local.set({ buttonVisibility: selectedVisibility });
      showMessage("Visibilidad de los botones actualizada.");
    } catch (error) {
      showMessage(`No se pudo actualizar la visibilidad: ${error.message}`, true);
      await refresh();
    } finally {
      visibilityOptions.querySelectorAll("input").forEach((input) => {
        input.disabled = false;
      });
    }
  });

  keyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showMessage("Escribe una clave nueva para actualizarla.", true);
      return;
    }

    saveButton.disabled = true;
    try {
      await chrome.storage.local.set({ openrouterApiKey: apiKey });
      await chrome.runtime.sendMessage({ type: "KEY_UPDATED" });
      showMessage("Clave guardada. Los botones están activados en las páginas compatibles.");
      await refresh();
    } catch (error) {
      showMessage(`No se pudo guardar la clave: ${error.message}`, true);
    } finally {
      saveButton.disabled = false;
    }
  });

  deleteButton.addEventListener("click", async () => {
    deleteButton.disabled = true;
    try {
      await chrome.storage.local.remove("openrouterApiKey");
      await chrome.runtime.sendMessage({ type: "KEY_UPDATED" });
      showMessage("Clave eliminada y botones desactivados.");
      await refresh();
    } catch (error) {
      showMessage(`No se pudo eliminar la clave: ${error.message}`, true);
    } finally {
      deleteButton.disabled = false;
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.queryHistory) {
      renderHistory(changes.queryHistory.newValue || []);
    }
  });

  refresh().catch((error) => showMessage(`No se pudo cargar la extensión: ${error.message}`, true));
});
