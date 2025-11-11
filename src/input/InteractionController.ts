import {
    Camera,
    Mesh,
    Object3D,
    Plane,
    Raycaster,
    Vector2,
    Vector3
} from 'three';
import { PlantManager } from '../core/PlantManager';
import { SoilTile } from '../core/GameState';
import { SoilTileManager } from '../core/SoilTileManager';
import { WorldManager } from '../core/WorldManager';

export type HoverTarget =
    | { type: 'none' }
    | { type: 'plant'; plantId: string }
    | { type: 'soil'; tile: SoilTile }
    | { type: 'preview'; previewTileId: string }
    | { type: 'out-of-bounds'; worldPos: { x: number; z: number } };

export type DragIntent = 'harvest' | 'plant' | 'build' | 'water' | 'pan';

export interface DragIntentRequest {
    target: HoverTarget;
    pointerId: number;
    nativeEvent: PointerEvent;
    phase: 'start' | 'move';
    baseIntent?: DragIntent;
}

export interface DragStartEvent {
    baseIntent: DragIntent;
    resolvedIntent: DragIntent;
    target: HoverTarget;
    pointerId: number;
    nativeEvent: PointerEvent;
}

export interface DragMoveEvent {
    baseIntent: DragIntent;
    resolvedIntent: DragIntent | null;
    target: HoverTarget;
    pointerId: number;
    nativeEvent: PointerEvent;
}

export interface DragEndEvent {
    baseIntent: DragIntent;
    pointerId: number;
    reason: 'completed' | 'cancelled';
    nativeEvent: PointerEvent | null;
}

export interface InteractionCallbacks {
    resolveDragIntent: (request: DragIntentRequest) => DragIntent | null;
    onDragStart: (event: DragStartEvent) => void;
    onDragEnter: (event: DragMoveEvent) => void;
    onDragEnd: (event: DragEndEvent) => void;
    onActionRejected?: (request: DragIntentRequest) => void;
    onPointerMiss: () => void;
    onHoverChanged: (target: HoverTarget) => void;
}

interface ActiveDrag {
    baseIntent: DragIntent;
    pointerId: number;
    visited: Set<string>;
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
    private activeDrag: ActiveDrag | null = null;
    private worldManager: WorldManager | null = null;
    private readonly groundPlane = new Plane(new Vector3(0, 1, 0), 0); // Y-up plane at y=0

    constructor(
        domElement: HTMLElement,
        camera: Camera,
        soilTileManager: SoilTileManager,
        plantManager: PlantManager,
        callbacks: InteractionCallbacks,
        worldManager?: WorldManager
    ) {
        this.domElement = domElement;
        this.camera = camera;
        this.soilTileManager = soilTileManager;
        this.plantManager = plantManager;
        this.callbacks = callbacks;
        this.worldManager = worldManager || null;

        this.domElement.addEventListener('pointerdown', this.handlePointerDown, { passive: false });
        this.domElement.addEventListener('pointermove', this.handlePointerMove, { passive: false });
        this.domElement.addEventListener('pointerup', this.handlePointerUp);
        this.domElement.addEventListener('pointercancel', this.handlePointerCancel);
        this.domElement.addEventListener('pointerleave', this.handlePointerLeave);
        window.addEventListener('keydown', this.handleKeyDown, true);
        this.domElement.addEventListener('contextmenu', this.handleContextMenu);
    }

    public dispose(): void {
        this.domElement.removeEventListener('pointerdown', this.handlePointerDown);
        this.domElement.removeEventListener('pointermove', this.handlePointerMove);
        this.domElement.removeEventListener('pointerup', this.handlePointerUp);
        this.domElement.removeEventListener('pointercancel', this.handlePointerCancel);
        this.domElement.removeEventListener('pointerleave', this.handlePointerLeave);
        this.domElement.removeEventListener('contextmenu', this.handleContextMenu);
        window.removeEventListener('keydown', this.handleKeyDown, true);
    }

    /**
     * Set the world manager for boundary checks
     */
    public setWorldManager(worldManager: WorldManager): void {
        this.worldManager = worldManager;
    }

    public refreshHover(): void {
        if (!this.lastPointerClient) {
            this.updateHoverTarget({ type: 'none' });
            return;
        }

        const intersection = this.getFirstIntersectionAt(
            this.lastPointerClient.x,
            this.lastPointerClient.y
        );
        const hoverTarget = this.resolveHoverTarget(intersection, this.lastPointerClient.x, this.lastPointerClient.y);
        this.updateHoverTarget(hoverTarget);
    }

    private handlePointerDown = (event: PointerEvent): void => {
        // Allow middle mouse button (button 1) for panning
        if (event.button === 2) {
            if (this.activeDrag) {
                this.cancelActiveDrag('cancelled', event);
                event.preventDefault();
            }
            return;
        }

        // Handle middle mouse button for panning
        if (event.button === 1) {
            event.preventDefault(); // Prevent default middle-click behavior
        }

        this.lastPointerClient = { x: event.clientX, y: event.clientY };
        const hoverTarget = this.getHoverTargetAt(event.clientX, event.clientY);
        this.updateHoverTarget(hoverTarget);

        const request: DragIntentRequest = {
            target: hoverTarget,
            pointerId: event.pointerId,
            nativeEvent: event,
            phase: 'start'
        };

        const resolvedIntent = this.callbacks.resolveDragIntent(request);
        if (!resolvedIntent) {
            if (hoverTarget.type === 'none') {
                this.callbacks.onPointerMiss();
            } else if (this.callbacks.onActionRejected) {
                this.callbacks.onActionRejected(request);
            }
            return;
        }

        this.domElement.setPointerCapture(event.pointerId);
        const drag: ActiveDrag = {
            baseIntent: resolvedIntent,
            pointerId: event.pointerId,
            visited: new Set([this.getTargetKey(hoverTarget)])
        };
        this.activeDrag = drag;

        const startEvent: DragStartEvent = {
            baseIntent: drag.baseIntent,
            resolvedIntent,
            target: hoverTarget,
            pointerId: event.pointerId,
            nativeEvent: event
        };
        this.callbacks.onDragStart(startEvent);
    };

    private handlePointerMove = (event: PointerEvent): void => {
        this.lastPointerClient = { x: event.clientX, y: event.clientY };
        const hoverTarget = this.getHoverTargetAt(event.clientX, event.clientY);
        this.updateHoverTarget(hoverTarget);

        if (!this.activeDrag) {
            return;
        }

        if (this.activeDrag.pointerId !== event.pointerId) {
            return;
        }

        if ((event.buttons & 1) === 0) {
            this.cancelActiveDrag('cancelled', event);
            return;
        }

        const targetKey = this.getTargetKey(hoverTarget);
        // Allow panning to continue even if we've visited this target (continuous movement)
        // Also allow water mode to continue (it's continuous)
        if (this.activeDrag.baseIntent !== 'water' && this.activeDrag.baseIntent !== 'pan') {
            if (this.activeDrag.visited.has(targetKey)) {
                return;
            }
            this.activeDrag.visited.add(targetKey);
        }

        const request: DragIntentRequest = {
            target: hoverTarget,
            pointerId: event.pointerId,
            nativeEvent: event,
            phase: 'move',
            baseIntent: this.activeDrag.baseIntent
        };
        const resolvedIntent = this.callbacks.resolveDragIntent(request);

        const moveEvent: DragMoveEvent = {
            baseIntent: this.activeDrag.baseIntent,
            resolvedIntent,
            target: hoverTarget,
            pointerId: event.pointerId,
            nativeEvent: event
        };
        this.callbacks.onDragEnter(moveEvent);
    };

    private handlePointerUp = (event: PointerEvent): void => {
        if (!this.activeDrag || this.activeDrag.pointerId !== event.pointerId) {
            return;
        }

        this.endActiveDrag('completed', event);
    };

    private handlePointerCancel = (event: PointerEvent): void => {
        if (!this.activeDrag || this.activeDrag.pointerId !== event.pointerId) {
            return;
        }

        this.cancelActiveDrag('cancelled', event);
    };

    private handlePointerLeave = (): void => {
        this.updateHoverTarget({ type: 'none' });
        this.lastPointerClient = null;
        if (!this.activeDrag) {
            this.callbacks.onPointerMiss();
        }
    };

    private handleContextMenu = (event: MouseEvent): void => {
        if (this.activeDrag) {
            event.preventDefault();
            this.cancelActiveDrag('cancelled', null);
        }
    };

    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== 'Escape') {
            return;
        }

        if (this.activeDrag) {
            event.preventDefault();
            this.cancelActiveDrag('cancelled', null);
        }
    };

    private endActiveDrag(reason: 'completed' | 'cancelled', event: PointerEvent | null): void {
        if (!this.activeDrag) {
            return;
        }

        const drag = this.activeDrag;
        this.activeDrag = null;

        this.domElement.releasePointerCapture(drag.pointerId);

        const endEvent: DragEndEvent = {
            baseIntent: drag.baseIntent,
            pointerId: drag.pointerId,
            reason,
            nativeEvent: event
        };
        this.callbacks.onDragEnd(endEvent);
    }

    private cancelActiveDrag(reason: 'cancelled', event: PointerEvent | null): void {
        this.endActiveDrag(reason, event);
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
                (target.type === 'out-of-bounds' &&
                    this.lastHoverTarget.type === 'out-of-bounds') ||
                (target.type === 'none' && this.lastHoverTarget.type === 'none'))
        ) {
            return;
        }

        this.lastHoverTarget = target;
        this.callbacks.onHoverChanged(target);
    }

    private getHoverTargetAt(clientX: number, clientY: number): HoverTarget {
        const intersection = this.getFirstIntersectionAt(clientX, clientY);
        return this.resolveHoverTarget(intersection, clientX, clientY);
    }

    private resolveHoverTarget(intersection: Mesh | null, clientX: number, clientY: number): HoverTarget {
        if (!intersection) {
            // Check if ray hits ground plane and if it's out of bounds
            if (this.worldManager && this.updatePointer(clientX, clientY)) {
                this.raycaster.setFromCamera(this.pointer, this.camera);
                const ray = this.raycaster.ray;
                const intersectionPoint = new Vector3();

                if (ray.intersectPlane(this.groundPlane, intersectionPoint)) {
                    if (!this.worldManager.isWithinRadius(intersectionPoint)) {
                        return {
                            type: 'out-of-bounds',
                            worldPos: { x: intersectionPoint.x, z: intersectionPoint.z }
                        };
                    }
                }
            }
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

    private getTargetKey(target: HoverTarget): string {
        if (target.type === 'plant') {
            return `plant:${target.plantId}`;
        }

        if (target.type === 'soil') {
            return `soil:${target.tile.id}`;
        }

        if (target.type === 'preview') {
            return `preview:${target.previewTileId}`;
        }

        if (target.type === 'out-of-bounds') {
            return `out-of-bounds:${target.worldPos.x},${target.worldPos.z}`;
        }

        return 'none';
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
