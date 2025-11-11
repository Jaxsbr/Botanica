import * as THREE from 'three';
import { GrassGround } from '../environment/GrassGround';

export interface GrassPoduleOptions {
    radius?: number;
}

export class GrassPodule {
    public readonly group: THREE.Group;

    private readonly grassGround: GrassGround;

    constructor(options?: GrassPoduleOptions) {
        const { radius = 8 } = options ?? {};

        this.group = new THREE.Group();
        this.grassGround = new GrassGround(radius);

        const grassMesh = this.grassGround.getMesh();
        grassMesh.receiveShadow = true;
        grassMesh.position.y = 0;

        this.group.add(grassMesh);

        // Add edge vignette if available
        const vignetteMesh = this.grassGround.getEdgeVignetteMesh();
        if (vignetteMesh) {
            this.group.add(vignetteMesh);
        }
    }

    public addToScene(scene: THREE.Scene): void {
        scene.add(this.group);
    }

    public removeFromScene(scene: THREE.Scene): void {
        scene.remove(this.group);
    }

    /**
     * Update the island radius (triggers smooth expansion animation)
     */
    public updateIslandRadius(radius: number): void {
        this.grassGround.updateRadius(radius);
    }

    /**
     * Update grass geometry (call this in animation loop for smooth expansion)
     */
    public update(deltaTimeMs: number): void {
        this.grassGround.updateGeometry();
    }

    /**
     * Get current island radius
     */
    public getRadius(): number {
        return this.grassGround.getRadius();
    }

    public dispose(): void {
        this.grassGround.dispose();
    }
}
