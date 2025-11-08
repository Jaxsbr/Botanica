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
    HoverTarget,
    InteractionController
} from '../input/InteractionController';
import { CursorIndicator, CursorState } from '../ui/CursorIndicator';

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
    private readonly cursorIndicator: CursorIndicator;
    private currentMode: ActionMode = 'plant';

    private animationHandle: number | null = null;
    private lastFrameTime = performance.now();
    private isPlacingTile = false;
    private pendingPlacementPositions: Map<string, GridPosition> = new Map();
    private hoverTarget: HoverTarget = { type: 'none' };

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
        this.renderer.domElement.classList.add('game-canvas');
        this.container.appendChild(this.renderer.domElement);

        this.gameState = this.createInitialGameState();

        this.addLighting();

        this.grassPodule = new GrassPodule();
        this.grassPodule.addToScene(this.scene);

        this.soilTileManager = new SoilTileManager(this.scene, this.gameState);
        this.soilTileManager.initialize();

        this.plantManager = new PlantManager(this.scene, this.gameState);

        this.cursorIndicator = new CursorIndicator(this.renderer.domElement);

        this.ui = new GameUI({
            onModeChanged: (mode) => this.handleModeChanged(mode),
            onSeedSelected: (seedId) => this.handleSeedSelection(seedId),
            onBuySoilTile: () => this.handleBuySoilTile()
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
        this.updateShopUI();

        this.interaction = new InteractionController(
            this.renderer.domElement,
            this.camera,
            this.soilTileManager,
            this.plantManager,
            {
                onPlantSelected: (plantId) => this.handlePlantInteraction(plantId),
                onSoilTileSelected: (tileId) => this.handleSoilTileInteraction(tileId),
                onPlacementPreviewSelected: (tileId) => this.handlePlacementPreview(tileId),
                onPointerMiss: () => this.handlePointerMiss(),
                onHoverChanged: (target) => this.handleHoverChanged(target)
            }
        );

        window.addEventListener('resize', this.handleResize);
        window.addEventListener('beforeunload', this.dispose);

        this.handleResize();
        this.start();
        this.updateCursorState();
    }

    public dispose = (): void => {
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('beforeunload', this.dispose);

        if (this.animationHandle !== null) {
            cancelAnimationFrame(this.animationHandle);
            this.animationHandle = null;
        }

        this.interaction.dispose();
        this.ui.destroy();
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
            this.renderer.render(this.scene, this.camera);
            this.animationHandle = requestAnimationFrame(renderLoop);
        };

        this.animationHandle = requestAnimationFrame(renderLoop);
    }

    private update(currentTime: number, _delta: number): void {
        this.plantManager.update(currentTime);
        this.soilTileManager.updatePlacementPreviews(currentTime);
    }

    private handleResize = (): void => {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (height === 0) {
            return;
        }

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    };

    private handleSeedSelection(seedId: string | null): void {
        this.gameState.selectedSeedId = seedId;
        this.updateCursorState();
    }

    private handleModeChanged(mode: ActionMode): void {
        if (this.currentMode === mode) {
            return;
        }

        this.currentMode = mode;

        if (mode === 'plant') {
            this.cancelSoilPlacement();
            if (!this.gameState.selectedSeedId) {
                const nextSeedId = this.getNextAvailableSeedId();
                if (nextSeedId) {
                    this.gameState.selectedSeedId = nextSeedId;
                }
            }
            return;
        }

        if (mode === 'till') {
            this.clearSeedSelection();
        }

        this.updateCursorState();
    }

    private handleSoilTileInteraction(tileId: string): void {
        if (this.currentMode !== 'plant') {
            return;
        }

        if (this.isPlacingTile) {
            this.cancelSoilPlacement();
            return;
        }

        if (!this.gameState.selectedSeedId) {
            return;
        }

        const availableSeedCount =
            this.gameState.inventory.seeds[this.gameState.selectedSeedId] ?? 0;
        if (availableSeedCount <= 0) {
            this.clearSeedSelection();
            return;
        }

        const planted = this.plantManager.plantSeed(
            tileId,
            this.gameState.selectedSeedId,
            performance.now()
        );
        if (!planted) {
            return;
        }

        this.gameState.inventory.seeds[this.gameState.selectedSeedId] = availableSeedCount - 1;
        this.ui.updateInventory(this.gameState.inventory, this.plantManager.plantDefinitions);
        this.updateCursorState();
        this.interaction.refreshHover();
    }

    private handlePlantInteraction(plantId: string): void {
        const result = this.plantManager.harvestPlant(plantId, performance.now());
        if (!result) {
            return;
        }

        this.ensurePlantSelection();
        this.cancelSoilPlacement();
        this.ui.updateInventory(this.gameState.inventory, this.plantManager.plantDefinitions);
        if (result.fruitYield > 0) {
            this.ui.triggerFruitPulse();
        }
        this.updateShopUI();
        this.interaction.refreshHover();
    }

    private handleBuySoilTile(): void {
        if (this.isPlacingTile) {
            return;
        }

        const availablePositions = this.soilTileManager.getAvailableAdjacentPositions();
        if (availablePositions.length === 0) {
            return;
        }

        if (this.gameState.inventory.fruit < SOIL_TILE_COST_FRUIT) {
            return;
        }

        this.isPlacingTile = true;
        this.pendingPlacementPositions = new Map(
            availablePositions.map((position) => [SoilTileManager.getTileId(position), position])
        );
        this.soilTileManager.showPlacementPreviews(availablePositions);
        this.updateShopUI();
        this.updateCursorState();
        this.interaction.refreshHover();
    }

    private handlePlacementPreview(previewTileId: string): void {
        if (!this.isPlacingTile) {
            return;
        }

        const position = this.pendingPlacementPositions.get(previewTileId);
        if (!position) {
            return;
        }

        if (this.gameState.inventory.fruit < SOIL_TILE_COST_FRUIT) {
            this.cancelSoilPlacement();
            return;
        }

        this.soilTileManager.addTile(position);
        this.gameState.inventory.fruit -= SOIL_TILE_COST_FRUIT;

        const nextPositions = this.soilTileManager.getAvailableAdjacentPositions();
        const canAffordNext = this.gameState.inventory.fruit >= SOIL_TILE_COST_FRUIT;
        const hasNextPlacement = nextPositions.length > 0;

        this.updateInventoryUI();

        if (canAffordNext && hasNextPlacement) {
            this.pendingPlacementPositions = new Map(
                nextPositions.map((nextPosition) => [
                    SoilTileManager.getTileId(nextPosition),
                    nextPosition
                ])
            );
            this.soilTileManager.showPlacementPreviews(nextPositions);
            this.updateShopUI();
            this.updateCursorState();
            this.interaction.refreshHover();
            return;
        }

        this.cancelSoilPlacement();
        this.updateShopUI();
        this.interaction.refreshHover();
    }

    private handlePointerMiss(): void {
        this.setHoverTarget({ type: 'none' });

        if (!this.isPlacingTile) {
            return;
        }

        const availablePositions = this.soilTileManager.getAvailableAdjacentPositions();
        const canAfford = this.gameState.inventory.fruit >= SOIL_TILE_COST_FRUIT;

        if (!canAfford || availablePositions.length === 0) {
            this.cancelSoilPlacement();
            return;
        }

        this.pendingPlacementPositions = new Map(
            availablePositions.map((position) => [SoilTileManager.getTileId(position), position])
        );
        this.soilTileManager.showPlacementPreviews(availablePositions);
        this.updateShopUI();
        this.updateCursorState();
    }

    private cancelSoilPlacement(): void {
        if (!this.isPlacingTile) {
            return;
        }

        this.isPlacingTile = false;
        this.pendingPlacementPositions.clear();
        this.soilTileManager.clearPlacementPreviews();
        this.updateShopUI();
        this.updateCursorState();
        this.interaction.refreshHover();
    }

    private clearSeedSelection(): void {
        if (!this.gameState.selectedSeedId) {
            return;
        }

        this.gameState.selectedSeedId = null;
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
        this.updateCursorState();
    }

    private updateShopUI(): void {
        if (this.isPlacingTile) {
            this.ui.setBuyTileState({
                enabled: true,
                costFruit: SOIL_TILE_COST_FRUIT,
                placementMode: true,
                message: 'Select a highlighted spot to place soil'
            });
            return;
        }

        const availablePositions = this.soilTileManager.getAvailableAdjacentPositions();
        const hasAdjacent = availablePositions.length > 0;
        const canAfford = this.gameState.inventory.fruit >= SOIL_TILE_COST_FRUIT;
        const enabled = hasAdjacent && canAfford;
        let message: string | undefined;

        if (!hasAdjacent) {
            message = 'No adjacent space available';
        } else if (!canAfford) {
            message = `Need ${SOIL_TILE_COST_FRUIT} fruit to add tile`;
        }

        this.ui.setBuyTileState({
            enabled,
            costFruit: SOIL_TILE_COST_FRUIT,
            message
        });
        this.updateCursorState();
    }

    private handleHoverChanged(target: HoverTarget): void {
        this.setHoverTarget(target);
    }

    private setHoverTarget(target: HoverTarget): void {
        this.hoverTarget = target;
        this.updateCursorState();
    }

    private updateCursorState(): void {
        let nextState: CursorState = 'default';

        if (this.hoverTarget.type === 'plant') {
            const plant = this.gameState.plants.get(this.hoverTarget.plantId);
            if (plant && plant.currentPhase === GrowthPhase.Fruitburst) {
                nextState = 'harvest';
            } else {
                nextState = 'plant-disabled';
            }
        } else if (this.hoverTarget.type === 'preview') {
            const canPlace = this.isPlacingTile && this.gameState.inventory.fruit >= SOIL_TILE_COST_FRUIT;
            nextState = canPlace ? 'build' : 'build-disabled';
        } else if (this.hoverTarget.type === 'soil') {
            if (this.currentMode === 'plant') {
                const canPlant = this.canPlantOnTile(this.hoverTarget.tile);
                nextState = canPlant ? 'plant' : 'plant-disabled';
            }
        }

        this.cursorIndicator.setState(nextState);
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
