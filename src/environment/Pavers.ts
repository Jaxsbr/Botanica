import * as THREE from 'three';

export class Pavers {
    private group: THREE.Group;
    private paverSize: number;
    private gap: number;
    private pavers: THREE.Mesh[] = [];
    private paverPositions: Map<number, THREE.Vector3> = new Map();

    constructor(paverCount: number = 9, paverSize: number = 0.8, gap: number = 0.1) {
        this.group = new THREE.Group();
        this.paverSize = paverSize;
        this.gap = gap;

        // Create a 3x3 grid of paver stones
        const rows = Math.sqrt(paverCount);
        const cols = Math.sqrt(paverCount);
        const totalSize = (paverSize * cols) + (gap * (cols - 1));
        const startX = -totalSize / 2 + paverSize / 2;
        const startZ = -totalSize / 2 + paverSize / 2;

        let paverIndex = 0;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const paver = this.createPaver(paverSize, paverIndex);

                const x = startX + (col * (paverSize + gap));
                const z = startZ + (row * (paverSize + gap));

                paver.position.set(x, 0.02, z); // Slightly above ground
                this.group.add(paver);
                this.pavers.push(paver);

                // Store world position for pot placement (center of paver)
                this.paverPositions.set(paverIndex, new THREE.Vector3(x, 0.06, z));

                paverIndex++;
            }
        }
    }

    private createPaver(size: number, index: number): THREE.Mesh {
        // Create individual paver stone
        const geometry = new THREE.BoxGeometry(size, 0.08, size);

        // Stone color with slight variation
        const stoneColor = 0xa89988; // Tan/gray stone color
        const material = new THREE.MeshStandardMaterial({
            color: stoneColor,
            roughness: 0.8,
            metalness: 0
        });

        const paver = new THREE.Mesh(geometry, material);
        paver.receiveShadow = true;
        paver.castShadow = true;

        // Store paver index in userData for raycasting
        paver.userData = { paverIndex: index, clickable: true };

        return paver;
    }

    public getGroup(): THREE.Group {
        return this.group;
    }

    /**
     * Get all paver meshes for raycasting
     */
    public getPavers(): THREE.Mesh[] {
        return this.pavers;
    }

    /**
     * Get position for pot placement at paver index
     */
    public getPaverPosition(index: number): THREE.Vector3 | undefined {
        return this.paverPositions.get(index);
    }

    /**
     * Get all paver positions
     */
    public getAllPaverPositions(): Map<number, THREE.Vector3> {
        return this.paverPositions;
    }

    public setPosition(x: number, y: number, z: number): void {
        this.group.position.set(x, y, z);
    }

    public dispose(): void {
        this.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (child.material instanceof THREE.Material) {
                    child.material.dispose();
                }
            }
        });
    }
}

