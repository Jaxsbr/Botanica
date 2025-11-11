import {
    AmbientLight,
    Color,
    DirectionalLight,
    PerspectiveCamera,
    Scene,
    Vector3,
    WebGLRenderer
} from 'three';
import { GrassPodule } from '../podules/GrassPodule';
import {
    GameState,
    GridPosition,
    GrowthPhase,
    Inventory,
    PlantState,
    SoilTile,
    TILE_SPACING
} from './GameState';
import { SoilTileManager } from './SoilTileManager';
import { PlantManager } from './PlantManager';
import { WorldManager } from './WorldManager';
import { ActionMode, GameUI } from '../ui/GameUI';
import { UpgradesPanel } from '../ui/UpgradesPanel';
import { UPGRADE_DEFINITIONS, calculateUpgradeCost } from '../config/upgrades';
import {
    DragEndEvent,
    DragIntent,
    DragIntentRequest,
    DragMoveEvent,
    DragStartEvent,
    HoverTarget,
    InteractionController
} from '../input/InteractionController';
import { CursorState } from '../ui/CursorIndicator';
import { InteractionFeedbackController } from '../environment/feedback/InteractionFeedbackController';
import { SoundController } from '../audio/SoundController';
import { ParallaxBackground } from '../environment/ParallaxBackground';
import {
    WATER_APPLICATION_RADIUS_TILES,
    WATER_DRAIN_RATE_PER_SECOND,
    WATER_RESERVOIR_CAPACITY,
    WATER_RESERVOIR_MIN_LEVEL,
    WATER_RESERVOIR_REFILL_DELAY_MS,
    WATER_RESERVOIR_REFILL_RATE_PER_SECOND
} from '../config/gameBalance';

const SOIL_TILE_COST_FRUIT = 5;

export class GameController {
    private readonly container: HTMLElement;
    private readonly scene: Scene;
    private readonly camera: PerspectiveCamera;
    private readonly renderer: WebGLRenderer;
    private readonly grassPodule: GrassPodule;
    private readonly gameState: GameState;
    private readonly worldManager: WorldManager;
    private readonly soilTileManager: SoilTileManager;
    private readonly plantManager: PlantManager;
    private readonly ui: GameUI;
    private readonly upgradesPanel: UpgradesPanel;
    private readonly interaction: InteractionController;
    private readonly feedback: InteractionFeedbackController;
    private readonly sound: SoundController;
    private readonly parallaxBackground: ParallaxBackground;
    private currentMode: ActionMode = 'plant';
    private previousPrimaryMode: Exclude<ActionMode, 'water'> = 'plant';
    private waterStatus = {
        level: WATER_RESERVOIR_CAPACITY,
        capacity: WATER_RESERVOIR_CAPACITY,
        available: true,
        message: null as string | null
    };
    private readonly waterRadiusWorld = WATER_APPLICATION_RADIUS_TILES * TILE_SPACING;

    private animationHandle: number | null = null;
    private lastFrameTime = performance.now();
    private availableBuildPositions: Map<string, GridPosition> = new Map();
    private activeDrag: { intent: DragIntent; exhausted: boolean } | null = null;
    private wateringState: {
        active: boolean;
        pointerId: number | null;
        targetPlantId: string | null;
        lastUpdateTimeMs: number;
    } = {
            active: false,
            pointerId: null,
            targetPlantId: null,
            lastUpdateTimeMs: performance.now()
        };
    private waterRefillResumeTimeMs: number | null = null;
    private hoverTarget: HoverTarget = { type: 'none' };
    private highlightedPlantId: string | null = null;
    private panningState: {
        active: boolean;
        pointerId: number | null;
        lastMouseX: number;
        lastMouseY: number;
        cameraOffset: Vector3;
    } = {
            active: false,
            pointerId: null,
            lastMouseX: 0,
            lastMouseY: 0,
            cameraOffset: new Vector3(0, 0, 0)
        };

    constructor(containerId: string = 'app') {
        const containerElement = document.getElementById(containerId);
        if (!containerElement) {
            throw new Error(`Container with id "${containerId}" not found.`);
        }

        this.container = containerElement;
        this.scene = new Scene();
        // Floating Garden theme: sky blue background
        this.scene.background = new Color(0x87ceeb);

        this.camera = new PerspectiveCamera(60, 1, 0.1, 100);
        this.camera.position.set(0, 14, 0.001);
        this.camera.up.set(0, 0, -1);
        this.camera.lookAt(new Vector3(0, 0, 0));

        this.renderer = new WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.autoClear = false;
        this.renderer.setClearColor(this.scene.background as Color, 1);
        this.renderer.domElement.classList.add('game-canvas');
        this.container.appendChild(this.renderer.domElement);

        this.gameState = this.createInitialGameState();

        // Create world manager first
        this.worldManager = new WorldManager(this.gameState);

        this.addLighting();

        // Create parallax background
        this.parallaxBackground = new ParallaxBackground(this.scene);

        this.grassPodule = new GrassPodule();
        this.grassPodule.addToScene(this.scene);

        // Initialize soil tile manager with world manager
        this.soilTileManager = new SoilTileManager(this.scene, this.gameState, this.worldManager);
        this.soilTileManager.initialize();

        // Update world radius after initial tile placement
        this.worldManager.updateRadius();
        this.grassPodule.updateIslandRadius(this.worldManager.getRadius());

        this.plantManager = new PlantManager(this.scene, this.gameState);

        this.feedback = new InteractionFeedbackController(this.scene, this.soilTileManager, this.plantManager);
        this.sound = new SoundController();

        this.ui = new GameUI(this.renderer, {
            onModeChanged: (mode) => this.handleModeChanged(mode),
            onSeedSelected: (seedId) => this.handleSeedSelection(seedId),
            onUpgradesToggle: () => this.handleUpgradesToggle()
        });

        this.upgradesPanel = new UpgradesPanel(this.renderer, {
            onUpgradePurchase: (upgradeId) => this.handleUpgradePurchase(upgradeId),
            onClose: () => this.handleUpgradesToggle()
        });
        this.upgradesPanel.setVisible(false);
        this.updateUpgradesPanel();
        this.ui.setSeedOptions(
            [
                {
                    id: 'lumen-bloom',
                    label: 'Lumen Bloom'
                }
            ],
            this.plantManager.plantDefinitions
        );
        this.updateInventoryUI();
        this.refreshBuildState();
        this.syncWaterStatus();

        this.interaction = new InteractionController(
            this.renderer.domElement,
            this.camera,
            this.soilTileManager,
            this.plantManager,
            {
                resolveDragIntent: (request) => this.handleResolveDragIntent(request),
                onDragStart: (event) => this.handleDragStart(event),
                onDragEnter: (event) => this.handleDragEnter(event),
                onDragEnd: (event) => this.handleDragEnd(event),
                onActionRejected: (request) => this.handleActionRejected(request),
                onPointerMiss: () => this.handlePointerMiss(),
                onHoverChanged: (target) => this.handleHoverChanged(target)
            },
            this.worldManager
        );

        // Set up mouse tracking for parallax
        this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);

        window.addEventListener('resize', this.handleResize);
        window.addEventListener('beforeunload', this.dispose);
        window.addEventListener('keydown', this.handleKeyDown, true);

        this.handleResize();
        this.start();
        this.updateCursorState();
    }

    public dispose = (): void => {
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('beforeunload', this.dispose);
        window.removeEventListener('keydown', this.handleKeyDown, true);
        this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove);

        if (this.animationHandle !== null) {
            cancelAnimationFrame(this.animationHandle);
            this.animationHandle = null;
        }

        this.interaction.dispose();
        this.ui.destroy();
        this.upgradesPanel.destroy();
        this.sound.dispose();
        this.parallaxBackground.dispose();
        this.plantManager.dispose();
        this.soilTileManager.dispose();
        this.grassPodule.dispose();
        this.renderer.dispose();
    };

    private createInitialGameState(): GameState {
        const initialInventory: Inventory = {
            fruit: 20,
            seeds: {
                'lumen-bloom': 5
            }
        };

        return {
            tiles: new Map<string, SoilTile>(),
            plants: new Map<string, PlantState>(),
            inventory: initialInventory,
            selectedSeedId: null,
            upgrades: {}
        };
    }

    private addLighting(): void {
        const ambientLight = new AmbientLight(0xf1fff4, 0.6);
        this.scene.add(ambientLight);

        const sunLight = new DirectionalLight(0xffffff, 0.9);
        sunLight.position.set(6, 12, 6);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.set(1024, 1024);
        sunLight.shadow.camera.near = 0.1;
        sunLight.shadow.camera.far = 30;
        sunLight.shadow.normalBias = 0.02;
        this.scene.add(sunLight);
    }

    private start(): void {
        if (this.animationHandle !== null) {
            return;
        }

        const renderLoop = (): void => {
            const now = performance.now();
            const delta = now - this.lastFrameTime;
            this.lastFrameTime = now;

            this.update(now, delta);
            this.renderer.clear();
            this.renderer.render(this.scene, this.camera);
            this.ui.render(now);
            this.upgradesPanel.render(now);
            this.animationHandle = requestAnimationFrame(renderLoop);
        };

        this.animationHandle = requestAnimationFrame(renderLoop);
    }

    private update(currentTime: number, delta: number): void {
        this.updateWatering(currentTime, delta);
        this.plantManager.update(currentTime);
        this.soilTileManager.updatePlacementPreviews(currentTime);
        this.feedback.update(currentTime);

        // Update grass expansion (radius is updated when tiles are placed, not every frame)
        const currentRadius = this.worldManager.getRadius();
        this.grassPodule.updateIslandRadius(currentRadius);
        this.grassPodule.update(delta); // Pass delta in milliseconds

        // Update parallax background
        this.parallaxBackground.update();
    }

    private handleResolveDragIntent = (request: DragIntentRequest): DragIntent | null => {
        const { target, phase, baseIntent } = request;

        // Check for panning triggers
        const isMiddleMouse = request.nativeEvent.button === 1;
        const isModifierHeld = request.nativeEvent.shiftKey || request.nativeEvent.ctrlKey || request.nativeEvent.metaKey;

        // Priority 1: Middle mouse button or modifier key always pans (even over objects)
        if (isMiddleMouse || isModifierHeld) {
            return 'pan';
        }

        if (target.type === 'plant') {
            const plant = this.gameState.plants.get(target.plantId);
            if (plant && plant.currentPhase === GrowthPhase.Fruitburst) {
                return 'harvest';
            }

            const wantsWater =
                this.currentMode === 'water' ||
                baseIntent === 'water' ||
                (this.activeDrag?.intent === 'water' && baseIntent === undefined);

            if (wantsWater && this.waterStatus.available) {
                return 'water';
            }

            return null;
        }

        if (target.type === 'soil') {
            if (baseIntent && baseIntent !== 'plant') {
                return null;
            }

            if (this.currentMode !== 'plant' && !baseIntent) {
                return null;
            }

            if (
                phase === 'move' &&
                baseIntent === 'plant' &&
                this.activeDrag &&
                this.activeDrag.intent === 'plant' &&
                this.activeDrag.exhausted
            ) {
                return null;
            }

            return this.canPlantOnTile(target.tile) ? 'plant' : null;
        }

        if (target.type === 'preview') {
            if (baseIntent && baseIntent !== 'build') {
                return null;
            }

            if (this.currentMode !== 'build' && !baseIntent) {
                return null;
            }

            const canAfford = this.gameState.inventory.fruit >= SOIL_TILE_COST_FRUIT;
            return canAfford && this.availableBuildPositions.has(target.previewTileId) ? 'build' : null;
        }

        // Allow panning on empty space or out-of-bounds areas when not over actionable targets
        // This works in all modes, including plant/build mode
        if (target.type === 'none' && phase === 'start' && !baseIntent) {
            // Allow panning when clicking on empty space (grass area)
            return 'pan';
        }

        if (target.type === 'out-of-bounds' && !isMiddleMouse && !isModifierHeld) {
            // Allow panning on out-of-bounds areas
            return 'pan';
        }

        return null;
    };

    private handleDragStart = (event: DragStartEvent): void => {
        void this.sound.unlock();
        this.activeDrag = {
            intent: event.baseIntent,
            exhausted: false
        };

        if (event.resolvedIntent === 'pan') {
            this.beginPanning(event.pointerId, event.nativeEvent);
            return;
        }

        if (event.resolvedIntent === 'harvest' && event.target.type === 'plant') {
            this.executeHarvest(event.target.plantId, event.nativeEvent.timeStamp ?? performance.now());
            return;
        }

        if (event.resolvedIntent === 'plant' && event.target.type === 'soil') {
            const planted = this.executePlant(event.target.tile.id, event.nativeEvent.timeStamp ?? performance.now());
            if (!planted) {
                this.activeDrag.exhausted = true;
            } else if (!this.hasSeedsAvailable()) {
                this.activeDrag.exhausted = true;
            }
            return;
        }

        if (event.resolvedIntent === 'water' && event.target.type === 'plant') {
            this.beginWatering(
                event.pointerId,
                event.target.plantId,
                event.nativeEvent.timeStamp ?? performance.now()
            );
            return;
        }

        if (event.resolvedIntent === 'build' && event.target.type === 'preview') {
            const built = this.executeBuild(event.target.previewTileId);
            if (!built) {
                this.activeDrag.exhausted = true;
            } else if (!this.canAffordNextSoil() || this.availableBuildPositions.size === 0) {
                this.activeDrag.exhausted = true;
            }
        }
    };

    private handleDragEnter = (event: DragMoveEvent): void => {
        if (!this.activeDrag) {
            return;
        }

        // Continue panning if we started panning, regardless of what we're hovering over
        if (this.activeDrag.intent === 'pan') {
            this.updatePanning(event.nativeEvent);
            return;
        }

        if (event.resolvedIntent === 'pan') {
            this.updatePanning(event.nativeEvent);
            return;
        }

        if (event.resolvedIntent === 'harvest' && event.target.type === 'plant') {
            this.executeHarvest(event.target.plantId, event.nativeEvent.timeStamp ?? performance.now());
            return;
        }

        if (event.resolvedIntent === 'plant' && event.target.type === 'soil') {
            const planted = this.executePlant(event.target.tile.id, event.nativeEvent.timeStamp ?? performance.now());
            if (!planted) {
                this.feedback.triggerSoilShake(event.target.tile.id);
            } else if (!this.hasSeedsAvailable() && this.activeDrag) {
                this.activeDrag.exhausted = true;
            }
            return;
        }

        if (event.resolvedIntent === 'water' && event.target.type === 'plant') {
            this.continueWatering(
                event.pointerId,
                event.target.plantId,
                event.nativeEvent.timeStamp ?? performance.now()
            );
            return;
        }

        if (event.resolvedIntent === 'build' && event.target.type === 'preview') {
            const built = this.executeBuild(event.target.previewTileId);
            if (!built && this.activeDrag) {
                this.activeDrag.exhausted = true;
            }
            return;
        }

        this.showBlockedFeedback(event.target);
    };

    private handleDragEnd = (event: DragEndEvent): void => {
        if (this.activeDrag?.intent === 'pan') {
            this.endPanning(event.pointerId);
        }

        this.activeDrag = null;
        const timestamp = event.nativeEvent ? event.nativeEvent.timeStamp : performance.now();
        this.endWatering(event.pointerId, timestamp);
        if (event.reason === 'cancelled') {
            this.feedback.clearAll();
            this.highlightedPlantId = null;
            this.refreshBuildState();
            this.interaction.refreshHover();
        }
    };

    private handleActionRejected = (request: DragIntentRequest): void => {
        this.showBlockedFeedback(request.target);
    };

    private handleMouseMove = (event: MouseEvent): void => {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.parallaxBackground.updateMousePosition(
            event.clientX - rect.left,
            event.clientY - rect.top,
            rect.width,
            rect.height
        );
    };

    private handleResize = (): void => {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (height === 0) {
            return;
        }

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.ui.handleResize(width, height);
        this.upgradesPanel.handleResize(width, height);
    };

    private executePlant(tileId: string, timestamp: number): boolean {
        if (!this.gameState.selectedSeedId) {
            return false;
        }

        const availableSeedCount =
            this.gameState.inventory.seeds[this.gameState.selectedSeedId] ?? 0;
        if (availableSeedCount <= 0) {
            this.clearSeedSelection();
            return false;
        }

        const planted = this.plantManager.plantSeed(
            tileId,
            this.gameState.selectedSeedId,
            timestamp
        );
        if (!planted) {
            return false;
        }

        this.gameState.inventory.seeds[this.gameState.selectedSeedId] = availableSeedCount - 1;
        this.updateInventoryUI();
        this.ensurePlantSelection();
        this.interaction.refreshHover();
        this.sound.play('plant');
        return true;
    }

    private executeHarvest(plantId: string, timestamp: number): boolean {
        const result = this.plantManager.harvestPlant(plantId, timestamp);
        if (!result) {
            return false;
        }

        this.ensurePlantSelection();
        this.updateInventoryUI();
        if (result.fruitYield > 0) {
            this.ui.triggerFruitPulse();
        }
        if (this.highlightedPlantId === plantId) {
            this.highlightedPlantId = null;
        }
        this.feedback.setPlantHighlight(plantId, 'none');
        this.interaction.refreshHover();
        this.sound.play('harvest');
        return true;
    }

    private executeBuild(previewTileId: string): boolean {
        const position = this.availableBuildPositions.get(previewTileId);
        if (!position) {
            return false;
        }

        if (this.gameState.inventory.fruit < SOIL_TILE_COST_FRUIT) {
            return false;
        }

        this.soilTileManager.addTile(position);
        this.gameState.inventory.fruit -= SOIL_TILE_COST_FRUIT;
        this.updateInventoryUI();

        // Update world radius after placing tile
        this.worldManager.updateRadius();
        this.grassPodule.updateIslandRadius(this.worldManager.getRadius());

        this.sound.play('build');
        return true;
    }

    private refreshBuildState(): void {
        const positions = this.soilTileManager.getAvailableAdjacentPositions();
        this.availableBuildPositions = new Map(
            positions.map((position) => [SoilTileManager.getTileId(position), position])
        );

        const hasAdjacent = positions.length > 0;
        const canAfford = this.gameState.inventory.fruit >= SOIL_TILE_COST_FRUIT;
        const inBuildMode = this.currentMode === 'build';

        if (inBuildMode && hasAdjacent) {
            this.soilTileManager.showPlacementPreviews(positions);
            this.soilTileManager.setPlacementPreviewAffordability(canAfford);
        } else {
            this.soilTileManager.clearPlacementPreviews();
        }

        let message: string | undefined;
        if (inBuildMode) {
            if (!hasAdjacent) {
                message = 'No adjacent space available';
            } else if (!canAfford) {
                message = `Need ${SOIL_TILE_COST_FRUIT} fruit to add tile`;
            }
        }

        this.ui.setBuildState({
            available: hasAdjacent && canAfford,
            placementActive: inBuildMode && hasAdjacent,
            message
        });

        this.updateCursorState();
        if (inBuildMode) {
            this.interaction.refreshHover();
        }
    }

    private showBlockedFeedback(target: HoverTarget): void {
        // Handle out-of-bounds feedback
        if (target.type === 'out-of-bounds') {
            this.ui.showModeMessage('Need to expand island to build here', true);
            return;
        }

        if (this.currentMode === 'water') {
            if (!this.waterStatus.available) {
                this.ui.showModeMessage('Reservoir empty', true);
            } else if (target.type === 'plant') {
                this.ui.showModeMessage('Hold to water', false);
            } else {
                this.ui.showModeMessage('Aim at a plant to water', false);
            }
            return;
        }

        if (target.type === 'plant') {
            this.feedback.triggerPlantShake(target.plantId);
            this.feedback.setPlantHighlight(target.plantId, 'blocked');
            this.ui.showModeMessage('Not ready to harvest');
            return;
        }

        if (target.type === 'soil') {
            this.feedback.triggerSoilShake(target.tile.id);

            if (target.tile.occupiedByPlantId) {
                this.ui.showModeMessage('Tile occupied');
            } else if (!this.hasSeedsAvailable()) {
                this.ui.showModeMessage('Out of seeds');
            } else {
                this.ui.showModeMessage('Cannot plant here');
            }
            return;
        }

        if (target.type === 'preview') {
            if (!this.canAffordNextSoil()) {
                this.ui.showModeMessage('Need more fruit');
            }
        }
    }

    private hasSeedsAvailable(): boolean {
        if (!this.gameState.selectedSeedId) {
            return false;
        }

        return (this.gameState.inventory.seeds[this.gameState.selectedSeedId] ?? 0) > 0;
    }

    private canAffordNextSoil(): boolean {
        return this.gameState.inventory.fruit >= SOIL_TILE_COST_FRUIT;
    }

    private handleSeedSelection(seedId: string | null): void {
        this.gameState.selectedSeedId = seedId;
        this.updateCursorState();
    }

    private handleModeChanged(mode: ActionMode): void {
        if (this.currentMode === mode) {
            return;
        }

        const previousMode = this.currentMode;
        this.currentMode = mode;

        if (mode !== 'water') {
            this.previousPrimaryMode = mode;
        }

        if (mode === 'plant') {
            if (!this.gameState.selectedSeedId) {
                const nextSeedId = this.getNextAvailableSeedId();
                if (nextSeedId) {
                    this.gameState.selectedSeedId = nextSeedId;
                }
            }
            this.refreshBuildState();
        } else if (mode === 'build') {
            this.clearSeedSelection();
            this.refreshBuildState();
        } else if (mode === 'water') {
            this.refreshBuildState();
            this.syncWaterStatus(true);
        }

        if (previousMode === 'water' && mode !== 'water') {
            this.ui.clearModeMessage();
            this.feedback.stopWateringStream();
        }

        this.updateCursorState();
        this.interaction.refreshHover();
    }

    private handlePointerMiss(): void {
        this.setHoverTarget({ type: 'none' });
        if (this.currentMode === 'build') {
            this.refreshBuildState();
        }
    }

    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.defaultPrevented || event.repeat) {
            return;
        }

        if (event.metaKey || event.ctrlKey || event.altKey) {
            return;
        }

        const target = event.target as HTMLElement | null;
        if (target) {
            const tagName = target.tagName;
            if (
                tagName === 'INPUT' ||
                tagName === 'TEXTAREA' ||
                tagName === 'SELECT' ||
                target.isContentEditable
            ) {
                return;
            }
        }

        const key = event.key.toLowerCase();
        if (key === 'w') {
            event.preventDefault();
            this.toggleWaterMode();
            return;
        }

        if (key === 'u') {
            event.preventDefault();
            this.handleUpgradesToggle();
            return;
        }
    };

    private toggleWaterMode(): void {
        if (this.currentMode === 'water') {
            const fallbacks: Exclude<ActionMode, 'water'>[] = [
                this.previousPrimaryMode,
                'plant',
                'build'
            ];
            const tried = new Set<ActionMode>();
            for (const mode of fallbacks) {
                if (tried.has(mode)) {
                    continue;
                }
                tried.add(mode);
                this.ui.requestModeChange(mode);
                if (this.currentMode !== 'water') {
                    return;
                }
            }
            return;
        }

        if (!this.waterStatus.available) {
            this.waterStatus.message = this.waterStatus.message ?? 'Reservoir empty';
            this.syncWaterStatus(false);
            return;
        }

        this.previousPrimaryMode = this.currentMode as Exclude<ActionMode, 'water'>;

        this.ui.requestModeChange('water');
    }

    private syncWaterStatus(force = false): void {
        this.ui.setWaterStatus(
            {
                level: this.waterStatus.level,
                capacity: this.waterStatus.capacity,
                available: this.waterStatus.available,
                message: this.waterStatus.message
            },
            force ? { force: true } : undefined
        );
    }

    private clearSeedSelection(): void {
        if (!this.gameState.selectedSeedId) {
            return;
        }

        this.gameState.selectedSeedId = null;
        this.updateCursorState();
    }

    private ensurePlantSelection(): void {
        if (this.currentMode !== 'plant') {
            return;
        }

        const selectedSeedId = this.gameState.selectedSeedId;
        if (selectedSeedId) {
            const remaining = this.gameState.inventory.seeds[selectedSeedId] ?? 0;
            if (remaining > 0) {
                return;
            }
        }

        this.gameState.selectedSeedId = this.getNextAvailableSeedId();
    }

    private getNextAvailableSeedId(): string | null {
        for (const [seedId, count] of Object.entries(this.gameState.inventory.seeds)) {
            if (count > 0) {
                return seedId;
            }
        }

        return null;
    }

    private updateInventoryUI(): void {
        this.ui.updateInventory(this.gameState.inventory, this.plantManager.plantDefinitions);
        this.refreshBuildState();
        this.updateUpgradesPanel();
    }

    private handleHoverChanged(target: HoverTarget): void {
        this.setHoverTarget(target);
    }

    private setHoverTarget(target: HoverTarget): void {
        if (this.highlightedPlantId && (target.type !== 'plant' || target.plantId !== this.highlightedPlantId)) {
            this.feedback.setPlantHighlight(this.highlightedPlantId, 'none');
            this.highlightedPlantId = null;
        }

        if (target.type === 'plant') {
            const plant = this.gameState.plants.get(target.plantId);
            if (plant && plant.currentPhase === GrowthPhase.Fruitburst) {
                this.feedback.setPlantHighlight(target.plantId, 'harvest-ready');
            } else {
                this.feedback.setPlantHighlight(target.plantId, 'blocked');
            }
            this.highlightedPlantId = target.plantId;
        }

        this.hoverTarget = target;
        this.updateCursorState();
    }

    private beginPanning(pointerId: number, event: PointerEvent): void {
        this.panningState.active = true;
        this.panningState.pointerId = pointerId;
        this.panningState.lastMouseX = event.clientX;
        this.panningState.lastMouseY = event.clientY;
        // Store current camera offset from origin
        this.panningState.cameraOffset.copy(this.camera.position);
    }

    private updatePanning(event: PointerEvent): void {
        if (!this.panningState.active || this.panningState.pointerId !== event.pointerId) {
            return;
        }

        // Calculate mouse delta in screen space
        const deltaX = event.clientX - this.panningState.lastMouseX;
        const deltaY = event.clientY - this.panningState.lastMouseY;

        this.panningState.lastMouseX = event.clientX;
        this.panningState.lastMouseY = event.clientY;

        // Convert screen space delta to world space movement
        // For top-down camera, we need to convert screen coordinates to world coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        if (width === 0 || height === 0) {
            return;
        }

        // Calculate world space movement based on camera's view
        // Camera is at y=14 looking down, so we need to project screen movement to x-z plane
        const aspect = this.camera.aspect;
        const fov = this.camera.fov * (Math.PI / 180);
        const distance = Math.abs(this.camera.position.y); // Height above ground (always positive)
        const worldHeight = 2 * Math.tan(fov / 2) * distance;
        const worldWidth = worldHeight * aspect;

        // Convert pixel movement to world movement
        // Negative X for natural left-right panning, negative Z for natural up-down panning
        // (drag up = move camera up = move world down, so negative Z)
        const worldDeltaX = -(deltaX / width) * worldWidth;
        const worldDeltaZ = -(deltaY / height) * worldHeight; // Fixed: negative for correct direction

        // Update camera offset (moving in x-z plane, keeping y constant)
        this.panningState.cameraOffset.x += worldDeltaX;
        this.panningState.cameraOffset.z += worldDeltaZ;

        // Update camera position (keep y at 14, maintain top-down view)
        this.camera.position.set(
            this.panningState.cameraOffset.x,
            14, // Fixed height for top-down view
            this.panningState.cameraOffset.z
        );

        // Update lookAt target to match camera movement (center of view moves with camera)
        const lookAtTarget = new Vector3(
            this.panningState.cameraOffset.x,
            0,
            this.panningState.cameraOffset.z
        );
        this.camera.lookAt(lookAtTarget);
        this.camera.updateProjectionMatrix();
    }

    private endPanning(pointerId: number): void {
        if (this.panningState.active && this.panningState.pointerId === pointerId) {
            this.panningState.active = false;
            this.panningState.pointerId = null;
        }
    }

    private updateCursorState(): void {
        const hover = this.hoverTarget;
        let nextState: CursorState = 'default';

        // Handle out-of-bounds cursor state
        if (hover.type === 'out-of-bounds') {
            if (this.currentMode === 'build') {
                nextState = 'build-disabled';
            } else if (this.currentMode === 'plant') {
                nextState = 'plant-disabled';
            } else {
                nextState = 'default';
            }
            this.ui.setCursorState(nextState);
            return;
        }

        // Show pan cursor when hovering over empty space (when not in build/plant mode)
        if (hover.type === 'none' && this.currentMode !== 'build' && this.currentMode !== 'plant') {
            nextState = 'default'; // Could be 'pan' cursor in the future
        }

        if (hover.type === 'plant') {
            const plant = this.gameState.plants.get(hover.plantId);
            const harvestReady = plant?.currentPhase === GrowthPhase.Fruitburst;
            if (harvestReady) {
                nextState = 'harvest';
            } else if (this.currentMode === 'water') {
                nextState = this.waterStatus.available ? 'water' : 'water-disabled';
            } else {
                nextState = 'harvest-disabled';
            }
        } else if (this.currentMode === 'build') {
            const canAfford = this.canAffordNextSoil();
            if (hover.type === 'preview') {
                const canPlace = this.availableBuildPositions.has(hover.previewTileId) && canAfford;
                nextState = canPlace ? 'build' : 'build-disabled';
            } else {
                const hasPlacement = this.availableBuildPositions.size > 0;
                nextState = hasPlacement && canAfford ? 'build' : 'build-disabled';
            }
        } else if (this.currentMode === 'plant') {
            if (hover.type === 'soil') {
                nextState = this.canPlantOnTile(hover.tile) ? 'plant' : 'plant-disabled';
            } else {
                nextState = this.hasSeedsAvailable() ? 'plant' : 'plant-disabled';
            }
        } else if (this.currentMode === 'water') {
            nextState = this.waterStatus.available ? 'water' : 'water-disabled';
        }

        this.ui.setCursorState(nextState);
    }

    private updateWatering(currentTime: number, deltaMs: number): void {
        const deltaSeconds = Math.max(deltaMs, 0) / 1000;
        let statusChanged = false;
        let messageChanged = false;

        const wateringPosition = this.getWateringPosition();

        if (this.wateringState.active) {
            if (!wateringPosition) {
                this.endWatering(this.wateringState.pointerId, currentTime);
                this.feedback.stopWateringStream();
            } else {
                this.feedback.updateWateringStream(wateringPosition, currentTime);
            }
        } else {
            this.feedback.stopWateringStream();
        }

        if (this.wateringState.active && this.wateringState.targetPlantId) {
            if (this.waterStatus.level <= WATER_RESERVOIR_MIN_LEVEL) {
                if (this.waterStatus.available) {
                    this.waterStatus.available = false;
                    statusChanged = true;
                }
                if (this.waterStatus.message !== 'Reservoir empty') {
                    this.waterStatus.message = 'Reservoir empty';
                    messageChanged = true;
                }
                this.endWatering(this.wateringState.pointerId, currentTime);
            } else {
                const drainAmount = WATER_DRAIN_RATE_PER_SECOND * deltaSeconds;
                if (drainAmount > 0) {
                    const previousLevel = this.waterStatus.level;
                    const consumed = Math.min(drainAmount, this.waterStatus.level - WATER_RESERVOIR_MIN_LEVEL);
                    if (consumed > 0) {
                        this.waterStatus.level = Math.max(
                            WATER_RESERVOIR_MIN_LEVEL,
                            this.waterStatus.level - consumed
                        );
                        statusChanged = statusChanged || this.waterStatus.level !== previousLevel;
                        this.markReservoirUsed(currentTime);
                        if (wateringPosition) {
                            this.applyWaterAtTarget(consumed, currentTime, wateringPosition);
                        }
                    }

                    if (this.waterStatus.level <= WATER_RESERVOIR_MIN_LEVEL + 0.00001) {
                        this.waterStatus.level = WATER_RESERVOIR_MIN_LEVEL;
                        this.waterStatus.available = false;
                        this.waterStatus.message = 'Reservoir empty';
                        statusChanged = true;
                        messageChanged = true;
                        this.endWatering(this.wateringState.pointerId, currentTime);
                    }
                }
            }
        } else {
            if (this.waterStatus.level < this.waterStatus.capacity) {
                if (this.waterRefillResumeTimeMs === null) {
                    this.waterRefillResumeTimeMs = currentTime + WATER_RESERVOIR_REFILL_DELAY_MS;
                }

                if (currentTime >= (this.waterRefillResumeTimeMs ?? 0)) {
                    const previousLevel = this.waterStatus.level;
                    const refillAmount = WATER_RESERVOIR_REFILL_RATE_PER_SECOND * deltaSeconds;
                    if (refillAmount > 0) {
                        this.waterStatus.level = Math.min(
                            this.waterStatus.capacity,
                            this.waterStatus.level + refillAmount
                        );
                        statusChanged = statusChanged || this.waterStatus.level !== previousLevel;
                    }

                    if (this.waterStatus.level >= this.waterStatus.capacity - 0.00001) {
                        this.waterStatus.level = this.waterStatus.capacity;
                        if (!this.waterStatus.available) {
                            this.waterStatus.available = true;
                            statusChanged = true;
                        }
                        if (this.waterStatus.message) {
                            this.waterStatus.message = null;
                            messageChanged = true;
                        }
                        this.waterRefillResumeTimeMs = null;
                    }
                }
            } else if (!this.waterStatus.available) {
                this.waterStatus.available = true;
                statusChanged = true;
            }
        }

        if (this.waterStatus.level > WATER_RESERVOIR_MIN_LEVEL && !this.wateringState.active) {
            if (!this.waterStatus.available) {
                this.waterStatus.available = true;
                statusChanged = true;
            }
            if (this.waterStatus.message) {
                this.waterStatus.message = null;
                messageChanged = true;
            }
        }

        if (statusChanged || messageChanged) {
            this.syncWaterStatus();
            this.updateCursorState();
        }
    }

    private markReservoirUsed(timestamp: number): void {
        this.waterRefillResumeTimeMs = timestamp + WATER_RESERVOIR_REFILL_DELAY_MS;
    }

    private getWateringPosition(): Vector3 | null {
        const plantId = this.wateringState.targetPlantId;
        if (!plantId) {
            return null;
        }

        return this.plantManager.getPlantWorldPosition(plantId);
    }

    private applyWaterAtTarget(amount: number, timestamp: number, position: Vector3): void {
        this.plantManager.applyWaterInRadius(position, this.waterRadiusWorld, amount, timestamp);
    }

    private beginWatering(pointerId: number, plantId: string, timestamp: number): void {
        if (!this.waterStatus.available) {
            this.waterStatus.message = this.waterStatus.message ?? 'Reservoir empty';
            this.syncWaterStatus();
            return;
        }

        this.wateringState.active = true;
        this.wateringState.pointerId = pointerId;
        this.wateringState.targetPlantId = plantId;
        this.wateringState.lastUpdateTimeMs = timestamp;
        this.markReservoirUsed(timestamp);

        if (this.waterStatus.message) {
            this.waterStatus.message = null;
            this.syncWaterStatus();
        }
    }

    private continueWatering(pointerId: number, plantId: string, timestamp: number): void {
        if (!this.wateringState.active || this.wateringState.pointerId !== pointerId) {
            this.beginWatering(pointerId, plantId, timestamp);
            return;
        }

        this.wateringState.targetPlantId = plantId;
        this.wateringState.lastUpdateTimeMs = timestamp;
        this.markReservoirUsed(timestamp);
    }

    private endWatering(pointerId: number | null, timestamp: number): void {
        if (!this.wateringState.active || this.wateringState.pointerId !== pointerId) {
            return;
        }

        this.wateringState.active = false;
        this.wateringState.pointerId = null;
        this.wateringState.targetPlantId = null;
        this.wateringState.lastUpdateTimeMs = timestamp;
        this.markReservoirUsed(timestamp);
        this.feedback.stopWateringStream();
    }

    private canPlantOnTile(tile: SoilTile): boolean {
        if (tile.occupiedByPlantId) {
            return false;
        }

        if (!this.gameState.selectedSeedId) {
            return false;
        }

        const availableSeedCount =
            this.gameState.inventory.seeds[this.gameState.selectedSeedId] ?? 0;
        return availableSeedCount > 0;
    }

    private handleUpgradesToggle(): void {
        const isVisible = this.upgradesPanel.getVisible();
        this.upgradesPanel.setVisible(!isVisible);
    }

    private handleUpgradePurchase(upgradeId: string): void {
        const definition = UPGRADE_DEFINITIONS.find((def) => def.upgradeId === upgradeId);
        if (!definition) {
            return;
        }

        const currentLevel = this.gameState.upgrades[upgradeId] ?? 0;
        const cost = calculateUpgradeCost(definition.baseCost, definition.costScale, currentLevel);

        if (this.gameState.inventory.fruit < cost) {
            return;
        }

        this.gameState.inventory.fruit -= cost;
        this.gameState.upgrades[upgradeId] = currentLevel + 1;

        this.updateInventoryUI();
    }

    private updateUpgradesPanel(): void {
        this.upgradesPanel.updateData(
            UPGRADE_DEFINITIONS,
            this.gameState.upgrades,
            this.gameState.inventory.fruit
        );
    }
}
