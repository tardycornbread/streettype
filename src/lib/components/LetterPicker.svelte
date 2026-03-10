<!--
  LetterPicker.svelte

  Displays the current text as clickable letter slots. Clicking
  opens a variant picker showing available photos — filtered by
  the active city/style selections from the FilterBar.

  Each variant thumbnail shows a small city/style tag so you
  can see where the letterform comes from.
-->

<script>
  import {
    characters,
    selectedVariants,
    setVariant,
  } from '../stores/composition.js';
  import {
    imageCache,
    ensureImage,
    getFilteredVariants,
    isManifestLoaded,
    activeCities,
    activeStyles,
    activeCases,
  } from '../stores/assets.js';

  let activeIndex = null;
  let activeVariants = [];

  function handleLetterClick(charInfo) {
    if (!charInfo.isSupported || charInfo.isSpace) return;

    if (activeIndex === charInfo.index) {
      activeIndex = null;
      activeVariants = [];
      return;
    }

    activeIndex = charInfo.index;
    refreshVariants(charInfo.char);
  }

  function refreshVariants(char) {
    activeVariants = getFilteredVariants(char);
    activeVariants.forEach(v => ensureImage(v));
  }

  // When filters change, refresh the open panel
  $: if (activeIndex !== null) {
    // Touch reactive deps to trigger refresh
    $activeCities;
    $activeStyles;
    $activeCases;

    const charInfo = $characters[activeIndex];
    if (charInfo && charInfo.isSupported && !charInfo.isSpace) {
      refreshVariants(charInfo.char);
    }
  }

  function handleVariantSelect(variant) {
    if (activeIndex !== null) {
      setVariant(activeIndex, variant.id);
    }
  }

  function isSelected(variantId, charIndex) {
    return $selectedVariants[charIndex] === variantId;
  }

  function displayTag(variant) {
    const parts = [];
    if (variant.city) parts.push(variant.city.toUpperCase());
    if (variant.style) parts.push(variant.style);
    if (variant.case && variant.case !== 'mixed') parts.push(variant.case);
    return parts.join(' · ');
  }
</script>

{#if $isManifestLoaded}
<div class="letter-picker">
  <div class="letter-strip">
    {#each $characters as charInfo (charInfo.index)}
      {#if charInfo.isSpace}
        <span class="letter-slot space-slot">&nbsp;</span>
      {:else if charInfo.isSupported}
        <button
          class="letter-slot"
          class:active={activeIndex === charInfo.index}
          class:has-selection={$selectedVariants[charInfo.index]}
          on:click={() => handleLetterClick(charInfo)}
        >
          {charInfo.char}
        </button>
      {:else}
        <span class="letter-slot unsupported" title="Not available">
          {charInfo.char}
        </span>
      {/if}
    {/each}
  </div>

  {#if activeIndex !== null}
    <div class="variant-panel">
      <div class="variant-header">
        <span class="variant-title">
          {activeVariants.length} variant{activeVariants.length !== 1 ? 's' : ''}
          {#if $activeCities.size > 0 || $activeStyles.size > 0 || $activeCases.size > 0}
            <span class="filtered-badge">filtered</span>
          {/if}
        </span>
        <button class="close-btn" on:click={() => { activeIndex = null; }}>
          ×
        </button>
      </div>

      {#if activeVariants.length === 0}
        <p class="no-results">No variants match your current filters. Try broadening your selection.</p>
      {:else}
        <div class="variant-grid">
          {#each activeVariants as variant (variant.id)}
            <button
              class="variant-thumb"
              class:selected={isSelected(variant.id, activeIndex)}
              on:click={() => handleVariantSelect(variant)}
              title={variant.id}
            >
              {#if $imageCache.has(variant.id)}
                <img
                  src={$imageCache.get(variant.id).src}
                  alt={variant.id}
                  class="variant-img"
                />
              {:else}
                <span class="loading-placeholder">...</span>
              {/if}
              <span class="variant-tag">{displayTag(variant)}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
{/if}

<style>
  .letter-picker {
    background: #FAFAFA;
    border-top: 1px solid #E0E0E0;
    padding: 0.75rem 1.5rem;
    font-family: 'Space Mono', monospace;
  }

  .letter-strip {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .letter-slot {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Space Mono', monospace;
    font-size: 16px;
    font-weight: 700;
    border: 2px solid #DDD;
    background: #FFF;
    cursor: pointer;
    transition: all 0.1s;
    color: #333;
  }

  .letter-slot:hover {
    border-color: #000;
  }

  .letter-slot.active {
    border-color: #0066FF;
    background: #F0F4FF;
    color: #0066FF;
  }

  .letter-slot.has-selection {
    border-color: #000;
    background: #000;
    color: #FFF;
  }

  .letter-slot.has-selection.active {
    border-color: #0066FF;
    background: #0066FF;
    color: #FFF;
  }

  .space-slot {
    border-color: transparent;
    background: transparent;
    cursor: default;
    width: 18px;
  }

  .unsupported {
    border-color: transparent;
    background: transparent;
    color: #CCC;
    cursor: not-allowed;
  }

  .variant-panel {
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: #FFF;
    border: 2px solid #0066FF;
  }

  .variant-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .variant-title {
    font-size: 11px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .filtered-badge {
    display: inline-block;
    font-size: 9px;
    padding: 1px 5px;
    background: #0066FF;
    color: #FFF;
    border-radius: 2px;
    margin-left: 6px;
    vertical-align: middle;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #999;
    padding: 0 4px;
  }

  .close-btn:hover {
    color: #000;
  }

  .no-results {
    font-size: 12px;
    color: #999;
    padding: 1rem 0;
  }

  .variant-grid {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .variant-thumb {
    width: 72px;
    border: 2px solid #DDD;
    background: #F8F8F8;
    padding: 4px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    transition: all 0.1s;
  }

  .variant-thumb:hover {
    border-color: #000;
  }

  .variant-thumb.selected {
    border-color: #0066FF;
    background: #F0F4FF;
  }

  .variant-img {
    width: 60px;
    height: 54px;
    object-fit: contain;
  }

  .variant-tag {
    font-size: 7px;
    color: #AAA;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    text-align: center;
    line-height: 1.2;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .loading-placeholder {
    width: 60px;
    height: 54px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #CCC;
    font-size: 12px;
  }
</style>
