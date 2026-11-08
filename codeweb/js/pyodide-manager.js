// webcode — Pyodide v0.26.2 Runtime & Visual Hooks Manager

class PyodideManager {
  constructor() {
    this.pyodide = null;
    this.isReady = false;
    this.isRunning = false;
    this.installedPackages = new Map(); // name -> { name, source, version, removable }
    this.uploadedFiles = new Map(); // filename -> { filename, type, size, moduleName }
    this.abortRequested = false;
  }

  async init(onStatusChange, onConsoleLog) {
    this.onStatusChange = onStatusChange || (() => {});
    this.onConsoleLog = onConsoleLog || (() => {});

    try {
      this.onStatusChange("loading", "Loading Python Engine...");
      this.onConsoleLog("⏳ Initializing Pyodide v0.26.2 WebAssembly Python runtime...", "system");

      if (typeof loadPyodide === "undefined") {
        throw new Error(
          "Pyodide CDN script failed to load. Please check your internet connection."
        );
      }

      this.pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
        stdout: (line) => {
          this.onConsoleLog(line, "stdout");
        },
        stderr: (line) => {
          this.onConsoleLog(line, "stderr");
        },
      });

      // Bind HTML5 <canvas id="canvas"> to Pyodide SDL/Canvas2D target
      const canvasEl = document.getElementById("canvas");
      if (canvasEl && this.pyodide.canvas) {
        try {
          this.pyodide.canvas.setCanvas2D(canvasEl);
        } catch (_) {}
      }

      // Load micropip package manager
      this.onStatusChange("loading", "Loading micropip...");
      await this.pyodide.loadPackage("micropip");
      this.installedPackages.set("micropip", {
        name: "micropip",
        source: "core",
        version: "builtin",
        removable: false,
      });

      // Bootstrap Python visual hooks & workspace directory
      await this.installVisualHooks();

      this.isReady = true;
      this.onStatusChange("ready", "Ready");
      this.onConsoleLog(
        "✅ Python 3.12 (Pyodide v0.26.2) & micropip ready. Press Run (Ctrl+Enter) to execute code.",
        "system"
      );
      if (window.packageManagerUI) {
        window.packageManagerUI.renderPackages();
      }
    } catch (err) {
      this.isReady = false;
      this.onStatusChange("error", "Runtime Error");
      this.onConsoleLog(`❌ Failed to initialize Pyodide: ${err.message || err}`, "stderr");
    }
  }

  async installVisualHooks() {
    const bootstrapCode = `
import sys
import io
import os
import json
import base64
import builtins
import js

# Ensure current working directory /home/pyodide is first on sys.path for uploaded modules
if "/home/pyodide" not in sys.path:
    sys.path.insert(0, "/home/pyodide")

def display_html(html_content, title="Interactive HTML / SVG"):
    """Render raw HTML or SVG string into #visual-output-root."""
    if hasattr(html_content, "_repr_html_"):
        html_content = html_content._repr_html_()
    elif hasattr(html_content, "_repr_svg_"):
        html_content = html_content._repr_svg_()
    js.__webcode_push_html(str(html_content), str(title))

def display_image(img_obj, label="Python Image"):
    """Render a PIL.Image or Matplotlib Figure into the Visual Output gallery."""
    buf = io.BytesIO()
    width, height = "", ""
    if hasattr(img_obj, "savefig"):
        img_obj.savefig(buf, format="png", bbox_inches="tight", facecolor=img_obj.get_facecolor())
        try:
            w_in, h_in = img_obj.get_size_inches()
            dpi = int(img_obj.get_dpi())
            width, height = int(w_in * dpi), int(h_in * dpi)
        except Exception:
            pass
    elif hasattr(img_obj, "save"):
        img_obj.save(buf, format="PNG")
        width = getattr(img_obj, "width", "")
        height = getattr(img_obj, "height", "")
    else:
        raise TypeError("display_image expects a Matplotlib Figure or PIL.Image object")

    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    meta = json.dumps({"source": label, "width": width, "height": height})
    js.__webcode_push_image(b64, meta)

def activate_canvas(title="HTML5 Canvas 2D Output"):
    """Reveal the <canvas id='canvas'> viewport in the Visual Output Screen."""
    js.__webcode_activate_canvas(str(title))

builtins.display_html = display_html
builtins.display_image = display_image
builtins.activate_canvas = activate_canvas

def __webcode_setup_visual_hooks(force_import_mpl=False, force_import_pil=False):
    # 1. Hook Matplotlib if loaded or requested
    if force_import_mpl or "matplotlib" in sys.modules:
        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt

            def _webcode_mpl_show(*args, **kwargs):
                figs = [plt.figure(num) for num in plt.get_fignums()]
                for fig in figs:
                    display_image(fig, label="Matplotlib Figure")
                plt.close("all")

            plt.show = _webcode_mpl_show
        except Exception as e:
            sys.stderr.write(f"[webcode matplotlib hook warning]: {e}\\n")

    # 2. Hook PIL.Image.Image.show if Pillow is loaded or requested
    if force_import_pil or "PIL" in sys.modules or "PIL.Image" in sys.modules:
        try:
            from PIL import Image

            def _webcode_pil_show(self, title=None, *args, **kwargs):
                display_image(self, label=title or f"PIL.Image ({self.mode})")

            Image.Image.show = _webcode_pil_show
        except Exception as e:
            sys.stderr.write(f"[webcode PIL hook warning]: {e}\\n")

# Hook builtins.__import__ with re-entrancy guard so importing matplotlib.pyplot or PIL.Image attaches visual hooks immediately
_orig_import = builtins.__import__
_in_webcode_hook = False
def _webcode_import(name, globals=None, locals=None, fromlist=(), level=0):
    global _in_webcode_hook
    mod = _orig_import(name, globals, locals, fromlist, level)
    if not _in_webcode_hook:
        root = name.split(".")[0]
        if root == "matplotlib" or (fromlist and "pyplot" in fromlist):
            _in_webcode_hook = True
            try:
                __webcode_setup_visual_hooks(force_import_mpl=True)
            finally:
                _in_webcode_hook = False
        elif root == "PIL":
            _in_webcode_hook = True
            try:
                __webcode_setup_visual_hooks(force_import_pil=True)
            finally:
                _in_webcode_hook = False
    return mod

builtins.__import__ = _webcode_import

def __webcode_flush_visuals(last_val=None):
    """After script execution, flush any un-shown matplotlib figures or rich return objects."""
    # Check if last_val is a rich object
    if last_val is not None:
        try:
            if hasattr(last_val, "_repr_html_"):
                js.__webcode_push_html(str(last_val._repr_html_()), type(last_val).__name__)
            elif hasattr(last_val, "_repr_svg_"):
                js.__webcode_push_html(str(last_val._repr_svg_()), type(last_val).__name__)
            elif hasattr(last_val, "savefig"):
                display_image(last_val, label="Matplotlib Figure")
            elif hasattr(last_val, "save") and hasattr(last_val, "mode") and hasattr(last_val, "size"):
                display_image(last_val, label=f"PIL.Image ({last_val.mode})")
        except Exception:
            pass

    # Flush any lingering Matplotlib figures that were created without calling plt.show()
    if "matplotlib.pyplot" in sys.modules:
        try:
            import matplotlib.pyplot as plt
            fignums = plt.get_fignums()
            if fignums:
                for num in fignums:
                    fig = plt.figure(num)
                    if fig.axes:
                        display_image(fig, label="Matplotlib Figure")
                plt.close("all")
        except Exception:
            pass
`;
    await this.pyodide.runPythonAsync(bootstrapCode);
  }

  async autoInstallMissingImports(code) {
    if (!this.pyodide) return;
    // Detect imports in the user code and load built-in Pyodide packages (e.g. numpy, matplotlib, pillow, scipy, pandas)
    try {
      const imports = await this.pyodide.runPythonAsync(`
import pyodide.code
pyodide.code.find_imports(${JSON.stringify(code)})
`);
      const importList = imports.toJs ? imports.toJs() : Array.from(imports || []);
      if (imports.destroy) imports.destroy();

      const pkgMap = {
        numpy: "numpy",
        matplotlib: "matplotlib",
        mpl_toolkits: "matplotlib",
        PIL: "pillow",
        scipy: "scipy",
        pandas: "pandas",
        sklearn: "scikit-learn",
        bs4: "beautifulsoup4",
        yaml: "pyyaml",
         networkx: "networkx",
        sympy: "sympy",
        pytz: "pytz",
        sqlite3: "sqlite3",
      };

      const toInstall = [];
      for (const imp of importList) {
        const root = imp.split(".")[0];
        // Check if module exists in sys.modules or uploaded files
        const targetPkg = pkgMap[root] || null;
        if (targetPkg && !this.installedPackages.has(targetPkg)) {
          toInstall.push(targetPkg);
        }
      }

      if (toInstall.length > 0) {
        const uniquePkgs = [...new Set(toInstall)];
        this.onStatusChange(
          "installing",
          `Installing ${uniquePkgs.join(", ")}...`
        );
        this.onConsoleLog(
          `📦 Auto-loading required packages: ${uniquePkgs.join(", ")}...`,
          "info"
        );
        for (const pkg of uniquePkgs) {
          await this.installPackage(pkg, { silentStatus: true });
        }
      }
    } catch (_) {
      // Ignore syntax errors during import scanning; main execution will report syntax traceback cleanly
    }
  }

  async runCode(code) {
    if (!this.isReady || !this.pyodide) {
      this.onConsoleLog("⚠️ Python runtime is still loading. Please wait...", "stderr");
      return { success: false };
    }
    if (this.isRunning) {
      this.onConsoleLog("⚠️ Code is already executing.", "stderr");
      return { success: false };
    }

    this.isRunning = true;
    this.abortRequested = false;
    const startTime = performance.now();

    try {
      if (window.visualEngine) {
        window.visualEngine.prepareForNewRun();
      }

      // Auto-load known scientific imports if needed
      await this.autoInstallMissingImports(code);

      // Ensure Matplotlib & PIL hooks are active before running
      await this.pyodide.runPythonAsync("__webcode_setup_visual_hooks()");

      this.onStatusChange("running", "Running...");

      // Pre-hook matplotlib/PIL if imported inside the user script by wrapping import or running setup before plt.show
      // Also hook matplotlib import dynamically so even first-time import in script hooks plt.show()
      await this.pyodide.runPythonAsync(`
if "matplotlib" in sys.modules or "PIL" in sys.modules:
    __webcode_setup_visual_hooks()
`);

      // Execute user code and capture last expression
      const result = await this.pyodide.runPythonAsync(code);

      // Re-run visual hooks in case matplotlib/PIL was imported for the first time during this run
      await this.pyodide.runPythonAsync("__webcode_setup_visual_hooks()");

      // Flush any open matplotlib figures or rich return value
      this.pyodide.globals.set("__webcode_last_result", result);
      await this.pyodide.runPythonAsync(`
__webcode_flush_visuals(__webcode_last_result)
`);

      if (result && typeof result.destroy === "function") {
        result.destroy();
      }

      const elapsedMs = (performance.now() - startTime).toFixed(1);
      if (window.visualEngine) {
        window.visualEngine.finalizeAfterRun();
      }

      this.onStatusChange("ready", "Ready");
      return { success: true, elapsedMs };
    } catch (err) {
      const elapsedMs = (performance.now() - startTime).toFixed(1);
      const formattedError = this.formatPythonTraceback(err);
      this.onConsoleLog(formattedError, "stderr");
      if (window.visualEngine) {
        window.visualEngine.finalizeAfterRun();
      }
      this.onStatusChange("ready", "Ready");
      return { success: false, elapsedMs, error: formattedError };
    } finally {
      this.isRunning = false;
    }
  }

  formatPythonTraceback(err) {
    const raw = String(err && err.message ? err.message : err);
    // Strip internal Pyodide frames to highlight the user's code lines clearly
    const lines = raw.split("\n");
    const cleaned = [];
    let skipInternal = false;
    for (const line of lines) {
      if (line.includes("_pyodide/_base.py") || line.includes("pyodide.asm.js")) {
        skipInternal = true;
        continue;
      }
      if (skipInternal && line.trim().startsWith("File ")) {
        skipInternal = false;
      }
      if (!skipInternal) {
        cleaned.push(line);
      }
    }
    return cleaned.join("\n").trim() || raw;
  }

  async installPackage(pkgSpec, options = {}) {
    if (!this.isReady || !this.pyodide) {
      this.onConsoleLog("⚠️ Wait for Python runtime to finish loading first.", "stderr");
      return false;
    }

    const cleanName = pkgSpec.trim();
    if (!cleanName) return false;

    if (!options.silentStatus) {
      this.onStatusChange("installing", "Installing Package...");
    }
    this.onConsoleLog(`📥 Installing '${cleanName}' via micropip...`, "info");

    try {
      const pkgResultJson = await this.pyodide.runPythonAsync(`
import micropip
import json

pkg_spec = ${JSON.stringify(cleanName)}
await micropip.install(pkg_spec)

# Configure visual hooks right away if matplotlib or pillow was installed
__webcode_setup_visual_hooks()

installed_list = micropip.list()
base_key = pkg_spec.split("==")[0].split(">=")[0].split("<=")[0].strip().lower()
version_found = "latest"
for k, pkg_meta in installed_list.items():
    if k.lower() == base_key or k.lower().replace("-", "_") == base_key.replace("-", "_"):
        version_found = getattr(pkg_meta, "version", "installed")
        base_key = k
        break

json.dumps({"name": base_key, "version": version_found})
`);

      const info = JSON.parse(pkgResultJson);
      this.installedPackages.set(info.name.toLowerCase(), {
        name: info.name,
        source: "PyPI / Pyodide",
        version: info.version,
        removable: true,
      });

      this.onConsoleLog(
        `✅ Successfully installed ${info.name} (${info.version}).`,
        "system"
      );

      if (window.packageManagerUI) {
        window.packageManagerUI.renderPackages();
      }
      if (!options.silentStatus) {
        this.onStatusChange("ready", "Ready");
      }
      return true;
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      this.onConsoleLog(
        `❌ Package installation failed for '${cleanName}':\n${this.formatPythonTraceback(msg)}\n💡 Tip: Ensure the package is a pure-Python wheel on PyPI or a pre-built Pyodide package.`,
        "stderr"
      );
      if (!options.silentStatus) {
        this.onStatusChange("ready", "Ready");
      }
      return false;
    }
  }

  async uploadCustomLibrary(file) {
    if (!this.isReady || !this.pyodide) {
      this.onConsoleLog("⚠️ Wait for Python runtime to finish loading first.", "stderr");
      return false;
    }

    const fileName = file.name;
    const lower = fileName.toLowerCase();
    this.onStatusChange("installing", `Uploading ${fileName}...`);
    this.onConsoleLog(`📂 Writing '${fileName}' (${(file.size / 1024).toFixed(1)} KB) to Pyodide FS...`, "info");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const targetPath = `/home/pyodide/${fileName}`;

      // Write file into Pyodide's virtual filesystem
      this.pyodide.FS.writeFile(targetPath, uint8Array);

      if (lower.endsWith(".whl")) {
        // Install local wheel via micropip emfs: protocol
        await this.pyodide.runPythonAsync(`
import micropip
import importlib
await micropip.install("emfs:${targetPath}")
importlib.invalidate_caches()
`);
        const pkgName = fileName.split("-")[0];
        this.installedPackages.set(pkgName.toLowerCase(), {
          name: pkgName,
          source: "Local .whl",
          version: "custom",
          removable: true,
          filePath: targetPath,
        });
        this.uploadedFiles.set(fileName, {
          filename: fileName,
          type: "Wheel (.whl)",
          size: file.size,
          moduleName: pkgName,
          path: targetPath,
        });
        this.onConsoleLog(
          `✅ Installed wheel '${fileName}' via micropip! Import it with: import ${pkgName}`,
          "system"
        );
      } else if (lower.endsWith(".zip")) {
        // Extract .zip into /home/pyodide so modules/packages inside are immediately importable
        const extractedModules = await this.pyodide.runPythonAsync(`
import zipfile
import os
import sys
import json
import importlib

zip_path = ${JSON.stringify(targetPath)}
extract_dir = "/home/pyodide"
with zipfile.ZipFile(zip_path, "r") as zf:
    top_items = set(name.split("/")[0] for name in zf.namelist() if name and not name.startswith("__MACOSX"))
    zf.extractall(extract_dir)

if extract_dir not in sys.path:
    sys.path.insert(0, extract_dir)
importlib.invalidate_caches()
json.dumps(sorted(list(top_items)))
`);
        const items = JSON.parse(extractedModules);
        const modHint = (items[0] || fileName.replace(/\.zip$/i, "")).replace(/\.py$/i, "");
        this.uploadedFiles.set(fileName, {
          filename: fileName,
          type: "Archive (.zip)",
          size: file.size,
          moduleName: modHint,
          path: targetPath,
        });
        this.installedPackages.set(modHint.toLowerCase(), {
          name: modHint,
          source: "Local .zip",
          version: "custom",
          removable: true,
          filePath: targetPath,
        });
        this.onConsoleLog(
          `✅ Extracted '${fileName}' into /home/pyodide! Ready to import: import ${modHint}`,
          "system"
        );
      } else if (lower.endsWith(".py")) {
        // Single Python module file
        await this.pyodide.runPythonAsync(`
import sys
import importlib
if "/home/pyodide" not in sys.path:
    sys.path.insert(0, "/home/pyodide")
importlib.invalidate_caches()
`);
        const modName = fileName.replace(/\.py$/i, "");
        this.uploadedFiles.set(fileName, {
          filename: fileName,
          type: "Module (.py)",
          size: file.size,
          moduleName: modName,
          path: targetPath,
        });
        this.installedPackages.set(modName.toLowerCase(), {
          name: modName,
          source: "Local .py",
          version: "module",
          removable: true,
          filePath: targetPath,
        });
        this.onConsoleLog(
          `✅ Mounted '${fileName}' in /home/pyodide! Import it directly with: import ${modName}`,
          "system"
        );
      } else {
        // Any data file (CSV, JSON, TXT, PNG)
        this.uploadedFiles.set(fileName, {
          filename: fileName,
          type: "FS File",
          size: file.size,
          moduleName: fileName,
          path: targetPath,
        });
        this.onConsoleLog(
          `✅ Saved '${fileName}' to Pyodide FS at '/home/pyodide/${fileName}'.`,
          "system"
        );
      }

      if (window.packageManagerUI) {
        window.packageManagerUI.renderPackages();
      }
      this.onStatusChange("ready", "Ready");
      return true;
    } catch (err) {
      this.onConsoleLog(
        `❌ Failed to upload '${fileName}': ${err.message || err}`,
        "stderr"
      );
      this.onStatusChange("ready", "Ready");
      return false;
    }
  }

  async removePackage(pkgKey) {
    const entry = this.installedPackages.get(pkgKey);
    if (!entry || !entry.removable) return;

    try {
      if (entry.filePath) {
        try {
          this.pyodide.FS.unlink(entry.filePath);
        } catch (_) {}
      }
      await this.pyodide.runPythonAsync(`
import sys
mod_name = ${JSON.stringify(entry.name)}
for k in list(sys.modules.keys()):
    if k == mod_name or k.startswith(mod_name + "."):
        del sys.modules[k]
`);
      this.installedPackages.delete(pkgKey);
      for (const [fKey, fVal] of this.uploadedFiles.entries()) {
        if (fVal.moduleName.toLowerCase() === pkgKey) {
          this.uploadedFiles.delete(fKey);
        }
      }
      this.onConsoleLog(`🗑️ Unloaded package/module '${entry.name}' from active session.`, "info");
      if (window.packageManagerUI) {
        window.packageManagerUI.renderPackages();
      }
    } catch (err) {
      this.onConsoleLog(`⚠️ Could not unload '${entry.name}': ${err.message}`, "stderr");
    }
  }

  async resetRuntime() {
    if (!this.isReady || !this.pyodide) return;
    this.onStatusChange("loading", "Resetting Runtime...");
    try {
      await this.pyodide.runPythonAsync(`
import sys
import builtins

# Close any open matplotlib figures
if "matplotlib.pyplot" in sys.modules:
    import matplotlib.pyplot as plt
    plt.close("all")

# Clear user-defined global variables while preserving hooks
_keep = {
    "__name__", "__doc__", "__package__", "__loader__", "__spec__",
    "__annotations__", "__builtins__", "sys", "io", "os", "json",
    "base64", "builtins", "js", "display_html", "display_image",
    "activate_canvas", "__webcode_setup_visual_hooks", "__webcode_flush_visuals",
    "_orig_import", "_in_webcode_hook", "_webcode_import"
}
for _k in list(globals().keys()):
    if _k not in _keep:
        del globals()[_k]
`);
      if (window.visualEngine) {
        window.visualEngine.prepareForNewRun();
      }
      this.onConsoleLog(
        "🔄 Python runtime namespace & visual buffers have been reset.",
        "system"
      );
    } catch (err) {
      this.onConsoleLog(`⚠️ Reset warning: ${err.message}`, "stderr");
    } finally {
      this.isRunning = false;
      this.onStatusChange("ready", "Ready");
    }
  }
}

window.pyodideManager = new PyodideManager();
