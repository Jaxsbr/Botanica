import { Vector3 } from 'three';
import { GameState, GridPosition, SoilTile, TILE_SPACING } from './GameState';

const ISLAND_BUFFER_ZONE = 2 * TILE_SPACING; // Buffer zone beyond furthest tile
const INITIAL_RADIUS = 8.0;
const MILESTONE_POND = 10;
const MILESTONE_BUTTERFLIES = 25;
const MILESTONE_FARM = 50;

export type MilestoneType = 'pond' | 'butterflies' | 'farm';

export interface MilestoneEvent {
    type: MilestoneType;
    tileCount: number;
}

export type MilestoneCallback = (event: MilestoneEvent) => void;

export class WorldManager {
    private currentRadius: number = INITIAL_RADIUS;
    private targetRadius: number = INITIAL_RADIUS;
    private animationStartTime: number | null = null;
    private animationDuration: number = 800; // ms
    private reachedMilestones: Set<MilestoneType> = new Set();
    private milestoneCallbacks: MilestoneCallback[] = [];

    constructor(private gameState: GameState) {
        this.updateRadius();
    }

    /**
     * Calculate and update the island radius based on current tile positions
     * Call this when tiles are added/removed, not every frame
     */
    public updateRadius(): void {
        if (this.gameState.tiles.size === 0) {
            this.targetRadius = INITIAL_RADIUS;
            if (Math.abs(this.targetRadius - this.currentRadius) > 0.1) {
                this.startRadiusAnimation();
            }
            return;
        }

        const tiles = Array.from(this.gameState.tiles.values());
        let maxDistance = 0;

        for (const tile of tiles) {
            const worldPos = new Vector3(
                tile.gridPosition.x * TILE_SPACING,
                0,
                tile.gridPosition.z * TILE_SPACING
            );
            const distance = worldPos.length();
            maxDistance = Math.max(maxDistance, distance);
        }

        // Add buffer zone and ensure minimum radius
        const calculatedRadius = maxDistance + ISLAND_BUFFER_ZONE;
        const newTargetRadius = Math.max(calculatedRadius, INITIAL_RADIUS);

        // Only update if radius changed significantly
        if (Math.abs(newTargetRadius - this.targetRadius) > 0.1) {
            this.targetRadius = newTargetRadius;
            this.startRadiusAnimation();
        }

        // Check for milestones (only check, don't recalculate radius)
        this.checkMilestones();
    }

    /**
     * Check if a world position is within the playable island radius
     */
    public isWithinRadius(worldPos: Vector3): boolean {
        const distance = new Vector3(worldPos.x, 0, worldPos.z).length();
        return distance <= this.getRadius();
    }

    /**
     * Check if a grid position is within the playable island radius
     */
    public isGridPositionWithinRadius(gridPos: GridPosition): boolean {
        const worldPos = new Vector3(
            gridPos.x * TILE_SPACING,
            0,
            gridPos.z * TILE_SPACING
        );
        return this.isWithinRadius(worldPos);
    }

    /**
     * Get the current island radius (interpolated during animations)
     */
    public getRadius(): number {
        if (this.animationStartTime === null) {
            return this.currentRadius;
        }

        const now = performance.now();
        const elapsed = now - this.animationStartTime;
        const progress = Math.min(elapsed / this.animationDuration, 1);

        // Ease out cubic for smooth expansion
        const eased = 1 - Math.pow(1 - progress, 3);

        const radius = this.currentRadius + (this.targetRadius - this.currentRadius) * eased;

        if (progress >= 1) {
            this.currentRadius = this.targetRadius;
            this.animationStartTime = null;
        }

        return radius;
    }

    /**
     * Get the target radius (final radius after animation completes)
     */
    public getTargetRadius(): number {
        return this.targetRadius;
    }

    /**
     * Check if animation is in progress
     */
    public isAnimating(): boolean {
        return this.animationStartTime !== null;
    }

    /**
     * Register a callback for milestone events
     */
    public onMilestoneReached(callback: MilestoneCallback): void {
        this.milestoneCallbacks.push(callback);
    }

    /**
     * Remove a milestone callback
     */
    public removeMilestoneCallback(callback: MilestoneCallback): void {
        const index = this.milestoneCallbacks.indexOf(callback);
        if (index !== -1) {
            this.milestoneCallbacks.splice(index, 1);
        }
    }

    /**
     * Check if a milestone has been reached
     */
    public hasMilestoneReached(milestone: MilestoneType): boolean {
        return this.reachedMilestones.has(milestone);
    }

    /**
     * Get the current tile count
     */
    public getTileCount(): number {
        return this.gameState.tiles.size;
    }

    private startRadiusAnimation(): void {
        if (this.animationStartTime === null) {
            this.currentRadius = this.getRadius(); // Capture current interpolated radius
        }
        this.animationStartTime = performance.now();
    }

    private checkMilestones(): void {
        const tileCount = this.gameState.tiles.size;

        if (tileCount >= MILESTONE_POND && !this.reachedMilestones.has('pond')) {
            this.reachedMilestones.add('pond');
            this.triggerMilestone('pond', MILESTONE_POND);
        }

        if (tileCount >= MILESTONE_BUTTERFLIES && !this.reachedMilestones.has('butterflies')) {
            this.reachedMilestones.add('butterflies');
            this.triggerMilestone('butterflies', MILESTONE_BUTTERFLIES);
        }

        if (tileCount >= MILESTONE_FARM && !this.reachedMilestones.has('farm')) {
            this.reachedMilestones.add('farm');
            this.triggerMilestone('farm', MILESTONE_FARM);
        }
    }

    private triggerMilestone(type: MilestoneType, tileCount: number): void {
        const event: MilestoneEvent = { type, tileCount };
        for (const callback of this.milestoneCallbacks) {
            callback(event);
        }
    }
}

