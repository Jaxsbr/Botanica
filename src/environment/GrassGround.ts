import * as THREE from 'three';

export class GrassGround {
    public mesh: THREE.Mesh;
    private currentRadius: number;
    private targetRadius: number;
    private geometry: THREE.CircleGeometry;
    private material: THREE.MeshStandardMaterial;
    private edgeVignetteMesh: THREE.Mesh | null = null;

    constructor(radius: number = 8.0) {
        this.currentRadius = radius;
        this.targetRadius = radius;

        // Create circular ground geometry
        this.geometry = new THREE.CircleGeometry(radius, 64);
        this.geometry.rotateX(-Math.PI / 2); // Lay flat on ground

        // Create grass material with vibrant green color and gradient effect
        this.material = new THREE.MeshStandardMaterial({
            color: 0x4a8f3a, // Vibrant grass green
            roughness: 0.85,
            metalness: 0
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.y = 0;
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = false;

        // Create edge vignette effect
        this.createEdgeVignette();
    }

    public getMesh(): THREE.Mesh {
        return this.mesh;
    }

    public setPosition(x: number, y: number, z: number): void {
        this.mesh.position.set(x, y, z);
        if (this.edgeVignetteMesh) {
            this.edgeVignetteMesh.position.set(x, y + 0.001, z);
        }
    }

    /**
     * Update the island radius with smooth animation
     */
    public updateRadius(newRadius: number, animate: boolean = true): void {
        this.targetRadius = newRadius;

        if (!animate) {
            this.currentRadius = newRadius;
            this.updateGeometry();
        }
    }

    /**
     * Update geometry based on current radius (call this in animation loop)
     */
    public updateGeometry(): void {
        // Smoothly interpolate towards target radius
        const lerpSpeed = 0.05;
        this.currentRadius += (this.targetRadius - this.currentRadius) * lerpSpeed;

        // Update geometry if radius changed significantly
        if (Math.abs(this.currentRadius - this.targetRadius) > 0.01) {
            const oldGeometry = this.geometry;
            this.geometry = new THREE.CircleGeometry(this.currentRadius, 64);
            this.geometry.rotateX(-Math.PI / 2);
            this.mesh.geometry = this.geometry;
            oldGeometry.dispose();

            // Update edge vignette
            this.updateEdgeVignette();
        }
    }

    /**
     * Get current radius
     */
    public getRadius(): number {
        return this.currentRadius;
    }

    /**
     * Create edge vignette overlay for depth effect
     */
    private createEdgeVignette(): void {
        // Create a ring that darkens the edge of the island
        const innerRadius = this.currentRadius * 0.85;
        const outerRadius = this.currentRadius * 1.2;
        const vignetteGeometry = new THREE.RingGeometry(
            innerRadius,
            outerRadius,
            64,
            1
        );
        vignetteGeometry.rotateX(-Math.PI / 2);

        const vignetteMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        this.edgeVignetteMesh = new THREE.Mesh(vignetteGeometry, vignetteMaterial);
        this.edgeVignetteMesh.position.y = 0.002;
        this.edgeVignetteMesh.renderOrder = -1;
    }

    /**
     * Update edge vignette when radius changes
     */
    private updateEdgeVignette(): void {
        if (!this.edgeVignetteMesh) {
            this.createEdgeVignette();
            return;
        }

        const oldGeometry = this.edgeVignetteMesh.geometry;
        const innerRadius = this.currentRadius * 0.85;
        const outerRadius = this.currentRadius * 1.2;
        const vignetteGeometry = new THREE.RingGeometry(
            innerRadius,
            outerRadius,
            64,
            1
        );
        vignetteGeometry.rotateX(-Math.PI / 2);

        this.edgeVignetteMesh.geometry = vignetteGeometry;
        oldGeometry.dispose();
    }

    /**
     * Get edge vignette mesh for adding to scene
     */
    public getEdgeVignetteMesh(): THREE.Mesh | null {
        return this.edgeVignetteMesh;
    }

    public dispose(): void {
        this.mesh.geometry.dispose();
        if (this.mesh.material instanceof THREE.Material) {
            this.mesh.material.dispose();
        }
        if (this.edgeVignetteMesh) {
            this.edgeVignetteMesh.geometry.dispose();
            if (this.edgeVignetteMesh.material instanceof THREE.Material) {
                this.edgeVignetteMesh.material.dispose();
            }
        }
    }
}

