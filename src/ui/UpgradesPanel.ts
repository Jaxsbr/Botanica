import type { UpgradeDefinition } from '../config/upgrades';
import { calculateUpgradeCost } from '../config/upgrades';
import {
    CURSOR_GLYPH_PATHS,
    CursorState,
    POINTER_TYPES_WITH_CURSOR,
    getCursorVisual,
    toCursorGlyphKey
} from './CursorIndicator';
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

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface UpgradeCard {
    definition: UpgradeDefinition;
    rect: Rect;
    worldX: number;
    worldY: number;
    isHovered: boolean;
    currentLevel: number;
    cost: number;
    canAfford: boolean;
    children: UpgradeCard[];
    parent: UpgradeCard | null;
}

export interface UpgradesPanelBindings {
    onUpgradePurchase: (upgradeId: string) => void;
    onClose: () => void;
}

const FONT_FAMILY = `'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
const PANEL_PADDING = 32;
const CARD_WIDTH = 320;
const CARD_HEIGHT = 260;
const CARD_GAP = 16;
const CARD_PADDING = 28;
const TREE_LEVEL_SPACING = 300;
const TREE_NODE_SPACING = 360;
const CONNECTION_LINE_WIDTH = 2;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
): number {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    const lines: string[] = [];

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && i > 0) {
            lines.push(line);
            line = words[i] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i].trim(), x, currentY + i * lineHeight);
    }

    return currentY + lines.length * lineHeight;
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

export class UpgradesPanel {
    private readonly renderer: WebGLRenderer;
    private readonly domElement: HTMLCanvasElement;
    private readonly bindings: UpgradesPanelBindings;
    private readonly overlayScene: Scene;
    private readonly overlayCamera: OrthographicCamera;
    private readonly overlayMesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
    private readonly overlayGeometry: PlaneGeometry;
    private readonly overlayMaterial: MeshBasicMaterial;
    private readonly texture: CanvasTexture;
    private readonly textureCanvas: HTMLCanvasElement;
    private readonly textureCtx: CanvasRenderingContext2D;

    private width = 0;
    private height = 0;
    private devicePixelRatio = 1;
    private isVisible = false;
    private destroyed = false;
    private needsRedraw = true;

    private upgradeDefinitions: UpgradeDefinition[] = [];
    private upgradeLevels: Record<string, number> = {};
    private currentFruit = 0;
    private cards: UpgradeCard[] = [];
    private panelRect: Rect = { x: 0, y: 0, width: 0, height: 0 };
    private closeButtonRect: Rect = { x: 0, y: 0, width: 0, height: 0 };
    private viewOffset = { x: 0, y: 0 };
    private isDragging = false;
    private dragStart = { x: 0, y: 0 };
    private treeCenter = { x: 0, y: 0 };
    private hoveredCard: UpgradeCard | null = null;
    private hoveredCloseButton = false;
    private activeCard: UpgradeCard | null = null;
    private activeCloseButton = false;

    private pointer: {
        x: number;
        y: number;
        visible: boolean;
        pressed: boolean;
        clickPulseStart: number | null;
    } = {
            x: 0,
            y: 0,
            visible: false,
            pressed: false,
            clickPulseStart: null
        };

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
    private readonly pointerCancelHandler = (event: PointerEvent): void => {
        this.handlePointerCancel(event);
    };

    constructor(renderer: WebGLRenderer, bindings: UpgradesPanelBindings) {
        this.renderer = renderer;
        this.domElement = renderer.domElement;
        this.bindings = bindings;

        this.textureCanvas = document.createElement('canvas');
        const context = this.textureCanvas.getContext('2d', { alpha: true });
        if (!context) {
            throw new Error('Unable to acquire 2D context for upgrades panel.');
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

        this.domElement.addEventListener('pointermove', this.pointerMoveHandler, true);
        this.domElement.addEventListener('pointerdown', this.pointerDownHandler, true);
        this.domElement.addEventListener('pointerup', this.pointerUpHandler, true);
        this.domElement.addEventListener('pointerleave', this.pointerLeaveHandler, true);
        this.domElement.addEventListener('pointercancel', this.pointerCancelHandler, true);
    }

    public destroy(): void {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;

        this.domElement.removeEventListener('pointermove', this.pointerMoveHandler, true);
        this.domElement.removeEventListener('pointerdown', this.pointerDownHandler, true);
        this.domElement.removeEventListener('pointerup', this.pointerUpHandler, true);
        this.domElement.removeEventListener('pointerleave', this.pointerLeaveHandler, true);
        this.domElement.removeEventListener('pointercancel', this.pointerCancelHandler, true);

        this.overlayScene.remove(this.overlayMesh);
        this.overlayGeometry.dispose();
        this.overlayMaterial.dispose();
        this.texture.dispose();
        this.cards.length = 0;
    }

    public setVisible(visible: boolean): void {
        if (this.isVisible === visible) {
            return;
        }
        this.isVisible = visible;
        if (visible) {
            // Reset view offset when opening panel to center the tree
            this.viewOffset.x = 0;
            this.viewOffset.y = 0;
            this.updateLayout();
        }
        this.requestRedraw();
    }

    public getVisible(): boolean {
        return this.isVisible;
    }

    public updateData(
        definitions: UpgradeDefinition[],
        levels: Record<string, number>,
        fruit: number
    ): void {
        this.upgradeDefinitions = definitions;
        this.upgradeLevels = levels;
        this.currentFruit = fruit;
        this.rebuildCards();
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
        if (this.destroyed || !this.isVisible || this.width === 0 || this.height === 0) {
            return;
        }

        // Update click pulse animation
        if (this.pointer.clickPulseStart !== null) {
            const CLICK_PULSE_DURATION = 260;
            const progress = (currentTime - this.pointer.clickPulseStart) / CLICK_PULSE_DURATION;
            if (progress >= 1) {
                this.pointer.clickPulseStart = null;
            }
        }

        const animating = this.pointer.clickPulseStart !== null || this.pointer.visible;
        if (this.needsRedraw || animating) {
            this.draw(currentTime);
            this.texture.needsUpdate = true;
            this.needsRedraw = false;
        }

        this.renderer.clearDepth();
        this.renderer.render(this.overlayScene, this.overlayCamera);
    }

    private requestRedraw(): void {
        this.needsRedraw = true;
    }

    private rebuildCards(): void {
        // Create tree structure: define parent-child relationships
        const treeStructure: Record<string, string[]> = {
            'water_plants': ['drag_planting', 'drag_building', 'drag_harvesting'],
            'drag_harvesting': ['water_capacity', 'water_speed', 'water_aoe']
        };

        // Create card map
        const cardMap = new Map<string, UpgradeCard>();
        this.cards = this.upgradeDefinitions.map((def) => {
            const level = this.upgradeLevels[def.upgradeId] ?? 0;

            // Bulk upgrades (drag_*) and water_plants are unlock-only and max at level 1
            const isUnlockUpgrade = def.upgradeId === 'drag_planting' || def.upgradeId === 'drag_building' || def.upgradeId === 'drag_harvesting' || def.upgradeId === 'water_plants';
            const isMaxed = isUnlockUpgrade && level >= 1;

            const cost = isMaxed ? 0 : calculateUpgradeCost(def.baseCost, def.costScale, level);
            const canAfford = isMaxed ? false : this.currentFruit >= cost;

            const card: UpgradeCard = {
                definition: def,
                rect: { x: 0, y: 0, width: 0, height: 0 },
                worldX: 0,
                worldY: 0,
                isHovered: false,
                currentLevel: level,
                cost,
                canAfford,
                children: [],
                parent: null
            };
            cardMap.set(def.upgradeId, card);
            return card;
        });

        // Build tree relationships
        for (const [parentId, childIds] of Object.entries(treeStructure)) {
            const parent = cardMap.get(parentId);
            if (parent) {
                for (const childId of childIds) {
                    const child = cardMap.get(childId);
                    if (child) {
                        parent.children.push(child);
                        child.parent = parent;
                    }
                }
            }
        }

        this.updateLayout();
    }

    private updateLayout(): void {
        if (this.width === 0 || this.height === 0) {
            return;
        }

        // Full overlay - cover entire screen
        this.panelRect = {
            x: 0,
            y: 0,
            width: this.width,
            height: this.height
        };

        const closeButtonSize = 40;
        const closeButtonMargin = 16;
        this.closeButtonRect = {
            x: this.width - closeButtonSize - closeButtonMargin,
            y: closeButtonMargin,
            width: closeButtonSize,
            height: closeButtonSize
        };

        // Calculate tree layout in world space
        this.calculateTreeLayout();

        // Set initial view offset to center the starting upgrade (root node) in screen center
        if (this.viewOffset.x === 0 && this.viewOffset.y === 0) {
            const rootCard = this.cards.find(card => card.parent === null);
            if (rootCard) {
                const screenCenterX = this.width / 2;
                const screenCenterY = this.height / 2;
                // Center the root card at screen center
                this.viewOffset.x = rootCard.worldX - screenCenterX + CARD_WIDTH / 2;
                this.viewOffset.y = rootCard.worldY - screenCenterY + CARD_HEIGHT / 2;
            }
        }

        // Update card screen positions based on world positions and view offset
        this.updateCardScreenPositions();
    }

    private calculateTreeLayout(): void {
        // Find root nodes (nodes without parents)
        const roots = this.cards.filter(card => card.parent === null);

        // Calculate positions using a simple tree layout algorithm
        let currentY = 0;
        const levelNodes: UpgradeCard[][] = [];
        const processed = new Set<string>();

        // Level 0: root nodes
        if (roots.length > 0) {
            levelNodes.push(roots);
            const rootY = currentY;
            const rootSpacing = TREE_NODE_SPACING;
            const totalWidth = (roots.length - 1) * rootSpacing;
            const startX = -totalWidth / 2;

            roots.forEach((root, index) => {
                root.worldX = startX + index * rootSpacing;
                root.worldY = rootY;
                processed.add(root.definition.upgradeId);
            });
            currentY += TREE_LEVEL_SPACING;
        }

        // Process subsequent levels
        let currentLevel = 1;
        while (true) {
            const levelCards: UpgradeCard[] = [];
            for (const card of this.cards) {
                if (!processed.has(card.definition.upgradeId) && card.parent && processed.has(card.parent.definition.upgradeId)) {
                    levelCards.push(card);
                }
            }

            if (levelCards.length === 0) {
                break;
            }

            levelNodes.push(levelCards);
            const levelY = currentY;
            const levelSpacing = TREE_NODE_SPACING;
            const totalWidth = (levelCards.length - 1) * levelSpacing;
            const startX = -totalWidth / 2;

            levelCards.forEach((card, index) => {
                card.worldX = startX + index * levelSpacing;
                card.worldY = levelY;
                processed.add(card.definition.upgradeId);
            });

            currentY += TREE_LEVEL_SPACING;
            currentLevel++;
        }

        // Calculate tree center (average of all node positions)
        if (this.cards.length > 0) {
            let sumX = 0;
            let sumY = 0;
            for (const card of this.cards) {
                sumX += card.worldX;
                sumY += card.worldY;
            }
            this.treeCenter.x = sumX / this.cards.length;
            this.treeCenter.y = sumY / this.cards.length;
        }
    }

    private updateCardScreenPositions(): void {
        // Full overlay - no padding offset needed
        for (const card of this.cards) {
            const screenX = card.worldX - this.viewOffset.x;
            const screenY = card.worldY - this.viewOffset.y;

            card.rect = {
                x: screenX,
                y: screenY,
                width: CARD_WIDTH,
                height: CARD_HEIGHT
            };
        }
    }

    private draw(currentTime: number): void {
        const ctx = this.textureCtx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.textureCanvas.width, this.textureCanvas.height);
        ctx.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);
        ctx.imageSmoothingEnabled = true;

        this.drawPanel(ctx, currentTime);
        this.drawCloseButton(ctx);
        this.drawUpgradeCards(ctx, currentTime);
        this.drawCursor(ctx, currentTime);
    }

    private drawPanel(ctx: CanvasRenderingContext2D, currentTime: number): void {
        const rect = this.panelRect;
        ctx.save();

        // Dark semi-transparent overlay background
        const overlayGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
        overlayGradient.addColorStop(0, 'rgba(15, 25, 20, 0.92)');
        overlayGradient.addColorStop(1, 'rgba(20, 35, 28, 0.95)');
        ctx.fillStyle = overlayGradient;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        // Animated parallax background pattern
        this.drawParallaxBackground(ctx, currentTime);

        // Title with shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = 'rgba(240, 255, 240, 0.98)';
        ctx.font = `700 36px ${FONT_FAMILY}`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillText('UPGRADES', PANEL_PADDING, PANEL_PADDING, rect.width - PANEL_PADDING * 2);
        ctx.shadowColor = 'transparent';

        ctx.restore();
    }

    private drawParallaxBackground(ctx: CanvasRenderingContext2D, currentTime: number): void {
        ctx.save();
        ctx.globalAlpha = 0.15;

        const time = currentTime / 1000; // Convert to seconds
        const numCircles = 12;
        const baseRadius = 80;
        const speed = 0.3;

        for (let i = 0; i < numCircles; i++) {
            const angle = (i / numCircles) * Math.PI * 2 + time * speed;
            const radius = baseRadius + Math.sin(time * 0.5 + i) * 30;
            const x = this.width / 2 + Math.cos(angle) * (this.width * 0.4);
            const y = this.height / 2 + Math.sin(angle) * (this.height * 0.4);
            const circleRadius = 60 + Math.sin(time * 0.7 + i * 0.5) * 20;

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, circleRadius);
            gradient.addColorStop(0, 'rgba(100, 200, 150, 0.4)');
            gradient.addColorStop(0.5, 'rgba(80, 160, 120, 0.2)');
            gradient.addColorStop(1, 'rgba(60, 120, 90, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    private drawCloseButton(ctx: CanvasRenderingContext2D): void {
        const rect = this.closeButtonRect;
        ctx.save();

        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
        if (this.hoveredCloseButton) {
            gradient.addColorStop(0, 'rgba(240, 100, 100, 0.95)');
            gradient.addColorStop(1, 'rgba(200, 80, 80, 0.95)');
        } else {
            gradient.addColorStop(0, 'rgba(60, 80, 70, 0.9)');
            gradient.addColorStop(1, 'rgba(40, 60, 50, 0.9)');
        }
        ctx.fillStyle = gradient;
        drawRoundedRect(ctx, rect, 8);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = this.hoveredCloseButton ? 'rgba(255, 200, 200, 0.8)' : 'rgba(100, 140, 120, 0.6)';
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, rect, 8);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = `700 28px ${FONT_FAMILY}`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText('×', rect.x + rect.width / 2, rect.y + rect.height / 2);

        ctx.restore();
    }

    private drawUpgradeCards(ctx: CanvasRenderingContext2D, currentTime: number): void {
        // Draw connection lines first (behind cards)
        this.drawTreeConnections(ctx, currentTime);

        // Draw cards that are visible in viewport
        for (const card of this.cards) {
            // Check if card is visible in viewport
            if (
                card.rect.x + card.rect.width < 0 ||
                card.rect.x > this.width ||
                card.rect.y + card.rect.height < 0 ||
                card.rect.y > this.height
            ) {
                continue;
            }
            this.drawUpgradeCard(ctx, card, currentTime);
        }
    }

    private drawTreeConnections(ctx: CanvasRenderingContext2D, currentTime: number): void {
        ctx.save();

        for (const card of this.cards) {
            if (card.parent) {
                const parentScreenX = card.parent.worldX - this.viewOffset.x;
                const parentScreenY = card.parent.worldY - this.viewOffset.y;
                const childScreenX = card.worldX - this.viewOffset.x;
                const childScreenY = card.worldY - this.viewOffset.y;

                // Only draw if either endpoint is in viewport
                if (
                    (parentScreenX >= -CARD_WIDTH && parentScreenX <= this.width + CARD_WIDTH &&
                        parentScreenY >= -CARD_HEIGHT && parentScreenY <= this.height + CARD_HEIGHT) ||
                    (childScreenX >= -CARD_WIDTH && childScreenX <= this.width + CARD_WIDTH &&
                        childScreenY >= -CARD_HEIGHT && childScreenY <= this.height + CARD_HEIGHT)
                ) {
                    const startX = parentScreenX + CARD_WIDTH / 2;
                    const startY = parentScreenY + CARD_HEIGHT;
                    const endX = childScreenX + CARD_WIDTH / 2;
                    const endY = childScreenY;

                    // Glow effect
                    ctx.shadowColor = 'rgba(100, 200, 150, 0.6)';
                    ctx.shadowBlur = 8;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;

                    // Gradient line
                    const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
                    gradient.addColorStop(0, 'rgba(100, 200, 150, 0.8)');
                    gradient.addColorStop(0.5, 'rgba(80, 180, 130, 0.9)');
                    gradient.addColorStop(1, 'rgba(100, 200, 150, 0.8)');

                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 3;
                    ctx.setLineDash([6, 4]);
                    ctx.lineCap = 'round';

                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();

                    ctx.shadowColor = 'transparent';
                }
            }
        }

        ctx.restore();
    }

    private drawUpgradeCard(ctx: CanvasRenderingContext2D, card: UpgradeCard, currentTime: number): void {
        const rect = card.rect;
        ctx.save();

        // Calculate depth-based brightness (cards closer to center are brighter)
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const cardCenterX = rect.x + rect.width / 2;
        const cardCenterY = rect.y + rect.height / 2;
        const distanceFromCenter = Math.sqrt(
            Math.pow(cardCenterX - centerX, 2) + Math.pow(cardCenterY - centerY, 2)
        );
        const maxDistance = Math.sqrt(Math.pow(this.width, 2) + Math.pow(this.height, 2)) / 2;
        const depthFactor = 1 - (distanceFromCenter / maxDistance) * 0.3;
        const brightness = 0.7 + depthFactor * 0.3;

        // Hover scale effect
        const hoverScale = card.isHovered ? 1.03 : 1.0;
        ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
        ctx.scale(hoverScale, hoverScale);
        ctx.translate(-rect.width / 2, -rect.height / 2);

        // Multiple shadow layers for depth
        ctx.shadowColor = card.isHovered ? 'rgba(100, 200, 150, 0.6)' : 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = card.isHovered ? 24 : 14;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = card.isHovered ? 8 : 5;

        // Gradient background based on tree level and hover state
        const level = this.getTreeLevel(card);
        const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);

        if (card.isHovered) {
            gradient.addColorStop(0, `rgba(${Math.round(120 * brightness)}, ${Math.round(220 * brightness)}, ${Math.round(160 * brightness)}, 0.95)`);
            gradient.addColorStop(1, `rgba(${Math.round(80 * brightness)}, ${Math.round(180 * brightness)}, ${Math.round(120 * brightness)}, 0.95)`);
        } else {
            if (level === 0) {
                gradient.addColorStop(0, `rgba(${Math.round(100 * brightness)}, ${Math.round(180 * brightness)}, ${Math.round(140 * brightness)}, 0.9)`);
                gradient.addColorStop(1, `rgba(${Math.round(70 * brightness)}, ${Math.round(150 * brightness)}, ${Math.round(110 * brightness)}, 0.9)`);
            } else if (level === 1) {
                gradient.addColorStop(0, `rgba(${Math.round(90 * brightness)}, ${Math.round(160 * brightness)}, ${Math.round(180 * brightness)}, 0.9)`);
                gradient.addColorStop(1, `rgba(${Math.round(60 * brightness)}, ${Math.round(130 * brightness)}, ${Math.round(150 * brightness)}, 0.9)`);
            } else {
                gradient.addColorStop(0, `rgba(${Math.round(80 * brightness)}, ${Math.round(140 * brightness)}, ${Math.round(200 * brightness)}, 0.9)`);
                gradient.addColorStop(1, `rgba(${Math.round(50 * brightness)}, ${Math.round(110 * brightness)}, ${Math.round(170 * brightness)}, 0.9)`);
            }
        }

        ctx.fillStyle = gradient;
        drawRoundedRect(ctx, { x: 0, y: 0, width: rect.width, height: rect.height }, 20);
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // Glowing border
        const borderGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
        if (card.isHovered) {
            borderGradient.addColorStop(0, 'rgba(150, 255, 200, 0.9)');
            borderGradient.addColorStop(1, 'rgba(100, 220, 150, 0.9)');
        } else if (!card.canAfford) {
            borderGradient.addColorStop(0, 'rgba(100, 100, 100, 0.4)');
            borderGradient.addColorStop(1, 'rgba(80, 80, 80, 0.4)');
        } else {
            borderGradient.addColorStop(0, 'rgba(80, 180, 130, 0.6)');
            borderGradient.addColorStop(1, 'rgba(60, 140, 100, 0.6)');
        }
        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = card.isHovered ? 3 : 2.5;
        drawRoundedRect(ctx, { x: 0, y: 0, width: rect.width, height: rect.height }, 20);
        ctx.stroke();

        // Level in top left corner (or "Unlocked" for unlock upgrades)
        const isUnlockUpgrade = card.definition.upgradeId === 'drag_planting' || card.definition.upgradeId === 'drag_building' || card.definition.upgradeId === 'drag_harvesting' || card.definition.upgradeId === 'water_plants';
        const isMaxed = isUnlockUpgrade && card.currentLevel >= 1;
        const levelText = isMaxed ? 'Unlocked' : `Level ${card.currentLevel}`;
        ctx.font = `700 16px ${FONT_FAMILY}`;
        ctx.fillStyle = 'rgba(200, 255, 220, 0.95)';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillText(levelText, CARD_PADDING, CARD_PADDING);

        // Cost in top right corner (same font size as level) - hide for maxed unlock upgrades
        if (!isMaxed) {
            const costText = `${card.cost} 🍓`;
            ctx.font = `700 16px ${FONT_FAMILY}`;
            ctx.fillStyle = card.canAfford ? 'rgba(200, 255, 220, 0.95)' : 'rgba(150, 150, 150, 0.8)';
            ctx.textAlign = 'right';
            ctx.fillText(costText, rect.width - CARD_PADDING, CARD_PADDING);
        }

        // Icon below level (centered)
        const iconSize = 72;
        const iconY = CARD_PADDING + 28;
        const iconX = rect.width / 2;

        // Icon background circle with gradient
        const iconBgSize = iconSize + 24;
        const iconBgGradient = ctx.createRadialGradient(
            iconX, iconY + iconBgSize / 2, 0,
            iconX, iconY + iconBgSize / 2, iconBgSize / 2
        );
        iconBgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        iconBgGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        ctx.fillStyle = iconBgGradient;
        ctx.beginPath();
        ctx.arc(iconX, iconY + iconBgSize / 2, iconBgSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `500 ${iconSize}px ${FONT_FAMILY}`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(card.definition.icon ?? '⚙️', iconX, iconY + iconBgSize / 2);

        // Title below icon (centered, big and bold)
        const titleY = iconY + iconBgSize + 16;
        const titleFontSize = 26;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        ctx.font = `700 ${titleFontSize}px ${FONT_FAMILY}`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        ctx.fillText(card.definition.name, iconX, titleY, rect.width - CARD_PADDING * 2);
        ctx.shadowColor = 'transparent';

        // Description directly below title (centered, wraps naturally, inside card)
        const descriptionY = titleY + titleFontSize + 14;
        const descriptionWidth = rect.width - CARD_PADDING * 2;
        ctx.font = `500 18px ${FONT_FAMILY}`;
        ctx.fillStyle = card.canAfford ? 'rgba(240, 255, 240, 0.95)' : 'rgba(200, 200, 200, 0.8)';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        const descriptionLineHeight = 24;
        wrapText(
            ctx,
            card.definition.description,
            iconX,
            descriptionY,
            descriptionWidth,
            descriptionLineHeight
        );

        ctx.restore();
    }

    private getTreeLevel(card: UpgradeCard): number {
        let level = 0;
        let current: UpgradeCard | null = card;
        while (current.parent) {
            level++;
            current = current.parent;
        }
        return level;
    }



    private drawCursor(ctx: CanvasRenderingContext2D, currentTime: number): void {
        if (!this.pointer.visible) {
            return;
        }

        // Cursor is always visible when panel is open (full overlay)

        // Determine cursor state
        let cursorState: CursorState = 'upgrades';
        if (this.hoveredCloseButton || (this.hoveredCard && this.hoveredCard.canAfford)) {
            cursorState = 'upgrades-clickable';
        }

        const style = getCursorVisual(cursorState);
        const glyphKey = toCursorGlyphKey(cursorState);
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
        ctx.globalAlpha = 1;
        const glyphSize = radius * 1.2;
        glyph.outer(ctx, glyphSize);

        if (this.pointer.clickPulseStart !== null) {
            const CLICK_PULSE_DURATION = 260;
            const progress = clamp((currentTime - this.pointer.clickPulseStart) / CLICK_PULSE_DURATION, 0, 1);
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
        if (this.destroyed || !this.isVisible) {
            this.pointer.visible = false;
            return;
        }

        const local = this.getLocalPointer(event);
        if (!local) {
            this.pointer.visible = false;
            this.clearHover();
            return;
        }

        const supportsCursor = POINTER_TYPES_WITH_CURSOR.has(event.pointerType);
        this.pointer.visible = supportsCursor;
        this.pointer.x = local.x;
        this.pointer.y = local.y;

        // Handle dragging
        if (this.isDragging && this.pointer.pressed) {
            const deltaX = local.x - this.dragStart.x;
            const deltaY = local.y - this.dragStart.y;
            this.viewOffset.x -= deltaX;
            this.viewOffset.y -= deltaY;
            this.dragStart.x = local.x;
            this.dragStart.y = local.y;
            this.updateCardScreenPositions();
            this.requestRedraw();
            return;
        }

        let hoverChanged = false;

        if (this.hitTestRect(local.x, local.y, this.closeButtonRect)) {
            if (!this.hoveredCloseButton) {
                this.hoveredCloseButton = true;
                hoverChanged = true;
            }
        } else {
            if (this.hoveredCloseButton) {
                this.hoveredCloseButton = false;
                hoverChanged = true;
            }
        }

        let newHoveredCard: UpgradeCard | null = null;

        for (const card of this.cards) {
            if (this.hitTestRect(local.x, local.y, card.rect)) {
                newHoveredCard = card;
                break;
            }
        }

        if (newHoveredCard !== this.hoveredCard) {
            if (this.hoveredCard) {
                this.hoveredCard.isHovered = false;
            }
            if (newHoveredCard) {
                newHoveredCard.isHovered = true;
            }
            this.hoveredCard = newHoveredCard;
            hoverChanged = true;
        }

        if (hoverChanged) {
            this.requestRedraw();
        }
    }

    private handlePointerDown(event: PointerEvent): void {
        if (this.destroyed || !this.isVisible || event.button !== 0) {
            return;
        }

        if (!POINTER_TYPES_WITH_CURSOR.has(event.pointerType)) {
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

        // Check if clicking on close button
        if (this.hitTestRect(local.x, local.y, this.closeButtonRect)) {
            this.activeCloseButton = true;
            event.stopPropagation();
            event.preventDefault();
        }
        // Check if clicking on a card
        else {
            let clickedOnCard = false;
            for (const card of this.cards) {
                if (this.hitTestRect(local.x, local.y, card.rect)) {
                    this.activeCard = card;
                    clickedOnCard = true;
                    event.stopPropagation();
                    event.preventDefault();
                    break;
                }
            }
            // If not clicking on a card, start dragging
            if (!clickedOnCard && this.hitTestRect(local.x, local.y, this.panelRect)) {
                this.isDragging = true;
                this.dragStart.x = local.x;
                this.dragStart.y = local.y;
                event.stopPropagation();
                event.preventDefault();
            }
        }

        this.requestRedraw();
    }

    private handlePointerUp(event: PointerEvent): void {
        if (this.destroyed || !this.isVisible || event.button !== 0) {
            return;
        }

        const local = this.getLocalPointer(event);
        if (local) {
            this.pointer.x = local.x;
            this.pointer.y = local.y;
        }

        // Stop dragging
        if (this.isDragging) {
            this.isDragging = false;
            // Only trigger click actions if we didn't drag much
            const dragDistance = Math.sqrt(
                Math.pow(local ? local.x - this.dragStart.x : 0, 2) +
                Math.pow(local ? local.y - this.dragStart.y : 0, 2)
            );
            if (dragDistance < 5) {
                // Small movement, treat as click
                if (local) {
                    if (this.hitTestRect(local.x, local.y, this.closeButtonRect)) {
                        this.bindings.onClose();
                        event.stopPropagation();
                        event.preventDefault();
                    } else if (this.activeCard) {
                        const card = this.activeCard;
                        if (this.hitTestRect(local.x, local.y, card.rect) && card.canAfford) {
                            this.bindings.onUpgradePurchase(card.definition.upgradeId);
                            event.stopPropagation();
                            event.preventDefault();
                        }
                    }
                }
            }
        } else {
            // Normal click handling
            if (local) {
                if (this.activeCloseButton && this.hitTestRect(local.x, local.y, this.closeButtonRect)) {
                    this.bindings.onClose();
                    event.stopPropagation();
                    event.preventDefault();
                } else if (this.activeCard) {
                    const card = this.activeCard;
                    if (this.hitTestRect(local.x, local.y, card.rect) && card.canAfford) {
                        this.bindings.onUpgradePurchase(card.definition.upgradeId);
                        event.stopPropagation();
                        event.preventDefault();
                    }
                }
            }
        }

        this.pointer.pressed = false;
        this.activeCloseButton = false;
        this.activeCard = null;
        this.requestRedraw();
    }

    private handlePointerLeave(): void {
        this.pointer.visible = false;
        this.pointer.pressed = false;
        this.isDragging = false;
        this.clearHover();
        this.activeCloseButton = false;
        this.activeCard = null;
    }

    private handlePointerCancel(_event: PointerEvent): void {
        this.pointer.pressed = false;
        this.pointer.clickPulseStart = null;
        this.isDragging = false;
        this.activeCloseButton = false;
        this.activeCard = null;
    }

    private clearHover(): void {
        if (this.hoveredCard) {
            this.hoveredCard.isHovered = false;
            this.hoveredCard = null;
        }
        this.hoveredCloseButton = false;
        this.requestRedraw();
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

    private hitTestRect(x: number, y: number, rect: Rect): boolean {
        return (
            x >= rect.x &&
            x <= rect.x + rect.width &&
            y >= rect.y &&
            y <= rect.y + rect.height
        );
    }
}

