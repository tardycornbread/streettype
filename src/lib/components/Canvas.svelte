<!--
  Canvas.svelte

  The rendering surface. Binds a <canvas> element and redraws
  whenever composition state changes. Uses $effect (Svelte 5 runes)
  to reactively trigger re-renders.
-->

<script>
  import { onMount } from 'svelte';
  import {
    canvasSettings,
    characters,
    selectedVariants,
  } from '../stores/composition.js';
  import { imageCache, getVariant } from '../stores/assets.js';
  import { render, downloadCanvas } from '../canvas/renderer.js';

  let canvasEl;
  let ctx;

  onMount(() => {
    ctx = canvasEl.getContext('2d');
    drawComposition();
  });

  // Re-render whenever any dependency changes
  $: if (ctx) {
    // Touch all reactive deps to trigger re-render
    $canvasSettings;
    $characters;
    $selectedVariants;
    $imageCache;

    drawComposition();
  }

  function drawComposition() {
    if (!ctx) return;

    render({
      ctx,
      settings: $canvasSettings,
      characters: $characters,
      selectedVariants: $selectedVariants,
      imageCache: $imageCache,
      getVariantFn: getVariant,
    });
  }

  export function getCanvas() {
    return canvasEl;
  }

  export function download(filename, format) {
    downloadCanvas(canvasEl, filename, format);
  }
</script>

<div class="canvas-container">
  <canvas
    bind:this={canvasEl}
    width={$canvasSettings.width}
    height={$canvasSettings.height}
    class="composition-canvas"
  ></canvas>
</div>

<style>
  .canvas-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    overflow: auto;
    background:
      repeating-conic-gradient(
        #f0f0f0 0% 25%, transparent 0% 50%
      ) 50% / 20px 20px;
  }

  .composition-canvas {
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
    max-width: 100%;
    height: auto;
  }
</style>
