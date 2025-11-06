import * as THREE from 'three';
import { ShopHotspot } from './Hotspot';
import type { ShopCategory } from '../types';

/**
 * HotspotManager - Manages all shop hotspots (NO global listeners)
 * 
 * Handles raycasting for mouse hover/click detection.
 * Input is routed through InputManager, not global listeners.
 */
export class HotspotManager {
    private hotspots: ShopHotspot[] = [];
    private raycaster: THREE.Raycaster;
    private camera: THREE.Camera;
    private currentHovered: ShopHotspot | null = null;

    constructor(camera: THREE.Camera) {
        this.camera = camera;
        this.raycaster = new THREE.Raycaster();
    }

    /**
     * Add a hotspot to manage
     */
    public addHotspot(hotspot: ShopHotspot): void {
        this.hotspots.push(hotspot);
    }

    /**
     * Get all hotspot groups for adding to scene
     */
    public getHotspotGroups(): THREE.Group[] {
        return this.hotspots.map(h => h.group);
    }

    /**
     * Check which hotspot is hovered at the given mouse coordinates
     * Returns the hovered hotspot or null
     */
    public checkHover(mouse: THREE.Vector2): ShopHotspot | null {
        // Update raycaster
        this.raycaster.setFromCamera(mouse, this.camera);

        // Get all hotspot meshes
        const hotspotMeshes = this.hotspots.map(h => h.getMesh());

        // Check intersections
        const intersects = this.raycaster.intersectObjects(hotspotMeshes);

        if (intersects.length > 0) {
            // Find which hotspot was hit
            const hitMesh = intersects[0].object as THREE.Mesh;
            const hotspot = this.hotspots.find(h => h.getMesh() === hitMesh);

            if (hotspot && hotspot !== this.currentHovered) {
                // Clear previous hover
                if (this.currentHovered) {
                    this.currentHovered.onHoverExit();
                }

                // Set new hover
                this.currentHovered = hotspot;
                this.currentHovered.onHoverEnter();
            }

            return this.currentHovered;
        } else {
            // No intersection - clear hover
            if (this.currentHovered) {
                this.currentHovered.onHoverExit();
                this.currentHovered = null;
            }
            return null;
        }
    }

    /**
     * Check which hotspot is clicked at the given mouse coordinates
     * Returns the clicked hotspot's category or null
     */
    public checkClick(mouse: THREE.Vector2): ShopCategory | null {
        // Update raycaster
        this.raycaster.setFromCamera(mouse, this.camera);

        // Get all hotspot meshes
        const hotspotMeshes = this.hotspots.map(h => h.getMesh());

        // Check intersections
        const intersects = this.raycaster.intersectObjects(hotspotMeshes);

        if (intersects.length > 0) {
            // Find which hotspot was hit
            const hitMesh = intersects[0].object as THREE.Mesh;
            const hotspot = this.hotspots.find(h => h.getMesh() === hitMesh);

            if (hotspot) {
                console.log('🔥 Hotspot clicked:', hotspot.category);
                return hotspot.category;
            }
        }

        return null;
    }

    /**
     * Update all hotspots
     */
    public update(deltaTime: number): void {
        this.hotspots.forEach(hotspot => hotspot.update(deltaTime));
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        // Clear hover state
        if (this.currentHovered) {
            this.currentHovered.onHoverExit();
            this.currentHovered = null;
        }

        this.hotspots.forEach(hotspot => hotspot.dispose());
        this.hotspots = [];
    }
}

