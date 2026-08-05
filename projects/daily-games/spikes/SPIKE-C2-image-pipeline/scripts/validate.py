#!/usr/bin/env python3
"""Validate all pairs: every changed pixel must fall inside some diff bbox (+pad),
and every diff bbox must contain visible change. Also emit annotated QA sheets."""
import glob, json, os
import numpy as np
from PIL import Image, ImageDraw

OUT = os.path.dirname(os.path.abspath(__file__))
os.makedirs(f"{OUT}/qa", exist_ok=True)
PAD = 18
report = []
for mp in sorted(glob.glob(f"{OUT}/meta/*.json")):
    m = json.load(open(mp))
    n = m["pair"]
    a = np.array(Image.open(f"{OUT}/pairs/{n}_A.png").convert("RGB")).astype(np.int16)
    b = np.array(Image.open(f"{OUT}/pairs/{n}_B.png").convert("RGB")).astype(np.int16)
    delta = np.abs(a - b).sum(axis=2)
    changed = delta > 30
    cover = np.zeros(changed.shape, bool)
    diff_ok = []
    for d in m["diffs"]:
        x, y, w, h = d["bbox"]
        x0, y0 = max(0, x - PAD), max(0, y - PAD)
        x1, y1 = min(changed.shape[1], x + w + PAD), min(changed.shape[0], y + h + PAD)
        cover[y0:y1, x0:x1] = True
        diff_ok.append(bool(changed[y0:y1, x0:x1].sum() > 150))
    stray = int((changed & ~cover).sum())
    report.append({"pair": n, "route": m["route"], "n_diffs": m["n_diffs"],
                   "all_diffs_visible": all(diff_ok), "stray_changed_px": stray})
    img = Image.open(f"{OUT}/pairs/{n}_B.png").convert("RGB")
    dr = ImageDraw.Draw(img)
    for d in m["diffs"]:
        x, y, w, h = d["bbox"]
        dr.rectangle([x - 6, y - 6, x + w + 6, y + h + 6], outline=(255, 0, 0), width=5)
    img.save(f"{OUT}/qa/{n}_annotated.png")
json.dump(report, open(f"{OUT}/qa/validation.json", "w"), indent=1)
bad = [r for r in report if not r["all_diffs_visible"] or r["stray_changed_px"] > 0]
print("pairs:", len(report), "| clean:", len(report) - len(bad))
for r in bad:
    print("ISSUE:", r)
