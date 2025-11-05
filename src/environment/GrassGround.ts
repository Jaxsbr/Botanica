import * as THREE from 'three';

export class GrassGround {
    public mesh: THREE.Mesh;

    constructor(radius: number = 10.0) {
        // Create circular ground geometry
        const geometry = new THREE.CircleGeometry(radius, 64);
        geometry.rotateX(-Math.PI / 2); // Lay flat on ground

        // Create grass material with vibrant green color
        const material = new THREE.MeshStandardMaterial({
            color: 0x4a8f3a, // Vibrant grass green
            roughness: 0.85,
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

