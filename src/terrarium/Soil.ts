import * as THREE from 'three';

export class Soil {
    public mesh: THREE.Mesh;

    constructor(radius: number = 1.5, color: number = 0x654321) {
        // Create circular ground geometry
        const geometry = new THREE.CircleGeometry(radius, 32);
        geometry.rotateX(-Math.PI / 2); // Lay flat on ground

        // Create soil material
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.9,
            metalness: 0
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = 0;
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = false;
    }

    public getMesh(): THREE.Mesh {
        return this.mesh;
    }

    public setPosition(x: number, y: number, z: number): void {
        this.mesh.position.set(x, y, z);
    }

    public dispose(): void {
        this.mesh.geometry.dispose();
        if (this.mesh.material instanceof THREE.Material) {
            this.mesh.material.dispose();
        }
    }
}

