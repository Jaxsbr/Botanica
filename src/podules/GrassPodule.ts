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
    }

    public addToScene(scene: THREE.Scene): void {
        scene.add(this.group);
    }

    public removeFromScene(scene: THREE.Scene): void {
        scene.remove(this.group);
    }

    public dispose(): void {
        this.grassGround.dispose();
    }
}
