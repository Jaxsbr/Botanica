import * as THREE from 'three';
import { ShopHotspot } from './Hotspot';
import type { ShopCategory } from '../types';

/**
 * HotspotManager - Manages all shop hotspots and handles interaction
 * 
 * Handles raycasting for mouse hover/click detection and coordinates
 * between multiple hotspots in the shop scene.
 */
export class HotspotManager {
    private hotspots: ShopHotspot[] = [];
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    private camera: THREE.Camera;
    private currentHovered: ShopHotspot | null = null;
    private clickCallback?: (category: ShopCategory) => void;
    private mouseDownPos: { x: number; y: number } | null = null;
    private enabled: boolean = true;

    constructor(camera: THREE.Camera) {
        this.camera = camera;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Add a hotspot to manage
     */
    public addHotspot(hotspot: ShopHotspot): void {
        this.hotspots.push(hotspot);

        // If callback is already set, apply it to this new hotspot
        if (this.clickCallback) {
            hotspot.onClick(this.clickCallback);
        }
    }

    /**
     * Get all hotspot groups for adding to scene
     */
    public getHotspotGroups(): THREE.Group[] {
        return this.hotspots.map(h => h.group);
    }

    /**
     * Set the callback for when a hotspot is clicked
     */
    public onClick(callback: (category: ShopCategory) => void): void {
        this.clickCallback = callback;
        // Also set on individual hotspots
        this.hotspots.forEach(hotspot => {
            hotspot.onClick(callback);
        });
    }

    /**
     * Enable or disable hotspot interaction
     * (Used to prevent clicking through shop overlay)
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;

        // Clear hover state when disabling
        if (!enabled && this.currentHovered) {
            this.currentHovered.onHoverExit();
            this.currentHovered = null;
            document.body.style.cursor = 'default';
        }
    }

    /**
     * Set up mouse event listeners
     */
    private setupEventListeners(): void {
        // Mouse move for hover detection
        window.addEventListener('mousemove', (event) => {
            // Normalize mouse coordinates (-1 to +1)
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.updateHover();

            // Change cursor on hover
            if (this.currentHovered) {
                document.body.style.cursor = 'pointer';
            } else {
                document.body.style.cursor = 'default';
            }
        });

        // Track mouse down position to differentiate click from drag
        window.addEventListener('mousedown', (event) => {
            this.mouseDownPos = { x: event.clientX, y: event.clientY };
        });

        // Only trigger click if mouse hasn't moved much (not a drag)
        window.addEventListener('mouseup', (event) => {
            if (!this.mouseDownPos) return;

            // Skip if disabled
            if (!this.enabled) {
                this.mouseDownPos = null;
                return;
            }

            // Calculate distance moved
            const dx = event.clientX - this.mouseDownPos.x;
            const dy = event.clientY - this.mouseDownPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // If moved less than 5 pixels, treat as click (not drag)
            if (distance < 5 && this.currentHovered) {
                console.log('🔥 Hotspot clicked:', this.currentHovered.category);
                this.currentHovered.handleClick();
            }

            this.mouseDownPos = null;
        });
    }

    /**
     * Update hover state based on raycasting
     */
    private updateHover(): void {
        // Skip if disabled
        if (!this.enabled) {
            return;
        }

        // Update raycaster
        this.raycaster.setFromCamera(this.mouse, this.camera);

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
        } else {
            // No intersection - clear hover
            if (this.currentHovered) {
                this.currentHovered.onHoverExit();
                this.currentHovered = null;
            }
        }
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
        this.hotspots.forEach(hotspot => hotspot.dispose());
        this.hotspots = [];

        // Remove event listeners
        window.removeEventListener('mousemove', this.updateHover);
        window.removeEventListener('click', () => { });
    }
}

