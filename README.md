# StreetType v2

A web-based typographic tool that generates text compositions from photographs of letterforms found on New York City street signs and building facades.

Built with **Svelte** + **Vite** + **Canvas API**. No p5.js.

---

## Architecture

```
streettype-svelte/
├── scripts/
│   └── generate-manifest.js    # Build-time asset scanner
├── public/
│   └── manifest.json           # Generated — DO NOT edit by hand
├── static/
│   └── letters/                # Your letter photographs
│       └── NYC/                #   ← city
│           └── Alphabet/
│               ├── A/          #     ← letter
│               │   ├── sans-lower/       01.jpg, 02.jpg...
│               │   ├── sans-upper/       01.jpg...
│               │   ├── serif-lower/      01.jpg...
│               │   ├── serif-upper/      01.jpg...
│               │   ├── monospace-lower/
│               │   ├── Display-Decorative-lower/
│               │   └── Script-Handwritten-upper/
│               ├── B/
│               └── ...
├── src/
│   ├── main.js                 # Entry point
│   ├── App.svelte              # Root layout
│   └── lib/
│       ├── stores/
│       │   ├── composition.js  # Reactive state (text, selections, settings)
│       │   └── assets.js       # Manifest + image cache + filters
│       ├── canvas/
│       │   └── renderer.js     # Pure drawing functions (Canvas API)
│       └── components/
│           ├── Controls.svelte     # Sidebar UI
│           ├── FilterBar.svelte    # City / Style / Case toggles
│           ├── Canvas.svelte       # Rendering surface
│           └── LetterPicker.svelte # Variant browser (filter-aware)
├── package.json
├── vite.config.js
└── svelte.config.js
```

### Key design decisions

**Manifest-based assets (no runtime probing)**
The v1 architecture tried up to 8 fallback paths per letter at runtime, with 1-second timeouts per attempt. v2 replaces this with a build-time manifest generator (`scripts/generate-manifest.js`) that scans your `static/letters/` directory and produces a JSON lookup table. At runtime, the app fetches a single `manifest.json` and does O(1) path lookups. Zero probing, zero race conditions.

**Native Canvas API (no p5.js)**
StreetType composites pre-existing images onto a canvas — it doesn't need p5's animation loop, shape primitives, or abstractions. The native Canvas API (`drawImage`, transforms, compositing) does everything with less overhead and more control. The renderer (`src/lib/canvas/renderer.js`) is a set of pure functions with no framework coupling.

**Svelte stores for state**
Reactive stores (`composition.js`, `assets.js`) replace the global state management that was scattered across multiple singleton modules. Any component can subscribe to or update state without prop drilling.

**Parallel image loading**
All image loads fire simultaneously via `Promise.all`. No sequential `for...of` + `await` chains.

---

## Getting started

```bash
# Install dependencies
npm install

# Copy your existing letter photos into static/letters/
# Structure: static/letters/{CITY}/Alphabet/{LETTER}/{style-case}/*.jpg
cp -r /path/to/assets/Alphabet/cities/* static/letters/

# Generate the asset manifest
npm run manifest

# Start dev server
npm run dev
```

### Adding letter photos

Photos are organized by **city**, then **letter**, then **style-case**:

```
static/letters/{CITY}/Alphabet/{LETTER}/{style-case}/{number}.ext
```

This matches your existing project structure. For example:
```
static/letters/NYC/Alphabet/A/sans-lower/01.jpg
static/letters/NYC/Alphabet/A/sans-upper/01.jpg
static/letters/NYC/Alphabet/A/serif-lower/03.png
static/letters/NYC/Alphabet/B/Display-Decorative-upper/01.jpg
static/letters/NYC/Alphabet/B/Script-Handwritten-lower/02.jpg
```

The style-case folder name is parsed automatically:
- `sans-lower` → style: **Sans**, case: **Lowercase**
- `serif-upper` → style: **Serif**, case: **Uppercase**
- `Display-Decorative-lower` → style: **Display / Decorative**, case: **Lowercase**
- `Script-Handwritten-upper` → style: **Script / Handwritten**, case: **Uppercase**

To migrate your existing photos, copy your `cities/` folder contents into `static/letters/`:
```
cp -r assets/Alphabet/cities/* static/letters/
```

Then run `npm run manifest` — it auto-discovers all cities, styles, cases, and letters.

Running `npm run manifest` with no photos creates a scaffold for NYC with A-Z and all 10 style-case folders (serif, sans, monospace, Display-Decorative, Script-Handwritten × upper/lower).

### Filtering

The FilterBar appears at the top of the canvas area with three filter groups: **City**, **Style**, and **Case**. Each is a set of toggleable pills that auto-populate from whatever the manifest finds. Active filters constrain the LetterPicker and Randomize button. Empty filters = show everything.

---

## Building for production

```bash
npm run build    # Runs manifest + vite build
npm run preview  # Preview the production build
```

Output goes to `dist/`.

---

## v1 → v2 migration

Your existing photo structure already matches what v2 expects. To migrate:

1. Copy your city folders into `static/letters/`:
   ```bash
   cp -r /path/to/Street\ Type/assets/Alphabet/cities/* static/letters/
   ```
2. Run `npm run manifest`
3. Done — the generator auto-discovers the `{CITY}/Alphabet/{LETTER}/{style-case}/` structure

**macOS note:** If your style folders use slashes in Finder (e.g., "Display/Decorative-lower"), macOS stores these as colons on disk. The manifest generator normalizes colons to dashes automatically. If you run into issues, rename the folders using dashes instead (e.g., "Display-Decorative-lower").
