import {
    Camera,
    Mesh,
    Object3D,
    Raycaster,
    Vector2
} from 'three';
import { PlantManager } from '../core/PlantManager';
import { SoilTileManager } from '../core/SoilTileManager';

export interface InteractionCallbacks {
    onSoilTileSelected: (tileId: string) => void;
    onPlantSelected: (plantId: string) => void;
    onPlacementPreviewSelected: (previewTileId: string) => void;
    onPointerMiss: () => void;
}

export class InteractionController {
    private readonly camera: Camera;
    private readonly soilTileManager: SoilTileManager;
    private readonly plantManager: PlantManager;
    private readonly callbacks: InteractionCallbacks;
    private readonly domElement: HTMLElement;
    private readonly raycaster = new Raycaster();
    private readonly pointer = new Vector2();

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
    }

    public dispose(): void {
        this.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    }

    private handlePointerDown = (event: PointerEvent): void => {
        const boundingRect = this.domElement.getBoundingClientRect();
        this.pointer.x = ((event.clientX - boundingRect.left) / boundingRect.width) * 2 - 1;
        this.pointer.y = -(((event.clientY - boundingRect.top) / boundingRect.height) * 2 - 1);

        this.raycaster.setFromCamera(this.pointer, this.camera);

        const previewMeshes = this.soilTileManager.getPlacementPreviewMeshes();
        const plantMeshes = this.plantManager.registerInteractiveTargets();
        const soilMeshes = this.soilTileManager.getIntersectableMeshes();
        const objectsToTest: Object3D[] = [...previewMeshes, ...plantMeshes, ...soilMeshes];

        if (objectsToTest.length === 0) {
            this.callbacks.onPointerMiss();
            return;
        }

        const intersections = this.raycaster.intersectObjects(objectsToTest, false);
        if (intersections.length === 0) {
            this.callbacks.onPointerMiss();
            return;
        }

        const firstHit = intersections[0].object as Mesh;
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
}
