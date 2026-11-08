// webcode — Starter Code Templates & Visual Demos

window.WEBCODE_TEMPLATES = {
  starter: {
    name: "Starter: Console & Visual Plot",
    description: "Default starter script demonstrating stdout console metrics and a Matplotlib plot.",
    packages: ["numpy", "matplotlib"],
    code: `# ==========================================================
# webcode — Browser-Based Python IDE & Visual Sandbox
# Shortcut: Press Ctrl+Enter (or Cmd+Enter) to Run Code
# ==========================================================
import sys
import math
import numpy as np
import matplotlib.pyplot as plt

print("🚀 Welcome to webcode Python Runtime!")
print(f"🐍 Python Version : {sys.version.split()[0]}")
print(f"📦 NumPy Version  : {np.__version__}")
print("-" * 52)

# 1. Standard Console Computation
frequencies = [1.0, 2.5, 4.0]
x = np.linspace(0, 2 * math.pi, 400)
composite_signal = sum(np.sin(f * x) / idx for idx, f in enumerate(frequencies, 1))

print(f"Signal samples    : {len(x)}")
print(f"Peak amplitude    : {composite_signal.max():.4f}")
print(f"RMS energy        : {np.sqrt(np.mean(composite_signal**2)):.4f}")

# 2. Visual Plot (automatically routed to Visual Output Screen)
plt.style.use("dark_background")
fig, ax = plt.subplots(figsize=(8, 4.2), dpi=130)
fig.patch.set_facecolor("#0d1117")
ax.set_facecolor("#161b22")

ax.plot(x, np.sin(x), label="Fundamental sin(x)", color="#10b981", linewidth=2.2)
ax.plot(x, composite_signal, label="Harmonic Synthesis", color="#38bdf8", linewidth=1.8, alpha=0.9)
ax.fill_between(x, composite_signal, color="#38bdf8", alpha=0.12)

ax.set_title("webcode Visual Sandbox — Harmonic Wave Synthesis", fontsize=13, color="#e6edf3", pad=12)
ax.set_xlabel("Phase (radians)", color="#8b949e")
ax.set_ylabel("Amplitude", color="#8b949e")
ax.grid(True, linestyle="--", alpha=0.2, color="#484f58")
ax.legend(facecolor="#0d1117", edgecolor="#30363d", labelcolor="#e6edf3")

plt.tight_layout()
plt.show()
print("✅ Plot rendered to the Visual Output Screen below!")
`
  },

  visual_demo: {
    name: "Visual Demo: Sine Wave & Phase Spectrum",
    description: "Installs numpy & matplotlib and renders a dual-panel sine wave & Lissajous figure.",
    packages: ["numpy", "matplotlib"],
    code: `# ==========================================================
# webcode — One-Click Visual Demo (Matplotlib + NumPy)
# Generates a multi-panel Sine Wave & Phase Portrait
# ==========================================================
import numpy as np
import matplotlib.pyplot as plt

print("🔬 Generating Sine Wave & Harmonic Spectrum Demo...")

t = np.linspace(0, 4 * np.pi, 600)
carrier = np.sin(t)
modulated = np.sin(t) * np.cos(0.25 * t)
envelope = np.cos(0.25 * t)

plt.style.use("dark_background")
fig = plt.figure(figsize=(9.5, 4.6), dpi=140)
fig.patch.set_facecolor("#0d1117")

# Panel 1: Damped / Modulated Sine Wave
ax1 = fig.add_subplot(1, 2, 1)
ax1.set_facecolor("#161b22")
ax1.plot(t, carrier, color="#30363d", linestyle=":", linewidth=1.3, label="Carrier sin(t)")
ax1.plot(t, modulated, color="#10b981", linewidth=2.2, label="Modulated Wave")
ax1.plot(t, envelope, color="#f59e0b", linestyle="--", linewidth=1.4, label="Envelope ±cos(0.25t)")
ax1.plot(t, -envelope, color="#f59e0b", linestyle="--", linewidth=1.4)
ax1.fill_between(t, modulated, color="#10b981", alpha=0.15)
ax1.set_title("Amplitude-Modulated Sine Wave", color="#e6edf3", fontsize=12, pad=10)
ax1.set_xlabel("Time (rad)", color="#8b949e")
ax1.set_ylabel("Amplitude", color="#8b949e")
ax1.grid(True, alpha=0.18, linestyle="--")
ax1.legend(loc="upper right", fontsize=8, facecolor="#0d1117", edgecolor="#30363d")

# Panel 2: Lissajous Phase Space (3:4 Harmonic Ratio)
ax2 = fig.add_subplot(1, 2, 2)
ax2.set_facecolor("#161b22")
theta = np.linspace(0, 2 * np.pi, 800)
lx = np.sin(3 * theta + np.pi / 4)
ly = np.sin(4 * theta)
scatter = ax2.scatter(lx, ly, c=theta, cmap="viridis", s=8, alpha=0.85)
ax2.set_title("Lissajous Phase Orbit (3:4)", color="#e6edf3", fontsize=12, pad=10)
ax2.set_xlabel("X = sin(3θ + π/4)", color="#8b949e")
ax2.set_ylabel("Y = sin(4θ)", color="#8b949e")
ax2.grid(True, alpha=0.18, linestyle="--")
ax2.set_aspect("equal")

plt.tight_layout()
plt.show()

print(f"📊 Rendered {len(t)} time steps across 2 visual subplots.")
print("💡 Tip: Click the plot image below to zoom in or download as PNG!")
`
  },

  html_interactive: {
    name: "Interactive HTML / SVG Dashboard",
    description: "Renders interactive HTML & vector SVG widgets into #visual-output-root.",
    packages: [],
    code: `# ==========================================================
# webcode — HTML / SVG Interactive Visual Hook Demo
# Use display_html(...) or return an object with _repr_html_()
# ==========================================================
import math

print("🎨 Building interactive SVG + HTML telemetry card...")

bars = [
    ("CPU Core 0", 78, "#10b981"),
    ("WASM Heap", 54, "#38bdf8"),
    ("Vector ALU", 91, "#a855f7"),
    ("I/O Pipeline", 36, "#f59e0b"),
]

# Generate an SVG sparkline wave
points = " ".join(
    f"{i * 12},{45 - int(math.sin(i * 0.45) * 28 + math.cos(i * 0.2) * 10)}"
    for i in range(36)
)

bars_html = "".join(f"""
  <div style="margin-bottom: 10px;">
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;color:#e6edf3;">
      <span>{label}</span>
      <span style="color:{color};font-family:monospace;font-weight:600;">{val}%</span>
    </div>
    <div style="height:8px;background:#0d1117;border-radius:999px;overflow:hidden;border:1px solid #30363d;">
      <div style="width:{val}%;height:100%;background:{color};border-radius:999px;"></div>
    </div>
  </div>
""" for label, val, color in bars)

html_widget = f"""
<div style="background:#161b22;border:1px solid #30363d;border-radius:10px;padding:16px;color:#e6edf3;font-family:Inter,sans-serif;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
    <div>
      <h4 style="margin:0;font-size:15px;color:#10b981;">⚡ Real-Time Telemetry HTML/SVG View</h4>
      <p style="margin:2px 0 0;font-size:12px;color:#8b949e;">Rendered inside #visual-output-root sandbox</p>
    </div>
    <span style="font-size:11px;background:rgba(16,185,129,0.15);color:#10b981;padding:4px 8px;border-radius:6px;border:1px solid rgba(16,185,129,0.3);">
      DOM + SVG Active
    </span>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;align-items:center;">
    <div>{bars_html}</div>
    <div style="background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:12px;text-align:center;">
      <div style="font-size:11px;color:#8b949e;margin-bottom:6px;">Harmonic SVG Waveform</div>
      <svg viewBox="0 0 420 90" style="width:100%;height:90px;overflow:visible;">
        <polyline fill="none" stroke="#10b981" stroke-width="2.5" points="{points}" />
      </svg>
    </div>
  </div>
</div>
"""

display_html(html_widget)
print("✅ Interactive HTML/SVG widget mounted in #visual-output-root.")
`
  },

  canvas_turtle: {
    name: "Canvas 2D / Geometric Spirograph",
    description: "Draws directly onto the HTML5 <canvas id='canvas'> element from Python.",
    packages: [],
    code: `# ==========================================================
# webcode — HTML5 <canvas id="canvas"> Direct 2D Graphics
# Uses Pyodide JS bridge to draw onto the dedicated canvas
# ==========================================================
import math
from js import document

canvas = document.getElementById("canvas")
canvas.width = 680
canvas.height = 360
ctx = canvas.getContext("2d")

# Activate the canvas panel in webcode's Visual Output Screen
activate_canvas("Geometric Hypotrochoid Spirograph (HTML5 Canvas)")

# Background fill
ctx.fillStyle = "#0d1117"
ctx.fillRect(0, 0, canvas.width, canvas.height)

cx, cy = canvas.width / 2, canvas.height / 2
R, r, d = 125, 48, 78

ctx.lineWidth = 1.6
steps = 1800
for i in range(steps):
    t1 = (i / steps) * 24 * math.pi
    t2 = ((i + 1) / steps) * 24 * math.pi

    x1 = cx + (R - r) * math.cos(t1) + d * math.cos(((R - r) / r) * t1)
    y1 = cy + (R - r) * math.sin(t1) - d * math.sin(((R - r) / r) * t1)

    x2 = cx + (R - r) * math.cos(t2) + d * math.cos(((R - r) / r) * t2)
    y2 = cy + (R - r) * math.sin(t2) - d * math.sin(((R - r) / r) * t2)

    hue = int((i / steps) * 160 + 135)
    ctx.strokeStyle = f"hsl({hue}, 85%, 60%)"
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

print("🎯 Rendered 1,800 vector segments onto <canvas id='canvas'>!")
`
  },

  pil_imaging: {
    name: "Pillow (PIL) Procedural Image",
    description: "Synthesizes a fractal/gradient image with PIL.Image and renders it to the Visual Screen.",
    packages: ["pillow", "numpy"],
    code: `# ==========================================================
# webcode — PIL / Pillow Image Hook Demo
# Calling img.show() or display_image(img) renders directly!
# ==========================================================
import numpy as np
from PIL import Image, ImageDraw

print("🖼️ Synthesizing procedural plasma image with Pillow (PIL)...")

w, h = 520, 280
x = np.linspace(-3.2, 3.2, w)
y = np.linspace(-1.8, 1.8, h)
xx, yy = np.meshgrid(x, y)

wave = np.sin(xx * 2.5 + np.cos(yy * 3.0)) + np.cos( np.sqrt(xx**2 + yy**2) * 3.5 )
norm = (wave - wave.min()) / (wave.max() - wave.min())

rgb = np.zeros((h, w, 3), dtype=np.uint8)
rgb[..., 0] = (np.sin(norm * 3.14) * 45).astype(np.uint8)
rgb[..., 1] = (norm * 215 + 30).astype(np.uint8)
rgb[..., 2] = ((1.0 - norm) * 190 + 55).astype(np.uint8)

img = Image.fromarray(rgb, mode="RGB")
draw = ImageDraw.Draw(img)
draw.rectangle([12, 12, 235, 42], fill=(13, 17, 23), outline=(16, 185, 129))
draw.text((22, 22), "webcode PIL.Image Output", fill=(16, 185, 129))

# Trigger the PIL visual hook
img.show()
print(f"✅ PIL Image ({img.width}x{img.height} {img.mode}) rendered to Visual Output!")
`
  }
};
