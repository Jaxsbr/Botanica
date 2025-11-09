import {
    Group,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    Scene,
    SphereGeometry,
    Vector3
} from 'three';
import {
    GameState,
    GrowthPhase,
    PlantDefinition,
    PlantState,
    TILE_SPACING
} from './GameState';
import {
    WATER_PLANT_ABSORB_MULTIPLIER,
    WATER_PLANT_DECAY_RATE_PER_SECOND,
    WATER_PLANT_FULL_THRESHOLD,
    WATER_PLANT_GROWTH_MULTIPLIER
} from '../config/gameBalance';
import { PlantVisual } from '../environment/plants/PlantVisual';

const PHASE_SEQUENCE: GrowthPhase[] = [
    GrowthPhase.Seedling,
    GrowthPhase.Sproutspire,
    GrowthPhase.VerdantCrown,
    GrowthPhase.Bloomflare,
    GrowthPhase.Fruitburst
];

const LUMEN_BLOOM_DEFINITION: PlantDefinition = {
    id: 'lumen-bloom',
    displayName: 'Lumen Bloom',
    fruitYield: 3,
    seedYield: 2,
    growthDurationsMs: {
        [GrowthPhase.Seedling]: 12000,
        [GrowthPhase.Sproutspire]: 12000,
        [GrowthPhase.VerdantCrown]: 12000,
        [GrowthPhase.Bloomflare]: 12000,
        [GrowthPhase.Fruitburst]: 0
    }
};

const HARVEST_BURST_DURATION_MS = 600;

interface HarvestBurst {
    mesh: Mesh;
    createdAt: number;
}

export interface PlantHarvestResult {
    fruitYield: number;
    seedYield: number;
    plantDefinitionId: string;
}

export class PlantManager {
    public readonly plantDefinitions: Map<string, PlantDefinition> = new Map([
        [LUMEN_BLOOM_DEFINITION.id, LUMEN_BLOOM_DEFINITION]
    ]);

    private readonly scene: Scene;
    private readonly gameState: GameState;
    private readonly plantGroup: Group = new Group();
    private readonly visualsByPlantId: Map<string, PlantVisual> = new Map();
    private readonly harvestBursts: HarvestBurst[] = [];
    private readonly harvestBurstGeometry = new SphereGeometry(0.22, 12, 12);

    constructor(scene: Scene, gameState: GameState) {
        this.scene = scene;
        this.gameState = gameState;
        this.scene.add(this.plantGroup);
    }

    public plantSeed(tileId: string, definitionId: string, timestamp: number): PlantState | null {
        const tile = this.gameState.tiles.get(tileId);
        if (!tile) {
            return null;
        }

        if (tile.occupiedByPlantId) {
            return null;
        }

        const definition = this.plantDefinitions.get(definitionId);
        if (!definition) {
            return null;
        }

        const plantId = this.createPlantId();
        const plantState: PlantState = {
            id: plantId,
            definitionId: definition.id,
            plantedAt: timestamp,
            currentPhase: GrowthPhase.Seedling,
            phaseStartedAt: timestamp,
            tileId,
            waterLevel: 0,
            isFullyWatered: false,
            lastWateredAt: 0,
            lastWaterLevelUpdate: timestamp
        };

        const visual = new PlantVisual(GrowthPhase.Seedling);
        const tilePosition = new Vector3(
            tile.gridPosition.x * TILE_SPACING,
            0,
            tile.gridPosition.z * TILE_SPACING
        );
        visual.group.position.copy(tilePosition);
        visual.group.position.y = 0.1;

        this.plantGroup.add(visual.group);
        this.visualsByPlantId.set(plantId, visual);
        this.gameState.plants.set(plantId, plantState);

        tile.occupiedByPlantId = plantId;

        visual.playPlantingAnimation(timestamp);

        return plantState;
    }

    public getPlantFromObject(object: Object3D | null): PlantState | null {
        if (!object) {
            return null;
        }

        const plantId = object.userData.plantId as string | undefined;
        if (plantId) {
            return this.gameState.plants.get(plantId) ?? null;
        }

        if (object.parent) {
            return this.getPlantFromObject(object.parent);
        }

        return null;
    }

    public registerInteractiveTargets(): Mesh[] {
        const meshes: Mesh[] = [];
        for (const [plantId, visual] of this.visualsByPlantId.entries()) {
            for (const mesh of visual.getInteractiveObjects()) {
                mesh.userData.plantId = plantId;
                meshes.push(mesh);
            }
        }

        return meshes;
    }

    public harvestPlant(plantId: string, timestamp: number): PlantHarvestResult | null {
        const plant = this.gameState.plants.get(plantId);
        if (!plant) {
            return null;
        }

        const definition = this.plantDefinitions.get(plant.definitionId);
        if (!definition) {
            return null;
        }

        if (plant.currentPhase !== GrowthPhase.Fruitburst) {
            return null;
        }

        this.gameState.inventory.fruit += definition.fruitYield;
        this.gameState.inventory.seeds[definition.id] =
            (this.gameState.inventory.seeds[definition.id] ?? 0) + definition.seedYield;

        const tile = this.gameState.tiles.get(plant.tileId);
        if (tile) {
            tile.occupiedByPlantId = null;
        }

        const visual = this.visualsByPlantId.get(plantId);
        if (visual) {
            this.spawnHarvestBurst(visual.group.position, timestamp);
            visual.dispose();
            this.visualsByPlantId.delete(plantId);
        }

        this.gameState.plants.delete(plantId);

        return {
            fruitYield: definition.fruitYield,
            seedYield: definition.seedYield,
            plantDefinitionId: definition.id
        };
    }

    public update(currentTime: number): void {
        for (const plant of this.gameState.plants.values()) {
            const definition = this.plantDefinitions.get(plant.definitionId);
            if (!definition) {
                continue;
            }

            this.updatePlantWaterState(plant, currentTime);
            this.advancePhaseIfNeeded(plant, definition, currentTime);

            const visual = this.visualsByPlantId.get(plant.id);
            if (!visual) {
                continue;
            }

            const saturation = Math.min(plant.waterLevel / WATER_PLANT_FULL_THRESHOLD, 1);
            visual.setWateredState(saturation, plant.isFullyWatered);
            visual.update(currentTime);
        }

        this.updateHarvestBursts(currentTime);
    }

    public dispose(): void {
        for (const visual of this.visualsByPlantId.values()) {
            visual.dispose();
        }

        this.visualsByPlantId.clear();
        this.plantGroup.removeFromParent();

        for (const burst of this.harvestBursts) {
            this.disposeBurst(burst);
        }

        this.harvestBurstGeometry.dispose();
        this.harvestBursts.length = 0;
    }

    public getVisualById(plantId: string): PlantVisual | null {
        return this.visualsByPlantId.get(plantId) ?? null;
    }

    public setHarvestGlow(plantId: string, intensity: number): void {
        const visual = this.visualsByPlantId.get(plantId);
        if (!visual) {
            return;
        }

        visual.setHarvestGlow(intensity);
    }

    public triggerPlantShake(plantId: string): void {
        const visual = this.visualsByPlantId.get(plantId);
        if (!visual) {
            return;
        }

        visual.playShake();
    }

    private advancePhaseIfNeeded(
        plant: PlantState,
        definition: PlantDefinition,
        currentTime: number
    ): void {
        if (plant.currentPhase === GrowthPhase.Fruitburst) {
            return;
        }

        const phaseDuration = definition.growthDurationsMs[plant.currentPhase];
        if (!phaseDuration) {
            return;
        }

        const growthMultiplier = this.getGrowthMultiplier(plant);
        const effectiveDuration = phaseDuration / Math.max(growthMultiplier, 0.0001);

        const elapsed = currentTime - plant.phaseStartedAt;
        if (elapsed < effectiveDuration) {
            return;
        }

        const nextPhase = this.getNextPhase(plant.currentPhase);
        if (!nextPhase) {
            return;
        }

        plant.currentPhase = nextPhase;
        plant.phaseStartedAt = currentTime;

        const visual = this.visualsByPlantId.get(plant.id);
        if (visual) {
            visual.setPhase(nextPhase, currentTime);
        }
    }

    private getNextPhase(phase: GrowthPhase): GrowthPhase | null {
        const index = PHASE_SEQUENCE.indexOf(phase);
        if (index < 0 || index >= PHASE_SEQUENCE.length - 1) {
            return null;
        }

        return PHASE_SEQUENCE[index + 1];
    }

    private createPlantId(): string {
        return `plant-${Math.random().toString(36).slice(2, 10)}`;
    }

    private spawnHarvestBurst(position: Vector3, timestamp: number): void {
        const material = new MeshBasicMaterial({
            color: 0xffd27a,
            transparent: true,
            opacity: 0.95
        });
        const mesh = new Mesh(this.harvestBurstGeometry, material);
        mesh.position.copy(position.clone().setY(0.2));
        mesh.scale.setScalar(0.8);
        this.plantGroup.add(mesh);
        this.harvestBursts.push({
            mesh,
            createdAt: timestamp
        });
    }

    private updateHarvestBursts(currentTime: number): void {
        for (let index = this.harvestBursts.length - 1; index >= 0; index -= 1) {
            const burst = this.harvestBursts[index];
            const elapsed = currentTime - burst.createdAt;
            const progress = elapsed / HARVEST_BURST_DURATION_MS;

            if (progress >= 1) {
                this.disposeBurst(burst);
                this.harvestBursts.splice(index, 1);
                continue;
            }

            const eased = progress * progress;
            burst.mesh.scale.setScalar(0.8 + eased * 1.4);
            burst.mesh.position.y = 0.2 + eased * 0.9;

            const material = burst.mesh.material as MeshBasicMaterial;
            material.opacity = 0.95 * (1 - progress);
        }
    }

    private disposeBurst(burst: HarvestBurst): void {
        burst.mesh.removeFromParent();
        const material = burst.mesh.material as MeshBasicMaterial;
        material.dispose();
    }

    public getPlantWorldPosition(plantId: string): Vector3 | null {
        const visual = this.visualsByPlantId.get(plantId);
        if (!visual) {
            return null;
        }

        return visual.group.position.clone();
    }

    public applyWaterInRadius(
        position: Vector3,
        radius: number,
        amount: number,
        timestamp: number
    ): PlantState[] {
        if (amount <= 0) {
            return [];
        }

        const affected: PlantState[] = [];
        const radiusSq = radius * radius;

        for (const plant of this.gameState.plants.values()) {
            const visual = this.visualsByPlantId.get(plant.id);
            if (!visual) {
                continue;
            }

            const distanceSq = visual.group.position.distanceToSquared(position);
            if (distanceSq > radiusSq) {
                continue;
            }

            if (this.applyWaterToPlant(plant, amount, timestamp)) {
                affected.push(plant);
            }
        }

        return affected;
    }

    private updatePlantWaterState(plant: PlantState, currentTime: number): void {
        this.refreshPlantWaterLevel(plant, currentTime);
    }

    private applyWaterToPlant(plant: PlantState, amount: number, timestamp: number): boolean {
        if (amount <= 0) {
            return false;
        }

        this.refreshPlantWaterLevel(plant, timestamp);

        const previousLevel = plant.waterLevel;
        const wasFullyWatered = plant.isFullyWatered;

        const absorbed = amount * WATER_PLANT_ABSORB_MULTIPLIER;
        plant.waterLevel = Math.min(previousLevel + absorbed, WATER_PLANT_FULL_THRESHOLD);
        plant.lastWateredAt = timestamp;
        plant.isFullyWatered = plant.waterLevel >= WATER_PLANT_FULL_THRESHOLD - 0.0001;

        if (plant.isFullyWatered) {
            plant.waterLevel = WATER_PLANT_FULL_THRESHOLD;
        }

        return plant.waterLevel !== previousLevel || plant.isFullyWatered !== wasFullyWatered;
    }

    private refreshPlantWaterLevel(plant: PlantState, timestamp: number): void {
        if (plant.isFullyWatered) {
            plant.waterLevel = WATER_PLANT_FULL_THRESHOLD;
            plant.lastWaterLevelUpdate = timestamp;
            return;
        }

        const elapsedSeconds = (timestamp - plant.lastWaterLevelUpdate) / 1000;
        if (elapsedSeconds > 0) {
            const decay = WATER_PLANT_DECAY_RATE_PER_SECOND * elapsedSeconds;
            plant.waterLevel = Math.max(0, plant.waterLevel - decay);

            if (plant.waterLevel < WATER_PLANT_FULL_THRESHOLD) {
                plant.isFullyWatered = false;
            }
        }

        plant.lastWaterLevelUpdate = timestamp;
    }

    private getGrowthMultiplier(plant: PlantState): number {
        return plant.isFullyWatered ? WATER_PLANT_GROWTH_MULTIPLIER : 1;
    }
}
