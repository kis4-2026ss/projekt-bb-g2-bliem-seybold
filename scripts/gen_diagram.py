"""Render a presentation-ready system-flow diagram (16:9 PNG) for the app."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1600, 900
img = Image.new("RGB", (W, H), "#f8fafc")
d = ImageDraw.Draw(img)

INDIGO = "#4f46e5"; INK = "#1e293b"; GRAY = "#64748b"
EMERALD = "#059669"; EM_BG = "#d1fae5"; SLATE = "#475569"; SL_BG = "#e2e8f0"
WHITE = "#ffffff"; BORDER = "#cbd5e1"; SHADOW = "#e2e8f0"

def font(sz, bold=False):
    p = "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"
    return ImageFont.truetype(p, sz)

def ctext(cx, y, text, fnt, fill, anchor="mm"):
    d.text((cx, y), text, font=fnt, fill=fill, anchor=anchor)

def rrect(x, y, w, h, r, fill, outline=None, width=1, shadow=False):
    if shadow:
        d.rounded_rectangle((x+4, y+5, x+w+4, y+h+5), r, fill=SHADOW)
    d.rounded_rectangle((x, y, x+w, y+h), r, fill=fill, outline=outline, width=width)

def stage(x, w, header, body):
    y, h = 395, 152
    rrect(x, y, w, h, 14, WHITE, BORDER, 1, shadow=True)
    d.rounded_rectangle((x, y, x+w, y+44), 14, fill=INDIGO)
    d.rectangle((x, y+30, x+w, y+44), fill=INDIGO)  # square off bottom of header
    ctext(x+w/2, y+22, header, font(20, True), WHITE)
    for i, line in enumerate(body):
        ctext(x+w/2, y+74 + i*26, line, font(16), GRAY)
    return (x, y, w, h)

def arrow_h(x1, x2, y, color=SLATE, w=4):
    d.line((x1, y, x2-10, y), fill=color, width=w)
    d.polygon([(x2, y), (x2-13, y-8), (x2-13, y+8)], fill=color)

def arrow_v_double(x, y_top, y_bot, color=SLATE, w=4, dashed=False):
    if dashed:
        yy = y_top
        while yy < y_bot:
            d.line((x, yy, x, min(yy+10, y_bot)), fill=color, width=w); yy += 18
    else:
        d.line((x, y_top, x, y_bot), fill=color, width=w)
    d.polygon([(x, y_top-1), (x-8, y_top+12), (x+8, y_top+12)], fill=color)      # up head
    if not dashed:
        d.polygon([(x, y_bot+1), (x-8, y_bot-12), (x+8, y_bot-12)], fill=color)  # down head

# --- Title ---
ctext(W/2, 42, "AI-Powered Invoice -> JSON   ·   System Flow", font(34, True), INK)
ctext(W/2, 80, "The same document is sent to many models, then compared on quality, latency and tokens.",
      font(18), GRAY)

# --- 5 pipeline stages ---
bw, gap, x0 = 250, 62, 50
stages = [
    ("1 · Upload", ["Invoice / receipt", "drag-drop · paste", "PNG · JPG · PDF"]),
    ("2 · Send to API", ["base64 over HTTPS", "API keys stay", "on the server"]),
    ("3 · Model layer", ["one interface,", "any model", "(swap freely)"]),
    ("4 · Extract + check", ["parse JSON and", "validate against", "the Zod schema"]),
    ("5 · Compare + score", ["latency · tokens", "JSON side by side", "accuracy vs truth"]),
]
xs = []
for i, (hd, bd) in enumerate(stages):
    x = x0 + i*(bw+gap); xs.append(x); stage(x, bw, hd, bd)
for i in range(4):
    arrow_h(xs[i]+bw, xs[i+1], 471)

# --- AI models container above stage 3 ---
cx3 = xs[2] + bw/2
cw = 620; cx = cx3 - cw/2; cy, ch = 112, 150
rrect(cx, cy, cw, ch, 16, "#eef2ff", "#c7d2fe", 1, shadow=True)
ctext(cx3, cy+24, "AI MODELS  —  pick one or many", font(18, True), INDIGO)
chips = [("Gemini", "free", EM_BG, EMERALD), ("OpenRouter", "free", EM_BG, EMERALD),
         ("GPT-4o", "paid", SL_BG, SLATE), ("Claude", "paid", SL_BG, SLATE)]
chw, chh = 128, 60; cgap = (cw - 40 - 4*chw) / 3; cxs0 = cx + 20
for i, (nm, tag, bg, fg) in enumerate(chips):
    chx = cxs0 + i*(chw+cgap); chy = cy+58
    rrect(chx, chy, chw, chh, 12, bg)
    ctext(chx+chw/2, chy+22, nm, font(18, True), fg)
    ctext(chx+chw/2, chy+44, "("+tag+")", font(14), fg)
arrow_v_double(cx3, cy+ch, 395)

# --- Ground truth below stage 5 ---
cx5 = xs[4] + bw/2
gw, gh = 250, 86; gx = cx5 - gw/2; gy = 620
rrect(gx, gy, gw, gh, 14, "#fffbeb", "#fde68a", 1, shadow=True)
ctext(cx5, gy+30, "samples/ *.json", font(19, True), "#b45309")
ctext(cx5, gy+58, "known-correct answers", font(15), "#b45309")
d.line((cx5, gy, cx5, 555), fill="#d97706", width=4)
yy = 555
while yy < gy:
    d.line((cx5, yy, cx5, min(yy+10, gy)), fill="#d97706", width=4); yy += 18
d.polygon([(cx5, 547), (cx5-8, 560), (cx5+8, 560)], fill="#d97706")

# --- Legend ---
ly = 800
d.rounded_rectangle((50, ly, 74, ly+24), 6, fill=EM_BG); ctext(86, ly+12, "free model", font(16), GRAY, "lm")
d.rounded_rectangle((230, ly, 254, ly+24), 6, fill=SL_BG); ctext(266, ly+12, "paid model", font(16), GRAY, "lm")
d.line((430, ly+2, 430, ly+22), fill="#d97706", width=4)
ctext(444, ly+12, "ground truth (dashed) feeds the scoring step", font(16), GRAY, "lm")
ctext(W-50, ly+12, "All models run at temperature 0 for a fair comparison.", font(16), GRAY, "rm")

img.save("docs/flow-diagram.png")
print("wrote docs/flow-diagram.png", img.size)
