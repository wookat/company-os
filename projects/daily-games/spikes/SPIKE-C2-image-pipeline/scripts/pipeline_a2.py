#!/usr/bin/env python3
"""Route A v2: object-aware diff injection on AI base images.

Finds color-connected components (object-like blobs), then either:
  - recolor: hue-rotate exactly the component pixels (keeps shape/shading)
  - erase: fill component with its dominant neighboring color (object vanishes)
Metadata records tight bbox + centroid per diff for click-hit testing.
"""
import os, json, colorsys
import numpy as np
from PIL import Image
from scipy import ndimage

OUT = os.path.dirname(os.path.abspath(__file__))

def components(arr):
    q = (arr >> 4)
    key = q[:, :, 0].astype(np.int32) * 4096 + q[:, :, 1].astype(np.int32) * 64 + q[:, :, 2]
    comps = []
    for val in np.unique(key):
        mask = key == val
        if mask.sum() < 400:
            continue
        lab, n = ndimage.label(mask)
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        for i, s in enumerate(sizes, 1):
            if 500 <= s <= 12000:
                comps.append(lab == i)
    return comps

def comp_info(m):
    ys, xs = np.where(m)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    w, h = x1 - x0 + 1, y1 - y0 + 1
    return x0, y0, w, h, m.sum() / (w * h)

def ring_contrast(arr, m):
    ring = ndimage.binary_dilation(m, iterations=5) & ~m
    return float(np.abs(np.median(arr[m], axis=0).astype(np.float32) - np.median(arr[ring], axis=0).astype(np.float32)).sum())

def saturation(arr, m):
    px = arr[m].astype(np.float32)
    return float((px.max(axis=1) - px.min(axis=1)).mean())

def recolor(arr, m, rng):
    px = arr[m].astype(np.float32) / 255.0
    hs = np.array([colorsys.rgb_to_hsv(*p) for p in px])
    hs[:, 0] = (hs[:, 0] + rng.uniform(0.3, 0.55)) % 1.0
    hs[:, 1] = np.clip(hs[:, 1] * 1.05 + 0.05, 0, 1)
    out = np.array([colorsys.hsv_to_rgb(*p) for p in hs]) * 255
    arr[m] = out.astype(np.uint8)
    return True

def erase(arr, m, rng):
    ring = ndimage.binary_dilation(m, iterations=6) & ~ndimage.binary_dilation(m, iterations=1)
    ring_px = arr[ring]
    if ring_px.std(axis=0).mean() > 26:
        return False
    fill = np.median(ring_px, axis=0)
    grown = ndimage.binary_dilation(m, iterations=2)
    arr[grown] = fill.astype(np.uint8)
    return True

def make_pair(name, base_path, n_diffs, seed):
    rng = np.random.RandomState(seed)
    orig = np.array(Image.open(base_path).convert("RGB"))
    mod = orig.copy()
    comps = components(orig)
    # score: saturated + compact + not near border
    Hh, Ww = orig.shape[:2]
    scored = []
    for m in comps:
        x, y, w, h, fill = comp_info(m)
        if x < 15 or y < 15 or x + w > Ww - 15 or y + h > Hh - 15:
            continue
        if fill < 0.28 or max(w, h) > 260 or m.sum() < 600:
            continue
        rc = ring_contrast(orig, m)
        if rc < 50:  # blends into surroundings -> likely a patch inside an object
            continue
        scored.append((saturation(orig, m) * fill + rc * 0.3, m))
    scored.sort(key=lambda t: -t[0])
    diffs, used = [], np.zeros((Hh, Ww), bool)
    for sc, m in scored:
        if len(diffs) >= n_diffs:
            break
        big = ndimage.binary_dilation(m, iterations=22)
        if (big & used).any():
            continue
        etype = "erase" if (len(diffs) % 3 == 2) else "recolor"
        trial = mod.copy()
        fn = erase if etype == "erase" else recolor
        if not fn(trial, m, rng):
            etype = "recolor"
            trial = mod.copy()
            recolor(trial, m, rng)
        delta = np.abs(trial.astype(np.int16) - mod.astype(np.int16)).sum(axis=2)
        if delta.max() < 60 or delta[delta > 30].size < 400:
            continue
        ys, xs = np.where(delta > 30)
        x0, y0 = int(xs.min()), int(ys.min())
        bw, bh = int(xs.max() - x0 + 1), int(ys.max() - y0 + 1)
        mod = trial
        used |= big
        diffs.append({"type": etype, "bbox": [x0, y0, bw, bh],
                      "center": [x0 + bw // 2, y0 + bh // 2],
                      "area_px": int((delta > 30).sum())})
    Image.fromarray(orig).save(f"{OUT}/pairs/{name}_A.png")
    Image.fromarray(mod).save(f"{OUT}/pairs/{name}_B.png")
    meta = {"pair": name, "route": "A_ai_base_object_edit", "size": [Ww, Hh],
            "n_diffs": len(diffs), "diffs": diffs}
    json.dump(meta, open(f"{OUT}/meta/{name}.json", "w"), indent=1)
    return meta

if __name__ == "__main__":
    import glob
    ok = 0
    for i, p in enumerate(sorted(glob.glob(f"{OUT}/a_base/*.png"))):
        name = "a_" + os.path.basename(p)[:-4]
        if name in ("a_test_flux", "a_test_inpaint"):
            continue
        m = make_pair(name, p, n_diffs=7, seed=2000 + i)
        print(name, m["n_diffs"], [d["type"] for d in m["diffs"]])
        ok += m["n_diffs"] >= 5
    print("pairs >=5 diffs:", ok)
