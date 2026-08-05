#!/usr/bin/env python3
"""Route A: AI base image (Workers AI flux-1-schnell) + programmatic diff injection.

Diffs are pixel-locatable (bbox in metadata). Edit types:
  - hue_shift: rotate hue of the dominant color-cluster inside a region (object recolor)
  - flip: mirror a small region horizontally
  - erase: replace an isolated small blob with surrounding background color
All edits verified: pixel delta inside bbox above threshold, zero outside.
"""
import os, sys, io, json, base64, random, colorsys, time
import requests
import numpy as np
from PIL import Image

ACC = "ddff52d24ee44e21a021c15eaffcc86d"
TOKEN = os.environ["CLOUDFLARE_API_TOKEN"]
H = {"Authorization": f"Bearer {TOKEN}"}
MODEL = "@cf/black-forest-labs/flux-1-schnell"
OUT = os.path.dirname(os.path.abspath(__file__))

SCENES = [
    ("kitchen", "a cozy cartoon kitchen scene, flat vector illustration, bright colors, many distinct small objects: teapot, cat, wall clock, fruit bowl, potted plants, window, jars on shelves"),
    ("park", "a cheerful cartoon park scene, flat vector illustration, bright colors, many distinct small objects: bench, balloons, dog, kite, ice cream cart, trees, birds, fountain"),
    ("beach", "a sunny cartoon beach scene, flat vector illustration, bright colors, many distinct small objects: umbrella, sandcastle, crab, beach ball, sailboat, seagulls, starfish, cocktail"),
    ("space", "a playful cartoon outer space scene, flat vector illustration, bright colors, many distinct small objects: rocket, planets with rings, astronaut, satellite, stars, comet, alien, moon"),
    ("farm", "a cute cartoon farm scene, flat vector illustration, bright colors, many distinct small objects: barn, tractor, chicken, sunflowers, scarecrow, sheep, windmill, apple tree"),
    ("city", "a lively cartoon city street scene, flat vector illustration, bright colors, many distinct small objects: cafe storefront, bicycle, traffic light, hot dog stand, pigeons, streetlamp, bus stop, flower boxes"),
    ("forest", "a magical cartoon forest scene, flat vector illustration, bright colors, many distinct small objects: mushrooms, fox, owl on branch, lantern, butterflies, tree stump, ferns, tiny house door"),
    ("desk", "a tidy cartoon office desk scene, flat vector illustration, bright colors, many distinct small objects: laptop, coffee mug, cactus, sticky notes, desk lamp, books, pencil cup, headphones"),
    ("winter", "a cozy cartoon winter village scene, flat vector illustration, bright colors, many distinct small objects: snowman, cottages, pine trees, sled, streetlamp, snowflakes, mittens on a line, chimney smoke"),
    ("aquarium", "a colorful cartoon aquarium scene, flat vector illustration, bright colors, many distinct small objects: tropical fish, treasure chest, bubbles, coral, seahorse, diver figurine, seaweed, snail"),
    ("market", "a busy cartoon farmers market scene, flat vector illustration, bright colors, many distinct small objects: fruit stall, awning, baskets, cheese wheel, flowers bucket, price signs, cash box, watermelon"),
    ("bedroom", "a cute cartoon kids bedroom scene, flat vector illustration, bright colors, many distinct small objects: bunk bed, teddy bear, toy train, bookshelf, star mobile, rug, alarm clock, drawing on wall"),
]

def gen_base(name, prompt, seed):
    path = f"{OUT}/a_base/{name}.png"
    if os.path.exists(path):
        return path
    for attempt in range(3):
        r = requests.post(f"https://api.cloudflare.com/client/v4/accounts/{ACC}/ai/run/{MODEL}",
                          headers=H, json={"prompt": prompt, "steps": 8, "seed": seed}, timeout=180)
        if r.ok and r.json().get("result"):
            open(path, "wb").write(base64.b64decode(r.json()["result"]["image"]))
            return path
        time.sleep(3)
    raise RuntimeError(f"gen failed {name}: {r.status_code} {r.text[:200]}")

def region_score(arr, x, y, w, h):
    """Prefer colorful, locally-distinct regions (likely objects)."""
    box = arr[y:y+h, x:x+w].astype(np.float32)
    sat = box.max(axis=2) - box.min(axis=2)
    return float(sat.mean()) + float(box.std())

def pick_regions(arr, n, size_range=(70, 130), tries=900, rng=None):
    Hh, Ww = arr.shape[:2]
    cands = []
    for _ in range(tries):
        s = rng.randint(*size_range)
        x = rng.randint(10, Ww - s - 10); y = rng.randint(10, Hh - s - 10)
        cands.append((region_score(arr, x, y, s, s), x, y, s))
    cands.sort(reverse=True)
    chosen = []
    for sc, x, y, s in cands:
        if all(abs(x-cx) > (s+cs)//2 + 30 or abs(y-cy) > (s+cs)//2 + 30 for _, cx, cy, cs in chosen):
            chosen.append((sc, x, y, s))
        if len(chosen) == n:
            break
    return [(x, y, s, s) for _, x, y, s in chosen]

def dominant_mask(box):
    """Mask of pixels close to the dominant color cluster in the box."""
    q = (box >> 5).reshape(-1, 3)
    keys, counts = np.unique(q, axis=0, return_counts=True)
    dom = keys[counts.argmax()].astype(np.int16)
    dist = np.abs((box.astype(np.int16) >> 5) - dom).sum(axis=2)
    return dist <= 1

def hue_shift(arr, bbox, rng):
    x, y, w, h = bbox
    box = arr[y:y+h, x:x+w]
    m = dominant_mask(box)
    if m.mean() < 0.15:
        return False
    px = box[m].astype(np.float32) / 255.0
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in px])
    hsv[:, 0] = (hsv[:, 0] + rng.uniform(0.28, 0.5)) % 1.0
    hsv[:, 1] = np.clip(hsv[:, 1] * 1.1 + 0.08, 0, 1)
    out = np.array([colorsys.hsv_to_rgb(*p) for p in hsv]) * 255
    box[m] = out.astype(np.uint8)
    arr[y:y+h, x:x+w] = box
    return True

def flip_region(arr, bbox, rng):
    x, y, w, h = bbox
    box = arr[y:y+h, x:x+w]
    if box.std() < 18:  # nothing to flip
        return False
    arr[y:y+h, x:x+w] = box[:, ::-1]
    return True

def erase_region(arr, bbox, rng):
    """Fill region with the median border color (works on flat backgrounds)."""
    x, y, w, h = bbox
    border = np.concatenate([arr[y-4:y, x:x+w].reshape(-1, 3), arr[y+h:y+h+4, x:x+w].reshape(-1, 3),
                             arr[y:y+h, x-4:x].reshape(-1, 3), arr[y:y+h, x+w:x+w+4].reshape(-1, 3)])
    med = np.median(border, axis=0)
    if border.std(axis=0).mean() > 22:  # border not uniform -> would look patchy
        return False
    box = arr[y:y+h, x:x+w]
    if np.abs(box.astype(np.float32) - med).mean() < 20:  # nothing distinct inside
        return False
    arr[y:y+h, x:x+w] = med.astype(np.uint8)
    return True

EDITS = [hue_shift, hue_shift, hue_shift, flip_region, erase_region]

def make_pair(name, base_path, n_diffs, seed):
    rng = random.Random(seed)
    nprng = np.random.RandomState(seed)
    class R:  # bridge rng for pick_regions
        randint = staticmethod(lambda a, b: int(nprng.randint(a, b + 1)))
        uniform = staticmethod(lambda a, b: float(nprng.uniform(a, b)))
    orig = np.array(Image.open(base_path).convert("RGB"))
    mod = orig.copy()
    regions = pick_regions(orig, n_diffs * 3, rng=R)
    diffs = []
    for bbox in regions:
        if len(diffs) >= n_diffs:
            break
        edit = EDITS[len(diffs) % len(EDITS)]
        trial = mod.copy()
        if not edit(trial, bbox, R):
            continue
        x, y, w, h = bbox
        delta = np.abs(trial.astype(np.int16) - mod.astype(np.int16)).sum(axis=2)
        inside = delta[y:y+h, x:x+w].mean()
        outside_mask = np.ones(delta.shape, bool); outside_mask[y:y+h, x:x+w] = False
        if inside < 14 or delta[outside_mask].sum() != 0:
            continue
        changed_frac = (delta[y:y+h, x:x+w] > 30).mean()
        if changed_frac < 0.08:
            continue
        mod = trial
        diffs.append({"type": edit.__name__, "bbox": [int(x), int(y), int(w), int(h)],
                      "center": [int(x + w / 2), int(y + h / 2)],
                      "mean_delta": round(float(inside), 1), "changed_frac": round(float(changed_frac), 3)})
    Image.fromarray(orig).save(f"{OUT}/pairs/{name}_A.png")
    Image.fromarray(mod).save(f"{OUT}/pairs/{name}_B.png")
    meta = {"pair": name, "route": "A_ai_base_programmatic", "size": [orig.shape[1], orig.shape[0]],
            "n_diffs": len(diffs), "diffs": diffs}
    json.dump(meta, open(f"{OUT}/meta/{name}.json", "w"), indent=1)
    return meta

if __name__ == "__main__":
    results = []
    for i, (name, prompt) in enumerate(SCENES):
        p = gen_base(name, prompt, seed=20260802 + i)
        m = make_pair(f"a_{name}", p, n_diffs=6, seed=1000 + i)
        print(name, m["n_diffs"], [d["type"] for d in m["diffs"]])
        results.append(m)
    print("pairs with >=5 diffs:", sum(1 for m in results if m["n_diffs"] >= 5), "/", len(results))
