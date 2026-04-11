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

### 0.3.0 — Basic Chat
*Codename: "Conversation"*

**Summary:** Implement core chat functionality with real-time streaming responses.

**Requirements:**
- [ ] Text input area with send button
- [ ] User messages display in chat window
- [ ] Model generates responses with token-by-token streaming
- [ ] Auto-scroll to keep latest messages visible during generation
- [ ] Basic in-memory message history (resets on page reload)
- [ ] Stop generation button during streaming
- [ ] Generation state indicator (typing, ready, error)

**Acceptance Criteria:**
- User can type a message and press Enter or click Send
- Messages appear in chronological order
- Model response streams character-by-character in real-time
- Clicking "Stop" halts generation immediately
- No flickering or layout shifts during streaming
- Previous messages remain visible during new generation

**Dependencies:** 0.2.0 — requires loaded model

---

### 0.4.0 — Text Content Upload
*Codename: "Context"*

**Summary:** Allow users to upload text content for local AI processing, addressing priority requirement #1.

**Requirements:**
- [ ] File upload button with drag-and-drop support
- [ ] File picker for selecting files from disk
- [ ] Supported formats: `.txt`, `.md`, `.csv`, `.json`
- [ ] File size validation with clear limits (e.g., 5MB max)
- [ ] Uploaded text content injected into conversation context
- [ ] User can ask questions about uploaded content
- [ ] Visual indication when file is loaded and ready
- [ ] Clear uploaded file option to start fresh

**Acceptance Criteria:**
- Dragging a `.txt` file onto the chat shows a drop zone
- Selecting a file via picker uploads it successfully
- Uploading a 10MB file shows a clear "file too large" error
- User can ask "Summarize this file" and receive a relevant response
- Content from uploaded file is included in model context
- File name and size displayed after successful upload
- User can remove uploaded file and context is cleared

**Dependencies:** 0.3.0 — requires working chat

---

### 0.5.0 — Model Management
*Codename: "Control"*

**Summary:** Provide model selection, storage management, and advanced loading options, addressing priority requirement #2.

**Requirements:**
- [ ] Model selector UI to choose between E2B and E4B variants
- [ ] Memory/VRAM detection to recommend appropriate model
- [ ] "Clear Model" button to free storage space
- [ ] Storage usage display (e.g., "2.1 GB used of 4 GB cached")
- [ ] Load model from local file system (advanced users)
- [ ] Switch between models without full page reload
- [ ] Model metadata display (name, size, quantization level)
- [ ] Confirmation dialog before clearing cached model

**Acceptance Criteria:**
- Settings panel shows "E2B (2GB)" and "E4B (4GB)" options
- On low-memory devices (<4GB available), E2B is recommended
- "Clear Model" shows confirmation before deleting cached data
- Loading local model file shows progress and success/error feedback
- Storage usage updates after model download/clear
- Switching models shows loading indicator

**Dependencies:** 0.2.0 — requires model caching infrastructure

---

### 0.6.0 — Chat UX Polish
*Codename: "Refine"*

**Summary:** Improve the chat experience with rich formatting and history persistence.

**Requirements:**
- [ ] Markdown rendering in responses (headers, lists, bold, italic)
- [ ] Code syntax highlighting for code blocks
- [ ] Copy message button for each message
- [ ] Copy code block button with one-click copy
- [ ] Chat history persistence in IndexedDB
- [ ] Clear chat / new conversation button
- [ ] Message timestamps (relative: "2 minutes ago")
- [ ] Scroll position preserved across sessions

**Acceptance Criteria:**
- Claude responses with `# Heading` render as actual headings
- Code blocks have syntax highlighting based on language tag
- Clicking copy button shows "Copied!" feedback briefly
- Chat history persists after browser restart
- "New Chat" clears messages but keeps model loaded
- Timestamps update correctly (e.g., "Just now" → "5m ago")

**Dependencies:** 0.3.0 — requires basic chat

---

### 0.7.0 — Offline & PWA
*Codename: "Standalone"*

**Summary:** Enable full offline capability and installable PWA experience.

**Requirements:**
- [ ] Service worker for offline page serving
- [ ] "Offline Ready" indicator when all assets cached
- [ ] PWA manifest for home screen installation
- [ ] Install prompt for desktop/mobile
- [ ] Graceful degradation when WebGPU unavailable:
  - Show clear error explaining browser limitations
  - Provide fallback suggestions (different browser, check GPU)
- [ ] Offline notification when user loses connection
- [ ] Background sync for any pending state

**Acceptance Criteria:**
- After first load, app works 100% offline
- Installing PWA creates desktop/home screen icon
- Opening installed PWA shows no browser chrome
- Non-WebGPU browsers see helpful error with suggestions
- Connectivity status indicated in UI
- No network requests after initial model download

**Dependencies:** 0.2.0 — requires model caching

---

### 0.8.0 — Settings & Customization
*Codename: "Preferences"*

**Summary:** Allow users to customize behavior and appearance.

**Requirements:**
- [ ] Temperature slider (0.0 – 2.0, default 0.7)
- [ ] Max tokens slider (16 – 4096, default 2048)
- [ ] Top-p sampling control (0.0 – 1.0, default 0.95)
- [ ] System prompt textarea for custom instructions
- [ ] Theme toggle: light / dark / system
- [ ] Export chat as plain text (`.txt`)
- [ ] Export chat as Markdown (`.md`)
- [ ] Reset all settings to defaults
- [ ] Settings persist in IndexedDB

**Acceptance Criteria:**
- Temperature changes affect generation creativity
- System prompt is prepended to all conversations
- Theme change applies immediately without reload
- Exported `.md` file renders correctly in Markdown viewers
- "Reset to Defaults" clears all customizations
- Settings persist across browser sessions

**Dependencies:** 0.3.0 — requires chat infrastructure

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