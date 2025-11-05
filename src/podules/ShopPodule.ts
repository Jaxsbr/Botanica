import * as THREE from 'three';
import { BasePodule } from './BasePodule';
import type { PoduleConfig } from '../types';

/**
 * ShopPodule - The shopping area for purchasing items
 * 
 * Placeholder implementation for Phase 1.2 economy system.
 * Will contain UI for buying pots, soil, fertilizer, and other items.
 */
export class ShopPodule extends BasePodule {
    private groundPlane: THREE.Mesh;

    constructor(config: PoduleConfig) {
        super('shop', config);

        // Create simple ground plane for shop area
        const geometry = new THREE.CircleGeometry(config.radius * 0.95, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0x8B7355, // Wood-like floor color
            roughness: 0.8,
            metalness: 0.1
        });

        this.groundPlane = new THREE.Mesh(geometry, material);
        this.groundPlane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        this.groundPlane.receiveShadow = true;
        this.group.add(this.groundPlane);

        // TODO Phase 1.2: Add shop shelves, display items, UI overlay
        console.log('🛒 Shop podule created (placeholder)');
    }

    public update(_deltaTime: number): void {
        // No animations yet in shop podule
        // Future: Item highlights, UI animations, etc.
    }

    protected onActivate(): void {
        console.log('🛒 Shop podule activated');
        // TODO Phase 1.2: Show shop UI overlay
    }

    protected onDeactivate(): void {
        console.log('🛒 Shop podule deactivated');
        // TODO Phase 1.2: Hide shop UI overlay
    }

    protected onDispose(): void {
        this.groundPlane.geometry.dispose();
        if (this.groundPlane.material instanceof THREE.Material) {
            this.groundPlane.material.dispose();
        }
    }
}

