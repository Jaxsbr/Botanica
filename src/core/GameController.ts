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
    Inventory,
    PlantState,
    SoilTile
} from './GameState';
import { SoilTileManager } from './SoilTileManager';
import { PlantManager } from './PlantManager';
import { GameUI } from '../ui/GameUI';
import { InteractionController } from '../input/InteractionController';

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

    private animationHandle: number | null = null;
    private lastFrameTime = performance.now();
    private isPlacingTile = false;
    private pendingPlacementPositions: Map<string, GridPosition> = new Map();

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
        this.container.appendChild(this.renderer.domElement);

        this.gameState = this.createInitialGameState();

        this.addLighting();

        this.grassPodule = new GrassPodule();
        this.grassPodule.addToScene(this.scene);

        this.soilTileManager = new SoilTileManager(this.scene, this.gameState);
        this.soilTileManager.initialize();

        this.plantManager = new PlantManager(this.scene, this.gameState);

        this.ui = new GameUI({
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
        this.ui.setSelectedSeed(this.gameState.selectedSeedId);
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
                onPointerMiss: () => this.handlePointerMiss()
            }
        );

        window.addEventListener('resize', this.handleResize);
        window.addEventListener('beforeunload', this.dispose);

        this.handleResize();
        this.start();
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
            fruit: 0,
            seeds: {
                'lumen-bloom': 1
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

    private handleSeedSelection(seedId: string): void {
        if (this.gameState.selectedSeedId === seedId) {
            this.gameState.selectedSeedId = null;
        } else {
            this.gameState.selectedSeedId = seedId;
        }

        this.ui.setSelectedSeed(this.gameState.selectedSeedId);
    }

    private handleSoilTileInteraction(tileId: string): void {
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
        this.clearSeedSelection();
    }

    private handlePlantInteraction(plantId: string): void {
        const result = this.plantManager.harvestPlant(plantId, performance.now());
        if (!result) {
            return;
        }

        this.clearSeedSelection();
        this.cancelSoilPlacement();
        this.ui.updateInventory(this.gameState.inventory, this.plantManager.plantDefinitions);
        if (result.fruitYield > 0) {
            this.ui.triggerFruitPulse();
        }
        this.updateShopUI();
    }

    private handleBuySoilTile(): void {
        if (this.isPlacingTile) {
            this.cancelSoilPlacement();
            return;
        }

        const availablePositions = this.soilTileManager.getAvailableAdjacentPositions();
        if (availablePositions.length === 0) {
            this.updateShopUI();
            return;
        }

        if (this.gameState.inventory.fruit < SOIL_TILE_COST_FRUIT) {
            this.updateShopUI();
            return;
        }

        this.isPlacingTile = true;
        this.pendingPlacementPositions = new Map(
            availablePositions.map((position) => [SoilTileManager.getTileId(position), position])
        );
        this.soilTileManager.showPlacementPreviews(availablePositions);
        this.updateShopUI();
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

        this.cancelSoilPlacement();
        this.updateInventoryUI();
        this.updateShopUI();
    }

    private handlePointerMiss(): void {
        if (this.isPlacingTile) {
            this.cancelSoilPlacement();
        }

        if (this.gameState.selectedSeedId) {
            this.clearSeedSelection();
        }
    }

    private cancelSoilPlacement(): void {
        if (!this.isPlacingTile) {
            return;
        }

        this.isPlacingTile = false;
        this.pendingPlacementPositions.clear();
        this.soilTileManager.clearPlacementPreviews();
        this.updateShopUI();
    }

    private clearSeedSelection(): void {
        if (!this.gameState.selectedSeedId) {
            return;
        }

        this.gameState.selectedSeedId = null;
        this.ui.setSelectedSeed(null);
    }

    private updateInventoryUI(): void {
        this.ui.updateInventory(this.gameState.inventory, this.plantManager.plantDefinitions);
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
    }
}
