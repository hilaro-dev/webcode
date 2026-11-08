// webcode — Dynamic Library & Package Manager UI Controller

class PackageManagerUI {
  constructor() {
    this.inputEl = null;
    this.installBtn = null;
    this.packagesListEl = null;
    this.customFilesListEl = null;
    this.dropzoneEl = null;
    this.fileInputEl = null;
    this.countBadgeEl = null;
    this.mobileCountBadgeEl = null;
  }

  init() {
    this.inputEl = document.getElementById("pkg-search-input");
    this.installBtn = document.getElementById("pkg-install-btn");
    this.packagesListEl = document.getElementById("installed-packages-list");
    this.customFilesListEl = document.getElementById("custom-files-list");
    this.dropzoneEl = document.getElementById("custom-pkg-dropzone");
    this.fileInputEl = document.getElementById("custom-pkg-file-input");
    this.countBadgeEl = document.getElementById("pkg-count-badge");
    this.mobileCountBadgeEl = document.getElementById("mobile-pkg-count-badge");

    if (this.installBtn && this.inputEl) {
      this.installBtn.addEventListener("click", () => this.handleInstallFromInput());
      this.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.handleInstallFromInput();
        }
      });
    }

    // Quick-install preset buttons
    document.querySelectorAll("[data-quick-pkg]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pkgName = btn.getAttribute("data-quick-pkg");
        if (!pkgName) return;
        btn.disabled = true;
        btn.classList.add("opacity-60");
        await window.pyodideManager.installPackage(pkgName);
        btn.disabled = false;
        btn.classList.remove("opacity-60");
      });
    });

    // Drag & Drop + File Picker for .whl / .py / .zip custom libraries
    if (this.dropzoneEl && this.fileInputEl) {
      this.dropzoneEl.addEventListener("click", (e) => {
        if (e.target.tagName !== "INPUT") {
          this.fileInputEl.click();
        }
      });

      this.fileInputEl.addEventListener("change", async (e) => {
        const files = Array.from(e.target.files || []);
        for (const file of files) {
          await window.pyodideManager.uploadCustomLibrary(file);
        }
        this.fileInputEl.value = "";
      });

      ["dragenter", "dragover"].forEach((evtName) => {
        this.dropzoneEl.addEventListener(evtName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropzoneEl.classList.add("dropzone-active");
        });
      });

      ["dragleave", "drop"].forEach((evtName) => {
        this.dropzoneEl.addEventListener(evtName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropzoneEl.classList.remove("dropzone-active");
        });
      });

      this.dropzoneEl.addEventListener("drop", async (e) => {
        const files = Array.from(e.dataTransfer?.files || []);
        for (const file of files) {
          await window.pyodideManager.uploadCustomLibrary(file);
        }
      });
    }

    // Sample custom library generator button for testing pyodide.FS custom imports
    const sampleModBtn = document.getElementById("create-sample-module-btn");
    if (sampleModBtn) {
      sampleModBtn.addEventListener("click", () => this.createSampleCustomModule());
    }

    this.renderPackages();
  }

  async handleInstallFromInput() {
    if (!this.inputEl) return;
    const raw = this.inputEl.value.trim();
    if (!raw) return;

    this.installBtn.disabled = true;
    const origHtml = this.installBtn.innerHTML;
    this.installBtn.innerHTML = `<span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full"></span>`;

    // Support comma or space separated package names
    const pkgs = raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const pkg of pkgs) {
      const ok = await window.pyodideManager.installPackage(pkg);
      if (ok) {
        this.inputEl.value = "";
      }
    }

    this.installBtn.disabled = false;
    this.installBtn.innerHTML = origHtml;
  }

  async createSampleCustomModule() {
    const sampleContent = `# Custom Python module mounted into Pyodide FS (/home/pyodide/webcode_toolkit.py)
import math

def describe():
    return "webcode_toolkit v1.0 — Custom FS Module active!"

def fourier_square_wave(x, harmonics=7):
    """Compute a Fourier series approximation of a square wave."""
    total = 0.0
    for n in range(1, harmonics * 2, 2):
        total += (4.0 / (math.pi * n)) * math.sin(n * x)
    return total
`;
    const file = new File([sampleContent], "webcode_toolkit.py", {
      type: "text/x-python",
    });
    const ok = await window.pyodideManager.uploadCustomLibrary(file);
    if (ok && window.editorController) {
      const snippet = `# ==========================================================
# Custom Uploaded Module Test (webcode_toolkit.py in pyodide.FS)
# ==========================================================
import math
import webcode_toolkit

print("📦", webcode_toolkit.describe())

samples = [round(webcode_toolkit.fourier_square_wave(i * 0.25, harmonics=9), 4) for i in range(12)]
print("📈 Fourier square-wave samples:", samples)
`;
      window.editorController.setValue(snippet);
    }
  }

  renderPackages() {
    if (!this.packagesListEl) return;
    const packages = Array.from(window.pyodideManager.installedPackages.values());
    const uploaded = Array.from(window.pyodideManager.uploadedFiles.values());

    if (this.countBadgeEl) {
      this.countBadgeEl.textContent = String(packages.length);
    }
    if (this.mobileCountBadgeEl) {
      this.mobileCountBadgeEl.textContent = String(packages.length);
    }

    this.packagesListEl.innerHTML = "";
    if (packages.length === 0) {
      this.packagesListEl.innerHTML = `
        <div class="text-xs text-slate-500 italic py-2">
          No packages loaded yet. Install via micropip above.
        </div>
      `;
    } else {
      packages.forEach((pkg) => {
        const key = pkg.name.toLowerCase();
        const badge = document.createElement("div");
        badge.className =
          "group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-[#161b22] border border-[#30363d] hover:border-emerald-500/50 text-slate-200 transition";

        const isCustom = pkg.source && pkg.source.startsWith("Local");
        const dotColor = isCustom ? "bg-sky-400" : "bg-emerald-400";

        badge.innerHTML = `
          <span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span>
          <span class="font-medium">${this.escapeHtml(pkg.name)}</span>
          <span class="text-[10px] text-slate-400">${this.escapeHtml(pkg.version || "")}</span>
          ${
            pkg.removable
              ? `<button type="button" data-remove-pkg="${this.escapeHtml(key)}"
                   class="ml-0.5 text-slate-500 hover:text-rose-400 transition"
                   title="Unload ${this.escapeHtml(pkg.name)}">
                   &times;
                 </button>`
              : ""
          }
        `;

        const removeBtn = badge.querySelector("[data-remove-pkg]");
        if (removeBtn) {
          removeBtn.addEventListener("click", () => {
            window.pyodideManager.removePackage(key);
          });
        }
        this.packagesListEl.appendChild(badge);
      });
    }

    if (this.customFilesListEl) {
      this.customFilesListEl.innerHTML = "";
      if (uploaded.length === 0) {
        this.customFilesListEl.innerHTML = `
          <div class="text-[11px] text-slate-500 italic">
            No custom files uploaded to /home/pyodide yet.
          </div>
        `;
      } else {
        uploaded.forEach((item) => {
          const row = document.createElement("div");
          row.className =
            "flex items-center justify-between px-2.5 py-1.5 rounded bg-[#161b22] border border-[#30363d] text-xs";
          row.innerHTML = `
            <div class="truncate pr-2">
              <div class="font-mono text-emerald-400 truncate">${this.escapeHtml(item.filename)}</div>
              <div class="text-[10px] text-slate-400">${this.escapeHtml(item.type)} • import <code class="text-slate-200">${this.escapeHtml(item.moduleName)}</code></div>
            </div>
            <span class="text-[10px] font-mono text-slate-400 shrink-0">${(item.size / 1024).toFixed(1)} KB</span>
          `;
          this.customFilesListEl.appendChild(row);
        });
      }
    }
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

window.packageManagerUI = new PackageManagerUI();
