/**
 * canvas/renderer.js
 *
 * Pure rendering functions. Takes a canvas 2D context + composition
 * state and draws the letter composition. No framework dependencies,
 * no side effects beyond drawing.
 *
 * Why native Canvas API instead of p5.js:
 * - StreetType doesn't need an animation loop — it's event-driven
 * - We're compositing pre-existing images, not drawing shapes
 * - Direct control over image loading, scaling, and compositing
 * - Smaller bundle, fewer abstractions to fight
 */

/**
 * @typedef {Object} RenderParams
 * @property {CanvasRenderingContext2D} ctx
 * @property {Object} settings - From canvasSettings store
 * @property {Array} characters - From characters derived store
 * @property {Object} selectedVariants - variantId per position
 * @property {Map} imageCache - variantId → HTMLImageElement
 * @property {Function} getVariant - Lookup function from assets store
 */

/**
 * Main render function. Clears the canvas and draws the full composition.
 */
export function render({
  ctx,
  settings,
  characters,
  selectedVariants,
  imageCache,
  getVariantFn,
}) {
  const { width, height, backgroundColor, letterSpacing, padding, fitMode, showGrid } = settings;

  // Clear
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Debug grid
  if (showGrid) {
    drawGrid(ctx, width, height);
  }

  // Gather drawable letters with their images
  const drawables = resolveDrawables(characters, selectedVariants, imageCache, getVariantFn);

  if (drawables.length === 0) {
    drawPlaceholder(ctx, width, height);
    return;
  }

  // Layout: compute position and scale for each letter
  const layout = computeLayout(drawables, settings);

  // Draw each letter
  for (const item of layout) {
    ctx.drawImage(
      item.image,
      item.x,
      item.y,
      item.drawWidth,
      item.drawHeight,
    );
  }
}

/**
 * Resolve which images we can actually draw.
 */
function resolveDrawables(characters, selectedVariants, imageCache, getVariantFn) {
  const result = [];

  for (const charInfo of characters) {
    if (charInfo.isSpace) {
      result.push({ type: 'space', char: ' ', index: charInfo.index });
      continue;
    }

    if (!charInfo.isSupported) continue;

    const variantId = selectedVariants[charInfo.index];
    if (!variantId) continue;

    const image = imageCache.get(variantId);
    if (!image) continue;

    const variant = getVariantFn(charInfo.char, variantId);

    result.push({
      type: 'letter',
      char: charInfo.char,
      index: charInfo.index,
      image,
      variant,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      aspectRatio: image.naturalWidth / image.naturalHeight,
    });
  }

  return result;
}

/**
 * Compute layout positions for all drawables.
 *
 * `uniform` mode: all letters scaled to the same height,
 * evenly distributed across the available width.
 */
function computeLayout(drawables, settings) {
  const { width, height, padding, letterSpacing, fitMode } = settings;

  if (fitMode === 'uniform') {
    return layoutUniform(drawables, width, height, padding, letterSpacing);
  }

  // Default to uniform for now — add baseline/freeform later
  return layoutUniform(drawables, width, height, padding, letterSpacing);
}

function layoutUniform(drawables, canvasWidth, canvasHeight, padding, letterSpacing) {
  const availableHeight = canvasHeight - padding * 2;
  const availableWidth = canvasWidth - padding * 2;

  // First pass: compute total width if all letters are scaled to available height
  const scaled = drawables.map(d => {
    if (d.type === 'space') {
      return { ...d, scaledWidth: availableHeight * 0.3, scaledHeight: availableHeight };
    }
    const scale = availableHeight / d.naturalHeight;
    return {
      ...d,
      scaledWidth: d.naturalWidth * scale,
      scaledHeight: availableHeight,
    };
  });

  const totalSpacing = Math.max(0, (scaled.length - 1)) * letterSpacing;
  const totalScaledWidth = scaled.reduce((sum, d) => sum + d.scaledWidth, 0) + totalSpacing;

  // If the total width exceeds available space, scale everything down uniformly
  const widthScale = totalScaledWidth > availableWidth
    ? availableWidth / totalScaledWidth
    : 1;

  const finalHeight = availableHeight * widthScale;

  // Second pass: compute final positions
  let x = padding;

  // Center horizontally if there's extra space
  const finalTotalWidth = totalScaledWidth * widthScale;
  if (finalTotalWidth < availableWidth) {
    x = padding + (availableWidth - finalTotalWidth) / 2;
  }

  const y = padding + (availableHeight - finalHeight) / 2;

  const layout = [];

  for (const item of scaled) {
    const drawWidth = item.scaledWidth * widthScale;
    const drawHeight = item.scaledHeight * widthScale;

    if (item.type === 'letter') {
      layout.push({
        ...item,
        x,
        y,
        drawWidth,
        drawHeight,
      });
    }

    x += drawWidth + letterSpacing * widthScale;
  }

  return layout;
}

/**
 * Draw a subtle placeholder when no letters are composed.
 */
function drawPlaceholder(ctx, width, height) {
  ctx.save();
  ctx.fillStyle = '#CCCCCC';
  ctx.font = '16px "Space Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Type something to begin', width / 2, height / 2);
  ctx.restore();
}

/**
 * Draw a debug grid overlay.
 */
function drawGrid(ctx, width, height) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 1;

  const step = 50;
  for (let x = step; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = step; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Export the canvas as a data URL.
 */
export function exportCanvas(canvas, format = 'png', quality = 0.95) {
  const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
  return canvas.toDataURL(mimeType, quality);
}

/**
 * Trigger a download of the canvas content.
 */
export function downloadCanvas(canvas, filename = 'streettype', format = 'png') {
  const dataUrl = exportCanvas(canvas, format);
  const link = document.createElement('a');
  link.download = `${filename}.${format}`;
  link.href = dataUrl;
  link.click();
}
