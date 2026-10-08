"""Make a publishable copy of the ROI Slack screenshot with every name replaced.

  python3 scripts/redact-roi-shot.py

Replaces the Slack bot display name with "ROI" and each ad-account label with
"Ad account 1".."Ad account 6" (painted over in the Slack background colour, then
redrawn), restores the clipped header time ("30 PM Update" -> "7:30 PM Update",
matching the message's 7:30 PM timestamp), and writes
public/shots/roi-bot-redacted.png. The image is not cropped: both totals stay
visible ("Profit" = completed calls; "Net Profit" adds estimated revenue from
calls still live). Only that redacted copy
may be used on public pages. Needs Pillow and the Lato font (Slack's UI font);
set LATO_DIR to override.
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "scripts/source-images/roi-bot.png")  # unredacted original, kept out of public/
OUT = os.path.join(ROOT, "public/shots/roi-bot-redacted.png")
LATO = os.environ.get("LATO_DIR", "/usr/share/fonts/truetype/sand-box/google/Lato")

BG = (26, 29, 33)
TEXT = (209, 210, 211)
NAME = (248, 248, 248)

im = Image.open(SRC).convert("RGB")
draw = ImageDraw.Draw(im)
regular = ImageFont.truetype(os.path.join(LATO, "Lato-Regular.ttf"), 13)
bold = ImageFont.truetype(os.path.join(LATO, "Lato-Black.ttf"), 15)

# Bot display name (left of the APP badge).
draw.rectangle((57, 4, 132, 26), fill=BG)
draw.text((58, 6), "ROI", font=bold, fill=NAME)

# Header: the source shows "30 PM Update" with the hour clipped (a stray colon
# fragment remains at x~82). Clear that gap and draw "7:" so it ends exactly where
# the original "3" starts. Lato Regular 14 px, origin (100, 53), best pixel match
# to the original "30 PM Update" glyphs, which are left untouched.
header = ImageFont.truetype(os.path.join(LATO, "Lato-Regular.ttf"), 14)
draw.rectangle((80, 52, 99, 72), fill=BG)
draw.text((100 - header.getlength("7:"), 53), "7:", font=header, fill=TEXT)

# Ad-account labels: (top, bottom, right edge of the label) per row, measured from the source.
rows = [(84, 96, 153), (104, 116, 153), (124, 136, 153), (144, 156, 153), (164, 176, 153), (183, 195, 162)]
for i, (top, bottom, right) in enumerate(rows, start=1):
    draw.rectangle((56, top - 3, right + 1, bottom + 3), fill=BG)
    # Same font size and baseline as the original label, left-aligned like Slack.
    draw.text((58, top - 3), f"Ad account {i}", font=regular, fill=TEXT)

im.save(OUT, optimize=True)
print(f"wrote {OUT}")
