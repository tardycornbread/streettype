<!--
  Controls.svelte

  Sidebar controls for text input, canvas settings, and export.
  Writes directly to Svelte stores — no callbacks needed.
-->

<script>
  import {
    inputText,
    canvasSettings,
    updateCanvasSetting,
    randomizeVariants,
    clearComposition,
    characters,
  } from '../stores/composition.js';
  import { preloadForText } from '../stores/assets.js';
  import { get } from 'svelte/store';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  let exportFormat = 'png';

  // Debounced text change handler
  let debounceTimer;
  function handleTextInput(e) {
    const value = e.target.value;
    inputText.set(value);

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      preloadForText(value);
    }, 300);
  }

  function handleRandomize() {
    const $chars = get(characters);
    randomizeVariants($chars);
  }

  function handleExport() {
    dispatch('export', { format: exportFormat });
  }
</script>

<aside class="controls">
  <div class="controls-header">
    <h1 class="logo">StreetType</h1>
    <p class="tagline">Urban letterforms → typography</p>
  </div>

  <section class="control-section">
    <label class="control-label" for="text-input">Text</label>
    <input
      id="text-input"
      type="text"
      value={$inputText}
      on:input={handleTextInput}
      placeholder="Type here..."
      class="text-input"
      autocomplete="off"
      spellcheck="false"
    />
  </section>

  <section class="control-section">
    <label class="control-label">Actions</label>
    <div class="button-row">
      <button class="btn btn-secondary" on:click={handleRandomize}>
        Randomize
      </button>
      <button class="btn btn-ghost" on:click={clearComposition}>
        Clear
      </button>
    </div>
  </section>

  <section class="control-section">
    <label class="control-label">Canvas</label>

    <div class="setting-row">
      <span class="setting-name">Width</span>
      <input
        type="number"
        value={$canvasSettings.width}
        on:change={(e) => updateCanvasSetting('width', +e.target.value)}
        class="number-input"
        min="200"
        max="4000"
        step="100"
      />
    </div>

    <div class="setting-row">
      <span class="setting-name">Height</span>
      <input
        type="number"
        value={$canvasSettings.height}
        on:change={(e) => updateCanvasSetting('height', +e.target.value)}
        class="number-input"
        min="100"
        max="4000"
        step="100"
      />
    </div>

    <div class="setting-row">
      <span class="setting-name">Spacing</span>
      <input
        type="range"
        value={$canvasSettings.letterSpacing}
        on:input={(e) => updateCanvasSetting('letterSpacing', +e.target.value)}
        min="-20"
        max="80"
        step="1"
        class="range-input"
      />
      <span class="setting-value">{$canvasSettings.letterSpacing}px</span>
    </div>

    <div class="setting-row">
      <span class="setting-name">Padding</span>
      <input
        type="range"
        value={$canvasSettings.padding}
        on:input={(e) => updateCanvasSetting('padding', +e.target.value)}
        min="0"
        max="120"
        step="4"
        class="range-input"
      />
      <span class="setting-value">{$canvasSettings.padding}px</span>
    </div>

    <div class="setting-row">
      <span class="setting-name">Background</span>
      <input
        type="color"
        value={$canvasSettings.backgroundColor}
        on:input={(e) => updateCanvasSetting('backgroundColor', e.target.value)}
        class="color-input"
      />
    </div>

    <div class="setting-row">
      <label class="checkbox-label">
        <input
          type="checkbox"
          checked={$canvasSettings.showGrid}
          on:change={(e) => updateCanvasSetting('showGrid', e.target.checked)}
        />
        Show grid
      </label>
    </div>
  </section>

  <section class="control-section">
    <label class="control-label">Export</label>
    <div class="button-row">
      <select bind:value={exportFormat} class="select-input">
        <option value="png">PNG</option>
        <option value="jpg">JPG</option>
      </select>
      <button class="btn btn-primary" on:click={handleExport}>
        Download
      </button>
    </div>
  </section>

  <footer class="controls-footer">
    <p>
      Letter photographs from urban street signs
      and building facades around the world.
    </p>
  </footer>
</aside>

<style>
  .controls {
    width: 280px;
    min-width: 280px;
    height: 100vh;
    overflow-y: auto;
    background: #FAFAFA;
    border-right: 1px solid #E0E0E0;
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
    gap: 1.5rem;
    font-family: 'Space Mono', monospace;
    font-size: 13px;
  }

  .controls-header {
    padding-bottom: 1rem;
    border-bottom: 2px solid #000;
  }

  .logo {
    font-size: 1.4rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0;
  }

  .tagline {
    margin: 0.25rem 0 0;
    color: #888;
    font-size: 11px;
  }

  .control-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .control-label {
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #555;
  }

  .text-input {
    font-family: 'Space Mono', monospace;
    font-size: 18px;
    font-weight: 700;
    padding: 0.6rem 0.75rem;
    border: 2px solid #000;
    background: #FFF;
    outline: none;
    letter-spacing: 0.04em;
    transition: border-color 0.15s;
  }

  .text-input:focus {
    border-color: #0066FF;
  }

  .button-row {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    border: 2px solid #000;
    transition: all 0.12s;
    flex: 1;
  }

  .btn-primary {
    background: #000;
    color: #FFF;
  }

  .btn-primary:hover {
    background: #222;
  }

  .btn-secondary {
    background: #FFF;
    color: #000;
  }

  .btn-secondary:hover {
    background: #F0F0F0;
  }

  .btn-ghost {
    background: transparent;
    border-color: #CCC;
    color: #666;
  }

  .btn-ghost:hover {
    border-color: #000;
    color: #000;
  }

  .setting-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .setting-name {
    min-width: 72px;
    color: #666;
    font-size: 12px;
  }

  .setting-value {
    min-width: 40px;
    text-align: right;
    color: #888;
    font-size: 11px;
  }

  .number-input {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    width: 80px;
    padding: 0.3rem 0.4rem;
    border: 1px solid #CCC;
    background: #FFF;
    outline: none;
  }

  .number-input:focus {
    border-color: #0066FF;
  }

  .range-input {
    flex: 1;
    accent-color: #000;
  }

  .color-input {
    width: 36px;
    height: 28px;
    padding: 0;
    border: 1px solid #CCC;
    cursor: pointer;
  }

  .select-input {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    padding: 0.45rem 0.5rem;
    border: 2px solid #000;
    background: #FFF;
    cursor: pointer;
    flex: 1;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: #666;
    font-size: 12px;
    cursor: pointer;
  }

  .controls-footer {
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid #E0E0E0;
  }

  .controls-footer p {
    margin: 0;
    color: #AAA;
    font-size: 10px;
    line-height: 1.5;
  }
</style>
