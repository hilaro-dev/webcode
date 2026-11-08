// webcode — Python Code Editor & Mobile Touch Toolbar Controller

class EditorController {
  constructor() {
    this.cm = null;
    this.textarea = null;
    this.cursorStatusEl = null;
    this.onRunShortcut = null;
  }

  init(initialCode, onRunShortcut) {
    this.textarea = document.getElementById("python-editor-textarea");
    this.cursorStatusEl = document.getElementById("editor-cursor-status");
    this.onRunShortcut = onRunShortcut || (() => {});

    if (!this.textarea) return;
    this.textarea.value = initialCode || "";

    if (typeof CodeMirror !== "undefined") {
      this.cm = CodeMirror.fromTextArea(this.textarea, {
        mode: {
          name: "python",
          version: 3,
          singleLineStringErrors: false,
        },
        theme: "webcode",
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        smartIndent: true,
        lineWrapping: false,
        styleActiveLine: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        inputStyle: "contenteditable",
        extraKeys: {
          "Ctrl-Enter": () => this.onRunShortcut(),
          "Cmd-Enter": () => this.onRunShortcut(),
          "Shift-Enter": () => this.onRunShortcut(),
          Tab: (cm) => {
            if (cm.somethingSelected()) {
              cm.indentSelection("add");
            } else {
              cm.replaceSelection("    ", "end", "+input");
            }
          },
          "Shift-Tab": (cm) => {
            cm.indentSelection("subtract");
          },
        },
      });

      this.cm.on("cursorActivity", () => {
        const pos = this.cm.getCursor();
        if (this.cursorStatusEl) {
          this.cursorStatusEl.textContent = `Ln ${pos.line + 1}, Col ${pos.ch + 1}`;
        }
      });
    } else {
      // Fallback if CodeMirror CDN fails
      this.textarea.classList.remove("hidden");
      this.textarea.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          this.onRunShortcut();
        }
      });
    }

    this.initMobileToolbar();
  }

  initMobileToolbar() {
    document.querySelectorAll("[data-insert-token]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const token = btn.getAttribute("data-insert-token");
        this.insertToken(token);
      });
    });

    const undoBtn = document.getElementById("mobile-key-undo");
    const redoBtn = document.getElementById("mobile-key-redo");

    if (undoBtn) {
      undoBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.undo();
      });
    }
    if (redoBtn) {
      redoBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.redo();
      });
    }
  }

  insertToken(token) {
    if (!this.cm) {
      if (!this.textarea) return;
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const val = this.textarea.value;
      const actual = token === "TAB" ? "    " : token;
      this.textarea.value = val.slice(0, start) + actual + val.slice(end);
      this.textarea.selectionStart = this.textarea.selectionEnd = start + actual.length;
      this.textarea.focus();
      return;
    }

    const doc = this.cm.getDoc();
    const cursor = doc.getCursor();

    if (token === "TAB") {
      doc.replaceSelection("    ");
    } else if (token === "()" || token === '""' || token === "''" || token === "[]") {
      doc.replaceRange(token, cursor);
      doc.setCursor({ line: cursor.line, ch: cursor.ch + 1 });
    } else {
      doc.replaceSelection(token);
    }
    this.cm.focus();
  }

  undo() {
    if (this.cm) {
      this.cm.undo();
      this.cm.focus();
    }
  }

  redo() {
    if (this.cm) {
      this.cm.redo();
      this.cm.focus();
    }
  }

  getValue() {
    if (this.cm) return this.cm.getValue();
    return this.textarea ? this.textarea.value : "";
  }

  setValue(code) {
    if (this.cm) {
      this.cm.setValue(code);
      this.cm.refresh();
    } else if (this.textarea) {
      this.textarea.value = code;
    }
  }

  refresh() {
    if (this.cm) {
      setTimeout(() => this.cm.refresh(), 20);
    }
  }
}

window.editorController = new EditorController();
