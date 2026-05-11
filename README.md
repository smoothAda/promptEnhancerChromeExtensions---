NOTE
This project runs locally as a Chrome extension. GitHub does not allow me to upload some parts of the codebase because the repository contains sensitive configuration data such as API-related information that is blocked by GitHub security rules.



# Prompt Enhancer (Groq) — Chrome Extension

Adds a floating **✨ Enhance prompt** button on ChatGPT and Google Gemini that
rewrites your draft prompt into a clearer, more detailed, structured version
using the free [Groq](https://groq.com) API.

## Features

- Works on:
  - `https://chatgpt.com/*`
  - `https://chat.openai.com/*`
  - `https://gemini.google.com/*`
- Floating button isolated in Shadow DOM (host page CSS cannot break it).
- Detects both `<textarea>` and `contenteditable` inputs.
- Supports `llama-3.3-70b-versatile` (default) and `mixtral-8x7b-32768`.
- API key stored in `chrome.storage.sync`.
- Non-intrusive toast for empty prompts and errors.

## Folder structure

```
extension/
├── manifest.json     # MV3 manifest
├── background.js     # Service worker: calls Groq API
├── content.js        # Injects the Shadow DOM button + handles input
├── options.html      # Settings page
├── options.js        # Settings logic
├── icon.png          # 128x128 icon
└── README.md
```

## Install (developer mode)

1. Download / unzip this folder somewhere on disk.
2. Open Chrome (or any Chromium browser) and go to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `extension/` folder.
5. The options page opens automatically on first install — paste your Groq
   API key and click **Save**. You can reopen it anytime from
   `chrome://extensions` → Prompt Enhancer → **Details** → **Extension options**.

## Getting a Groq API key

1. Go to <https://console.groq.com/keys>.
2. Sign in and click **Create API Key**.
3. Copy the key (starts with `gsk_…`) and paste it into the extension options.

## Usage

1. Open <https://chatgpt.com> or <https://gemini.google.com>.
2. Start typing a prompt.
3. Click the floating **✨ Enhance prompt** button.
4. Your draft is replaced by an improved version.

## How it works

- `content.js` watches the page with a `MutationObserver`, locates the prompt
  input, and mounts a Shadow-DOM-hosted button.
- On click, it sends `{action: "enhancePrompt", prompt}` via
  `chrome.runtime.sendMessage` to the background service worker.
- `background.js` reads the API key from `chrome.storage.sync` and calls
  `https://api.groq.com/openai/v1/chat/completions` with this system prompt:

  > You are an expert prompt engineer. Rewrite the user's draft prompt into a
  > clearer, more detailed, structured, and effective version. Keep the
  > original language. Do not answer the prompt, only return the improved
  > version of the prompt. Be concise and precise.

- The improved text replaces the original input, dispatching an `input`
  event so the host site picks up the change.

## Troubleshooting

- **"No Groq API key set"** — Open the extension options and paste your key.
- **"Groq API error 401"** — The key is invalid or revoked; generate a new one.
- **Button doesn't appear** — Reload the tab; some pages mount the input late.
- **Nothing happens after click** — Open DevTools console; errors are logged
  with the `[PromptEnhancer]` prefix.

## Privacy

Your draft prompts are sent only to `api.groq.com`. Nothing is stored on any
server by this extension; the API key lives in your browser's sync storage.
