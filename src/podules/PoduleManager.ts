import * as THREE from 'three';
import { BasePodule } from './BasePodule';
import type { PoduleType } from '../types';

/**
 * PoduleManager - Manages multiple podules and handles switching between them
 * 
 * Ensures only one podule is active at a time for optimal performance.
 * Handles adding/removing podule groups from the scene during transitions.
 */
export class PoduleManager {
    private podules: Map<PoduleType, BasePodule>;
    private currentPodule: BasePodule | null = null;
    private scene: THREE.Scene;
    private transitionCallback?: (fromType: PoduleType | null, toType: PoduleType) => void;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.podules = new Map();
    }

    /**
     * Register a podule with the manager
     */
    public addPodule(podule: BasePodule): void {
        this.podules.set(podule.type, podule);
    }

    /**
     * Set callback function to be called during podule transitions
     * Useful for triggering fade effects or other transition animations
     */
    public setTransitionCallback(callback: (fromType: PoduleType | null, toType: PoduleType) => void): void {
        this.transitionCallback = callback;
    }

    /**
     * Switch to a different podule
     */
    public switchToPodule(type: PoduleType): void {
        const targetPodule = this.podules.get(type);
        if (!targetPodule) {
            console.error(`Podule type '${type}' not found`);
            return;
        }

        // Don't switch if already active
        if (this.currentPodule === targetPodule) {
            return;
        }

        const fromType = this.currentPodule?.type ?? null;

        // Trigger transition callback
        if (this.transitionCallback) {
            this.transitionCallback(fromType, type);
        }

        // Deactivate current podule and remove from scene
        if (this.currentPodule) {
            this.currentPodule.deactivate();
            this.scene.remove(this.currentPodule.group);
        }

        // Activate new podule and add to scene
        this.currentPodule = targetPodule;
        this.scene.add(this.currentPodule.group);
        this.currentPodule.activate();
    }

    /**
     * Get the currently active podule
     */
    public getCurrentPodule(): BasePodule | null {
        return this.currentPodule;
    }

    /**
     * Get a specific podule by type
     */
    public getPodule(type: PoduleType): BasePodule | undefined {
        return this.podules.get(type);
    }

    /**
     * Update the active podule (call this in your animation loop)
     */
    public update(deltaTime: number): void {
        if (this.currentPodule && this.currentPodule.isActive) {
            this.currentPodule.update(deltaTime);
        }
    }

    /**
     * Clean up all podules
     */
    public dispose(): void {
        this.podules.forEach(podule => {
            if (podule.isActive) {
                this.scene.remove(podule.group);
            }
            podule.dispose();
        });
        this.podules.clear();
        this.currentPodule = null;
    }
}

