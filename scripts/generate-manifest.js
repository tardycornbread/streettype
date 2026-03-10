/**
 * generate-manifest.js
 *
 * Scans letter photo directories matching Kyle's actual structure:
 *
 *   static/letters/{CITY}/Alphabet/{LETTER}/{STYLE-CASE}/{NUMBER}.ext
 *
 * Example:
 *   static/letters/NYC/Alphabet/A/sans-lower/01.jpg
 *   static/letters/NYC/Alphabet/A/serif-upper/03.png
 *   static/letters/NYC/Alphabet/B/Display-Decorative-lower/01.jpg
 *   static/letters/Tokyo/Alphabet/A/mono-upper/01.jpg
 *
 * The style-case folder name is parsed into two fields:
 *   "sans-lower"  → style: "sans",  case: "lower"
 *   "serif-upper" → style: "serif", case: "upper"
 *   "Display-Decorative-lower" → style: "Display-Decorative", case: "lower"
 *   "Script-Handwritten-upper" → style: "Script-Handwritten", case: "upper"
 *
 * NOTE on macOS folder names with slashes:
 *   Finder shows "Display/Decorative-lower" but the filesystem stores it
 *   as "Display:Decorative-lower" (macOS swaps / and : between Finder and
 *   the filesystem). If your folders use colons on disk, the scanner handles
 *   both. If they're literal nested directories (Display/Decorative-lower/),
 *   flatten them to "Display-Decorative-lower" before running this script,
 *   or just rename them with a dash instead of a slash.
 *
 * Output: public/manifest.json
 *
 * Usage:
 *   node scripts/generate-manifest.js
 *   node scripts/generate-manifest.js --verbose
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const LETTERS_DIR = path.join(PROJECT_ROOT, 'static', 'letters');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'static', 'manifest.json');
const SUPPORTED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
const VERBOSE = process.argv.includes('--verbose');

// --- Helpers ---

function getImageDimensions(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.png' && buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }

    if (ext === '.jpg' || ext === '.jpeg') {
      let i = 2;
      while (i < buffer.length - 9) {
        if (buffer[i] === 0xFF) {
          const marker = buffer[i + 1];
          if (marker === 0xC0 || marker === 0xC2) {
            return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) };
          }
          i += 2 + buffer.readUInt16BE(i + 2);
        } else {
          i++;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

function readDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

function readImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => SUPPORTED_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * Parse a style-case folder name like "sans-lower" or
 * "Display-Decorative-upper" into { style, letterCase }.
 *
 * Strategy: the last segment after the final "-" is the case
 * (lower/upper). Everything before it is the style name.
 */
function parseStyleFolder(folderName) {
  // Normalize macOS colon-slash swap
  const normalized = folderName.replace(/:/g, '-');

  // Check if it ends with -lower or -upper
  const lowerMatch = normalized.match(/^(.+)-lower$/);
  const upperMatch = normalized.match(/^(.+)-upper$/);

  if (lowerMatch) {
    return { style: lowerMatch[1], letterCase: 'lower' };
  }
  if (upperMatch) {
    return { style: upperMatch[1], letterCase: 'upper' };
  }

  // No case suffix — treat entire name as style, case unknown
  return { style: normalized, letterCase: 'mixed' };
}

// --- Main ---

function generateManifest() {
  if (!fs.existsSync(LETTERS_DIR)) {
    console.log(`\n  Letters directory not found: ${LETTERS_DIR}`);
    console.log(`  Creating placeholder structure...\n`);
    createPlaceholderStructure();
  }

  const citiesFound = new Set();
  const stylesFound = new Set();
  const casesFound = new Set();

  const manifest = {
    generated: new Date().toISOString(),
    basePath: '/letters',
    cities: [],
    styles: [],
    cases: [],
    letters: {},
    stats: {
      totalVariants: 0,
      letters: 0,
      cityCounts: {},
      styleCounts: {},
      caseCounts: {},
      missingLetters: [],
    },
  };

  // Walk: {CITY}/Alphabet/{LETTER}/{STYLE-CASE}/{files}
  const cityDirs = readDirs(LETTERS_DIR);

  for (const city of cityDirs) {
    const alphabetPath = path.join(LETTERS_DIR, city, 'Alphabet');

    // If there's no Alphabet subfolder, try scanning the city dir directly
    const scanRoot = fs.existsSync(alphabetPath) ? alphabetPath : path.join(LETTERS_DIR, city);
    const letterDirs = readDirs(scanRoot);

    for (const letterDir of letterDirs) {
      const letterKey = letterDir.toUpperCase();

      // Skip non-letter directories
      if (!/^[A-Z0-9]$/i.test(letterKey) && letterDir !== 'punctuation') continue;

      const letterPath = path.join(scanRoot, letterDir);
      const styleCaseDirs = readDirs(letterPath);

      for (const styleCaseDir of styleCaseDirs) {
        const { style, letterCase } = parseStyleFolder(styleCaseDir);
        const imagesDir = path.join(letterPath, styleCaseDir);
        const files = readImages(imagesDir);

        if (files.length === 0) continue;

        // Ensure letter entry exists
        if (!manifest.letters[letterKey]) {
          manifest.letters[letterKey] = { count: 0, variants: [] };
          manifest.stats.letters++;
        }

        const entry = manifest.letters[letterKey];

        for (const file of files) {
          const filePath = path.join(imagesDir, file);
          const dimensions = getImageDimensions(filePath);
          const fileStats = fs.statSync(filePath);

          // Build a readable variant ID
          const baseName = path.parse(file).name; // "01", "02", etc.
          const id = `${letterKey}_${city}_${style}_${letterCase}_${baseName}`;

          // Build the URL path
          const relativePath = path.relative(
            path.join(PROJECT_ROOT, 'static'),
            filePath
          ).split(path.sep).join('/');

          entry.variants.push({
            id,
            file,
            path: `/${relativePath}`,
            city,
            style,
            case: letterCase,
            ext: path.extname(file).toLowerCase().slice(1),
            size: fileStats.size,
            ...(dimensions && { width: dimensions.width, height: dimensions.height }),
          });

          entry.count++;
          manifest.stats.totalVariants++;
          citiesFound.add(city);
          stylesFound.add(style);
          casesFound.add(letterCase);
          manifest.stats.cityCounts[city] = (manifest.stats.cityCounts[city] || 0) + 1;
          manifest.stats.styleCounts[style] = (manifest.stats.styleCounts[style] || 0) + 1;
          manifest.stats.caseCounts[letterCase] = (manifest.stats.caseCounts[letterCase] || 0) + 1;

          if (VERBOSE) console.log(`  ${id} → ${relativePath}`);
        }
      }
    }
  }

  manifest.cities = [...citiesFound].sort();
  manifest.styles = [...stylesFound].sort();
  manifest.cases = [...casesFound].sort();

  const expected = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
  manifest.stats.missingLetters = expected.filter(l => !manifest.letters[l]);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2));

  // Report
  console.log(`\n  StreetType Asset Manifest`);
  console.log(`  ────────────────────────`);
  console.log(`  Cities:     ${manifest.cities.join(', ') || '(none)'}`);
  console.log(`  Styles:     ${manifest.styles.join(', ') || '(none)'}`);
  console.log(`  Cases:      ${manifest.cases.join(', ') || '(none)'}`);
  console.log(`  Letters:    ${manifest.stats.letters}`);
  console.log(`  Variants:   ${manifest.stats.totalVariants}`);

  if (Object.keys(manifest.stats.cityCounts).length > 0) {
    console.log(`  By city:`);
    for (const [city, count] of Object.entries(manifest.stats.cityCounts).sort()) {
      console.log(`    ${city}: ${count}`);
    }
  }
  if (Object.keys(manifest.stats.styleCounts).length > 0) {
    console.log(`  By style:`);
    for (const [style, count] of Object.entries(manifest.stats.styleCounts).sort()) {
      console.log(`    ${style}: ${count}`);
    }
  }
  if (manifest.stats.missingLetters.length > 0) {
    console.log(`  Missing:    ${manifest.stats.missingLetters.join(', ')}`);
  }
  console.log(`  Output:     ${path.relative(PROJECT_ROOT, OUTPUT_PATH)}\n`);
}

function createPlaceholderStructure() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const city = 'NYC';
  const styleCases = [
    'serif-lower', 'serif-upper',
    'sans-lower', 'sans-upper',
    'monospace-lower', 'monospace-upper',
    'Display-Decorative-lower', 'Display-Decorative-upper',
    'Script-Handwritten-lower', 'Script-Handwritten-upper',
  ];

  for (const letter of letters) {
    for (const sc of styleCases) {
      fs.mkdirSync(path.join(LETTERS_DIR, city, 'Alphabet', letter, sc), { recursive: true });
    }
  }
  console.log(`  Created: ${city}/Alphabet/ with A-Z × ${styleCases.length} style folders\n`);
}

generateManifest();
