"""
Generate synthetic invoice/receipt images for testing (Python + Pillow).

Run from the project root:  python scripts/gen_samples.py

Each generated image should get a matching hand-written ground-truth JSON in
samples/ (same base name) — see samples/README.md.
"""
from PIL import Image, ImageDraw, ImageFont


def font(size, bold=False):
    path = "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"
    return ImageFont.truetype(path, size)


def gen_invoice_acme(out="samples/invoice-acme-01.png"):
    W, H = 800, 1000
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    black, gray = (20, 20, 20), (110, 110, 110)

    d.text((50, 40), "ACME Office Supplies GmbH", font=font(26, True), fill=black)
    d.text((50, 78), "Industriestrasse 12, 1010 Wien, Austria", font=font(14), fill=gray)
    d.text((50, 98), "UID: ATU12345678", font=font(14), fill=gray)
    d.text((560, 44), "INVOICE", font=font(30, True), fill=(40, 60, 140))

    d.text((560, 90), "Invoice No: 2026-0042", font=font(14), fill=black)
    d.text((560, 112), "Date: 14.05.2026", font=font(14), fill=black)
    d.text((560, 134), "Due: 13.06.2026", font=font(14), fill=black)

    d.text((50, 150), "Bill to: Muster Handels GmbH, Linzer Str. 5, 4020 Linz", font=font(14), fill=black)
    d.line((50, 185, 750, 185), fill=(200, 200, 200), width=2)

    y = 205
    d.text((50, y), "Description", font=font(14, True), fill=black)
    d.text((430, y), "Qty", font=font(14, True), fill=black)
    d.text((520, y), "Unit", font=font(14, True), fill=black)
    d.text((650, y), "Amount", font=font(14, True), fill=black)
    y += 28
    rows = [
        ("Printer paper A4 (500 sheets)", "10", "4.50", "45.00"),
        ("Ballpoint pens (box of 50)", "3", "8.90", "26.70"),
        ("Stapler heavy duty", "2", "15.00", "30.00"),
        ("USB-C cable 2m", "5", "9.20", "46.00"),
    ]
    for desc, q, u, a in rows:
        d.text((50, y), desc, font=font(14), fill=black)
        d.text((430, y), q, font=font(14), fill=black)
        d.text((520, y), u, font=font(14), fill=black)
        d.text((650, y), a, font=font(14), fill=black)
        y += 26

    d.line((50, y + 6, 750, y + 6), fill=(200, 200, 200), width=1)
    y += 24
    d.text((520, y), "Subtotal:", font=font(14), fill=black)
    d.text((650, y), "147.70", font=font(14), fill=black)
    y += 24
    d.text((520, y), "VAT 20% (on 121.70):", font=font(12), fill=gray)
    d.text((650, y), "24.34", font=font(14), fill=black)
    y += 22
    d.text((520, y), "VAT 10% (on 26.00):", font=font(12), fill=gray)
    d.text((650, y), "2.60", font=font(14), fill=black)
    y += 26
    d.text((520, y), "TOTAL EUR:", font=font(16, True), fill=black)
    d.text((650, y), "174.64", font=font(16, True), fill=black)

    d.text((50, 940), "Payment within 30 days. Thank you for your business.", font=font(12), fill=gray)

    img.save(out)
    print("wrote", out, img.size)


if __name__ == "__main__":
    gen_invoice_acme()
