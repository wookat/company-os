#!/usr/bin/env python3
"""Route B: pure procedural SVG scene composition.

Scenes are built from a parametric object library; the B version re-renders with
N object-level mutations (recolor / remove / flip / resize / swap-variant).
Coordinates are exact by construction. Rendered to PNG via cairosvg.
"""
import os, json, random, copy
import cairosvg

OUT = os.path.dirname(os.path.abspath(__file__))
W = Hh = 1024

PALETTES = {
    "meadow": {"sky": "#dff1fb", "ground": "#bfe3a0", "accent": ["#f27059", "#f4b942", "#6a8ec9", "#b56fb0", "#3ba99c", "#e05780"]},
    "night": {"sky": "#2b3a67", "ground": "#3e5641", "accent": ["#ffd166", "#ef476f", "#06d6a0", "#8ecae6", "#f4a261", "#c77dff"]},
    "autumn": {"sky": "#fdebd3", "ground": "#d9a066", "accent": ["#c1440e", "#e8871e", "#7a9e7e", "#5c4d7d", "#ba5624", "#2e86ab"]},
    "candy": {"sky": "#ffe5ec", "ground": "#a9def9", "accent": ["#ff5d8f", "#7161ef", "#57cc99", "#ffca3a", "#ff924c", "#4cc9f0"]},
}

def balloon(o):
    x, y, s, c = o["x"], o["y"], o["s"], o["c"]
    fl = -1 if o.get("flip") else 1
    return (f'<g><ellipse cx="{x}" cy="{y}" rx="{28*s}" ry="{36*s}" fill="{c}" stroke="#333" stroke-width="3"/>'
            f'<path d="M {x} {y+36*s} q {14*s*fl} {30*s} {-6*s*fl} {70*s}" stroke="#555" fill="none" stroke-width="2.5"/>'
            f'<ellipse cx="{x-9*s}" cy="{y-12*s}" rx="7*{s}" ry="10" fill="#ffffff" opacity="0.5"/></g>')

def house(o):
    x, y, s, c = o["x"], o["y"], o["s"], o["c"]
    fl = -1 if o.get("flip") else 1
    return (f'<g transform="translate({x},{y}) scale({fl*s},{s})">'
            f'<rect x="-45" y="-40" width="90" height="70" fill="{c}" stroke="#333" stroke-width="3"/>'
            f'<polygon points="-55,-40 55,-40 0,-85" fill="#8d5524" stroke="#333" stroke-width="3"/>'
            f'<rect x="-12" y="-5" width="24" height="35" fill="#6b4226" stroke="#333" stroke-width="2.5"/>'
            f'<rect x="-36" y="-28" width="20" height="18" fill="#cfe8ef" stroke="#333" stroke-width="2.5"/>'
            f'<rect x="16" y="-28" width="20" height="18" fill="#cfe8ef" stroke="#333" stroke-width="2.5"/>'
            f'<rect x="20" y="-78" width="14" height="24" fill="#a26769" stroke="#333" stroke-width="2.5"/></g>')

def tree(o):
    x, y, s, c = o["x"], o["y"], o["s"], o["c"]
    return (f'<g transform="translate({x},{y}) scale({s})">'
            f'<rect x="-8" y="-20" width="16" height="55" fill="#8d5524" stroke="#333" stroke-width="3"/>'
            f'<circle cx="0" cy="-55" r="42" fill="{c}" stroke="#333" stroke-width="3"/>'
            f'<circle cx="-30" cy="-35" r="28" fill="{c}" stroke="#333" stroke-width="3"/>'
            f'<circle cx="30" cy="-35" r="28" fill="{c}" stroke="#333" stroke-width="3"/></g>')

def flower(o):
    x, y, s, c = o["x"], o["y"], o["s"], o["c"]
    pet = "".join(f'<ellipse cx="0" cy="-14" rx="7" ry="14" fill="{c}" stroke="#333" stroke-width="2" transform="rotate({a})"/>' for a in range(0, 360, 60))
    return (f'<g transform="translate({x},{y}) scale({s})"><line x1="0" y1="0" x2="0" y2="34" stroke="#3a7d44" stroke-width="4"/>'
            f'{pet}<circle r="8" fill="#ffd166" stroke="#333" stroke-width="2"/></g>')

def bird(o):
    x, y, s, c = o["x"], o["y"], o["s"], o["c"]
    fl = -1 if o.get("flip") else 1
    return (f'<g transform="translate({x},{y}) scale({fl*s},{s})">'
            f'<ellipse rx="22" ry="14" fill="{c}" stroke="#333" stroke-width="2.5"/>'
            f'<circle cx="20" cy="-8" r="9" fill="{c}" stroke="#333" stroke-width="2.5"/>'
            f'<polygon points="28,-8 40,-5 28,-2" fill="#f4a261" stroke="#333" stroke-width="2"/>'
            f'<circle cx="22" cy="-10" r="2" fill="#222"/>'
            f'<path d="M -5 -4 q -12 -14 -22 -6" stroke="#333" stroke-width="2.5" fill="none"/></g>')

def cloud(o):
    x, y, s = o["x"], o["y"], o["s"]
    return (f'<g transform="translate({x},{y}) scale({s})" fill="#ffffff" stroke="#9db4c0" stroke-width="2">'
            f'<ellipse rx="40" ry="20"/><ellipse cx="-25" cy="8" rx="26" ry="15"/><ellipse cx="26" cy="6" rx="28" ry="16"/></g>')

def kite(o):
    x, y, s, c = o["x"], o["y"], o["s"], o["c"]
    fl = -1 if o.get("flip") else 1
    return (f'<g transform="translate({x},{y}) scale({fl*s},{s})">'
            f'<polygon points="0,-35 22,0 0,35 -22,0" fill="{c}" stroke="#333" stroke-width="3"/>'
            f'<line x1="0" y1="-35" x2="0" y2="35" stroke="#333" stroke-width="2"/><line x1="-22" y1="0" x2="22" y2="0" stroke="#333" stroke-width="2"/>'
            f'<path d="M 0 35 q 15 25 5 55" stroke="#555" stroke-width="2.5" fill="none"/></g>')

def mushroom(o):
    x, y, s, c = o["x"], o["y"], o["s"], o["c"]
    return (f'<g transform="translate({x},{y}) scale({s})">'
            f'<rect x="-10" y="-6" width="20" height="26" rx="6" fill="#f2e8cf" stroke="#333" stroke-width="2.5"/>'
            f'<path d="M -30 -5 a 30 22 0 0 1 60 0 z" fill="{c}" stroke="#333" stroke-width="2.5"/>'
            f'<circle cx="-12" cy="-14" r="4" fill="#fff"/><circle cx="8" cy="-18" r="5" fill="#fff"/></g>')

def sun(o):
    x, y, s = o["x"], o["y"], o["s"]
    rays = "".join(f'<line x1="0" y1="-42" x2="0" y2="-58" stroke="#f4b942" stroke-width="6" stroke-linecap="round" transform="rotate({a})"/>' for a in range(0, 360, 45))
    return f'<g transform="translate({x},{y}) scale({s})">{rays}<circle r="36" fill="#ffd166" stroke="#e8a815" stroke-width="4"/></g>'

LIB = {"balloon": balloon, "house": house, "tree": tree, "flower": flower, "bird": bird, "cloud": cloud, "kite": kite, "mushroom": mushroom, "sun": sun}
SIZE_HINT = {"balloon": 75, "house": 130, "tree": 130, "flower": 55, "bird": 55, "cloud": 90, "kite": 75, "mushroom": 55, "sun": 100}

def build_scene(seed, palette_name):
    rng = random.Random(seed)
    pal = PALETTES[palette_name]
    objs = []
    def add(kind, x, y, smin=0.8, smax=1.4):
        objs.append({"kind": kind, "x": x, "y": y, "s": round(rng.uniform(smin, smax), 2),
                     "c": rng.choice(pal["accent"]), "flip": rng.random() < 0.5})
    add("sun", rng.randint(120, 400), rng.randint(100, 180))
    for _ in range(rng.randint(2, 3)):
        add("cloud", rng.randint(80, 950), rng.randint(80, 260), 0.7, 1.2)
    for _ in range(rng.randint(2, 3)):
        add("bird", rng.randint(100, 930), rng.randint(120, 330), 0.7, 1.1)
    add("kite", rng.randint(550, 900), rng.randint(180, 350))
    horizon = 560
    xs = list(range(90, 950, 110)); rng.shuffle(xs)
    for x in xs[:3]:
        add("tree", x, horizon + rng.randint(20, 80), 0.9, 1.4)
    for x in xs[3:5]:
        add("house", x, horizon + rng.randint(90, 150), 0.9, 1.3)
    for _ in range(3):
        add("balloon", rng.randint(80, 950), rng.randint(320, 520), 0.8, 1.2)
    for _ in range(rng.randint(4, 6)):
        add("flower", rng.randint(60, 970), rng.randint(horizon + 170, 980), 0.8, 1.3)
    for _ in range(rng.randint(2, 3)):
        add("mushroom", rng.randint(60, 970), rng.randint(horizon + 160, 970), 0.8, 1.3)
    return pal, objs

def render(pal, objs, path):
    body = "".join(LIB[o["kind"]](o) for o in objs)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{Hh}">'
           f'<rect width="{W}" height="{Hh}" fill="{pal["sky"]}"/>'
           f'<rect y="560" width="{W}" height="{Hh-560}" fill="{pal["ground"]}"/>'
           f'<ellipse cx="512" cy="565" rx="700" ry="30" fill="{pal["ground"]}"/>{body}</svg>')
    cairosvg.svg2png(bytestring=svg.encode(), write_to=path, output_width=W, output_height=Hh)

def mutate(objs, pal, n_diffs, seed):
    rng = random.Random(seed + 77)
    mutated = copy.deepcopy(objs)
    idxs = [i for i, o in enumerate(mutated) if o["kind"] not in ("sun",)]
    rng.shuffle(idxs)
    diffs = []
    ops = ["recolor", "remove", "flip", "resize", "recolor"]
    removed = []
    for i in idxs:
        if len(diffs) >= n_diffs:
            break
        o = mutated[i]
        s_before = o["s"]
        op = ops[len(diffs) % len(ops)]
        if op == "recolor":
            choices = [c for c in pal["accent"] if c != o.get("c")]
            if o["kind"] == "cloud":
                op = "resize"
            else:
                o["c"] = rng.choice(choices)
        if op == "flip":
            if o["kind"] in ("flower", "tree", "mushroom", "cloud"):  # symmetric, flip invisible
                op = "recolor"
                o["c"] = rng.choice([c for c in pal["accent"] if c != o.get("c")])
            else:
                o["flip"] = not o.get("flip")
        if op == "resize":
            o["s"] = round(o["s"] * rng.choice([0.68, 1.45]), 2)
        if op == "remove":
            removed.append(i)
        r = SIZE_HINT[o["kind"]] * max(o["s"], s_before) * 1.25
        diffs.append({"type": op, "object": o["kind"],
                      "bbox": [int(o["x"] - r), int(o["y"] - r), int(2 * r), int(2 * r)],
                      "center": [int(o["x"]), int(o["y"])]})
    mutated = [o for i, o in enumerate(mutated) if i not in removed]
    return mutated, diffs

def make_pair(name, seed, palette_name, n_diffs=7):
    pal, objs = build_scene(seed, palette_name)
    mutated, diffs = mutate(objs, pal, n_diffs, seed)
    render(pal, objs, f"{OUT}/pairs/{name}_A.png")
    render(pal, mutated, f"{OUT}/pairs/{name}_B.png")
    meta = {"pair": name, "route": "B_svg_procedural", "size": [W, Hh], "n_diffs": len(diffs), "diffs": diffs}
    json.dump(meta, open(f"{OUT}/meta/{name}.json", "w"), indent=1)
    return meta

if __name__ == "__main__":
    pals = list(PALETTES) * 2
    for i in range(8):
        m = make_pair(f"b_scene{i+1:02d}", seed=500 + i * 13, palette_name=pals[i], n_diffs=7)
        print(m["pair"], m["n_diffs"], [d["type"] for d in m["diffs"]])
