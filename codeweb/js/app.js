// webcode — Main Application Orchestrator

class WebcodeApp {
  constructor() {
    this.consoleOutputEl = null;
    this.statusBadgeEl = null;
    this.statusDotEl = null;
    this.statusTextEl = null;
    this.execTimeBadgeEl = null;
    this.runBtn = null;
    this.sidebarEl = null;
    this.sidebarOpen = true;
    this.mobileActiveTab = "all"; // 'all' | 'editor' | 'libraries' | 'console' | 'visual'
  }

  async init() {
    this.consoleOutputEl = document.getElementById("console-output");
    this.statusBadgeEl = document.getElementById("runtime-status-badge");
    this.statusDotEl = document.getElementById("runtime-status-dot");
    this.statusTextEl = document.getElementById("runtime-status-text");
    this.execTimeBadgeEl = document.getElementById("exec-time-badge");
    this.runBtn = document.getElementById("run-code-btn");
    this.sidebarEl = document.getElementById("libraries-sidebar");

    // 1. Initialize Visual Output Engine
    window.visualEngine.init();

    // 2. Initialize Code Editor with default starter script
    const starterCode = window.WEBCODE_TEMPLATES.starter.code;
    window.editorController.init(starterCode, () => this.handleRunCode());

    // 3. Initialize Package Manager UI
    window.packageManagerUI.init();

    // 4. Bind UI Controls & Buttons
    this.bindControls();

    // 5. Boot Pyodide Runtime
    await window.pyodideManager.init(
      (state, label) => this.updateStatusIndicator(state, label),
      (line, type) => this.appendConsoleLine(line, type)
    );
  }

  bindControls() {
    // Run Code button
    if (this.runBtn) {
      this.runBtn.addEventListener("click", () => this.handleRunCode());
    }

    // Stop / Reset Runtime button
    const resetBtn = document.getElementById("reset-runtime-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => window.pyodideManager.resetRuntime());
    }

    // Clear Output button (clears both console and visual output)
    const clearBtn = document.getElementById("clear-output-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.clearAllOutput());
    }

    // Clear console only button
    const clearConsoleBtn = document.getElementById("clear-console-only-btn");
    if (clearConsoleBtn) {
      clearConsoleBtn.addEventListener("click", () => this.clearConsole());
    }

    // Copy console button
    const copyConsoleBtn = document.getElementById("copy-console-btn");
    if (copyConsoleBtn) {
      copyConsoleBtn.addEventListener("click", () => {
        if (!this.consoleOutputEl) return;
        navigator.clipboard?.writeText(this.consoleOutputEl.innerText);
        const orig = copyConsoleBtn.textContent;
        copyConsoleBtn.textContent = "Copied!";
        setTimeout(() => {
          copyConsoleBtn.textContent = orig;
        }, 1200);
      });
    }

    // One-Click "Load Visual Demo" Button
    const visualDemoBtn = document.getElementById("load-visual-demo-btn");
    if (visualDemoBtn) {
      visualDemoBtn.addEventListener("click", () => this.handleLoadVisualDemo());
    }

    // Template Selector Dropdown
    const templateSelect = document.getElementById("template-selector");
    if (templateSelect) {
      templateSelect.addEventListener("change", (e) => {
        const key = e.target.value;
        const tpl = window.WEBCODE_TEMPLATES[key];
        if (tpl) {
          window.editorController.setValue(tpl.code);
          this.appendConsoleLine(`📄 Loaded template: ${tpl.name}`, "info");
        }
      });
    }

    // Download .py script button
    const downloadPyBtn = document.getElementById("download-py-btn");
    if (downloadPyBtn) {
      downloadPyBtn.addEventListener("click", () => {
        const code = window.editorController.getValue();
        const blob = new Blob([code], { type: "text/x-python" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "main.py";
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Desktop Collapsible Libraries Sidebar Toggle
    const toggleSidebarBtn = document.getElementById("toggle-sidebar-btn");
    if (toggleSidebarBtn) {
      toggleSidebarBtn.addEventListener("click", () => this.toggleDesktopSidebar());
    }

    // Visual Output Collapse Toggle
    const visualHeaderToggle = document.getElementById("visual-header-toggle");
    if (visualHeaderToggle) {
      visualHeaderToggle.addEventListener("click", () => {
        window.visualEngine.toggleCollapse();
      });
    }

    // Canvas Download & Zoom buttons
    const canvasDownloadBtn = document.getElementById("canvas-download-btn");
    if (canvasDownloadBtn) {
      canvasDownloadBtn.addEventListener("click", () =>
        window.visualEngine.downloadCanvasPng()
      );
    }
    const canvasZoomBtn = document.getElementById("canvas-zoom-btn");
    if (canvasZoomBtn) {
      canvasZoomBtn.addEventListener("click", () => window.visualEngine.zoomCanvas());
    }

    // Lightbox Close
    const lightboxCloseBtn = document.getElementById("lightbox-close-btn");
    const lightboxModal = document.getElementById("image-lightbox-modal");
    if (lightboxCloseBtn) {
      lightboxCloseBtn.addEventListener("click", () =>
        window.visualEngine.closeLightbox()
      );
    }
    if (lightboxModal) {
      lightboxModal.addEventListener("click", (e) => {
        if (e.target === lightboxModal) {
          window.visualEngine.closeLightbox();
        }
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        window.visualEngine.closeLightbox();
      }
    });

    // Mobile / Tablet Navigation Tabs
    document.querySelectorAll("[data-mobile-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-mobile-tab");
        this.switchMobileTab(tab);
      });
    });
  }

  toggleDesktopSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    if (this.sidebarEl) {
      this.sidebarEl.classList.toggle("lg:hidden", !this.sidebarOpen);
    }
    window.editorController.refresh();
  }

  switchMobileTab(tab) {
    this.mobileActiveTab = tab;
    document.querySelectorAll("[data-mobile-tab]").forEach((btn) => {
      const isMatch = btn.getAttribute("data-mobile-tab") === tab;
      btn.className = isMatch
        ? "px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 whitespace-nowrap transition"
        : "px-3 py-1.5 text-xs font-medium rounded-md text-slate-400 hover:text-slate-200 whitespace-nowrap transition";
    });

    const sidebarPane = document.getElementById("libraries-sidebar");
    const editorPane = document.getElementById("editor-pane");
    const consolePane = document.getElementById("console-pane");
    const visualPane = document.getElementById("visual-output-section");

    if (tab === "all") {
      sidebarPane?.classList.remove("hidden");
      editorPane?.classList.remove("hidden");
      consolePane?.classList.remove("hidden");
      visualPane?.classList.remove("hidden");
    } else if (tab === "editor") {
      sidebarPane?.classList.add("hidden");
      editorPane?.classList.remove("hidden");
      consolePane?.classList.add("hidden");
      visualPane?.classList.add("hidden");
    } else if (tab === "libraries") {
      sidebarPane?.classList.remove("hidden");
      editorPane?.classList.add("hidden");
      consolePane?.classList.add("hidden");
      visualPane?.classList.add("hidden");
    } else if (tab === "console") {
      sidebarPane?.classList.add("hidden");
      editorPane?.classList.add("hidden");
      consolePane?.classList.remove("hidden");
      visualPane?.classList.add("hidden");
    } else if (tab === "visual") {
      sidebarPane?.classList.add("hidden");
      editorPane?.classList.add("hidden");
      consolePane?.classList.add("hidden");
      visualPane?.classList.remove("hidden");
    }

    window.editorController.refresh();
  }

  async handleRunCode() {
    const code = window.editorController.getValue();
    if (!code.trim()) {
      this.appendConsoleLine("⚠️ Editor is empty. Write some Python code first.", "stderr");
      return;
    }

    this.appendConsoleLine("▶ Executing main.py...", "system");
    const res = await window.pyodideManager.runCode(code);

    if (res && res.elapsedMs && this.execTimeBadgeEl) {
      this.execTimeBadgeEl.textContent = `${res.elapsedMs} ms`;
      this.execTimeBadgeEl.classList.remove("hidden");
    }

    // On mobile/tablet screens (< 1024px), automatically reveal and scroll to Output/Visual Screen
    if (window.innerWidth < 1024) {
      const hasVisuals = window.visualEngine && window.visualEngine.outputCount > 0;
      if (this.mobileActiveTab !== "all") {
        this.switchMobileTab(hasVisuals ? "visual" : "console");
      } else {
        const targetEl = hasVisuals
          ? document.getElementById("visual-output-section")
          : document.getElementById("console-pane");
        if (targetEl) {
          setTimeout(() => {
            targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 80);
        }
      }
    } else if (window.visualEngine && window.visualEngine.outputCount > 0) {
      // On desktop, smoothly scroll the visual output card into view inside the right column
      const visualEl = document.getElementById("visual-output-section");
      if (visualEl) {
        setTimeout(() => {
          visualEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 60);
      }
    }
  }

  async handleLoadVisualDemo() {
    const demo = window.WEBCODE_TEMPLATES.visual_demo;
    const templateSelect = document.getElementById("template-selector");
    if (templateSelect) {
      templateSelect.value = "visual_demo";
    }

    window.editorController.setValue(demo.code);
    this.appendConsoleLine(
      "✨ Loading Visual Demo: Installing numpy & matplotlib and rendering Sine Wave Chart...",
      "system"
    );

    if (!window.pyodideManager.isReady) {
      this.appendConsoleLine(
        "⚠️ Please wait a moment for the Python Engine to finish initializing, then click Load Visual Demo again.",
        "stderr"
      );
      return;
    }

    // Explicitly install numpy and matplotlib via micropip so they show in Installed Packages
    for (const pkg of demo.packages) {
      if (!window.pyodideManager.installedPackages.has(pkg)) {
        await window.pyodideManager.installPackage(pkg);
      }
    }

    await this.handleRunCode();
  }

  updateStatusIndicator(state, label) {
    if (!this.statusTextEl || !this.statusDotEl || !this.statusBadgeEl) return;
    this.statusTextEl.textContent = label;

    const styles = {
      loading: {
        dot: "bg-amber-400 status-pulse",
        badge: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      },
      installing: {
        dot: "bg-sky-400 status-pulse",
        badge: "bg-sky-500/10 text-sky-300 border-sky-500/30",
      },
      running: {
        dot: "bg-emerald-400 status-pulse",
        badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
      },
      ready: {
        dot: "bg-emerald-400",
        badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      },
      error: {
        dot: "bg-rose-500",
        badge: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      },
    };

    const st = styles[state] || styles.ready;
    this.statusDotEl.className = `w-2 h-2 rounded-full ${st.dot}`;
    this.statusBadgeEl.className = `inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border transition ${st.badge}`;

    if (this.runBtn) {
      const busy = state === "loading" || state === "running" || state === "installing";
      this.runBtn.disabled = busy;
      this.runBtn.classList.toggle("opacity-60", busy);
    }
  }

  appendConsoleLine(text, type = "stdout") {
    if (!this.consoleOutputEl) return;

    const placeholder = document.getElementById("console-empty-placeholder");
    if (placeholder) {
      placeholder.remove();
    }

    const row = document.createElement("div");
    const typeClass =
      type === "stderr"
        ? "console-stderr"
        : type === "system"
        ? "console-system"
        : type === "info"
        ? "console-info"
        : "console-stdout";

    row.className = `console-line font-mono py-0.5 ${typeClass}`;
    row.textContent = text;

    this.consoleOutputEl.appendChild(row);
    this.consoleOutputEl.scrollTop = this.consoleOutputEl.scrollHeight;
  }

  clearConsole() {
    if (!this.consoleOutputEl) return;
    this.consoleOutputEl.innerHTML = `
      <div id="console-empty-placeholder" class="text-xs text-slate-500 italic py-2">
        Console cleared. Ready for next execution...
      </div>
    `;
    if (this.execTimeBadgeEl) {
      this.execTimeBadgeEl.classList.add("hidden");
    }
  }

  clearAllOutput() {
    this.clearConsole();
    if (window.visualEngine) {
      window.visualEngine.prepareForNewRun();
    }
  }
}

window.webcodeApp = new WebcodeApp();
document.addEventListener("DOMContentLoaded", () => {
  window.webcodeApp.init();
});
