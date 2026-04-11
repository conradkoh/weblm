# WebLM Product Milestones

This document outlines the development roadmap for WebLM, a local-first browser AI chat application powered by Gemma 4 and WebLLM. Each milestone follows [Semantic Versioning](https://semver.org/) for 0.x releases, indicating development-phase changes.

---

## User Priority Requirements

These are the top user priorities that must be addressed prominently:

1. **Text Content Upload** — Users can upload text files (`.txt`, `.md`, `.csv`, `.json`) to be processed locally by the model. The AI can summarize, analyze, or transform uploaded content without the data leaving the browser.

2. **Persistent Model Caching** — Model weights are cached in IndexedDB so users don't need to re-download on each session. Includes one-click download of recommended models and ability to load models from local disk.

---

## Milestones

### 0.1.0 — Foundation ✅
*Codename: "Groundwork"*

**Summary:** Establish the minimal infrastructure for local development with proper browser headers and basic rendering.

**Requirements:**
- [x] WebGPU capability detection with clear user messaging when unsupported
- [x] Development server with COOP/COEP headers configured (required for `SharedArrayBuffer`)
- [x] Basic HTML shell renders successfully in supported browsers
- [x] TypeScript compilation and type checking passes with zero errors
- [x] Build produces a single distributable HTML file

**Acceptance Criteria:**
- Visiting the dev server URL shows a page with "WebGPU Available" or "WebGPU Not Available" message
- `bun run dev` starts development server successfully
- `bun run build` produces `dist/index.html` containing all assets inline
- Unsupported browsers see a clear explanation message

**Dependencies:** None — this is the starting point.

**✅ Completed: 2025-04-11 UTC**

---

### 0.2.0 — Model Loading ✅
*Codename: "Bootstrap"*

**Summary:** Enable model download with progress feedback and persistent caching so users only download once.

**Requirements:**
- [x] One-click download of recommended Gemma 4 model (E2B variant)
- [x] Download progress bar showing percentage, bytes downloaded, and ETA
- [x] Model weights cached in IndexedDB for persistence across sessions
- [x] "Model Ready" status indicator when model is loaded
- [x] Error handling for failed/interrupted downloads with retry and resume support
- [x] Storage quota detection before download to prevent OOM
- [x] Clear feedback when storage is insufficient

**Acceptance Criteria:**
- Clicking "Download Model" initiates download with visible progress
- Closing and reopening the browser shows "Model Ready" immediately (no re-download)
- Interrupted downloads can be resumed
- Users see clear error messages if they lack storage space
- Estimated download size shown before starting
- Subsequent app loads show TTFT < 500ms when model is cached

**Dependencies:** 0.1.0 — requires foundation infrastructure

**✅ Completed: 2025-04-11 UTC**

---

### 0.3.0 — Basic Chat ✅
*Codename: "Conversation"*

**Summary:** Implement core chat functionality with real-time streaming responses.

**Requirements:**
- [x] Text input area with send button
- [x] User messages display in chat window
- [x] Model generates responses with token-by-token streaming
- [x] Auto-scroll to keep latest messages visible during generation
- [x] Basic in-memory message history (resets on page reload)
- [x] Stop generation button during streaming
- [x] Generation state indicator (typing, ready, error)

**Acceptance Criteria:**
- User can type a message and press Enter or click Send
- Messages appear in chronological order
- Model response streams character-by-character in real-time
- Clicking "Stop" halts generation immediately
- No flickering or layout shifts during streaming
- Previous messages remain visible during new generation

**Dependencies:** 0.2.0 — requires loaded model

**✅ Completed: 2025-04-11 UTC**

---

### 0.4.0 — Text Content Upload ✅
*Codename: "Context"*

**Summary:** Allow users to upload text content for local AI processing, addressing priority requirement #1.

**Requirements:**
- [x] File upload button with drag-and-drop support
- [x] File picker for selecting files from disk
- [x] Supported formats: `.txt`, `.md`, `.csv`, `.json`
- [x] File size validation with clear limits (5MB max)
- [x] Uploaded text content injected into conversation context
- [x] User can ask questions about uploaded content
- [x] Visual indication when file is loaded and ready
- [x] Clear uploaded file option to start fresh

**Acceptance Criteria:**
- Dragging a `.txt` file onto the chat shows a drop zone
- Selecting a file via picker uploads it successfully
- Uploading a 10MB file shows a clear "file too large" error
- User can ask "Summarize this file" and receive a relevant response
- Content from uploaded file is included in model context
- File name and size displayed after successful upload
- User can remove uploaded file and context is cleared

**Dependencies:** 0.3.0 — requires working chat

**✅ Completed: 2025-04-11 UTC**

---

### 0.5.0 — Model Management ✅
*Codename: "Control"*

**Summary:** Provide model selection, storage management, and advanced loading options, addressing priority requirement #2.

**Requirements:**
- [x] Model selector UI to choose between E2B and E4B variants
- [x] Memory/VRAM detection to recommend appropriate model
- [x] "Clear Model" button to free storage space
- [x] Storage usage display (e.g., "2.1 GB used of 4 GB cached")
- [ ] Load model from local file system (advanced users) — deferred
- [x] Switch between models without full page reload
- [x] Model metadata display (name, size, quantization level)
- [x] Confirmation dialog before clearing cached model

**Acceptance Criteria:**
- Settings panel shows "Gemma 2 2B" and "Gemma 2 9B" options
- On low-memory devices (<4GB available), smaller model is recommended
- "Clear Model" shows confirmation before deleting cached data
- Storage usage updates after model download/clear
- Switching models shows loading indicator

**Dependencies:** 0.2.0 — requires model caching infrastructure

**Note:** Local file model loading was deferred as WebLLM's prebuilt config expects model IDs from HuggingFace repos. A note was added that this feature is "coming soon."

**✅ Completed: 2025-04-11 UTC**

---

### 0.6.0 — Chat UX Polish ✅
*Codename: "Refine"*

**Summary:** Improve the chat experience with rich formatting and history persistence.

**Requirements:**
- [x] Markdown rendering in responses (headers, lists, bold, italic)
- [x] Code syntax highlighting for code blocks
- [x] Copy message button for each message
- [x] Copy code block button with one-click copy
- [x] Chat history persistence in IndexedDB
- [x] Clear chat / new conversation button
- [x] Message timestamps (relative: "2 minutes ago")
- [ ] Scroll position preserved across sessions — deferred

**Acceptance Criteria:**
- Claude responses with `# Heading` render as actual headings
- Code blocks have syntax highlighting based on language tag
- Clicking copy button shows "Copied!" feedback briefly
- Chat history persists after browser restart
- "New Chat" clears messages but keeps model loaded
- Timestamps update correctly (e.g., "Just now" → "5m ago")

**Dependencies:** 0.3.0 — requires basic chat

**Note:** Scroll position preservation was deferred to keep scope manageable. Can be added in a future update if requested.

**✅ Completed: 2026-04-11 UTC**

---

### 0.7.0 — Offline & PWA ✅
*Codename: "Standalone"*

**Summary:** Enable full offline capability and installable PWA experience.

**Requirements:**
- [x] Service worker for offline page serving
- [x] "Offline Ready" indicator when all assets cached
- [x] PWA manifest for home screen installation
- [ ] Install prompt for desktop/mobile — deferred (native PWA install prompts)
- [x] Graceful degradation when WebGPU unavailable:
  - Show clear error explaining browser limitations
  - Provide fallback suggestions (different browser, check GPU)
- [x] Offline notification when user loses connection
- [ ] Background sync for any pending state — deferred (not critical for 1.0)

**Acceptance Criteria:**
- After first load, app works 100% offline
- Installing PWA creates desktop/home screen icon
- Opening installed PWA shows no browser chrome
- Non-WebGPU browsers see helpful error with suggestions
- Connectivity status indicated in UI
- No network requests after initial model download

**Dependencies:** 0.2.0 — requires model caching

**Note:** Native install prompts deferred as browsers handle this automatically for PWAs. Background sync deferred as it's not critical for 1.0.

**✅ Completed: 2026-04-11 UTC**

---

### 0.8.0 — Settings & Customization ✅
*Codename: "Preferences"*

**Summary:** Allow users to customize behavior and appearance.

**Requirements:**
- [x] Temperature slider (0.0 – 2.0, default 0.7)
- [x] Max tokens slider (16 – 4096, default 2048)
- [x] Top-p sampling control (0.0 – 1.0, default 0.95)
- [x] System prompt textarea for custom instructions
- [x] Theme toggle: light / dark / system
- [x] Export chat as plain text (`.txt`)
- [x] Export chat as Markdown (`.md`)
- [x] Reset all settings to defaults
- [x] Settings persist in localStorage

**Acceptance Criteria:**
- Temperature changes affect generation creativity
- System prompt is prepended to all conversations
- Theme change applies immediately without reload
- Exported `.md` file renders correctly in Markdown viewers
- "Reset to Defaults" clears all customizations
- Settings persist across browser sessions

**Dependencies:** 0.3.0 — requires chat infrastructure

**Note:** Settings are stored in localStorage (small key-value pairs) rather than IndexedDB for simplicity.

**✅ Completed: 2026-04-11 UTC**

---

### 0.9.0 — Performance & Reliability
*Codename: "Hardened"*

**Summary:** Optimize performance and handle edge cases robustly.

**Requirements:**
- [ ] TTFT < 500ms on subsequent loads (with cached model)
- [ ] Token throughput > 20 t/s on integrated GPUs (Apple M-series, Intel Iris Xe)
- [ ] Memory leak prevention (stable heap across long sessions)
- [ ] Error recovery from model crash (auto-restart with message)
- [ ] OOM handling with clear user guidance
- [ ] Loading state management (no flash of unstyled content)
- [ ] Responsive generation (UI doesn't freeze during inference)
- [ ] Performance metrics display (optional debug mode)

**Acceptance Criteria:**
- Measured TTFT under 500ms on MacBook Air M1 with cached E2B
- Token generation rate displayed and >20 t/s on reference hardware
- 1-hour continuous use shows stable memory profile
- Model crash shows "Something went wrong. Restarting..." and recovers
- Low memory warning shows "Close other tabs or try E2B model"
- First paint happens within 100ms of page load
- UI remains responsive during stream generation

**Dependencies:** 0.3.0 — requires chat streaming

---

### 1.0.0 — Production Ready
*Codename: "Stable"*

**Summary:** Finalize all features for public release with comprehensive testing and documentation.

**Requirements:**
- [ ] All features from 0.1.0 – 0.9.0 stable and tested
- [ ] Cross-browser testing:
  - Chrome 121+ (primary): full functionality
  - Edge 121+: full functionality
  - Safari 18+: full functionality
  - Firefox: documented limitations (WebGPU status)
- [ ] Accessibility basics:
  - Keyboard navigation for all interactive elements
  - Screen reader compatible message display
  - Focus management during streaming
  - Color contrast ratio ≥4.5:1
- [ ] Responsive design:
  - Mobile viewport support (375px minimum)
  - Touch-friendly input (larger hit targets)
  - Responsive chat layout
- [ ] Documentation complete:
  - README with installation, usage, troubleshooting
  - DEVELOPMENT.md for contributors
  - Architecture diagram
- [ ] No console errors in normal usage
- [ ] Full offline capability verified

**Acceptance Criteria:**
- Fresh clone → `bun install` → `bun run dev` works first try
- Build produces working `dist/index.html` with all features
- All acceptance criteria from previous milestones pass
- Accessibility audit passes automated checks
- Mobile device testing shows usable interface
- Zero console warnings/errors in production build
- All documentation is accurate and up-to-date

**Dependencies:** 0.9.0 — all previous milestones complete

---

## Non-Goals for 1.0

The following features are explicitly out of scope for the 1.0 release:

- **Multi-modal input/output** — Image, audio, or video processing is not supported
- **Fine-tuning in browser** — Users cannot customize model weights
- **Multi-user / collaboration** — No shared chats or sync between devices
- **Cloud fallback** — No server-side inference; WebGPU required
- **Multiple models simultaneously** — Only one model loaded at a time
- **ChatGPT-compatible API** — No OpenAI API compatibility layer
- **Voice input/output** — No speech recognition or TTS
- **Plugin system** — No extensibility mechanism
- **User accounts** — No authentication or cloud storage

These may be considered for future versions based on user feedback.

---

## Technical Assumptions

This roadmap assumes the following technical constraints:

### Browser Requirements
- **WebGPU support** — Required for inference; no fallback path
- **SharedArrayBuffer** — Requires COOP/COEP headers for multi-threading
- **IndexedDB** — Large object storage for model weights (2-4GB)
- **Modern JavaScript** — ES2020+ features including workers, modules

### Target Hardware
- **Minimum**: 4GB RAM, any GPU with WebGPU support
- **Recommended**: 8GB+ RAM, discrete GPU or Apple M-series
- **Browser**: Chrome 121+, Edge 121+, Safari 18+ (WebGPU enabled)

### Model Constraints
- **Gemma 4 E2B** — 4-bit quantized, ~2GB download, ~3GB RAM to run
- **Gemma 4 E4B** — 4-bit quantized, ~4GB download, ~5GB RAM to run
- **No fine-tuning** — Model weights are immutable in browser

### Storage
- **IndexedDB** — For model weights and chat history
- **LocalStorage** — For user preferences (theme, settings)
- **No server storage** — All data stays on user's device

### Performance Targets
- **TTFT (Time to First Token)**: < 500ms after model loaded
- **Token throughput**: > 20 tokens/sec on reference hardware
- **Cold start**: Initial model download is the only slow operation

---

## Release Cadence

| Version | Target | Focus Area |
|---------|--------|------------|
| 0.1.0 | Week 1 | Foundation, dev tooling |
| 0.2.0 | Week 2-3 | Model download & caching |
| 0.3.0 | Week 4-5 | Basic chat functionality |
| 0.4.0 | Week 6-7 | Text upload (priority feature) |
| 0.5.0 | Week 8-9 | Model management (priority feature) |
| 0.6.0 | Week 10-11 | UX polish |
| 0.7.0 | Week 12-13 | PWA & offline |
| 0.8.0 | Week 14-15 | Settings & customization |
| 0.9.0 | Week 16-17 | Performance optimization |
| 1.0.0 | Week 18-20 | Final testing & release |

*Timeline is approximate and subject to adjustment based on development velocity.*

---

## Success Metrics

The 1.0 release will be considered successful when:

- [ ] A user can open the HTML file and have a complete conversation without network
- [ ] Model download is a one-time operation with clear progress feedback
- [ ] Text files can be uploaded and analyzed locally
- [ ] The app works offline with no degradation in functionality
- [ ] Performance meets targets on reference hardware
- [ ] All major browsers with WebGPU support work correctly
- [ ] No user data leaves the browser under any circumstances