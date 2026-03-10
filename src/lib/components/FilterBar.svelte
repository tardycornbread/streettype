<!--
  FilterBar.svelte

  Horizontal filter bar with three filter groups:
  City, Style, and Case. Auto-populates from manifest data.
  Filters are additive: active filters narrow down which
  variants appear in the picker and randomizer.
-->

<script>
  import {
    availableCities,
    availableStyles,
    availableCases,
    activeCities,
    activeStyles,
    activeCases,
    toggleCity,
    toggleStyle,
    toggleCase,
    clearFilters,
  } from '../stores/assets.js';

  // Prettify names for display
  function displayName(name) {
    const special = {
      nyc: 'NYC', la: 'LA', sf: 'SF', dc: 'DC',
      upper: 'Uppercase', lower: 'Lowercase', mixed: 'Mixed',
    };
    const lower = name.toLowerCase();
    if (special[lower]) return special[lower];

    // Handle compound names like "Display-Decorative" or "Script-Handwritten"
    return name
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' / ');
  }

  $: hasActiveFilters = $activeCities.size > 0 || $activeStyles.size > 0 || $activeCases.size > 0;
  $: totalFilters = $activeCities.size + $activeStyles.size + $activeCases.size;
</script>

{#if $availableCities.length > 0 || $availableStyles.length > 0 || $availableCases.length > 0}
  <div class="filter-bar">

    {#if $availableCities.length > 1}
      <div class="filter-group">
        <span class="filter-label">City</span>
        <div class="filter-pills">
          {#each $availableCities as city (city)}
            <button
              class="pill"
              class:active={$activeCities.has(city)}
              on:click={() => toggleCity(city)}
            >
              {displayName(city)}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if $availableStyles.length > 0}
      <div class="filter-group">
        <span class="filter-label">Style</span>
        <div class="filter-pills">
          {#each $availableStyles as style (style)}
            <button
              class="pill"
              class:active={$activeStyles.has(style)}
              on:click={() => toggleStyle(style)}
            >
              {displayName(style)}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if $availableCases.length > 1}
      <div class="filter-group">
        <span class="filter-label">Case</span>
        <div class="filter-pills">
          {#each $availableCases as c (c)}
            <button
              class="pill"
              class:active={$activeCases.has(c)}
              on:click={() => toggleCase(c)}
            >
              {displayName(c)}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if hasActiveFilters}
      <button class="clear-btn" on:click={clearFilters}>
        Clear {totalFilters} filter{totalFilters !== 1 ? 's' : ''}
      </button>
    {/if}
  </div>
{/if}

<style>
  .filter-bar {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 0.6rem 1.5rem;
    background: #F5F5F5;
    border-bottom: 1px solid #E0E0E0;
    font-family: 'Space Mono', monospace;
    overflow-x: auto;
    flex-shrink: 0;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .filter-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #999;
    min-width: fit-content;
  }

  .filter-pills {
    display: flex;
    gap: 4px;
  }

  .pill {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    padding: 3px 10px;
    border: 1.5px solid #CCC;
    border-radius: 2px;
    background: #FFF;
    color: #666;
    cursor: pointer;
    transition: all 0.1s;
    white-space: nowrap;
  }

  .pill:hover {
    border-color: #888;
    color: #333;
  }

  .pill.active {
    background: #000;
    border-color: #000;
    color: #FFF;
  }

  .pill.active:hover {
    background: #333;
    border-color: #333;
  }

  .clear-btn {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    padding: 3px 8px;
    border: none;
    background: none;
    color: #0066FF;
    cursor: pointer;
    white-space: nowrap;
    margin-left: auto;
  }

  .clear-btn:hover {
    text-decoration: underline;
  }
</style>
