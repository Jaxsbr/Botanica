/**
 * InputManager - Central input handler for all podules
 * 
 * Owns all global event listeners and routes input to the active podule.
 * Prevents click-through issues by ensuring only the active podule receives events.
 */

import * as THREE from 'three';
import { PoduleManager } from '../podules/PoduleManager';
import type { IClickable } from '../types';

export class InputManager {
    private mouse: THREE.Vector2;
    private mouseDownPos: { x: number; y: number } | null = null;
    private activeOverlays: Set<string> = new Set();
    
    // Bind methods to preserve 'this' context
    private boundMouseMove: (event: MouseEvent) => void;
    private boundMouseDown: (event: MouseEvent) => void;
    private boundMouseUp: (event: MouseEvent) => void;

    constructor(
        private poduleManager: PoduleManager,
        private camera: THREE.Camera
    ) {
        this.mouse = new THREE.Vector2();
        
        // Bind methods
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseDown = this.onMouseDown.bind(this);
        this.boundMouseUp = this.onMouseUp.bind(this);
    }

    /**
     * Initialize input manager and add global event listeners
     */
    public init(): void {
        window.addEventListener('mousemove', this.boundMouseMove);
        window.addEventListener('mousedown', this.boundMouseDown);
        window.addEventListener('mouseup', this.boundMouseUp);
        
        console.log('🎮 InputManager initialized');
    }

    /**
     * Clean up and remove all event listeners
     */
    public dispose(): void {
        window.removeEventListener('mousemove', this.boundMouseMove);
        window.removeEventListener('mousedown', this.boundMouseDown);
        window.removeEventListener('mouseup', this.boundMouseUp);
        
        console.log('🎮 InputManager disposed');
    }

    /**
     * Register an overlay that should block podule input
     * (e.g., inventory modal, shop UI)
     */
    public registerOverlay(id: string): void {
        this.activeOverlays.add(id);
        console.log(`🎮 Overlay registered: ${id}`);
    }

    /**
     * Unregister an overlay
     */
    public unregisterOverlay(id: string): void {
        this.activeOverlays.delete(id);
        console.log(`🎮 Overlay unregistered: ${id}`);
    }

    /**
     * Check if input should be routed to podule
     * Returns false if overlays are active
     */
    private shouldRouteInput(): boolean {
        return this.activeOverlays.size === 0;
    }

    /**
     * Handle mouse move event
     */
    private onMouseMove(event: MouseEvent): void {
        // Normalize mouse coordinates (-1 to +1)
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Route to active podule if no overlays active
        if (this.shouldRouteInput()) {
            const currentPodule = this.poduleManager.getCurrentPodule();
            if (currentPodule && this.isClickable(currentPodule)) {
                currentPodule.handleMouseMove(this.mouse, this.camera);
            } else {
                // Reset cursor if no clickable podule
                document.body.style.cursor = 'default';
            }
        }
    }

    /**
     * Handle mouse down event
     */
    private onMouseDown(event: MouseEvent): void {
        // Track mouse down position to differentiate click from drag
        this.mouseDownPos = { x: event.clientX, y: event.clientY };
    }

    /**
     * Handle mouse up event
     */
    private onMouseUp(event: MouseEvent): void {
        if (!this.mouseDownPos) return;

        // Calculate distance moved
        const dx = event.clientX - this.mouseDownPos.x;
        const dy = event.clientY - this.mouseDownPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If moved less than 5 pixels, treat as click (not drag)
        if (distance < 5 && this.shouldRouteInput()) {
            const currentPodule = this.poduleManager.getCurrentPodule();
            if (currentPodule && this.isClickable(currentPodule)) {
                const handled = currentPodule.handleClick(this.mouse, this.camera);
                if (handled) {
                    console.log('🎮 Click handled by podule:', currentPodule.type);
                }
            }
        }

        this.mouseDownPos = null;
    }

    /**
     * Type guard to check if podule implements IClickable
     */
    private isClickable(podule: any): podule is IClickable {
        return typeof podule.handleClick === 'function' && 
               typeof podule.handleMouseMove === 'function';
    }
}

