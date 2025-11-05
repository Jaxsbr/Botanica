import * as THREE from 'three';
import type { ShopCategory } from '../types';

/**
 * ShopHotspot - Interactive zone in the shop that players can click
 * 
 * Represents a clickable area (tools display, pot stacks, etc.) that
 * opens a filtered shop UI when clicked. Provides visual feedback on hover.
 */
export class ShopHotspot {
    public readonly category: ShopCategory;
    public readonly label: string;
    public readonly group: THREE.Group;

    private markerMesh: THREE.Mesh;
    private highlightMesh: THREE.Mesh;
    private isHovered: boolean = false;
    private clickCallback?: (category: ShopCategory) => void;

    constructor(
        category: ShopCategory,
        label: string,
        position: THREE.Vector3,
        size: THREE.Vector3 = new THREE.Vector3(0.5, 0.5, 0.5)
    ) {
        this.category = category;
        this.label = label;
        this.group = new THREE.Group();
        this.group.position.copy(position);

        // Create subtle marker (visible but not intrusive)
        const markerGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const markerMaterial = new THREE.MeshStandardMaterial({
            color: 0x4CAF50,
            transparent: true,
            opacity: 0.3,
            emissive: 0x4CAF50,
            emissiveIntensity: 0.2
        });
        this.markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
        this.group.add(this.markerMesh);

        // Create highlight mesh (shown on hover)
        const highlightGeometry = new THREE.BoxGeometry(size.x * 1.1, size.y * 1.1, size.z * 1.1);
        const highlightMaterial = new THREE.MeshStandardMaterial({
            color: 0x76FF03,
            transparent: true,
            opacity: 0,
            emissive: 0x76FF03,
            emissiveIntensity: 0.5
        });
        this.highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
        this.group.add(this.highlightMesh);
    }

    /**
     * Set the click callback
     */
    public onClick(callback: (category: ShopCategory) => void): void {
        this.clickCallback = callback;
    }

    /**
     * Handle hover enter
     */
    public onHoverEnter(): void {
        this.isHovered = true;
        const highlightMaterial = this.highlightMesh.material as THREE.MeshStandardMaterial;
        highlightMaterial.opacity = 0.6;

        const markerMaterial = this.markerMesh.material as THREE.MeshStandardMaterial;
        markerMaterial.emissiveIntensity = 0.5;
    }

    /**
     * Handle hover exit
     */
    public onHoverExit(): void {
        this.isHovered = false;
        const highlightMaterial = this.highlightMesh.material as THREE.MeshStandardMaterial;
        highlightMaterial.opacity = 0;

        const markerMaterial = this.markerMesh.material as THREE.MeshStandardMaterial;
        markerMaterial.emissiveIntensity = 0.2;
    }

    /**
     * Handle click
     */
    public handleClick(): void {
        if (this.clickCallback) {
            this.clickCallback(this.category);
        }
    }

    /**
     * Get the mesh for raycasting
     */
    public getMesh(): THREE.Mesh {
        return this.markerMesh;
    }

    /**
     * Check if currently hovered
     */
    public getIsHovered(): boolean {
        return this.isHovered;
    }

    /**
     * Update animation (subtle pulsing)
     */
    public update(_deltaTime: number): void {
        // Subtle pulsing animation when hovered
        if (this.isHovered) {
            const pulseSpeed = 3;
            const pulseAmount = 0.1;
            const scale = 1 + Math.sin(Date.now() * 0.001 * pulseSpeed) * pulseAmount;
            this.highlightMesh.scale.set(scale, scale, scale);
        } else {
            this.highlightMesh.scale.set(1, 1, 1);
        }
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        this.markerMesh.geometry.dispose();
        if (this.markerMesh.material instanceof THREE.Material) {
            this.markerMesh.material.dispose();
        }

        this.highlightMesh.geometry.dispose();
        if (this.highlightMesh.material instanceof THREE.Material) {
            this.highlightMesh.material.dispose();
        }
    }
}

