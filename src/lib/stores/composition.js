/**
 * stores/composition.js
 *
 * Central reactive state for the entire app. Every piece of UI
 * reads from and writes to these stores. The canvas renderer
 * subscribes and redraws when anything changes.
 *
 * Architecture note: We use Svelte's writable stores instead of
 * component-level state so that any component can read/write
 * without prop drilling. This is the Svelte equivalent of a
 * lightweight state manager.
 */

import { writable, derived } from 'svelte/store';
import { getRandomFilteredVariant } from './assets.js';

// --- Input text ---

export const inputText = writable('HELLO');

// --- Letter selections ---
// Map of position index → variant ID
// e.g. { 0: 'H_nyc_serif_02', 1: 'E_tokyo_geometric_01', ... }

export const selectedVariants = writable({});

// --- Canvas settings ---

export const canvasSettings = writable({
  width: 1200,
  height: 400,
  backgroundColor: '#FFFFFF',
  letterSpacing: 0,       // px between letters
  padding: 40,            // px around edges
  fitMode: 'uniform',     // 'uniform' | 'baseline' | 'freeform'
  showGrid: false,
});

// --- Derived: array of characters from input ---

export const characters = derived(inputText, ($text) =>
  $text
    .toUpperCase()
    .split('')
    .map((char, index) => ({
      char,
      index,
      isSpace: char === ' ',
      isLetter: /[A-Z]/.test(char),
      isDigit: /[0-9]/.test(char),
      isSupported: /[A-Z0-9 ]/.test(char),
    }))
);

// --- Actions ---

export function setVariant(positionIndex, variantId) {
  selectedVariants.update(current => ({
    ...current,
    [positionIndex]: variantId,
  }));
}

/**
 * Randomize all letter selections, respecting active city/style filters.
 * Uses getRandomFilteredVariant which falls back to unfiltered if no
 * matches exist for a given letter.
 */
export function randomizeVariants(chars) {
  const newSelections = {};

  chars.forEach((c, i) => {
    if (!c.isSupported || c.isSpace) return;

    const variant = getRandomFilteredVariant(c.char);
    if (variant) {
      newSelections[i] = variant.id;
    }
  });

  selectedVariants.set(newSelections);
}

export function clearComposition() {
  inputText.set('');
  selectedVariants.set({});
}

export function updateCanvasSetting(key, value) {
  canvasSettings.update(current => ({ ...current, [key]: value }));
}
