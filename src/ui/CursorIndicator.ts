export type CursorState =
    | 'default'
    | 'harvest'
    | 'harvest-disabled'
    | 'plant'
    | 'plant-disabled'
    | 'build'
    | 'build-disabled'
    | 'water'
    | 'water-disabled';

export type CursorGlyphKey = 'default' | 'harvest' | 'plant' | 'build' | 'water';

export interface CursorVisualStyle {
    fill: string;
    stroke: string;
    glow: string;
    glyph: string;
    disabledGlyphOpacity: number;
}

export const POINTER_TYPES_WITH_CURSOR = new Set(['mouse', 'pen']);

const BASE_CURSOR_FILL = 'rgba(255, 255, 255, 0.94)';
const BASE_CURSOR_STROKE = 'rgba(224, 232, 228, 0.95)';
const BASE_CURSOR_GLOW = 'rgba(72, 52, 126, 0.46)';
const ACTIVE_GLYPH = 'rgba(36, 43, 68, 0.97)';
const HIGHLIGHT_GLYPH = 'rgba(46, 54, 84, 0.97)';
const DISABLED_GLYPH = 'rgba(120, 128, 142, 0.82)';

export const CURSOR_VISUALS: Record<CursorState, CursorVisualStyle> = {
    default: {
        fill: BASE_CURSOR_FILL,
        stroke: BASE_CURSOR_STROKE,
        glow: BASE_CURSOR_GLOW,
        glyph: ACTIVE_GLYPH,
        disabledGlyphOpacity: 0.85
    },
    harvest: {
        fill: BASE_CURSOR_FILL,
        stroke: BASE_CURSOR_STROKE,
        glow: BASE_CURSOR_GLOW,
        glyph: HIGHLIGHT_GLYPH,
        disabledGlyphOpacity: 0.85
    },
    'harvest-disabled': {
        fill: BASE_CURSOR_FILL,
        stroke: BASE_CURSOR_STROKE,
        glow: BASE_CURSOR_GLOW,
        glyph: DISABLED_GLYPH,
        disabledGlyphOpacity: 0.6
    },
    plant: {
        fill: BASE_CURSOR_FILL,
        stroke: BASE_CURSOR_STROKE,
        glow: BASE_CURSOR_GLOW,
        glyph: ACTIVE_GLYPH,
        disabledGlyphOpacity: 0.85
    },
    'plant-disabled': {
        fill: BASE_CURSOR_FILL,
        stroke: BASE_CURSOR_STROKE,
        glow: BASE_CURSOR_GLOW,
        glyph: DISABLED_GLYPH,
        disabledGlyphOpacity: 0.6
    },
    build: {
        fill: BASE_CURSOR_FILL,
        stroke: BASE_CURSOR_STROKE,
        glow: BASE_CURSOR_GLOW,
        glyph: HIGHLIGHT_GLYPH,
        disabledGlyphOpacity: 0.85
    },
    'build-disabled': {
        fill: BASE_CURSOR_FILL,
        stroke: BASE_CURSOR_STROKE,
        glow: BASE_CURSOR_GLOW,
        glyph: DISABLED_GLYPH,
        disabledGlyphOpacity: 0.6
    },
    water: {
        fill: BASE_CURSOR_FILL,
        stroke: BASE_CURSOR_STROKE,
        glow: 'rgba(38, 119, 196, 0.45)',
        glyph: 'rgba(34, 86, 152, 0.96)',
        disabledGlyphOpacity: 0.85
    },
    'water-disabled': {
        fill: BASE_CURSOR_FILL,
        stroke: BASE_CURSOR_STROKE,
        glow: 'rgba(64, 84, 110, 0.4)',
        glyph: 'rgba(104, 116, 136, 0.8)',
        disabledGlyphOpacity: 0.6
    }
};

function drawRoundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

export const CURSOR_GLYPH_PATHS: Record<
    CursorGlyphKey,
    { outer: (ctx: CanvasRenderingContext2D, size: number) => void }
> = {
    default: {
        outer: (ctx, size) => {
            const radius = size * 0.34;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    harvest: {
        outer: (ctx, size) => {
            const width = size * 0.54;
            const height = size * 0.44;
            ctx.beginPath();
            ctx.ellipse(0, 0, width * 0.5, height * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-width * 0.1, -height * 0.42);
            ctx.quadraticCurveTo(width * 0.45, -height * 0.62, width * 0.6, -height * 0.68);
            ctx.stroke();
        }
    },
    plant: {
        outer: (ctx, size) => {
            const stemHeight = size * 0.32;
            const stemWidth = size * 0.08;
            ctx.beginPath();
            ctx.moveTo(-stemWidth, stemHeight * 0.45);
            ctx.bezierCurveTo(
                -stemWidth,
                stemHeight * 0.1,
                stemWidth,
                -stemHeight * 0.25,
                0,
                -stemHeight * 0.6
            );
            ctx.bezierCurveTo(
                -stemWidth * 2,
                -stemHeight * 0.75,
                -stemWidth * 1.5,
                -stemHeight * 0.95,
                stemWidth,
                -stemHeight
            );
            ctx.lineTo(stemWidth, stemHeight * 0.55);
            ctx.closePath();
            ctx.fill();
        }
    },
    build: {
        outer: (ctx, size) => {
            const width = size * 0.44;
            const height = size * 0.56;
            drawRoundedRectPath(ctx, -width / 2, -height / 2, width, height, width * 0.14);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-width / 2, height / 2);
            ctx.lineTo(width / 2, height / 2);
            ctx.stroke();
        }
    },
    water: {
        outer: (ctx, size) => {
            const width = size * 0.38;
            const height = size * 0.56;
            ctx.beginPath();
            ctx.moveTo(0, -height * 0.52);
            ctx.bezierCurveTo(width * 0.78, -height * 0.02, width * 0.58, height * 0.48, 0, height * 0.52);
            ctx.bezierCurveTo(-width * 0.58, height * 0.48, -width * 0.78, -height * 0.02, 0, -height * 0.52);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, -height * 0.2);
            ctx.bezierCurveTo(width * 0.22, 0, width * 0.08, height * 0.28, 0, height * 0.34);
            ctx.stroke();
        }
    }
};

export function getCursorVisual(state: CursorState): CursorVisualStyle {
    return CURSOR_VISUALS[state];
}

export function toCursorGlyphKey(state: CursorState): CursorGlyphKey {
    switch (state) {
        case 'harvest':
        case 'harvest-disabled':
            return 'harvest';
        case 'plant':
        case 'plant-disabled':
            return 'plant';
        case 'build':
        case 'build-disabled':
            return 'build';
        case 'water':
        case 'water-disabled':
            return 'water';
        default:
            return 'default';
    }
}