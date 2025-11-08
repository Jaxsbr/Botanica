/**
 * PlantLifecycle - Tracks plant growth through lifecycle stages
 * 
 * Manages growth progression from seed to fruiting based on:
 * - Time elapsed
 * - Soil nutrients (NPK)
 * - Water availability
 * - Plant species/type
 */

import { TimeManager } from './TimeManager';
import type { Soil } from './Soil';

export enum LifecycleStage {
    SEED = 'seed',           // Tiny sprout breaking soil surface
    SPROUT = 'sprout',       // First leaves visible, very small
    SEEDLING = 'seedling',   // Young plant, establishing structure
    YOUNG = 'young',         // Adolescent plant, gaining height/branches
    MATURE = 'mature',       // Full size, ready to fruit
    FRUITING = 'fruiting'    // Producing harvestable fruit
}

export interface LifecycleConfig {
    plantType: string;          // e.g., 'avocado', 'fern'
    baseGrowthRate: number;     // Base rate (1.0 = standard)
    stageGrowthPoints: Map<LifecycleStage, number>; // Points needed per stage
}

export interface LifecycleState {
    stage: LifecycleStage;
    growthProgress: number;     // 0-100% within current stage
    totalGrowthPoints: number;  // Accumulated growth points
    health: number;             // 0-100% (affects growth rate)
    daysAlive: number;          // Track time for display
}

export interface LifecycleSaveData {
    stage: LifecycleStage;
    totalGrowthPoints: number;
    health: number;
    daysAlive: number;
}

export class PlantLifecycle {
    private config: LifecycleConfig;
    private state: LifecycleState;
    private soil: Soil;
    private timeManager: TimeManager;
    private stageOrder: LifecycleStage[] = [
        LifecycleStage.SEED,
        LifecycleStage.SPROUT,
        LifecycleStage.SEEDLING,
        LifecycleStage.YOUNG,
        LifecycleStage.MATURE,
        LifecycleStage.FRUITING
    ];
    private onStageChange?: (stage: LifecycleStage) => void;

    constructor(config: LifecycleConfig, soil: Soil, initialStage: LifecycleStage = LifecycleStage.SEED) {
        this.config = config;
        this.soil = soil;
        this.timeManager = TimeManager.getInstance();

        this.state = {
            stage: initialStage,
            growthProgress: 0,
            totalGrowthPoints: 0,
            health: 100,
            daysAlive: 0
        };
    }

    /**
     * Update plant growth
     * @param deltaTime - Time since last update in seconds (before time multiplier)
     */
    public update(deltaTime: number): void {
        // Apply time multiplier
        const adjustedDelta = this.timeManager.applyMultiplier(deltaTime);

        if (adjustedDelta === 0) return; // Paused

        // Update plant health gradually towards target based on soil state
        this.updateHealth(adjustedDelta);

        // Calculate growth rate based on conditions
        const growthRate = this.calculateGrowthRate();

        // Accumulate growth points (1 point per second at 1.0 growth rate)
        const growthPoints = growthRate * adjustedDelta;
        this.state.totalGrowthPoints += growthPoints;

        // Consume nutrients proportional to growth
        if (growthPoints > 0) {
            const nutrientUse = growthPoints * 0.0015; // Gentle consumption per second
            this.soil.consumeNPK(nutrientUse * 1.2, nutrientUse, nutrientUse * 0.8);
        }

        // Track days alive (for display)
        const secondsPerDay = 86400; // Real-world seconds
        this.state.daysAlive += adjustedDelta / secondsPerDay;

        // Check if we should advance to next stage
        this.checkStageTransition();

        // Update growth progress within current stage
        this.updateGrowthProgress();
    }

    /**
     * Calculate growth rate based on soil conditions and health
     */
    private calculateGrowthRate(): number {
        const soilStats = this.soil.getStats();

        // Base rate from config
        let rate = this.config.baseGrowthRate;

        // Nutrient multiplier (0.5 - 1.5 based on NPK levels)
        // Ideal NPK is 60-80 for balanced growth
        const avgNPK = (soilStats.nitrogen + soilStats.phosphorus + soilStats.potassium) / 3;
        const nutrientMultiplier = 0.5 + (avgNPK / 100); // 0.5 at 0%, 1.5 at 100%
        rate *= nutrientMultiplier;

        // Water multiplier (0.0 - 1.0 based on water availability)
        // Ideal water is 40-80%
        const waterLevel = soilStats.waterLevel;
        let waterMultiplier = 0;

        if (waterLevel < 20) {
            // Drought stress - minimal growth
            waterMultiplier = waterLevel / 20; // 0.0 - 1.0
        } else if (waterLevel < 40) {
            // Low water - reduced growth
            waterMultiplier = 0.5 + ((waterLevel - 20) / 40); // 0.5 - 1.0
        } else if (waterLevel <= 80) {
            // Optimal water - full growth
            waterMultiplier = 1.0;
        } else {
            // Overwatering - slightly reduced
            waterMultiplier = 1.0 - ((waterLevel - 80) / 40); // 1.0 - 0.5
        }

        rate *= waterMultiplier;

        // Health multiplier (affects everything)
        rate *= (this.state.health / 100);

        return Math.max(0, rate);
    }

    /**
     * Check if plant should transition to next stage
     */
    private checkStageTransition(): void {
        const currentStageIndex = this.stageOrder.indexOf(this.state.stage);
        if (currentStageIndex >= this.stageOrder.length - 1) {
            // Already at final stage
            return;
        }

        const threshold = this.getCumulativePoints(this.state.stage);

        if (this.state.totalGrowthPoints >= threshold) {
            // Advance to next stage
            const nextStage = this.stageOrder[currentStageIndex + 1];
            this.state.stage = nextStage;
            console.log(`🌱 Plant grew to ${nextStage} stage!`);
            if (this.onStageChange) {
                this.onStageChange(nextStage);
            }
        }
    }

    /**
     * Update growth progress percentage within current stage
     */
    private updateGrowthProgress(): void {
        const currentStageIndex = this.stageOrder.indexOf(this.state.stage);

        // Calculate points accumulated before current stage
        const pointsBeforeStage = this.getPointsBeforeStage(currentStageIndex);

        // Calculate progress within current stage
        const pointsInCurrentStage = Math.max(0, this.state.totalGrowthPoints - pointsBeforeStage);
        const pointsNeededForStage = this.config.stageGrowthPoints.get(this.state.stage) || 100;

        if (pointsNeededForStage <= 0) {
            this.state.growthProgress = 100;
            return;
        }

        this.state.growthProgress = Math.min(100, (pointsInCurrentStage / pointsNeededForStage) * 100);
    }

    /**
     * Get current lifecycle state
     */
    public getState(): LifecycleState {
        return { ...this.state };
    }

    /**
     * Get current stage
     */
    public getStage(): LifecycleStage {
        return this.state.stage;
    }

    /**
     * Get growth progress within current stage (0-100%)
     */
    public getGrowthProgress(): number {
        return this.state.growthProgress;
    }

    /**
     * Get health (0-100%)
     */
    public getHealth(): number {
        return this.state.health;
    }

    /**
     * Set health (used for damage/stress)
     */
    public setHealth(health: number): void {
        this.state.health = Math.max(0, Math.min(100, health));
    }

    /**
     * Get days alive (for display)
     */
    public getDaysAlive(): number {
        return this.state.daysAlive;
    }

    /**
     * Check if plant is in fruiting stage
     */
    public isFruiting(): boolean {
        return this.state.stage === LifecycleStage.FRUITING;
    }

    /**
     * Check if plant is mature or fruiting
     */
    public isMature(): boolean {
        return this.state.stage === LifecycleStage.MATURE || this.state.stage === LifecycleStage.FRUITING;
    }

    /**
     * Register a callback that fires when the stage changes
     */
    public setStageChangeHandler(handler: (stage: LifecycleStage) => void): void {
        this.onStageChange = handler;
    }

    /**
     * Serialize lifecycle state for saving
     */
    public serialize(): LifecycleSaveData {
        return {
            stage: this.state.stage,
            totalGrowthPoints: this.state.totalGrowthPoints,
            health: this.state.health,
            daysAlive: this.state.daysAlive
        };
    }

    /**
     * Restore lifecycle state from saved data
     */
    public static fromSerialized(config: LifecycleConfig, soil: Soil, data: LifecycleSaveData): PlantLifecycle {
        const lifecycle = new PlantLifecycle(config, soil, data.stage);
        lifecycle.state = {
            stage: data.stage,
            growthProgress: lifecycle.state.growthProgress, // will be recalculated below
            totalGrowthPoints: data.totalGrowthPoints,
            health: data.health,
            daysAlive: data.daysAlive
        };
        lifecycle.updateGrowthProgress();
        return lifecycle;
    }

    private updateHealth(adjustedDelta: number): void {
        const soilStats = this.soil.getStats();
        let targetHealth = 100;

        // Penalize for low nutrients
        const avgNPK = (soilStats.nitrogen + soilStats.phosphorus + soilStats.potassium) / 3;
        if (avgNPK < 15) {
            targetHealth = 40;
        } else if (avgNPK < 35) {
            targetHealth = 70;
        }

        // Penalize for water extremes
        if (soilStats.waterLevel < 15) {
            targetHealth = Math.min(targetHealth, 45);
        } else if (soilStats.waterLevel < 30) {
            targetHealth = Math.min(targetHealth, 70);
        }

        const drainThreshold = soilStats.maxWater * 0.95;
        if (soilStats.waterLevel > drainThreshold) {
            targetHealth = Math.min(targetHealth, 65);
        }

        const delta = targetHealth - this.state.health;
        if (Math.abs(delta) < 0.01) {
            return;
        }

        // Smoothly move health towards target
        const changeRate = adjustedDelta * 1; // 1 health per in-game second
        if (delta > 0) {
            this.state.health = Math.min(100, this.state.health + Math.min(changeRate, delta));
        } else {
            this.state.health = Math.max(0, this.state.health - Math.min(changeRate, -delta));
        }
    }

    private getPointsBeforeStage(stageIndex: number): number {
        let total = 0;
        for (let i = 0; i < stageIndex; i++) {
            const stage = this.stageOrder[i];
            total += this.config.stageGrowthPoints.get(stage) ?? 0;
        }
        return total;
    }

    private getCumulativePoints(stage: LifecycleStage): number {
        let total = 0;
        for (const s of this.stageOrder) {
            total += this.config.stageGrowthPoints.get(s) ?? 0;
            if (s === stage) {
                break;
            }
        }
        return total;
    }
}

/**
 * Default lifecycle configurations for different plant types
 */
export const DEFAULT_LIFECYCLE_CONFIGS: Map<string, LifecycleConfig> = new Map([
    ['avocado', {
        plantType: 'avocado',
        baseGrowthRate: 1.0,
        stageGrowthPoints: new Map([
            [LifecycleStage.SEED, 100],      // ~100 seconds at optimal conditions
            [LifecycleStage.SPROUT, 200],    // +200 seconds
            [LifecycleStage.SEEDLING, 300],  // +300 seconds
            [LifecycleStage.YOUNG, 500],     // +500 seconds
            [LifecycleStage.MATURE, 800],    // +800 seconds
            [LifecycleStage.FRUITING, 0]     // Final stage
        ])
    }],
    ['fern', {
        plantType: 'fern',
        baseGrowthRate: 1.2, // Faster growing
        stageGrowthPoints: new Map([
            [LifecycleStage.SEED, 80],
            [LifecycleStage.SPROUT, 150],
            [LifecycleStage.SEEDLING, 250],
            [LifecycleStage.YOUNG, 400],
            [LifecycleStage.MATURE, 600],
            [LifecycleStage.FRUITING, 0] // Ferns don't fruit
        ])
    }],
    ['bush', {
        plantType: 'bush',
        baseGrowthRate: 0.9,
        stageGrowthPoints: new Map([
            [LifecycleStage.SEED, 90],
            [LifecycleStage.SPROUT, 180],
            [LifecycleStage.SEEDLING, 320],
            [LifecycleStage.YOUNG, 520],
            [LifecycleStage.MATURE, 780],
            [LifecycleStage.FRUITING, 0]
        ])
    }]
]);


