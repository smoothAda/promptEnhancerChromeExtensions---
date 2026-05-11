
(() => {
  const HOST_ID = "prompt-enhancer-host";
  const SELECTORS = [
    // ChatGPT
    'textarea[data-testid="prompt-textarea"]',
    'div#prompt-textarea[contenteditable="true"]',
    'form textarea',
    // Gemini
    'div.ql-editor[contenteditable="true"]',
    'rich-textarea div[contenteditable="true"]',
    // Claude
    'div[contenteditable="true"].ProseMirror',
    'div[contenteditable="true"][data-placeholder]',
    // Perplexity
    'textarea[placeholder*="Ask"]',
    'textarea[data-testid="search-input"]',
    // Copilot (Microsoft)
    'textarea[id="searchbox"]',
    'cib-text-input textarea',
    // DeepSeek
    'textarea#chat-input',
    // Poe
    'textarea[class*="GrowingTextArea"]',
    // HuggingChat
    'textarea[name="text-input"]',
    // Mistral
    'textarea[placeholder*="message" i]',
    'textarea[placeholder*="Ask" i]',
    // Grok
    'textarea[data-testid="tweetTextarea_0"]',
    'div[data-testid="tweetTextarea_0"][contenteditable="true"]',
    // You.com
    'textarea[data-testid="youchat-input"]',
    // Generic fallback (last resort)
    'textarea[placeholder*="message" i]',
  ];

  // Submit / send button selectors for all supported sites
  const SUBMIT_SELECTORS = [
    // ChatGPT
    'button[data-testid="send-button"]',
    'button[aria-label="Send prompt"]',
    // Gemini
    'button[aria-label="Send message"]',
    'button[jsname="Qx7uuf"]',
    'button.send-button',
    // Claude
    'button[aria-label="Send Message"]',
    'button[data-testid="send-message-button"]',
    // Perplexity
    'button[aria-label="Submit"]',
    'button[type="submit"]',
    // Copilot
    'button[aria-label="Send"]',
    'cib-chat-send-button button',
    // DeepSeek
    'div[role="button"][aria-label="Send"]',
    // Poe
    'button[class*="SendButton"]',
    // HuggingChat
    'button[type="submit"]',
    // Mistral / You.com / Grok generic
    'button[aria-label*="send" i]',
    'button[aria-label*="Send" i]',
  ];

  /** Find the currently visible prompt input on the page. */
  function findInput() {
    for (const sel of SELECTORS) {
      const nodes = document.querySelectorAll(sel);
      for (const el of nodes) {
        if (el.offsetParent !== null || el.getClientRects().length > 0) {
          return el;
        }
      }
    }
    return null;
  }

  /** Find the visible submit / send button on the page. */
  function findSubmitButton() {
    for (const sel of SUBMIT_SELECTORS) {
      const nodes = document.querySelectorAll(sel);
      for (const el of nodes) {
        if (el.offsetParent !== null || el.getClientRects().length > 0) {
          return el;
        }
      }
    }
    return null;
  }

  /** Read text from a textarea or contenteditable element. */
  function readValue(el) {
    if (!el) return "";
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return el.value;
    return el.innerText || el.textContent || "";
  }

  /** Replace text in a textarea or contenteditable and fire an input event. */
  function writeValue(el, text) {
    if (!el) return;
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      if (setter) setter.call(el, text);
      else el.value = text;
    } else {
      // contenteditable
      el.focus();
      // Replace all content
      el.innerHTML = "";
      const p = document.createElement("p");
      p.textContent = text;
      el.appendChild(p);
    }
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /** Create the floating host with Shadow DOM and return refs. */
  function createHost() {
    const host = document.createElement("div");
    host.id = HOST_ID;
    Object.assign(host.style, {
      position: "fixed",
      zIndex: "2147483647",
      pointerEvents: "none",
    });
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host, * { box-sizing: border-box; }

      .wrap {
        pointer-events: auto;
        display: inline-flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      }

      /* ── Glow ring behind the button ── */
      .btn-wrap {
        position: relative;
        display: inline-flex;
      }
      .btn-wrap::before {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 9999px;
        background: linear-gradient(135deg, #a855f7, #7c3aed, #4f46e5);
        opacity: 0;
        filter: blur(8px);
        transition: opacity .25s ease;
        z-index: 0;
      }
      .btn-wrap:hover::before { opacity: 0.75; }

      button.enh {
        all: unset;
        position: relative;
        z-index: 1;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        background: linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6d28d9 100%);
        color: #fff;
        font-size: 12.5px;
        font-weight: 700;
        letter-spacing: 0.02em;
        line-height: 1;
        padding: 9px 16px;
        border-radius: 9999px;
        box-shadow:
          0 0 0 1px rgba(168,85,247,0.4),
          0 4px 16px rgba(109,40,217,0.5),
          0 1px 3px rgba(0,0,0,0.3);
        user-select: none;
        overflow: hidden;
        transition: transform .1s ease, box-shadow .2s ease, opacity .15s ease;
      }

      /* shimmer sweep */
      button.enh::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(105deg,
          transparent 40%,
          rgba(255,255,255,0.18) 50%,
          transparent 60%);
        background-size: 200% 100%;
        background-position: 200% 0;
        animation: shimmer 3s ease infinite;
        border-radius: inherit;
      }
      @keyframes shimmer {
        0%   { background-position: 200% 0; }
        50%  { background-position: -200% 0; }
        100% { background-position: -200% 0; }
      }

      button.enh:hover {
        transform: translateY(-2px);
        box-shadow:
          0 0 0 1px rgba(168,85,247,0.6),
          0 6px 22px rgba(109,40,217,0.65),
          0 2px 6px rgba(0,0,0,0.3);
      }
      button.enh:active { transform: translateY(0); }
      button.enh[disabled] { opacity: 0.65; cursor: progress; }
      button.enh[disabled]::after { animation: none; }

      .icon { font-size: 14px; line-height: 1; }

      /* ── Spinner ── */
      .spinner {
        width: 13px; height: 13px; border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.35);
        border-top-color: #fff;
        animation: spin .75s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* ── Toast ── */
      .toast {
        max-width: 300px;
        background: #1e1b4b;
        border: 1px solid rgba(167,139,250,0.25);
        color: #e9d5ff;
        font-size: 12px;
        font-weight: 500;
        padding: 9px 12px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(109,40,217,0.3);
        opacity: 0;
        transform: translateY(6px);
        transition: opacity .18s ease, transform .18s ease;
      }
      .toast.show { opacity: 1; transform: translateY(0); }
      .toast.error { background: #450a0a; border-color: rgba(239,68,68,0.35); color: #fca5a5; }
    `;
    shadow.appendChild(style);

    const wrap = document.createElement("div");
    wrap.className = "wrap";

    const toast = document.createElement("div");
    toast.className = "toast";

    const btnWrap = document.createElement("div");
    btnWrap.className = "btn-wrap";

    const btn = document.createElement("button");
    btn.className = "enh";
    btn.type = "button";
    btn.innerHTML = `<span class="icon">✨</span><span class="label">Enhance prompt</span>`;

    btnWrap.appendChild(btn);
    wrap.appendChild(toast);
    wrap.appendChild(btnWrap);
    shadow.appendChild(wrap);

    document.documentElement.appendChild(host);
    return { host, shadow, btn, btnWrap, toast };
  }

  function showToast(toast, message, isError = false) {
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove("show"), 3500);
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    if (loading) {
      btn.innerHTML = `<span class="spinner"></span><span class="label">Enhancing…</span>`;
    } else {
      btn.innerHTML = `<span class="icon">✨</span><span class="label">Enhance prompt</span>`;
    }
  }


  /** Position the host immediately to the left of the submit button (or fall back to right of textarea). */
  function positionHost(host, input) {
    const submitBtn = findSubmitButton();

    // Prefer anchoring next to the submit button
    const anchor = submitBtn || null;
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      if (r.width && r.height) {
        host.style.display = "block";
        // Place our button just to the LEFT of the submit button, vertically centred
        const top = r.top + r.height / 2 - 18;
        const left = r.left - 150; // 150px ≈ button width + 8px gap
        host.style.top   = `${Math.max(8, top)}px`;
        host.style.left  = `${Math.max(8, left)}px`;
        host.style.right = "auto";
        return;
      }
    }

    // Fallback: right of the textarea
    const rect = input.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      host.style.display = "none";
      return;
    }
    host.style.display = "block";
    const top  = rect.top + rect.height / 2 - 18;
    const left = rect.right + 8;
    host.style.top   = `${Math.max(8, top)}px`;
    host.style.left  = `${left}px`;
    host.style.right = "auto";
  }

  async function handleClick(input, btn, toast) {
    const current = readValue(input).trim();
    if (!current) {
      showToast(toast, "Please type a prompt first.");
      return;
    }
    setLoading(btn, true);
    try {
      const res = await chrome.runtime.sendMessage({
        action: "enhancePrompt",
        prompt: current,
      });
      if (!res?.ok) {
        showToast(toast, res?.error || "Enhancement failed – check API key.", true);
      } else {
        writeValue(input, res.improvedPrompt);
        showToast(toast, "Prompt enhanced ✨");
      }
    } catch (err) {
      console.warn("[PromptEnhancer]", err);
      showToast(toast, "Enhancement failed – check API key.", true);
    } finally {
      setLoading(btn, false);
    }
  }

  // ----- bootstrap -----

  let refs = null;
  let currentInput = null;

  function attach() {
    const input = findInput();
    if (!input) {
      if (refs) refs.host.style.display = "none";
      currentInput = null;
      return;
    }
    if (!refs) {
      refs = createHost();
      refs.btn.addEventListener("click", () => {
        if (currentInput) handleClick(currentInput, refs.btn, refs.toast);
      });
    }
    currentInput = input;
    positionHost(refs.host, input);
  }

  const observer = new MutationObserver(() => attach());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("resize", () => {
    if (refs && currentInput) positionHost(refs.host, currentInput);
  });
  window.addEventListener("scroll", () => {
    if (refs && currentInput) positionHost(refs.host, currentInput);
  }, true);

  // initial pass
  attach();
})();