import {
    Camera,
    Mesh,
    Object3D,
    Raycaster,
    Vector2
} from 'three';
import { PlantManager } from '../core/PlantManager';
import { SoilTile } from '../core/GameState';
import { SoilTileManager } from '../core/SoilTileManager';

export type HoverTarget =
    | { type: 'none' }
    | { type: 'plant'; plantId: string }
    | { type: 'soil'; tile: SoilTile }
    | { type: 'preview'; previewTileId: string };

export interface InteractionCallbacks {
    onSoilTileSelected: (tileId: string) => void;
    onPlantSelected: (plantId: string) => void;
    onPlacementPreviewSelected: (previewTileId: string) => void;
    onPointerMiss: () => void;
    onHoverChanged: (target: HoverTarget) => void;
}

export class InteractionController {
    private readonly camera: Camera;
    private readonly soilTileManager: SoilTileManager;
    private readonly plantManager: PlantManager;
    private readonly callbacks: InteractionCallbacks;
    private readonly domElement: HTMLElement;
    private readonly raycaster = new Raycaster();
    private readonly pointer = new Vector2();
    private lastPointerClient: { x: number; y: number } | null = null;
    private lastHoverTarget: HoverTarget = { type: 'none' };

    constructor(
        domElement: HTMLElement,
        camera: Camera,
        soilTileManager: SoilTileManager,
        plantManager: PlantManager,
        callbacks: InteractionCallbacks
    ) {
        this.domElement = domElement;
        this.camera = camera;
        this.soilTileManager = soilTileManager;
        this.plantManager = plantManager;
        this.callbacks = callbacks;

        this.domElement.addEventListener('pointerdown', this.handlePointerDown);
        this.domElement.addEventListener('pointermove', this.handlePointerMove);
        this.domElement.addEventListener('pointerleave', this.handlePointerLeave);
    }

    public dispose(): void {
        this.domElement.removeEventListener('pointerdown', this.handlePointerDown);
        this.domElement.removeEventListener('pointermove', this.handlePointerMove);
        this.domElement.removeEventListener('pointerleave', this.handlePointerLeave);
    }

    private handlePointerDown = (event: PointerEvent): void => {
        this.lastPointerClient = { x: event.clientX, y: event.clientY };
        const firstHit = this.getFirstIntersectionAt(event.clientX, event.clientY);
        if (!firstHit) {
            this.callbacks.onPointerMiss();
            return;
        }

        const previewId = firstHit.userData.previewTileId as string | undefined;
        if (previewId) {
            this.callbacks.onPlacementPreviewSelected(previewId);
            return;
        }

        const plantId = firstHit.userData.plantId as string | undefined;
        if (plantId) {
            this.callbacks.onPlantSelected(plantId);
            return;
        }

        const tile = this.soilTileManager.getTileFromObject(firstHit);
        if (tile) {
            this.callbacks.onSoilTileSelected(tile.id);
            return;
        }

        this.callbacks.onPointerMiss();
    };

    private handlePointerMove = (event: PointerEvent): void => {
        this.lastPointerClient = { x: event.clientX, y: event.clientY };
        const intersection = this.getFirstIntersectionAt(event.clientX, event.clientY);
        const hoverTarget = this.resolveHoverTarget(intersection);
        this.updateHoverTarget(hoverTarget);
    };

    private handlePointerLeave = (): void => {
        this.updateHoverTarget({ type: 'none' });
        this.lastPointerClient = null;
        this.callbacks.onPointerMiss();
    };

    public refreshHover(): void {
        if (!this.lastPointerClient) {
            this.updateHoverTarget({ type: 'none' });
            return;
        }

        const intersection = this.getFirstIntersectionAt(
            this.lastPointerClient.x,
            this.lastPointerClient.y
        );
        const hoverTarget = this.resolveHoverTarget(intersection);
        this.updateHoverTarget(hoverTarget);
    }

    private updateHoverTarget(target: HoverTarget): void {
        if (
            this.lastHoverTarget.type === target.type &&
            ((target.type === 'plant' &&
                this.lastHoverTarget.type === 'plant' &&
                this.lastHoverTarget.plantId === target.plantId) ||
                (target.type === 'preview' &&
                    this.lastHoverTarget.type === 'preview' &&
                    this.lastHoverTarget.previewTileId === target.previewTileId) ||
                (target.type === 'soil' &&
                    this.lastHoverTarget.type === 'soil' &&
                    this.lastHoverTarget.tile.id === target.tile.id) ||
                (target.type === 'none' && this.lastHoverTarget.type === 'none'))
        ) {
            return;
        }

        this.lastHoverTarget = target;
        this.callbacks.onHoverChanged(target);
    }

    private resolveHoverTarget(intersection: Mesh | null): HoverTarget {
        if (!intersection) {
            return { type: 'none' };
        }

        const previewId = intersection.userData.previewTileId as string | undefined;
        if (previewId) {
            return { type: 'preview', previewTileId: previewId };
        }

        const plantId = intersection.userData.plantId as string | undefined;
        if (plantId) {
            return { type: 'plant', plantId };
        }

        const tile = this.soilTileManager.getTileFromObject(intersection);
        if (tile) {
            return { type: 'soil', tile };
        }

        return { type: 'none' };
    }

    private getFirstIntersectionAt(clientX: number, clientY: number): Mesh | null {
        const objectsToTest = this.getObjectsToTest();
        if (objectsToTest.length === 0) {
            return null;
        }

        if (!this.updatePointer(clientX, clientY)) {
            return null;
        }
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersections = this.raycaster.intersectObjects(objectsToTest, false);
        if (intersections.length === 0) {
            return null;
        }

        return intersections[0].object as Mesh;
    }

    private getObjectsToTest(): Object3D[] {
        const previewMeshes = this.soilTileManager.getPlacementPreviewMeshes();
        const plantMeshes = this.plantManager.registerInteractiveTargets();
        const soilMeshes = this.soilTileManager.getIntersectableMeshes();
        return [...previewMeshes, ...plantMeshes, ...soilMeshes];
    }

    private updatePointer(clientX: number, clientY: number): boolean {
        const boundingRect = this.domElement.getBoundingClientRect();
        if (boundingRect.width === 0 || boundingRect.height === 0) {
            return false;
        }

        this.pointer.x = ((clientX - boundingRect.left) / boundingRect.width) * 2 - 1;
        this.pointer.y = -(((clientY - boundingRect.top) / boundingRect.height) * 2 - 1);
        return true;
    }
}
