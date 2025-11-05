import * as THREE from 'three';
import { PoduleDome } from '../environment/PoduleDome';
import type { PoduleType, PoduleConfig } from '../types';

/**
 * BasePodule - Abstract base class for all podule environments
 * 
 * Each podule is a self-contained game area (home, shop, etc.) that manages
 * its own Three.js objects and update logic. Only the active podule is visible
 * and receives updates for optimal performance.
 */
export abstract class BasePodule {
    public readonly type: PoduleType;
    public readonly group: THREE.Group;
    protected dome: PoduleDome;
    protected config: PoduleConfig;
    protected radius: number;
    private _isActive: boolean = false;

    constructor(type: PoduleType, config: PoduleConfig, radiusOverride?: number) {
        this.type = type;
        this.config = config;
        this.radius = radiusOverride ?? config.radius;
        this.group = new THREE.Group();
        this.dome = new PoduleDome(this.radius);
        this.group.add(this.dome.getMesh());
    }

    /**
     * Check if this podule is currently active
     */
    public get isActive(): boolean {
        return this._isActive;
    }

    /**
     * Called when this podule becomes the active podule
     * Override to handle activation logic (e.g., resume animations)
     */
    public activate(): void {
        this._isActive = true;
        this.onActivate();
    }

    /**
     * Called when this podule is deactivated
     * Override to handle deactivation logic (e.g., pause animations)
     */
    public deactivate(): void {
        this._isActive = false;
        this.onDeactivate();
    }

    /**
     * Update loop - only called when podule is active
     * @param deltaTime - Time elapsed since last frame (for animations)
     */
    public abstract update(deltaTime: number): void;

    /**
     * Clean up resources when podule is destroyed
     */
    public dispose(): void {
        this.dome.dispose();
        this.onDispose();
    }

    /**
     * Override to implement activation logic
     */
    protected abstract onActivate(): void;

    /**
     * Override to implement deactivation logic
     */
    protected abstract onDeactivate(): void;

    /**
     * Override to implement custom disposal logic
     */
    protected abstract onDispose(): void;
}

