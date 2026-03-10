/**
 * stores/assets.js
 *
 * Manages the letter photo manifest, image cache, and filter state.
 *
 * Three filter dimensions:
 * - City (e.g., NYC, Tokyo)
 * - Style (e.g., serif, sans, monospace, Display-Decorative, Script-Handwritten)
 * - Case (upper, lower)
 *
 * Empty filter set = show everything (no constraint).
 */

import { writable, derived, get } from 'svelte/store';

// --- Core stores ---

export const manifest = writable(null);
export const manifestError = writable(null);
export const imageCache = writable(new Map());
export const loadingImages = writable(new Set());

export const isManifestLoaded = derived(manifest, ($m) => $m !== null);

// --- Filter stores ---

export const activeCities = writable(new Set());
export const activeStyles = writable(new Set());
export const activeCases = writable(new Set());

// Derived: available values from manifest
export const availableCities = derived(manifest, ($m) => $m ? $m.cities : []);
export const availableStyles = derived(manifest, ($m) => $m ? $m.styles : []);
export const availableCases = derived(manifest, ($m) => $m ? $m.cases : []);

// --- Filter actions ---

export function toggleCity(city) {
  activeCities.update(s => {
    const next = new Set(s);
    next.has(city) ? next.delete(city) : next.add(city);
    return next;
  });
}

export function toggleStyle(style) {
  activeStyles.update(s => {
    const next = new Set(s);
    next.has(style) ? next.delete(style) : next.add(style);
    return next;
  });
}

export function toggleCase(c) {
  activeCases.update(s => {
    const next = new Set(s);
    next.has(c) ? next.delete(c) : next.add(c);
    return next;
  });
}

export function clearFilters() {
  activeCities.set(new Set());
  activeStyles.set(new Set());
  activeCases.set(new Set());
}

// --- Manifest loading ---

export async function loadManifest(url = import.meta.env.BASE_URL + 'manifest.json') {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Manifest fetch failed: ${response.status}`);
    const data = await response.json();
    manifest.set(data);
    return data;
  } catch (err) {
    manifestError.set(err.message);
    console.error('[StreetType] Failed to load manifest:', err);
    return null;
  }
}

// --- Image loading ---

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

export async function ensureImage(variant) {
  const cache = get(imageCache);
  if (cache.has(variant.id)) return cache.get(variant.id);

  loadingImages.update(s => { s.add(variant.id); return new Set(s); });

  try {
    const img = await loadImage(variant.path);
    imageCache.update(c => { c.set(variant.id, img); return new Map(c); });
    return img;
  } catch (err) {
    console.warn(`[StreetType] Could not load ${variant.id}:`, err.message);
    return null;
  } finally {
    loadingImages.update(s => { s.delete(variant.id); return new Set(s); });
  }
}

export async function preloadForText(text) {
  const $manifest = get(manifest);
  if (!$manifest) return;

  const uniqueChars = [...new Set(text.toUpperCase().split(''))];
  const allVariants = [];

  for (const char of uniqueChars) {
    const letterData = $manifest.letters[char];
    if (!letterData) continue;
    allVariants.push(...letterData.variants);
  }

  await Promise.all(allVariants.map(v => ensureImage(v)));
}

// --- Filtered lookups ---

function variantPassesFilters(variant, $cities, $styles, $cases) {
  const cityOk = $cities.size === 0 || $cities.has(variant.city);
  const styleOk = $styles.size === 0 || $styles.has(variant.style);
  const caseOk = $cases.size === 0 || $cases.has(variant.case);
  return cityOk && styleOk && caseOk;
}

/**
 * Get variants for a letter, filtered by active city/style/case.
 */
export function getFilteredVariants(letter) {
  const $manifest = get(manifest);
  if (!$manifest) return [];

  const letterData = $manifest.letters[letter.toUpperCase()];
  if (!letterData) return [];

  const $cities = get(activeCities);
  const $styles = get(activeStyles);
  const $cases = get(activeCases);

  if ($cities.size === 0 && $styles.size === 0 && $cases.size === 0) {
    return letterData.variants;
  }

  return letterData.variants.filter(v => variantPassesFilters(v, $cities, $styles, $cases));
}

/**
 * Get a specific variant (unfiltered). Used by the renderer.
 */
export function getVariant(letter, variantId) {
  const $manifest = get(manifest);
  if (!$manifest) return null;

  const letterData = $manifest.letters[letter.toUpperCase()];
  if (!letterData) return null;

  return letterData.variants.find(v => v.id === variantId) || null;
}

/**
 * Get all variants (unfiltered) for a letter.
 */
export function getVariants(letter) {
  const $manifest = get(manifest);
  if (!$manifest) return [];

  const letterData = $manifest.letters[letter.toUpperCase()];
  return letterData ? letterData.variants : [];
}

/**
 * Get a random variant that passes current filters.
 * Falls back to any variant if no matches exist.
 */
export function getRandomFilteredVariant(letter) {
  const filtered = getFilteredVariants(letter);
  if (filtered.length > 0) {
    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  const all = getVariants(letter);
  return all.length > 0 ? all[Math.floor(Math.random() * all.length)] : null;
}
