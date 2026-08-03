(function protectPreview() {
  "use strict";

  const SESSION_KEY = "fundf:preview-access:v1";
  const PASSWORD_HASH = "a3872115e770a4270be939baaf38735c5a50ffccdce1bbc33663d129df88476d";

  function hasAccess() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === PASSWORD_HASH;
    } catch {
      return false;
    }
  }

  function rememberAccess() {
    try {
      sessionStorage.setItem(SESSION_KEY, PASSWORD_HASH);
    } catch {
      // Access remains active for the current page if session storage is blocked.
    }
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function fallbackSha256(message) {
    const constants = new Uint32Array([
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ]);
    const state = new Uint32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ]);
    const bytes = new TextEncoder().encode(message);
    const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
    const padded = new Uint8Array(paddedLength);
    padded.set(bytes);
    padded[bytes.length] = 0x80;

    const view = new DataView(padded.buffer);
    const bitLength = bytes.length * 8;
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
    view.setUint32(paddedLength - 4, bitLength >>> 0);

    const rotateRight = (value, amount) =>
      (value >>> amount) | (value << (32 - amount));

    for (let offset = 0; offset < paddedLength; offset += 64) {
      const words = new Uint32Array(64);
      for (let index = 0; index < 16; index += 1) {
        words[index] = view.getUint32(offset + index * 4);
      }
      for (let index = 16; index < 64; index += 1) {
        const sigma0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
        const sigma1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
        words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
      }

      let [a, b, c, d, e, f, g, h] = state;
      for (let index = 0; index < 64; index += 1) {
        const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
        const choice = (e & f) ^ (~e & g);
        const temp1 = (h + sum1 + choice + constants[index] + words[index]) >>> 0;
        const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
        const majority = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (sum0 + majority) >>> 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }

      state[0] = (state[0] + a) >>> 0;
      state[1] = (state[1] + b) >>> 0;
      state[2] = (state[2] + c) >>> 0;
      state[3] = (state[3] + d) >>> 0;
      state[4] = (state[4] + e) >>> 0;
      state[5] = (state[5] + f) >>> 0;
      state[6] = (state[6] + g) >>> 0;
      state[7] = (state[7] + h) >>> 0;
    }

    return Array.from(state, (word) => word.toString(16).padStart(8, "0")).join("");
  }

  async function hashPassword(password) {
    if (window.crypto?.subtle) {
      const bytes = new TextEncoder().encode(password);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0")
      ).join("");
    }

    return fallbackSha256(password);
  }

  function unlock(gate) {
    rememberAccess();
    document.documentElement.classList.remove("preview-locked");
    document.documentElement.classList.add("preview-authorized");
    gate.remove();
    document.querySelector(".skip-link")?.focus();
  }

  function mountGate() {
    if (hasAccess()) {
      document.documentElement.classList.remove("preview-locked");
      document.documentElement.classList.add("preview-authorized");
      return;
    }

    const gate = createElement("div", "preview-gate");
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-modal", "true");
    gate.setAttribute("aria-labelledby", "preview-gate-title");
    gate.setAttribute("aria-describedby", "preview-gate-description");

    const grid = createElement("div", "preview-gate__grid");
    grid.setAttribute("aria-hidden", "true");

    const panel = createElement("div", "preview-gate__panel");
    const brand = createElement("div", "preview-gate__brand");
    brand.append(
      createElement("span", "preview-gate__mark", "F&F"),
      createElement("span", "preview-gate__brand-name", "Fliese & Fuge")
    );

    const label = createElement("p", "preview-gate__label", "Geschützte Vorschau");
    const title = createElement("h1", "", "Diese Seite ist noch im Aufbau.");
    title.id = "preview-gate-title";
    const description = createElement(
      "p",
      "preview-gate__description",
      "Bitte geben Sie das Vorschau-Passwort ein, um den aktuellen Entwurf anzusehen."
    );
    description.id = "preview-gate-description";

    const form = createElement("form", "preview-gate__form");
    const labelElement = createElement("label", "", "Vorschau-Passwort");
    labelElement.htmlFor = "preview-password";
    const input = createElement("input");
    input.id = "preview-password";
    input.name = "password";
    input.type = "password";
    input.autocomplete = "current-password";
    input.required = true;
    input.spellcheck = false;

    const status = createElement("p", "preview-gate__status", "");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    const button = createElement("button", "preview-gate__button", "Vorschau öffnen");
    button.type = "submit";

    form.append(labelElement, input, status, button);
    panel.append(brand, label, title, description, form);
    gate.append(grid, panel);
    document.body.prepend(gate);
    input.focus();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!input.value) {
        status.textContent = "Bitte geben Sie das Passwort ein.";
        input.focus();
        return;
      }

      button.disabled = true;
      button.textContent = "Wird geprüft …";
      status.textContent = "";

      try {
        const candidateHash = await hashPassword(input.value);
        if (candidateHash === PASSWORD_HASH) {
          unlock(gate);
          return;
        }

        status.textContent = "Das Passwort ist nicht korrekt.";
        input.value = "";
        input.focus();
      } catch {
        status.textContent = "Die Passwortprüfung ist fehlgeschlagen. Bitte versuchen Sie es erneut.";
      } finally {
        button.disabled = false;
        button.textContent = "Vorschau öffnen";
      }
    });
  }

  if (hasAccess()) {
    document.documentElement.classList.remove("preview-locked");
    document.documentElement.classList.add("preview-authorized");
  } else {
    document.documentElement.classList.add("preview-locked");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountGate, { once: true });
  } else {
    mountGate();
  }
})();
