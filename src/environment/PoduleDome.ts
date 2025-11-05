import * as THREE from 'three';

/**
 * PoduleDome - The glass dome that encases each podule environment
 * 
 * A "podule" is a self-contained game area (home, shop, etc.) that lives
 * inside a glass dome, creating a snow globe / diorama aesthetic.
 * This class handles the visual dome that frames each podule.
 */
export class PoduleDome {
    public mesh: THREE.Mesh;

    constructor(radius: number = 1.5) {
        // Create hemisphere geometry
        const geometry = new THREE.SphereGeometry(
            radius,
            32,
            32,
            0,              // phiStart
            Math.PI * 2,    // phiLength (full circle)
            0,              // thetaStart
            Math.PI / 2     // thetaLength (half sphere = dome)
        );

        // Create realistic glass material
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.2,
            roughness: 0.1,
            metalness: 0,
            transmission: 0.9,      // Glass-like transparency
            thickness: 0.5,         // Refraction depth
            envMapIntensity: 1,
            clearcoat: 1,           // Additional glossy layer
            clearcoatRoughness: 0.1
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = 0;
        this.mesh.castShadow = false;
        this.mesh.receiveShadow = false;
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

