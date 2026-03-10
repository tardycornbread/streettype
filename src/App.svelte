<!--
  App.svelte

  Root layout. Four zones:
  1. Sidebar (Controls) — left
  2. FilterBar — top of main area
  3. Canvas — center
  4. LetterPicker — bottom

  Initializes the manifest on mount and auto-assigns default
  variants for the initial text.
-->

<script>
  import { onMount } from 'svelte';
  import Controls from './lib/components/Controls.svelte';
  import FilterBar from './lib/components/FilterBar.svelte';
  import Canvas from './lib/components/Canvas.svelte';
  import LetterPicker from './lib/components/LetterPicker.svelte';

  import {
    inputText,
    characters,
    selectedVariants,
    randomizeVariants,
  } from './lib/stores/composition.js';
  import {
    loadManifest,
    preloadForText,
    manifestError,
    isManifestLoaded,
    getRandomFilteredVariant,
  } from './lib/stores/assets.js';
  import { get } from 'svelte/store';

  let canvasComponent;
  let initialized = false;

  onMount(async () => {
    // 1. Load manifest (single fetch, no probing)
    const m = await loadManifest();
    if (!m) return;

    // 2. Preload images for initial text
    const text = get(inputText);
    await preloadForText(text);

    // 3. Auto-assign random variants for initial text
    const chars = get(characters);
    randomizeVariants(chars);

    initialized = true;
  });

  // Track previous text to detect what changed
  let prevText = '';

  // Re-preload and auto-assign variants when text changes
  $: if ($isManifestLoaded && $inputText !== undefined) {
    const newText = $inputText.toUpperCase();
    const oldText = prevText;
    prevText = newText;

    preloadForText($inputText).then(() => {
      const currentSelections = get(selectedVariants);
      const chars = get(characters);
      const updated = {};

      chars.forEach((c, i) => {
        if (!c.isSupported || c.isSpace) return;

        // If same character at same position, keep existing selection
        if (oldText[i] === newText[i] && currentSelections[i]) {
          updated[i] = currentSelections[i];
          return;
        }

        // New or changed position — assign a random variant
        const variant = getRandomFilteredVariant(c.char);
        if (variant) {
          updated[i] = variant.id;
        }
      });

      selectedVariants.set(updated);
    });
  }

  function handleExport(e) {
    const { format } = e.detail;
    const text = get(inputText) || 'streettype';
    const filename = text.toLowerCase().replace(/[^a-z0-9]/g, '-');
    canvasComponent?.download(filename, format);
  }
</script>

<div class="app-layout">
  <Controls on:export={handleExport} />

  <main class="main-area">
    {#if $manifestError}
      <div class="error-state">
        <h2>Could not load letter assets</h2>
        <p>{$manifestError}</p>
        <p class="hint">
          Run <code>npm run manifest</code> to generate the asset manifest,
          then add your letter photos to <code>static/letters/</code>.
        </p>
        <p class="hint">
          New structure: <code>static/letters/{'<city>'}/{'<style>'}/{'<LETTER>'}/*.png</code>
        </p>
      </div>
    {:else if !initialized}
      <div class="loading-state">
        <span class="loading-text">Loading letterforms...</span>
      </div>
    {:else}
      <FilterBar />
      <Canvas bind:this={canvasComponent} />
    {/if}

    <LetterPicker />
  </main>
</div>

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    font-family: 'Space Mono', monospace;
    background: #FFF;
    color: #000;
    overflow: hidden;
  }

  .app-layout {
    display: flex;
    height: 100vh;
    width: 100vw;
  }

  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .error-state,
  .loading-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
  }

  .error-state h2 {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }

  .error-state p {
    color: #666;
    font-size: 13px;
    max-width: 400px;
    line-height: 1.5;
  }

  .error-state .hint {
    margin-top: 0.75rem;
    color: #999;
    font-size: 12px;
  }

  .error-state code {
    background: #F0F0F0;
    padding: 0.15rem 0.4rem;
    font-size: 12px;
  }

  .loading-state {
    color: #888;
    font-size: 14px;
  }

  .loading-text {
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
</style>
