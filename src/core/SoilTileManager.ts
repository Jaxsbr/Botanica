import {
    BoxGeometry,
    Group,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Object3D,
    PlaneGeometry,
    Scene,
    Vector3
} from 'three';
import {
    GameState,
    GridPosition,
    SoilTile,
    TILE_SPACING
} from './GameState';

const TILE_HEIGHT = 0.1;
const TILE_SIZE = 1.4;
const PREVIEW_PULSE_SPEED = 4;
const PREVIEW_PULSE_INTENSITY = 0.12;

export class SoilTileManager {
    private readonly scene: Scene;
    private readonly gameState: GameState;
    private readonly tileMeshes: Map<string, Mesh> = new Map();
    private readonly tileGroup: Group = new Group();
    private readonly previewMeshes: Map<string, Mesh> = new Map();
    private readonly previewGroup: Group = new Group();
    private readonly tileGeometry = new BoxGeometry(TILE_SIZE, TILE_HEIGHT, TILE_SIZE);
    private readonly tileMaterial = new MeshStandardMaterial({
        color: 0x8b5a2b,
        roughness: 0.9
    });
    private readonly previewGeometry = new PlaneGeometry(TILE_SIZE * 0.9, TILE_SIZE * 0.9);
    private readonly previewMaterial = new MeshBasicMaterial({
        color: 0xffe29a,
        transparent: true,
        opacity: 0.6,
        depthWrite: false
    });
    private previewPulseStart = 0;

    constructor(scene: Scene, gameState: GameState) {
        this.scene = scene;
        this.gameState = gameState;
        this.tileGroup.position.y = TILE_HEIGHT / 2;
        this.previewGeometry.rotateX(-Math.PI / 2);
        this.previewGroup.position.y = TILE_HEIGHT + 0.005;
        this.scene.add(this.tileGroup);
        this.scene.add(this.previewGroup);
    }

    public initialize(): void {
        if (this.gameState.tiles.size > 0) {
            return;
        }

        this.addTile({ x: 0, z: 0 });
    }

    public addTile(position: GridPosition): SoilTile {
        const tileId = SoilTileManager.getTileId(position);
        if (this.gameState.tiles.has(tileId)) {
            const existingTile = this.gameState.tiles.get(tileId);
            if (!existingTile) {
                throw new Error('Tile map inconsistent state.');
            }

            return existingTile;
        }

        const mesh = new Mesh(this.tileGeometry, this.tileMaterial);
        mesh.position.set(position.x * TILE_SPACING, 0, position.z * TILE_SPACING);
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        mesh.userData.tileId = tileId;

        const tile: SoilTile = {
            id: tileId,
            gridPosition: position,
            occupiedByPlantId: null
        };

        this.tileGroup.add(mesh);
        this.tileMeshes.set(tileId, mesh);
        this.gameState.tiles.set(tileId, tile);

        return tile;
    }

    public getTileById(tileId: string): SoilTile | null {
        const tile = this.gameState.tiles.get(tileId);
        if (!tile) {
            return null;
        }

        return tile;
    }

    public getTileFromObject(object: Object3D | null): SoilTile | null {
        if (!object) {
            return null;
        }

        const tileId = object.userData.tileId as string | undefined;
        if (!tileId) {
            if (object.parent) {
                return this.getTileFromObject(object.parent);
            }

            return null;
        }

        return this.getTileById(tileId);
    }

    public getTileMesh(tileId: string): Mesh | null {
        return this.tileMeshes.get(tileId) ?? null;
    }

    public getTileWorldPosition(tileId: string): Vector3 | null {
        const mesh = this.tileMeshes.get(tileId);
        if (!mesh) {
            return null;
        }

        return mesh.position.clone();
    }

    public getIntersectableMeshes(): Mesh[] {
        return [...this.tileMeshes.values()];
    }

    public getPlacementPreviewMeshes(): Mesh[] {
        return [...this.previewMeshes.values()];
    }

    public showPlacementPreviews(positions: GridPosition[]): void {
        this.clearPlacementPreviews();
        this.previewPulseStart = Date.now();

        for (const position of positions) {
            const id = SoilTileManager.getTileId(position);
            const previewMesh = new Mesh(this.previewGeometry, this.previewMaterial);
            previewMesh.position.set(
                position.x * TILE_SPACING,
                0,
                position.z * TILE_SPACING
            );
            previewMesh.scale.setScalar(1);
            previewMesh.userData.previewTileId = id;
            this.previewGroup.add(previewMesh);
            this.previewMeshes.set(id, previewMesh);
        }
    }

    public clearPlacementPreviews(): void {
        for (const mesh of this.previewMeshes.values()) {
            mesh.removeFromParent();
        }

        this.previewMeshes.clear();
    }

    public setPlacementPreviewAffordability(affordable: boolean): void {
        const color = affordable ? 0xffe29a : 0xf2b0b0;
        for (const mesh of this.previewMeshes.values()) {
            const material = mesh.material as MeshBasicMaterial;
            material.color.setHex(color);
            material.opacity = affordable ? 0.6 : 0.45;
        }
    }

    public updatePlacementPreviews(currentTime: number): void {
        if (this.previewMeshes.size === 0) {
            return;
        }

        const start = this.previewPulseStart || currentTime;
        const elapsed = (currentTime - start) / 1000;
        const pulse = 1 + Math.sin(elapsed * PREVIEW_PULSE_SPEED) * PREVIEW_PULSE_INTENSITY;

        for (const mesh of this.previewMeshes.values()) {
            mesh.scale.set(pulse, pulse, pulse);
            const material = mesh.material as MeshBasicMaterial;
            material.opacity = 0.45 + (pulse - 1) * 1.2;
        }
    }

    public getAvailableAdjacentPositions(): GridPosition[] {
        const occupied = new Set<string>(this.gameState.tiles.keys());
        const candidates = new Map<string, GridPosition>();

        for (const tile of this.gameState.tiles.values()) {
            const deltas: GridPosition[] = [
                { x: tile.gridPosition.x + 1, z: tile.gridPosition.z },
                { x: tile.gridPosition.x - 1, z: tile.gridPosition.z },
                { x: tile.gridPosition.x, z: tile.gridPosition.z + 1 },
                { x: tile.gridPosition.x, z: tile.gridPosition.z - 1 }
            ];

            for (const delta of deltas) {
                const candidateId = SoilTileManager.getTileId(delta);
                if (occupied.has(candidateId) || candidates.has(candidateId)) {
                    continue;
                }

                candidates.set(candidateId, delta);
            }
        }

        return [...candidates.values()].sort((a, b) => {
            if (a.x === b.x) {
                return a.z - b.z;
            }

            return a.x - b.x;
        });
    }

    public remove(): void {
        this.scene.remove(this.tileGroup);
    }

    public dispose(): void {
        this.tileGroup.removeFromParent();
        this.previewGroup.removeFromParent();
        this.tileMeshes.clear();
        this.previewMeshes.clear();
        this.tileGeometry.dispose();
        this.previewGeometry.dispose();
        this.tileMaterial.dispose();
        this.previewMaterial.dispose();
    }

    public static getTileId(position: GridPosition): string {
        return `${position.x}_${position.z}`;
    }
}
