import type { Inventory, PlantDefinition } from '../core/GameState';
import {
    CanvasTexture,
    LinearFilter,
    Mesh,
    MeshBasicMaterial,
    OrthographicCamera,
    PlaneGeometry,
    Scene,
    WebGLRenderer
} from 'three';
import {
    CURSOR_GLYPH_PATHS,
    CursorState,
    POINTER_TYPES_WITH_CURSOR,
    getCursorVisual,
    toCursorGlyphKey
} from './CursorIndicator';

export interface SeedOption {
    id: string;
    label: string;
}

export type ActionMode = 'plant' | 'build' | 'water';

interface ActionConfig {
    mode: ActionMode;
    icon: string;
    label: string;
}

const ACTION_CONFIG: ActionConfig[] = [
    { mode: 'plant', icon: '🌱', label: 'Plant' },
    { mode: 'build', icon: '🧱', label: 'Build' },
    { mode: 'water', icon: '💧', label: 'Water' }
];

export interface GameUIBindings {
    onModeChanged: (mode: ActionMode) => void;
    onSeedSelected: (seedId: string | null) => void;
}

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface HudLayout {
    infoBar: Rect;
    messageRect: Rect;
    dockOrigin: { x: number; y: number };
    dockOrientation: 'horizontal' | 'vertical';
    buttonSize: number;
    buttonGap: number;
}

interface PulseState {
    type: 'increase' | 'decrease';
    startTime: number;
    duration: number;
}

interface CanvasButton {
    mode: ActionMode;
    icon: string;
    label: string;
    rect: Rect;
    isActive: boolean;
    isDisabled: boolean;
    isPlacement: boolean;
    isHovered: boolean;
}

interface MessageState {
    text: string;
    alpha: number;
    targetAlpha: number;
    hideAt: number;
    persist: boolean;
}

interface PointerState {
    x: number;
    y: number;
    visible: boolean;
    pressed: boolean;
    pointerType: string;
    clickPulseStart: number | null;
}

const COUNTER_PULSE_DURATION = 360;
const CLICK_PULSE_DURATION = 260;
const MESSAGE_DEFAULT_DURATION = 1600;
const MESSAGE_FADE_SPEED = 0.015;
const FONT_FAMILY = `'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    radius: number
): void {
    const { x, y, width, height } = rect;
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

export class GameUI {
    private readonly renderer: WebGLRenderer;
    private readonly domElement: HTMLCanvasElement;
    private readonly bindings: GameUIBindings;
    private readonly overlayScene: Scene;
    private readonly overlayCamera: OrthographicCamera;
    private readonly overlayMesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
    private readonly overlayGeometry: PlaneGeometry;
    private readonly overlayMaterial: MeshBasicMaterial;
    private readonly texture: CanvasTexture;
    private readonly textureCanvas: HTMLCanvasElement;
    private readonly textureCtx: CanvasRenderingContext2D;

    private readonly previousCursor: string;

    private width = 0;
    private height = 0;
    private devicePixelRatio = 1;
    private layout: HudLayout = {
        infoBar: { x: 0, y: 0, width: 0, height: 0 },
        messageRect: { x: 0, y: 0, width: 0, height: 0 },
        dockOrigin: { x: 0, y: 0 },
        dockOrientation: 'vertical',
        buttonSize: 0,
        buttonGap: 0
    };

    private buttons: CanvasButton[] = [];
    private buttonMap: Map<ActionMode, CanvasButton> = new Map();
    private hoverButton: CanvasButton | null = null;
    private activeButton: CanvasButton | null = null;

    private currentMode: ActionMode = 'plant';
    private lastSeedTotal = 0;
    private lastFruitCount = 0;
    private plantAvailable = false;
    private buildAvailable = false;
    private buildPlacementActive = false;
    private waterAvailable = true;
    private waterLevel = 1;
    private waterCapacity = 1;
    private waterStatusMessage: string | null = null;
    private seedOptions: SeedOption[] = [];
    private lastInventory: Inventory | null = null;
    private primarySeedId: string | null = null;
    private seedPulse: PulseState | null = null;
    private fruitPulse: PulseState | null = null;

    private pointer: PointerState = {
        x: 0,
        y: 0,
        visible: false,
        pressed: false,
        pointerType: 'mouse',
        clickPulseStart: null
    };

    private cursorState: CursorState = 'default';
    private messageState: MessageState = {
        text: '',
        alpha: 0,
        targetAlpha: 0,
        hideAt: 0,
        persist: false
    };

    private needsRedraw = true;
    private destroyed = false;
    private lastRenderTime = performance.now();

    private readonly pointerMoveHandler = (event: PointerEvent): void => {
        this.handlePointerMove(event);
    };
    private readonly pointerDownHandler = (event: PointerEvent): void => {
        this.handlePointerDown(event);
    };
    private readonly pointerUpHandler = (event: PointerEvent): void => {
        this.handlePointerUp(event);
    };
    private readonly pointerLeaveHandler = (): void => {
        this.handlePointerLeave();
    };
    private readonly pointerCancelHandler = (): void => {
        this.handlePointerCancel();
    };
    private readonly windowBlurHandler = (): void => {
        this.handleWindowBlur();
    };

    constructor(renderer: WebGLRenderer, bindings: GameUIBindings) {
        this.renderer = renderer;
        this.domElement = renderer.domElement;
        this.bindings = bindings;

        this.textureCanvas = document.createElement('canvas');
        const context = this.textureCanvas.getContext('2d', { alpha: true });
        if (!context) {
            throw new Error('Unable to acquire 2D context for game UI.');
        }
        this.textureCtx = context;
        this.texture = new CanvasTexture(this.textureCanvas);
        this.texture.minFilter = LinearFilter;
        this.texture.magFilter = LinearFilter;
        this.texture.anisotropy = 1;
        this.texture.needsUpdate = true;

        this.overlayGeometry = new PlaneGeometry(2, 2);
        this.overlayMaterial = new MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
        this.overlayMesh = new Mesh(this.overlayGeometry, this.overlayMaterial);
        this.overlayScene = new Scene();
        this.overlayScene.add(this.overlayMesh);
        this.overlayCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

        this.previousCursor = this.domElement.style.cursor;
        this.domElement.style.cursor = 'none';

        this.domElement.addEventListener('pointermove', this.pointerMoveHandler, true);
        this.domElement.addEventListener('pointerdown', this.pointerDownHandler, true);
        this.domElement.addEventListener('pointerup', this.pointerUpHandler, true);
        this.domElement.addEventListener('pointerleave', this.pointerLeaveHandler, true);
        this.domElement.addEventListener('pointercancel', this.pointerCancelHandler, true);
        window.addEventListener('blur', this.windowBlurHandler);

        this.rebuildButtons();
        this.setMode('plant', { notify: false });
        this.updateActionButtonStates();
    }

    public destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;

        this.domElement.style.cursor = this.previousCursor;

        this.domElement.removeEventListener('pointermove', this.pointerMoveHandler, true);
        this.domElement.removeEventListener('pointerdown', this.pointerDownHandler, true);
        this.domElement.removeEventListener('pointerup', this.pointerUpHandler, true);
        this.domElement.removeEventListener('pointerleave', this.pointerLeaveHandler, true);
        this.domElement.removeEventListener('pointercancel', this.pointerCancelHandler, true);
        window.removeEventListener('blur', this.windowBlurHandler);

        this.overlayScene.remove(this.overlayMesh);
        this.overlayGeometry.dispose();
        this.overlayMaterial.dispose();
        this.texture.dispose();
        this.buttons.length = 0;
        this.buttonMap.clear();
    }

    public setSeedOptions(options: SeedOption[], _definitions: Map<string, PlantDefinition>): void {
        this.seedOptions = options.slice();
        this.primarySeedId = null;
        this.updatePrimarySeedSelection(this.lastInventory);
        this.updateActionButtonStates();
        this.requestRedraw();
    }

    public updateInventory(inventory: Inventory, _definitions: Map<string, PlantDefinition>): void {
        this.lastInventory = inventory;
        let totalSeeds = 0;
        for (const count of Object.values(inventory.seeds)) {
            totalSeeds += count;
        }

        const seedDiff = totalSeeds - this.lastSeedTotal;
        if (seedDiff !== 0) {
            this.seedPulse = {
                type: seedDiff > 0 ? 'increase' : 'decrease',
                startTime: performance.now(),
                duration: COUNTER_PULSE_DURATION
            };
            this.requestRedraw();
        }
        this.lastSeedTotal = totalSeeds;

        const fruitDiff = inventory.fruit - this.lastFruitCount;
        if (fruitDiff !== 0) {
            this.fruitPulse = {
                type: fruitDiff > 0 ? 'increase' : 'decrease',
                startTime: performance.now(),
                duration: COUNTER_PULSE_DURATION
            };
            this.requestRedraw();
        }
        this.lastFruitCount = inventory.fruit;

        this.updatePrimarySeedSelection(inventory);
        this.updateActionButtonStates();
    }

    public triggerFruitPulse(): void {
        this.fruitPulse = {
            type: 'increase',
            startTime: performance.now(),
            duration: COUNTER_PULSE_DURATION
        };
        this.requestRedraw();
    }

    public setBuildState(options: {
        available: boolean;
        message?: string;
        placementActive?: boolean;
    }): void {
        const { available, placementActive } = options;
        this.buildPlacementActive = Boolean(placementActive);
        this.buildAvailable = available;

        if (options.message) {
            this.showModeMessage(options.message, true);
        } else if (!this.buildPlacementActive) {
            this.clearModeMessage();
        }

        if (this.buildPlacementActive) {
            this.setMode('build', { notify: false });
        }

        this.updateActionButtonStates();
    }

    public setWaterStatus(
        status: {
            level: number;
            capacity: number;
            available: boolean;
            message?: string | null;
        },
        options?: { force?: boolean }
    ): void {
        const capacity = Math.max(status.capacity, 0.0001);
        const clampedLevel = clamp(status.level, 0, capacity);
        const nextMessage = status.message ?? null;
        const force = options?.force ?? false;

        const changed =
            this.waterLevel !== clampedLevel ||
            this.waterCapacity !== capacity ||
            this.waterAvailable !== status.available ||
            this.waterStatusMessage !== nextMessage;

        if (!changed && !force) {
            return;
        }

        this.waterLevel = clampedLevel;
        this.waterCapacity = capacity;
        this.waterAvailable = status.available;
        this.waterStatusMessage = nextMessage;

        if (this.currentMode === 'water') {
            if (!this.waterAvailable) {
                this.showModeMessage(this.waterStatusMessage ?? 'Reservoir empty', true);
            } else if (this.waterStatusMessage) {
                this.showModeMessage(this.waterStatusMessage, true);
            } else {
                this.clearModeMessage();
            }
        }

        this.updateActionButtonStates();
        this.requestRedraw();
    }

    public syncMode(mode: ActionMode): void {
        this.setMode(mode, { notify: false });
    }

    public requestModeChange(mode: ActionMode): void {
        if (mode === this.currentMode) {
            return;
        }
        if (!this.isModeAvailable(mode)) {
            return;
        }
        this.setMode(mode, { notify: true });
    }

    public showModeMessage(message: string, persist = false): void {
        const now = performance.now();
        this.messageState.text = message;
        this.messageState.persist = persist;
        this.messageState.targetAlpha = 1;
        this.messageState.hideAt = persist ? Number.POSITIVE_INFINITY : now + MESSAGE_DEFAULT_DURATION;
        this.requestRedraw();
    }

    public clearModeMessage(): void {
        this.messageState.persist = false;
        this.messageState.targetAlpha = 0;
        this.messageState.hideAt = 0;
        this.requestRedraw();
    }

    public handleResize(width: number, height: number): void {
        this.width = Math.max(0, Math.floor(width));
        this.height = Math.max(0, Math.floor(height));
        this.devicePixelRatio = clamp(window.devicePixelRatio ?? 1, 1, 2);

        const pixelWidth = Math.max(1, Math.round(this.width * this.devicePixelRatio));
        const pixelHeight = Math.max(1, Math.round(this.height * this.devicePixelRatio));

        if (this.textureCanvas.width !== pixelWidth || this.textureCanvas.height !== pixelHeight) {
            this.textureCanvas.width = pixelWidth;
            this.textureCanvas.height = pixelHeight;
            this.texture.needsUpdate = true;
        }

        this.updateLayout();
        this.requestRedraw();
    }

    public render(currentTime: number): void {
        if (this.destroyed || this.width === 0 || this.height === 0) {
            return;
        }

        const now = currentTime;
        const delta = now - this.lastRenderTime;
        this.lastRenderTime = now;

        const animating = this.advanceAnimations(now, delta);
        if (this.needsRedraw || animating) {
            this.draw(now);
            this.texture.needsUpdate = true;
            this.needsRedraw = false;
        }

        this.renderer.clearDepth();
        this.renderer.render(this.overlayScene, this.overlayCamera);
    }

    public setCursorState(state: CursorState): void {
        if (this.cursorState === state) {
            return;
        }
        this.cursorState = state;
        this.requestRedraw();
    }

    private requestRedraw(): void {
        this.needsRedraw = true;
    }

    private updateLayout(): void {
        if (this.width === 0 || this.height === 0) {
            return;
        }

        const isMobile = this.width <= 720;
        const infoBarWidth = clamp(this.width * 0.7, 260, 420);
        const infoBarHeight = isMobile ? 88 : 112;
        const infoBarX = (this.width - infoBarWidth) / 2;
        const infoBarY = isMobile ? 24 : 48;

        this.layout.infoBar = {
            x: infoBarX,
            y: infoBarY,
            width: infoBarWidth,
            height: infoBarHeight
        };

        const buttonSize = isMobile ? 76 : 96;
        const buttonGap = isMobile ? 18 : 24;
        const dockWidth = isMobile
            ? buttonSize * ACTION_CONFIG.length + buttonGap * (ACTION_CONFIG.length - 1)
            : buttonSize;
        const dockHeight = isMobile
            ? buttonSize
            : buttonSize * ACTION_CONFIG.length + buttonGap * (ACTION_CONFIG.length - 1);

        const dockX = isMobile
            ? (this.width - dockWidth) / 2
            : this.width - buttonSize - (isMobile ? 24 : 64);
        const dockY = isMobile
            ? this.height - buttonSize - 32
            : (this.height - dockHeight) / 2;

        this.layout.dockOrigin = { x: dockX, y: dockY };
        this.layout.dockOrientation = isMobile ? 'horizontal' : 'vertical';
        this.layout.buttonSize = buttonSize;
        this.layout.buttonGap = buttonGap;

        const messageWidth = isMobile ? clamp(this.width * 0.8, 200, 320) : 260;
        const messageHeight = isMobile ? 64 : 72;
        const messageX = isMobile
            ? (this.width - messageWidth) / 2
            : dockX - messageWidth - 36;
        const messageY = isMobile
            ? Math.max(infoBarY + infoBarHeight + 18, dockY - messageHeight - 24)
            : dockY + dockHeight / 2 - messageHeight / 2;

        this.layout.messageRect = {
            x: messageX,
            y: messageY,
            width: messageWidth,
            height: messageHeight
        };

        this.rebuildButtons();
        this.requestRedraw();
    }

    private rebuildButtons(): void {
        const newButtons: CanvasButton[] = [];
        const orientation = this.layout.dockOrientation;
        let cursorX = this.layout.dockOrigin.x;
        let cursorY = this.layout.dockOrigin.y;

        for (const action of ACTION_CONFIG) {
            const previous = this.buttonMap.get(action.mode);
            const rect: Rect = {
                x: cursorX,
                y: cursorY,
                width: this.layout.buttonSize,
                height: this.layout.buttonSize
            };

            const button: CanvasButton = {
                mode: action.mode,
                icon: action.icon,
                label: action.label,
                rect,
                isActive: previous?.isActive ?? action.mode === this.currentMode,
                isDisabled: previous?.isDisabled ?? false,
                isPlacement: previous?.isPlacement ?? false,
                isHovered: previous?.isHovered ?? false
            };

            newButtons.push(button);
            this.buttonMap.set(action.mode, button);

            if (orientation === 'horizontal') {
                cursorX += this.layout.buttonSize + this.layout.buttonGap;
            } else {
                cursorY += this.layout.buttonSize + this.layout.buttonGap;
            }
        }

        this.buttons = newButtons;
    }

    private advanceAnimations(now: number, delta: number): boolean {
        let animating = false;

        if (this.seedPulse && now - this.seedPulse.startTime >= this.seedPulse.duration) {
            this.seedPulse = null;
            this.requestRedraw();
        } else if (this.seedPulse) {
            animating = true;
        }

        if (this.fruitPulse && now - this.fruitPulse.startTime >= this.fruitPulse.duration) {
            this.fruitPulse = null;
            this.requestRedraw();
        } else if (this.fruitPulse) {
            animating = true;
        }

        if (
            !this.messageState.persist &&
            this.messageState.hideAt > 0 &&
            now >= this.messageState.hideAt
        ) {
            this.messageState.targetAlpha = 0;
            this.messageState.hideAt = 0;
        }

        const alphaDelta = this.messageState.targetAlpha - this.messageState.alpha;
        if (Math.abs(alphaDelta) > 0.001) {
            const step = alphaDelta * clamp(delta * MESSAGE_FADE_SPEED, 0, 1);
            this.messageState.alpha = clamp(this.messageState.alpha + step, 0, 1);
            animating = true;
            this.requestRedraw();
        } else if (this.messageState.alpha !== this.messageState.targetAlpha) {
            this.messageState.alpha = this.messageState.targetAlpha;
            this.requestRedraw();
        }

        if (this.pointer.clickPulseStart !== null) {
            const progress = (now - this.pointer.clickPulseStart) / CLICK_PULSE_DURATION;
            if (progress >= 1) {
                this.pointer.clickPulseStart = null;
            } else {
                animating = true;
                this.requestRedraw();
            }
        }

        if (!this.pointer.visible && !this.pointer.pressed && this.pointer.clickPulseStart === null) {
            // no pointer animations
        } else if (this.pointer.pressed) {
            animating = true;
        }

        return animating;
    }

    private draw(now: number): void {
        const ctx = this.textureCtx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.textureCanvas.width, this.textureCanvas.height);
        ctx.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);
        ctx.imageSmoothingEnabled = true;

        this.drawInfoBar(ctx, now);
        this.drawActionDock(ctx);
        this.drawModeMessage(ctx);
        this.drawCursor(ctx, now);
    }

    private drawInfoBar(ctx: CanvasRenderingContext2D, now: number): void {
        const rect = this.layout.infoBar;
        if (rect.width === 0 || rect.height === 0) {
            return;
        }

        ctx.save();
        ctx.shadowColor = 'rgba(16, 24, 40, 0.18)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 18;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        drawRoundedRect(ctx, rect, 36);
        ctx.fill();
        ctx.restore();

        const paddingX = 28;
        const centerY = rect.y + rect.height * 0.34;
        const gap = Math.max(40, rect.width * 0.12);
        const iconSize = Math.round(rect.height * 0.36);

        const seedPulse = this.getPulseStyle(this.seedPulse, now);
        const fruitPulse = this.getPulseStyle(this.fruitPulse, now);

        const seedX = rect.x + paddingX;
        this.drawCounter(ctx, {
            icon: '🌱',
            label: 'Seeds',
            value: `${this.lastSeedTotal}`,
            centerY,
            iconSize,
            x: seedX,
            scale: seedPulse.scale,
            color: seedPulse.color
        });

        const fruitX = rect.x + rect.width / 2 + gap / 2;
        this.drawCounter(ctx, {
            icon: '🍓',
            label: 'Fruit',
            value: `${this.lastFruitCount}`,
            centerY,
            iconSize,
            x: fruitX,
            scale: fruitPulse.scale,
            color: fruitPulse.color
        });

        const meterWidth = rect.width - paddingX * 2;
        const meterHeight = Math.round(Math.max(14, rect.height * 0.26));
        const meterBottomSpacing = Math.round(Math.max(6, rect.height * 0.08));
        const meterX = rect.x + paddingX;
        const meterY = rect.y + rect.height - meterHeight - meterBottomSpacing;
        const ratio = clamp(this.waterLevel / this.waterCapacity, 0, 1);
        this.drawWaterMeter(ctx, {
            x: meterX,
            y: meterY,
            width: meterWidth,
            height: meterHeight,
            ratio,
            available: this.waterAvailable,
            message: this.waterStatusMessage
        });
    }

    private drawCounter(
        ctx: CanvasRenderingContext2D,
        options: {
            icon: string;
            label: string;
            value: string;
            x: number;
            centerY: number;
            iconSize: number;
            scale: number;
            color: string;
        }
    ): void {
        const iconOffset = 0;
        ctx.save();
        ctx.font = `500 ${options.iconSize}px ${FONT_FAMILY}`;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#183028';
        ctx.fillText(options.icon, options.x + iconOffset, options.centerY);

        const valueX = options.x + options.iconSize + 28;
        ctx.font = `600 28px ${FONT_FAMILY}`;
        ctx.fillStyle = options.color;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.translate(valueX, options.centerY);
        ctx.scale(options.scale, options.scale);
        ctx.fillText(options.value, 0, 0);
        ctx.restore();
    }

    private drawWaterMeter(
        ctx: CanvasRenderingContext2D,
        options: {
            x: number;
            y: number;
            width: number;
            height: number;
            ratio: number;
            available: boolean;
            message: string | null;
        }
    ): void {
        const { x, y, width, height, ratio, available, message } = options;
        if (width <= 0 || height <= 0) {
            return;
        }

        const roundedRatio = clamp(ratio, 0, 1);
        const statusText = message ?? (available ? `${Math.round(roundedRatio * 100)}%` : 'Empty');

        ctx.save();
        const radius = height / 2;
        const meterRect: Rect = { x, y, width, height };

        ctx.beginPath();
        drawRoundedRect(ctx, meterRect, radius);
        ctx.fillStyle = 'rgba(24, 48, 40, 0.16)';
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        drawRoundedRect(ctx, meterRect, radius);
        ctx.clip();

        const fillWidth = roundedRatio <= 0 ? 0 : Math.max(radius, width * roundedRatio);
        if (fillWidth > 0) {
            const gradient = ctx.createLinearGradient(x, y, x, y + height);
            if (available) {
                gradient.addColorStop(0, 'rgba(124, 206, 255, 0.95)');
                gradient.addColorStop(1, 'rgba(68, 142, 220, 0.95)');
            } else {
                gradient.addColorStop(0, 'rgba(160, 170, 186, 0.65)');
                gradient.addColorStop(1, 'rgba(116, 128, 150, 0.7)');
            }
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, fillWidth, height);
        }

        ctx.restore();

        const inset = Math.max(8, height * 0.3);
        const labelCenterY = y + height / 2;
        const labelFontSize = Math.max(11, Math.round(height * 0.6));

        ctx.save();
        ctx.font = `700 ${labelFontSize}px ${FONT_FAMILY}`;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = available ? 'rgba(24, 48, 40, 0.82)' : 'rgba(24, 48, 40, 0.6)';
        ctx.textAlign = 'left';
        ctx.fillText('WATER', x + inset, labelCenterY, width * 0.55);

        ctx.textAlign = 'right';
        ctx.fillText(statusText.toUpperCase(), x + width - inset, labelCenterY, width * 0.55);
        ctx.restore();

        ctx.lineWidth = 1.5;
        ctx.strokeStyle = available ? 'rgba(46, 104, 162, 0.8)' : 'rgba(80, 92, 112, 0.75)';
        drawRoundedRect(ctx, meterRect, radius);
        ctx.stroke();

        ctx.restore();
    }

    private getPulseStyle(pulse: PulseState | null, now: number): { scale: number; color: string } {
        const baseColor = '#183028';
        if (!pulse) {
            return { scale: 1, color: baseColor };
        }
        const progress = clamp((now - pulse.startTime) / pulse.duration, 0, 1);
        const curve = 1 - Math.pow(1 - progress, 3);
        const scale = pulse.type === 'increase' ? lerp(1.12, 1, curve) : lerp(0.88, 1, curve);
        const highlight = pulse.type === 'increase' ? '#44c776' : '#e95a5a';
        const color = progress < 0.5 ? highlight : baseColor;
        return { scale, color };
    }

    private drawActionDock(ctx: CanvasRenderingContext2D): void {
        for (const button of this.buttons) {
            this.drawActionButton(ctx, button);
        }
    }

    private drawActionButton(ctx: CanvasRenderingContext2D, button: CanvasButton): void {
        const rect = button.rect;
        ctx.save();

        let fill = 'rgba(255, 255, 255, 0.94)';
        let stroke = 'rgba(31, 61, 43, 0.26)';

        if (button.isPlacement) {
            fill = '#ffd267';
            stroke = 'rgba(176, 126, 36, 0.8)';
        } else if (button.isActive) {
            if (button.mode === 'plant') {
                fill = 'rgba(173, 236, 200, 0.95)';
                stroke = 'rgba(48, 134, 80, 0.9)';
            } else if (button.mode === 'water') {
                fill = 'rgba(164, 214, 255, 0.95)';
                stroke = 'rgba(46, 120, 186, 0.9)';
            } else {
                fill = 'rgba(78, 216, 132, 0.95)';
                stroke = 'rgba(34, 114, 70, 0.9)';
            }
        } else if (button.isDisabled) {
            fill = 'rgba(255, 255, 255, 0.28)';
            stroke = 'rgba(31, 61, 43, 0.18)';
        } else if (button.isHovered) {
            fill = 'rgba(255, 255, 255, 0.98)';
        }

        ctx.shadowColor = button.isDisabled ? 'rgba(0,0,0,0)' : 'rgba(15, 35, 27, 0.26)';
        ctx.shadowBlur = button.isDisabled ? 0 : 24;
        ctx.shadowOffsetY = button.isDisabled ? 0 : 12;
        ctx.shadowOffsetX = 0;

        ctx.fillStyle = fill;
        drawRoundedRect(ctx, rect, 22);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        if (!button.isDisabled) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = stroke;
            drawRoundedRect(ctx, rect, 22);
            ctx.stroke();
        }

        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        const iconY = rect.y + rect.height * 0.42;
        ctx.font = `500 ${rect.height * 0.42}px ${FONT_FAMILY}`;
        ctx.fillStyle = button.isDisabled ? 'rgba(52, 74, 64, 0.4)' : 'rgba(31, 61, 43, 0.92)';
        ctx.fillText(button.icon, rect.x + rect.width / 2, iconY);

        ctx.font = `600 ${rect.height * 0.18}px ${FONT_FAMILY}`;
        ctx.globalAlpha = button.isDisabled ? 0.5 : 0.9;
        ctx.fillText(button.label.toUpperCase(), rect.x + rect.width / 2, rect.y + rect.height * 0.78);
        ctx.restore();
    }

    private drawModeMessage(ctx: CanvasRenderingContext2D): void {
        if (this.messageState.alpha <= 0 || !this.messageState.text) {
            return;
        }

        const rect = this.layout.messageRect;
        ctx.save();
        ctx.globalAlpha = this.messageState.alpha;

        ctx.shadowColor = 'rgba(24, 48, 40, 0.42)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 12;

        ctx.fillStyle = 'rgba(24, 48, 40, 0.88)';
        drawRoundedRect(ctx, rect, 18);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#ffffff';
        ctx.font = `500 18px ${FONT_FAMILY}`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(this.messageState.text, rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width - 24);
        ctx.restore();
    }

    private drawCursor(ctx: CanvasRenderingContext2D, now: number): void {
        if (!this.pointer.visible) {
            return;
        }

        const style = getCursorVisual(this.cursorState);
        const glyphKey = toCursorGlyphKey(this.cursorState);
        const glyph = CURSOR_GLYPH_PATHS[glyphKey];
        const radius = 28;
        const haloRadius = radius * 1.8;
        const scale = this.pointer.pressed ? 0.92 : 1;

        ctx.save();
        ctx.translate(this.pointer.x, this.pointer.y);
        ctx.scale(scale, scale);

        ctx.beginPath();
        ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(0, 0, radius * 0.6, 0, 0, haloRadius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
        gradient.addColorStop(0.6, style.glow);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.55;
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = style.fill;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = style.stroke;
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = style.glyph;
        ctx.strokeStyle = style.glyph;
        ctx.globalAlpha = this.cursorState.endsWith('disabled') ? style.disabledGlyphOpacity : 1;
        const glyphSize = radius * 1.2;
        glyph.outer(ctx, glyphSize);

        if (this.pointer.clickPulseStart !== null) {
            const progress = clamp((now - this.pointer.clickPulseStart) / CLICK_PULSE_DURATION, 0, 1);
            ctx.globalAlpha = 1 - progress;
            ctx.lineWidth = 2;
            ctx.strokeStyle = style.stroke;
            ctx.beginPath();
            ctx.arc(0, 0, radius + progress * 16, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    private handlePointerMove(event: PointerEvent): void {
        if (this.destroyed) {
            return;
        }

        const local = this.getLocalPointer(event);
        if (!local) {
            this.hidePointer();
            return;
        }

        const supportsCursor = POINTER_TYPES_WITH_CURSOR.has(event.pointerType);
        this.pointer.pointerType = event.pointerType;
        this.pointer.visible = supportsCursor;
        this.pointer.x = local.x;
        this.pointer.y = local.y;

        let consumed = false;
        if (supportsCursor) {
            const hovered = this.hitTestButton(local.x, local.y);
            if (hovered !== this.hoverButton) {
                if (this.hoverButton) {
                    this.hoverButton.isHovered = false;
                }
                if (hovered) {
                    hovered.isHovered = true;
                    consumed = true;
                }
                this.hoverButton = hovered;
                this.requestRedraw();
            } else if (hovered) {
                consumed = true;
            }
        }

        if (consumed) {
            event.stopPropagation();
            event.preventDefault();
        }

        this.requestRedraw();
    }

    private handlePointerDown(event: PointerEvent): void {
        if (!POINTER_TYPES_WITH_CURSOR.has(event.pointerType) || event.button !== 0) {
            return;
        }

        const local = this.getLocalPointer(event);
        if (!local) {
            return;
        }

        this.pointer.visible = true;
        this.pointer.pressed = true;
        this.pointer.x = local.x;
        this.pointer.y = local.y;
        this.pointer.clickPulseStart = performance.now();

        const hovered = this.hitTestButton(local.x, local.y);
        if (hovered && !hovered.isDisabled) {
            this.activeButton = hovered;
            event.stopPropagation();
            event.preventDefault();
        }

        this.requestRedraw();
    }

    private handlePointerUp(event: PointerEvent): void {
        if (!POINTER_TYPES_WITH_CURSOR.has(event.pointerType) || event.button !== 0) {
            return;
        }

        const local = this.getLocalPointer(event);
        if (local) {
            this.pointer.x = local.x;
            this.pointer.y = local.y;
        }
        this.pointer.pressed = false;

        const hovered = local ? this.hitTestButton(local.x, local.y) : null;
        if (this.activeButton && hovered === this.activeButton && !this.activeButton.isDisabled) {
            this.handleModeRequest(this.activeButton.mode);
            event.stopPropagation();
            event.preventDefault();
        }

        this.activeButton = null;
        this.requestRedraw();
    }

    private handlePointerLeave(): void {
        this.hoverButton = null;
        this.activeButton = null;
        this.pointer.visible = false;
        this.pointer.pressed = false;
        this.requestRedraw();
    }

    private handlePointerCancel(): void {
        this.activeButton = null;
        this.pointer.pressed = false;
        this.pointer.clickPulseStart = null;
        this.requestRedraw();
    }

    private handleWindowBlur(): void {
        this.pointer.visible = false;
        this.pointer.pressed = false;
        this.pointer.clickPulseStart = null;
        if (this.hoverButton) {
            this.hoverButton.isHovered = false;
            this.hoverButton = null;
        }
        this.requestRedraw();
    }

    private hidePointer(): void {
        if (this.pointer.visible || this.pointer.pressed) {
            this.pointer.visible = false;
            this.pointer.pressed = false;
            this.requestRedraw();
        }
    }

    private getLocalPointer(event: PointerEvent): { x: number; y: number } | null {
        const rect = this.domElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            return null;
        }

        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
            return null;
        }

        return { x, y };
    }

    private hitTestButton(x: number, y: number): CanvasButton | null {
        for (const button of this.buttons) {
            const rect = button.rect;
            if (
                x >= rect.x &&
                x <= rect.x + rect.width &&
                y >= rect.y &&
                y <= rect.y + rect.height
            ) {
                return button;
            }
        }
        return null;
    }

    private handleModeRequest(mode: ActionMode): void {
        if (mode === this.currentMode) {
            return;
        }

        if (!this.isModeAvailable(mode)) {
            return;
        }

        this.setMode(mode, { notify: true });
    }

    private setMode(mode: ActionMode, options: { notify: boolean }): void {
        const { notify } = options;
        this.currentMode = mode;

        for (const button of this.buttons) {
            button.isActive = button.mode === mode;
        }

        if (!notify) {
            this.requestRedraw();
            return;
        }

        if (mode === 'plant') {
            this.bindings.onSeedSelected(this.primarySeedId ?? null);
        } else if (mode === 'build') {
            this.bindings.onSeedSelected(null);
        }

        this.bindings.onModeChanged(mode);
        this.requestRedraw();
    }

    private updatePrimarySeedSelection(inventory: Inventory | null): void {
        const source = inventory ?? this.lastInventory;
        if (!source) {
            const seedChanged = this.primarySeedId !== null;
            this.primarySeedId = null;
            this.plantAvailable = false;
            if (seedChanged && this.currentMode === 'plant') {
                this.bindings.onSeedSelected(null);
            }
            return;
        }

        let nextSeedId: string | null = null;

        for (const option of this.seedOptions) {
            const count = source.seeds[option.id] ?? 0;
            if (count > 0) {
                nextSeedId = option.id;
                break;
            }
        }

        const seedChanged = this.primarySeedId !== nextSeedId;
        this.primarySeedId = nextSeedId;
        this.plantAvailable = this.primarySeedId !== null;

        if (!seedChanged || this.currentMode !== 'plant') {
            return;
        }

        this.bindings.onSeedSelected(this.primarySeedId ?? null);
    }

    private updateActionButtonStates(): void {
        for (const button of this.buttons) {
            const available = this.isModeAvailable(button.mode);
            const isActive = button.mode === this.currentMode;
            const shouldDisable =
                !available &&
                (button.mode !== 'water' ? !isActive : true) &&
                !(button.mode === 'build' && this.buildPlacementActive);

            button.isDisabled = shouldDisable;
            button.isPlacement = button.mode === 'build' && this.buildPlacementActive;
        }

        this.requestRedraw();
    }

    private isModeAvailable(mode: ActionMode): boolean {
        if (mode === 'plant') {
            return this.plantAvailable;
        }

        if (mode === 'build') {
            return this.buildPlacementActive || this.buildAvailable;
        }

        if (mode === 'water') {
            return this.waterAvailable;
        }

        return false;
    }
}

