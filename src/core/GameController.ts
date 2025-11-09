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
    SoilTile
} from './GameState';
import { SoilTileManager } from './SoilTileManager';
import { PlantManager } from './PlantManager';
import { ActionMode, GameUI } from '../ui/GameUI';
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

const SOIL_TILE_COST_FRUIT = 5;

export class GameController {
    private readonly container: HTMLElement;
    private readonly scene: Scene;
    private readonly camera: PerspectiveCamera;
    private readonly renderer: WebGLRenderer;
    private readonly grassPodule: GrassPodule;
    private readonly gameState: GameState;
    private readonly soilTileManager: SoilTileManager;
    private readonly plantManager: PlantManager;
    private readonly ui: GameUI;
    private readonly interaction: InteractionController;
    private readonly feedback: InteractionFeedbackController;
    private readonly sound: SoundController;
    private currentMode: ActionMode = 'plant';
    private previousPrimaryMode: Exclude<ActionMode, 'water'> = 'plant';
    private waterStatus = {
        level: 1,
        capacity: 1,
        available: true,
        message: null as string | null
    };

    private animationHandle: number | null = null;
    private lastFrameTime = performance.now();
    private availableBuildPositions: Map<string, GridPosition> = new Map();
    private activeDrag: { intent: DragIntent; exhausted: boolean } | null = null;
    private hoverTarget: HoverTarget = { type: 'none' };
    private highlightedSoilId: string | null = null;
    private highlightedPlantId: string | null = null;

    constructor(containerId: string = 'app') {
        const containerElement = document.getElementById(containerId);
        if (!containerElement) {
            throw new Error(`Container with id "${containerId}" not found.`);
        }

        this.container = containerElement;
        this.scene = new Scene();
        this.scene.background = new Color(0xf1f5f2);

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

        this.addLighting();

        this.grassPodule = new GrassPodule();
        this.grassPodule.addToScene(this.scene);

        this.soilTileManager = new SoilTileManager(this.scene, this.gameState);
        this.soilTileManager.initialize();

        this.plantManager = new PlantManager(this.scene, this.gameState);

        this.feedback = new InteractionFeedbackController(this.scene, this.soilTileManager, this.plantManager);
        this.sound = new SoundController();

        this.ui = new GameUI(this.renderer, {
            onModeChanged: (mode) => this.handleModeChanged(mode),
            onSeedSelected: (seedId) => this.handleSeedSelection(seedId)
        });
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
            }
        );

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

        if (this.animationHandle !== null) {
            cancelAnimationFrame(this.animationHandle);
            this.animationHandle = null;
        }

        this.interaction.dispose();
        this.ui.destroy();
        this.sound.dispose();
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
            selectedSeedId: null
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
            this.animationHandle = requestAnimationFrame(renderLoop);
        };

        this.animationHandle = requestAnimationFrame(renderLoop);
    }

    private update(currentTime: number, _delta: number): void {
        this.plantManager.update(currentTime);
        this.soilTileManager.updatePlacementPreviews(currentTime);
        this.feedback.update(currentTime);
    }

    private handleResolveDragIntent = (request: DragIntentRequest): DragIntent | null => {
        const { target, phase, baseIntent } = request;

        if (target.type === 'plant') {
            const plant = this.gameState.plants.get(target.plantId);
            if (plant && plant.currentPhase === GrowthPhase.Fruitburst) {
                return 'harvest';
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

        return null;
    };

    private handleDragStart = (event: DragStartEvent): void => {
        void this.sound.unlock();
        this.activeDrag = {
            intent: event.baseIntent,
            exhausted: false
        };

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
        this.activeDrag = null;
        if (event.reason === 'cancelled') {
            this.feedback.clearAll();
            this.highlightedSoilId = null;
            this.highlightedPlantId = null;
            this.refreshBuildState();
            this.interaction.refreshHover();
        }
    };

    private handleActionRejected = (request: DragIntentRequest): void => {
        this.showBlockedFeedback(request.target);
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
        if (this.currentMode === 'water') {
            if (target.type === 'plant') {
                this.ui.showModeMessage(
                    this.waterStatus.available ? 'Watering coming soon' : 'Reservoir empty',
                    true
                );
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
            this.feedback.showSoilHighlight(target.tile.id, 'plant-blocked');
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
            const position = this.availableBuildPositions.get(target.previewTileId);
            if (position) {
                const tileId = SoilTileManager.getTileId(position);
                this.feedback.showSoilHighlight(tileId, 'build-blocked');
            }
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
        if (key !== 'w') {
            return;
        }

        event.preventDefault();
        this.toggleWaterMode();
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
    }

    private handleHoverChanged(target: HoverTarget): void {
        this.setHoverTarget(target);
    }

    private setHoverTarget(target: HoverTarget): void {
        if (this.highlightedSoilId && (target.type !== 'soil' || target.tile.id !== this.highlightedSoilId)) {
            this.feedback.clearSoilHighlight(this.highlightedSoilId);
            this.highlightedSoilId = null;
        }

        if (this.highlightedPlantId && (target.type !== 'plant' || target.plantId !== this.highlightedPlantId)) {
            this.feedback.setPlantHighlight(this.highlightedPlantId, 'none');
            this.highlightedPlantId = null;
        }

        if (target.type === 'soil') {
            const highlightState = this.canPlantOnTile(target.tile) ? 'plant-ready' : 'plant-blocked';
            this.feedback.showSoilHighlight(target.tile.id, highlightState);
            this.highlightedSoilId = target.tile.id;
        } else if (target.type === 'plant') {
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

    private updateCursorState(): void {
        const hover = this.hoverTarget;
        let nextState: CursorState = 'default';

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
}
