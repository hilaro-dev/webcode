// webcode — Automatic Visual Output Screen Engine

class VisualEngine {
  constructor() {
    this.visualSection = null;
    this.emptyState = null;
    this.galleryContainer = null;
    this.htmlRoot = null;
    this.canvasCard = null;
    this.canvasElement = null;
    this.canvasTitle = null;
    this.badgeCountEl = null;
    this.visualBody = null;
    this.collapseIcon = null;

    this.outputCount = 0;
    this.isCollapsed = false;
    this.figureIndex = 0;
  }

  init() {
    this.visualSection = document.getElementById("visual-output-section");
    this.emptyState = document.getElementById("visual-empty-state");
    this.galleryContainer = document.getElementById("visual-gallery");
    this.htmlRoot = document.getElementById("visual-output-root");
    this.canvasCard = document.getElementById("canvas-output-card");
    this.canvasElement = document.getElementById("canvas");
    this.canvasTitle = document.getElementById("canvas-card-title");
    this.badgeCountEl = document.getElementById("visual-count-badge");
    this.visualBody = document.getElementById("visual-panel-body");
    this.collapseIcon = document.getElementById("visual-collapse-icon");

    // Register global callbacks invoked directly from Pyodide Python hooks
    window.__webcode_push_image = (base64Png, metaJson) => {
      let meta = { source: "Matplotlib / PIL", width: "", height: "" };
      try {
        if (metaJson) meta = JSON.parse(metaJson);
      } catch (_) {}
      this.renderImageOutput(base64Png, meta);
    };

    window.__webcode_push_html = (htmlString, label) => {
      this.renderHtmlOutput(htmlString, label || "HTML / SVG Output");
    };

    window.__webcode_activate_canvas = (title) => {
      this.activateCanvas(title || "HTML5 Canvas 2D / SDL Surface");
    };
  }

  prepareForNewRun() {
    this.outputCount = 0;
    this.figureIndex = 0;
    if (this.galleryContainer) {
      this.galleryContainer.innerHTML = "";
      this.galleryContainer.classList.add("hidden");
    }
    if (this.htmlRoot) {
      this.htmlRoot.innerHTML = "";
      this.htmlRoot.classList.add("hidden");
    }
    if (this.canvasCard) {
      this.canvasCard.classList.add("hidden");
    }
    if (this.canvasElement) {
      const ctx = this.canvasElement.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      }
    }
    this.updateBadge();
    this.showNoVisualState();
  }

  finalizeAfterRun() {
    if (this.outputCount === 0) {
      this.showNoVisualState();
    } else {
      this.expandVisualPanel();
    }
  }

  showNoVisualState() {
    if (this.emptyState) {
      this.emptyState.classList.remove("hidden");
    }
  }

  hideNoVisualState() {
    if (this.emptyState) {
      this.emptyState.classList.add("hidden");
    }
  }

  expandVisualPanel() {
    this.isCollapsed = false;
    if (this.visualBody) {
      this.visualBody.classList.remove("hidden");
    }
    if (this.collapseIcon) {
      this.collapseIcon.style.transform = "rotate(0deg)";
    }
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    if (this.visualBody) {
      this.visualBody.classList.toggle("hidden", this.isCollapsed);
    }
    if (this.collapseIcon) {
      this.collapseIcon.style.transform = this.isCollapsed ? "rotate(-90deg)" : "rotate(0deg)";
    }
  }

  updateBadge() {
    if (!this.badgeCountEl) return;
    if (this.outputCount > 0) {
      this.badgeCountEl.textContent = `${this.outputCount} active`;
      this.badgeCountEl.className =
        "px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
    } else {
      this.badgeCountEl.textContent = "Idle";
      this.badgeCountEl.className =
        "px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-800 text-slate-400 border border-slate-700";
    }
  }

  renderImageOutput(base64Png, meta = {}) {
    this.hideNoVisualState();
    this.expandVisualPanel();
    this.outputCount += 1;
    this.figureIndex += 1;
    this.updateBadge();

    if (this.galleryContainer) {
      this.galleryContainer.classList.remove("hidden");
    }

    const figNum = this.figureIndex;
    const sourceLabel = meta.source || "Figure";
    const dims = meta.width && meta.height ? `${meta.width}×${meta.height}px` : "High-DPI PNG";
    const dataUri = base64Png.startsWith("data:")
      ? base64Png
      : `data:image/png;base64,${base64Png}`;

    const card = document.createElement("div");
    card.className =
      "visual-card bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden flex flex-col";

    card.innerHTML = `
      <div class="flex items-center justify-between px-3 py-2 bg-[#0d1117]/70 border-b border-[#30363d]">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span class="text-xs font-semibold text-slate-200">${this.escapeHtml(sourceLabel)} #${figNum}</span>
          <span class="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">${this.escapeHtml(dims)}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" data-action="zoom"
            class="px-2 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition flex items-center gap-1"
            title="Zoom / Fullscreen Preview">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16zM11 8v6M8 11h6"/>
            </svg>
            <span>Zoom</span>
          </button>
          <a href="${dataUri}" download="webcode-figure-${figNum}.png"
            class="px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded border border-emerald-500/30 transition flex items-center gap-1"
            title="Download PNG Image">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"/>
            </svg>
            <span>PNG</span>
          </a>
        </div>
      </div>
      <div class="p-3 flex items-center justify-center bg-[#0d1117]/40 cursor-zoom-in" data-action="zoom">
        <img src="${dataUri}" alt="${this.escapeHtml(sourceLabel)} #${figNum}"
          class="max-h-[420px] w-auto object-contain rounded border border-[#30363d]/60" />
      </div>
    `;

    card.querySelectorAll('[data-action="zoom"]').forEach((el) => {
      el.addEventListener("click", () => {
        this.openLightbox(dataUri, `${sourceLabel} #${figNum} (${dims})`);
      });
    });

    this.galleryContainer.appendChild(card);
  }

  renderHtmlOutput(htmlString, label = "Interactive DOM / SVG") {
    this.hideNoVisualState();
    this.expandVisualPanel();
    this.outputCount += 1;
    this.updateBadge();

    if (!this.htmlRoot) return;
    this.htmlRoot.classList.remove("hidden");

    const wrapper = document.createElement("div");
    wrapper.className =
      "visual-card bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden mb-3";

    const header = document.createElement("div");
    header.className =
      "flex items-center justify-between px-3 py-1.5 bg-[#0d1117]/70 border-b border-[#30363d]";
    header.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-sky-400"></span>
        <span class="text-xs font-semibold text-slate-200">${this.escapeHtml(label)}</span>
      </div>
      <span class="text-[11px] font-mono text-sky-400">#visual-output-root</span>
    `;

    const content = document.createElement("div");
    content.className = "p-3 overflow-x-auto text-sm";
    content.innerHTML = htmlString;

    // Re-execute any inline scripts (e.g., from Plotly/Bokeh/Altair HTML exports)
    content.querySelectorAll("script").forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value)
      );
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });

    wrapper.appendChild(header);
    wrapper.appendChild(content);
    this.htmlRoot.appendChild(wrapper);
  }

  activateCanvas(title = "HTML5 Canvas 2D Output") {
    this.hideNoVisualState();
    this.expandVisualPanel();
    if (this.canvasCard && this.canvasCard.classList.contains("hidden")) {
      this.outputCount += 1;
      this.updateBadge();
      this.canvasCard.classList.remove("hidden");
    }
    if (this.canvasTitle) {
      this.canvasTitle.textContent = title;
    }
  }

  downloadCanvasPng() {
    if (!this.canvasElement) return;
    const dataUri = this.canvasElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUri;
    link.download = "webcode-canvas.png";
    link.click();
  }

  zoomCanvas() {
    if (!this.canvasElement) return;
    const dataUri = this.canvasElement.toDataURL("image/png");
    this.openLightbox(dataUri, this.canvasTitle ? this.canvasTitle.textContent : "Canvas Output");
  }

  openLightbox(dataUri, caption) {
    const modal = document.getElementById("image-lightbox-modal");
    const modalImg = document.getElementById("lightbox-image");
    const modalCaption = document.getElementById("lightbox-caption");
    const modalDownload = document.getElementById("lightbox-download");

    if (!modal || !modalImg) return;
    modalImg.src = dataUri;
    if (modalCaption) modalCaption.textContent = caption || "Visual Output";
    if (modalDownload) modalDownload.href = dataUri;
    modal.classList.remove("hidden");
  }

  closeLightbox() {
    const modal = document.getElementById("image-lightbox-modal");
    if (modal) modal.classList.add("hidden");
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

window.visualEngine = new VisualEngine();
