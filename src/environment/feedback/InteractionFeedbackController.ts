import { Color, Group, Mesh, MeshBasicMaterial, Scene } from 'three';
import { PlantManager } from '../../core/PlantManager';
import { SoilTileManager, TILE_CHAMFER, TILE_SIZE } from '../../core/SoilTileManager';

export type SoilHighlightState =
    | 'plant-ready'
    | 'plant-blocked'
    | 'build-available'
    | 'build-blocked';

export type PlantHighlightState = 'harvest-ready' | 'blocked';

interface SoilHighlightEntry {
    mesh: Mesh;
    state: SoilHighlightState;
    createdAt: number;
}

interface PlantGlowState {
    state: PlantHighlightState;
    intensity: number;
}

const HIGHLIGHT_COLORS: Record<SoilHighlightState, number> = {
    'plant-ready': 0xa3f7b5,
    'plant-blocked': 0xf7b3a3,
    'build-available': 0xf5e0a3,
    'build-blocked': 0xf3bac2
};

const HIGHLIGHT_OPACITY: Record<SoilHighlightState, number> = {
    'plant-ready': 0.38,
    'plant-blocked': 0.42,
    'build-available': 0.36,
    'build-blocked': 0.4
};

const HIGHLIGHT_FADE_SPEED = 6;
const SHAKE_DURATION_MS = 260;
const SHAKE_AMPLITUDE = 0.06;

interface SoilShakeEntry {
    startedAt: number;
    mesh: Mesh;
    originalX: number;
}

export class InteractionFeedbackController {
    private readonly soilTileManager: SoilTileManager;
    private readonly plantManager: PlantManager;
    private readonly overlayGroup = new Group();
    private readonly overlayGeometry = SoilTileManager.createChamferedPlaneGeometry(
        TILE_SIZE - 0.1,
        TILE_CHAMFER
    );
    private readonly overlayMaterial = new MeshBasicMaterial({
        transparent: true,
        opacity: 0.35,
        depthWrite: false
    });
    private readonly soilHighlights: Map<string, SoilHighlightEntry> = new Map();
    private readonly soilShakes: Map<string, SoilShakeEntry> = new Map();
    private readonly plantGlows: Map<string, PlantGlowState> = new Map();

    constructor(scene: Scene, soilTileManager: SoilTileManager, plantManager: PlantManager) {
        this.soilTileManager = soilTileManager;
        this.plantManager = plantManager;
        this.overlayGroup.visible = true;
        scene.add(this.overlayGroup);
    }

    public update(currentTimeMs: number): void {
        this.updateSoilHighlights(currentTimeMs);
        this.updateSoilShakes(currentTimeMs);
        this.updatePlantGlows();
    }

    public showSoilHighlight(tileId: string, state: SoilHighlightState): void {
        let entry = this.soilHighlights.get(tileId);
        if (!entry) {
            const mesh = this.createOverlayMesh();
            const tilePosition = this.soilTileManager.getTileWorldPosition(tileId);
            if (!tilePosition) {
                return;
            }
            mesh.position.copy(tilePosition);
            mesh.position.y += 0.18;
            this.overlayGroup.add(mesh);

            entry = {
                mesh,
                state,
                createdAt: performance.now()
            };
            this.soilHighlights.set(tileId, entry);
        }

        entry.state = state;
        entry.createdAt = performance.now();
        const material = entry.mesh.material as MeshBasicMaterial;
        material.color = new Color(HIGHLIGHT_COLORS[state]);
        material.opacity = HIGHLIGHT_OPACITY[state];
    }

    public clearSoilHighlight(tileId: string): void {
        const entry = this.soilHighlights.get(tileId);
        if (!entry) {
            return;
        }

        entry.mesh.removeFromParent();
        const material = entry.mesh.material as MeshBasicMaterial;
        material.dispose();
        entry.mesh.geometry.dispose();
        this.soilHighlights.delete(tileId);
    }

    public triggerSoilShake(tileId: string): void {
        const mesh = this.soilTileManager.getTileMesh(tileId);
        if (!mesh) {
            return;
        }

        this.soilShakes.set(tileId, {
            startedAt: performance.now(),
            mesh,
            originalX: mesh.position.x
        });
    }

    public triggerPlantShake(plantId: string): void {
        const visual = this.plantManager.getVisualById(plantId);
        if (!visual) {
            return;
        }

        visual.playShake();
    }

    public setPlantHighlight(plantId: string, state: PlantHighlightState | 'none'): void {
        if (state === 'none') {
            const entry = this.plantGlows.get(plantId);
            if (!entry) {
                return;
            }
            entry.state = 'harvest-ready';
            entry.intensity = 0;
            this.plantManager.setHarvestGlow(plantId, 0);
            this.plantGlows.delete(plantId);
            return;
        }

        const entry =
            this.plantGlows.get(plantId) ??
            (() => {
                const created: PlantGlowState = { state, intensity: 0 };
                this.plantGlows.set(plantId, created);
                return created;
            })();
        entry.state = state;
    }

    public clearAll(): void {
        for (const [tileId] of this.soilHighlights) {
            this.clearSoilHighlight(tileId);
        }
        this.soilHighlights.clear();

        for (const shake of this.soilShakes.values()) {
            shake.mesh.position.x = shake.originalX;
        }
        this.soilShakes.clear();

        for (const plantId of this.plantGlows.keys()) {
            this.plantManager.setHarvestGlow(plantId, 0);
        }
        this.plantGlows.clear();
    }

    private updateSoilHighlights(currentTimeMs: number): void {
        for (const [tileId, entry] of this.soilHighlights.entries()) {
            const elapsed = (currentTimeMs - entry.createdAt) / 1000;
            const material = entry.mesh.material as MeshBasicMaterial;
            const targetOpacity = HIGHLIGHT_OPACITY[entry.state];
            material.opacity += (targetOpacity - material.opacity) * Math.min(elapsed * HIGHLIGHT_FADE_SPEED, 1);

            if (!this.soilTileManager.getTileById(tileId)) {
                this.clearSoilHighlight(tileId);
            }
        }
    }

    private updateSoilShakes(currentTimeMs: number): void {
        for (const [tileId, shake] of this.soilShakes.entries()) {
            const elapsed = currentTimeMs - shake.startedAt;
            if (elapsed >= SHAKE_DURATION_MS) {
                shake.mesh.position.x = shake.originalX;
                this.soilShakes.delete(tileId);
                continue;
            }

            const progress = elapsed / SHAKE_DURATION_MS;
            const strength = Math.sin(progress * Math.PI * 3) * (1 - progress);
            shake.mesh.position.x = shake.originalX + strength * SHAKE_AMPLITUDE;
        }
    }

    private updatePlantGlows(): void {
        const deltaSeconds = 1 / 60;
        for (const [plantId, glow] of this.plantGlows.entries()) {
            const targetIntensity = glow.state === 'harvest-ready' ? 1 : 0;
            glow.intensity += (targetIntensity - glow.intensity) * Math.min(deltaSeconds * 6, 1);

            if (glow.intensity <= 0.001 && targetIntensity === 0) {
                this.plantManager.setHarvestGlow(plantId, 0);
                this.plantGlows.delete(plantId);
                continue;
            }

            this.plantManager.setHarvestGlow(plantId, glow.intensity);
        }
    }

    private createOverlayMesh(): Mesh {
        const material = this.overlayMaterial.clone();
        const mesh = new Mesh(this.overlayGeometry.clone(), material);
        mesh.position.y = 0.16;
        return mesh;
    }
}

