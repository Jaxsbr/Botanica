import {
    Color,
    DoubleSide,
    ExtrudeGeometry,
    Group,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Object3D,
    Path,
    Scene,
    Shape,
    ShapeGeometry,
    Vector3
} from 'three';
import {
    GameState,
    GridPosition,
    SoilTile,
    TILE_SPACING
} from './GameState';

const TILE_HEIGHT = 0.1;
export const TILE_SIZE = 1.4;
export const TILE_CHAMFER = 0.16;
const SOIL_TILE_COLOR = 0xb68a4a;
const SOIL_TILE_BORDER_COLOR = 0xbd9450;
const PREVIEW_CHAMFER = TILE_CHAMFER;
const PREVIEW_BORDER_WIDTH = 0.08;
const PREVIEW_BORDER_PULSE_SPEED = 2.6;
const PREVIEW_BORDER_PULSE_INTENSITY = 0.5;

export class SoilTileManager {
    private readonly scene: Scene;
    private readonly gameState: GameState;
    private readonly tileMeshes: Map<string, Mesh> = new Map();
    private readonly tileBorderMeshes: Map<string, Mesh> = new Map();
    private readonly tileGroup: Group = new Group();
    private readonly previewMeshes: Map<string, Mesh> = new Map();
    private readonly previewBorderMeshes: Map<string, Mesh> = new Map();
    private readonly previewGroup: Group = new Group();
    private readonly tileGeometry = SoilTileManager.createTileGeometry(
        TILE_SIZE,
        TILE_HEIGHT,
        TILE_CHAMFER
    );
    private readonly tileMaterial = new MeshStandardMaterial({
        color: SOIL_TILE_COLOR,
        roughness: 0.9,
        metalness: 0.05
    });
    private readonly tileBorderGeometry = SoilTileManager.createBorderGeometry(
        TILE_SIZE,
        PREVIEW_BORDER_WIDTH,
        TILE_CHAMFER
    );
    private readonly tileBorderMaterial = new MeshBasicMaterial({
        color: SOIL_TILE_BORDER_COLOR,
        side: 2
    });
    private readonly previewFillGeometry = SoilTileManager.createChamferedPlaneGeometry(
        TILE_SIZE,
        PREVIEW_CHAMFER
    );
    private readonly previewFillMaterial = new MeshBasicMaterial({
        color: 0x9ec9ff,
        transparent: true,
        opacity: 0.35,
        depthWrite: false
    });
    private readonly previewBorderGeometry = SoilTileManager.createBorderGeometry(
        TILE_SIZE,
        PREVIEW_BORDER_WIDTH,
        PREVIEW_CHAMFER
    );
    private readonly previewBorderMaterial = new MeshBasicMaterial({
        color: 0x1f4f99,
        transparent: true,
        opacity: 0.7,
        side: DoubleSide,
        depthWrite: false
    });
    private readonly previewFillColorAffordable = new Color(0x9ec9ff);
    private readonly previewFillColorUnavailable = new Color(0x8fa3c4);
    private readonly previewBorderBaseColorAffordable = new Color(0x1f4f99);
    private readonly previewBorderGlowColorAffordable = new Color(0x64a0ff);
    private readonly previewBorderBaseColorUnavailable = new Color(0x3c4c6f);
    private readonly previewBorderGlowColorUnavailable = new Color(0x6a7d94);
    private readonly previewBorderCurrentBaseColor = new Color(0x1f4f99);
    private readonly previewBorderCurrentGlowColor = new Color(0x64a0ff);
    private previewBorderPulseStart = 0;

    constructor(scene: Scene, gameState: GameState) {
        this.scene = scene;
        this.gameState = gameState;
        this.tileGroup.position.y = TILE_HEIGHT / 2;
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

        const borderMesh = new Mesh(this.tileBorderGeometry, this.tileBorderMaterial);
        borderMesh.position.set(
            position.x * TILE_SPACING,
            TILE_HEIGHT * 1.6, // height above soil tile
            position.z * TILE_SPACING
        );
        borderMesh.castShadow = false;
        borderMesh.receiveShadow = false;
        borderMesh.userData.tileId = tileId;
        borderMesh.renderOrder = mesh.renderOrder;

        const tile: SoilTile = {
            id: tileId,
            gridPosition: position,
            occupiedByPlantId: null
        };

        this.tileGroup.add(mesh);
        this.tileGroup.add(borderMesh);
        this.tileMeshes.set(tileId, mesh);
        this.tileBorderMeshes.set(tileId, borderMesh);
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
        this.previewBorderPulseStart = Date.now();

        for (const position of positions) {
            const id = SoilTileManager.getTileId(position);
            const previewMesh = new Mesh(this.previewFillGeometry, this.previewFillMaterial);
            previewMesh.position.set(
                position.x * TILE_SPACING,
                0,
                position.z * TILE_SPACING
            );
            previewMesh.scale.setScalar(1);
            previewMesh.userData.previewTileId = id;
            this.previewGroup.add(previewMesh);
            this.previewMeshes.set(id, previewMesh);

            const borderMesh = new Mesh(this.previewBorderGeometry, this.previewBorderMaterial);
            borderMesh.position.copy(previewMesh.position);
            borderMesh.scale.copy(previewMesh.scale);
            borderMesh.userData.previewTileId = id;
            borderMesh.renderOrder = previewMesh.renderOrder + 1;
            this.previewGroup.add(borderMesh);
            this.previewBorderMeshes.set(id, borderMesh);
        }
    }

    public clearPlacementPreviews(): void {
        for (const mesh of this.previewMeshes.values()) {
            mesh.removeFromParent();
        }

        this.previewMeshes.clear();

        for (const border of this.previewBorderMeshes.values()) {
            border.removeFromParent();
        }

        this.previewBorderMeshes.clear();
    }

    public setPlacementPreviewAffordability(affordable: boolean): void {
        const fillColor = affordable ? this.previewFillColorAffordable : this.previewFillColorUnavailable;
        const borderBase = affordable
            ? this.previewBorderBaseColorAffordable
            : this.previewBorderBaseColorUnavailable;
        const borderGlow = affordable
            ? this.previewBorderGlowColorAffordable
            : this.previewBorderGlowColorUnavailable;

        this.previewFillMaterial.color.copy(fillColor);
        this.previewFillMaterial.opacity = affordable ? 0.35 : 0.25;
        this.previewBorderCurrentBaseColor.copy(borderBase);
        this.previewBorderCurrentGlowColor.copy(borderGlow);
        this.previewBorderMaterial.color.copy(borderBase);
        this.previewBorderMaterial.opacity = affordable ? 0.7 : 0.5;
    }

    public updatePlacementPreviews(currentTime: number): void {
        if (this.previewBorderMeshes.size === 0) {
            return;
        }

        const start = this.previewBorderPulseStart || currentTime;
        const elapsed = (currentTime - start) / 1000;
        const pulseT = (Math.sin(elapsed * PREVIEW_BORDER_PULSE_SPEED) + 1) / 2;
        const eased = pulseT * PREVIEW_BORDER_PULSE_INTENSITY;

        this.previewBorderMaterial.color.copy(this.previewBorderCurrentBaseColor);
        this.previewBorderMaterial.color.lerp(this.previewBorderCurrentGlowColor, eased);
        this.previewBorderMaterial.opacity = 0.55 + eased * 0.45;
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
        this.tileBorderMeshes.clear();
        this.previewMeshes.clear();
        this.previewBorderMeshes.clear();
        this.tileGeometry.dispose();
        this.previewFillGeometry.dispose();
        this.previewBorderGeometry.dispose();
        this.tileMaterial.dispose();
        this.tileBorderGeometry.dispose();
        this.tileBorderMaterial.dispose();
        this.previewFillMaterial.dispose();
        this.previewBorderMaterial.dispose();
    }

    public static getTileId(position: GridPosition): string {
        return `${position.x}_${position.z}`;
    }

    public static createChamferedPlaneGeometry(size: number, chamfer: number): ShapeGeometry {
        const shape = SoilTileManager.createChamferedRectangleShape(size / 2, chamfer);
        const geometry = new ShapeGeometry(shape);
        geometry.rotateX(-Math.PI / 2);
        return geometry;
    }

    private static createBorderGeometry(
        size: number,
        borderWidth: number,
        chamfer: number
    ): ShapeGeometry {
        const halfSize = size / 2;
        const shape = SoilTileManager.createChamferedRectangleShape(halfSize, chamfer);

        const innerHalfSize = Math.max(halfSize - borderWidth, 0);
        if (innerHalfSize > 0) {
            const innerChamfer = Math.max(chamfer - borderWidth, 0);
            const hole = SoilTileManager.createChamferedRectanglePath(innerHalfSize, innerChamfer);
            shape.holes.push(hole);
        }

        const geometry = new ShapeGeometry(shape);
        geometry.rotateX(-Math.PI / 2);
        return geometry;
    }

    private static createChamferedRectangleShape(halfSize: number, chamfer: number): Shape {
        const c = Math.min(chamfer, halfSize);
        const h = halfSize;

        const shape = new Shape();
        shape.moveTo(-h + c, -h);
        shape.lineTo(h - c, -h);
        shape.lineTo(h, -h + c);
        shape.lineTo(h, h - c);
        shape.lineTo(h - c, h);
        shape.lineTo(-h + c, h);
        shape.lineTo(-h, h - c);
        shape.lineTo(-h, -h + c);
        shape.lineTo(-h + c, -h);

        return shape;
    }

    private static createChamferedRectanglePath(halfSize: number, chamfer: number): Path {
        const c = Math.min(chamfer, halfSize);
        const h = halfSize;

        const path = new Path();
        path.moveTo(-h + c, -h);
        path.lineTo(-h, -h + c);
        path.lineTo(-h, h - c);
        path.lineTo(-h + c, h);
        path.lineTo(h - c, h);
        path.lineTo(h, h - c);
        path.lineTo(h, -h + c);
        path.lineTo(h - c, -h);
        path.lineTo(-h + c, -h);
        return path;
    }

    private static createTileGeometry(size: number, height: number, chamfer: number): ExtrudeGeometry {
        const shape = SoilTileManager.createChamferedRectangleShape(size / 2, chamfer);
        const geometry = new ExtrudeGeometry(shape, {
            depth: height,
            bevelEnabled: false
        });
        geometry.rotateX(-Math.PI / 2);
        geometry.translate(0, height / 2, 0);
        return geometry;
    }

}
