/**
 * Soil - Soil chemistry and water management system
 * 
 * Tracks NPK nutrients, pH, drainage, and water levels for individual pots.
 * Water depletes over time based on drainage type.
 * NPK nutrients are consumed by growing plants.
 */

import { TimeManager } from './TimeManager';
import type { DrainageType, SoilStats, SoilSaveData } from '../types';

export class Soil {
    // NPK nutrients (consumed by growing plants)
    private nitrogen: number = 50;      // 0-100
    private phosphorus: number = 50;    // 0-100
    private potassium: number = 50;     // 0-100

    // pH level (can be adjusted with lime/sulfur)
    private pH: number = 7.0;          // 4.0-9.0 scale

    // Drainage type affects water capacity and depletion rate
    private drainage: DrainageType = 'medium';

    // Water level (depletes over time)
    private waterLevel: number = 80;   // 0-100%
    private maxWater: number = 100;    // Based on drainage type
    private lastWateredTime: number = Date.now(); // Track when last watered

    // Time manager for realistic depletion rates
    private timeManager: TimeManager;

    // Water depletion rates per second (converted from per minute)
    private readonly DEPLETION_RATES = {
        poor: 2 / 60,     // 2% per minute = 0.033% per second
        medium: 5 / 60,   // 5% per minute = 0.083% per second
        good: 8 / 60      // 8% per minute = 0.133% per second
    };

    // Visual offset for misleading soil appearance based on drainage
    private readonly VISUAL_OFFSETS = {
        poor: 15,    // Surface stays wet - looks wetter than actual
        medium: 0,   // Accurate representation
        good: -15    // Surface dries fast - looks drier than actual
    };

    // Water color mapping based on moisture level
    private readonly WATER_COLORS = {
        dry: 0xA0826D,        // 0-20% - Light brown
        low: 0x8B6F47,        // 20-40% - Medium brown
        medium: 0x6B5638,     // 40-70% - Brown
        wet: 0x4A3C28         // 70-100% - Dark brown
    };

    constructor(drainage: DrainageType = 'medium') {
        this.drainage = drainage;
        this.timeManager = TimeManager.getInstance();
        this.updateMaxWater();
    }

    /**
     * Update max water capacity based on drainage type
     * Poor drainage = higher retention (120%)
     * Medium drainage = standard (100%)
     * Good drainage = lower retention (80%)
     */
    private updateMaxWater(): void {
        switch (this.drainage) {
            case 'poor':
                this.maxWater = 120;
                break;
            case 'medium':
                this.maxWater = 100;
                break;
            case 'good':
                this.maxWater = 80;
                break;
        }
    }

    /**
     * Add water to soil (from watering action)
     */
    public water(amount: number): void {
        this.waterLevel = Math.min(this.waterLevel + amount, this.maxWater);
        this.lastWateredTime = Date.now();
        console.log(`💧 Watered soil: ${this.waterLevel.toFixed(1)}% (max: ${this.maxWater}%)`);
    }

    /**
     * Update soil state - depletes water over time
     * @param deltaTime - Time since last update in seconds (before time multiplier)
     */
    public update(deltaTime: number): void {
        // Apply time multiplier
        const adjustedDelta = this.timeManager.applyMultiplier(deltaTime);

        // Deplete water based on drainage type
        const depletionRate = this.DEPLETION_RATES[this.drainage];
        const depletion = depletionRate * adjustedDelta;
        this.waterLevel = Math.max(0, this.waterLevel - depletion);
    }

    /**
     * Get soil color based on water level for visual feedback
     * This is the ACTUAL water level (used internally)
     */
    public getWaterColor(): number {
        if (this.waterLevel <= 20) {
            return this.WATER_COLORS.dry;
        } else if (this.waterLevel <= 40) {
            return this.WATER_COLORS.low;
        } else if (this.waterLevel <= 70) {
            return this.WATER_COLORS.medium;
        } else {
            return this.WATER_COLORS.wet;
        }
    }

    /**
     * Get VISUAL soil color with drainage-based deception
     * This is what players SEE (misleading based on drainage type)
     * 
     * Poor drainage: Surface stays wet (+15% visual)
     * Medium drainage: Accurate (0% offset)
     * Good drainage: Surface dries fast (-15% visual)
     */
    public getVisualWaterColor(): number {
        const offset = this.VISUAL_OFFSETS[this.drainage];
        const visualLevel = this.waterLevel + offset;

        if (visualLevel <= 20) {
            return this.WATER_COLORS.dry;
        } else if (visualLevel <= 40) {
            return this.WATER_COLORS.low;
        } else if (visualLevel <= 70) {
            return this.WATER_COLORS.medium;
        } else {
            return this.WATER_COLORS.wet;
        }
    }

    /**
     * Get time since last watered (for display when no moisture meter)
     */
    public getTimeSinceWatered(): string {
        const ms = Date.now() - this.lastWateredTime;
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(ms / 3600000);
        const days = Math.floor(ms / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    /**
     * Get last watered timestamp
     */
    public getLastWateredTime(): number {
        return this.lastWateredTime;
    }

    /**
     * Get formatted soil statistics for UI display
     */
    public getStats(): SoilStats {
        return {
            nitrogen: this.nitrogen,
            phosphorus: this.phosphorus,
            potassium: this.potassium,
            pH: this.pH,
            drainage: this.drainage,
            waterLevel: this.waterLevel,
            maxWater: this.maxWater
        };
    }

    /**
     * Set NPK values (for fertilizer application in future phases)
     */
    public setNPK(n: number, p: number, k: number): void {
        this.nitrogen = Math.max(0, Math.min(100, n));
        this.phosphorus = Math.max(0, Math.min(100, p));
        this.potassium = Math.max(0, Math.min(100, k));
    }

    /**
     * Set pH value (for lime/sulfur application in future phases)
     */
    public setPH(value: number): void {
        this.pH = Math.max(4.0, Math.min(9.0, value));
    }

    /**
     * Set drainage type
     */
    public setDrainage(type: DrainageType): void {
        this.drainage = type;
        this.updateMaxWater();
    }

    /**
     * Consume NPK nutrients (called by growing plants)
     * @param n - Nitrogen to consume (0-100)
     * @param p - Phosphorus to consume (0-100)
     * @param k - Potassium to consume (0-100)
     */
    public consumeNPK(n: number, p: number, k: number): void {
        this.nitrogen = Math.max(0, this.nitrogen - n);
        this.phosphorus = Math.max(0, this.phosphorus - p);
        this.potassium = Math.max(0, this.potassium - k);
    }

    /**
     * Add NPK nutrients (from fertilizer application)
     * @param n - Nitrogen to add (0-100)
     * @param p - Phosphorus to add (0-100)
     * @param k - Potassium to add (0-100)
     */
    public addNPK(n: number, p: number, k: number): void {
        this.nitrogen = Math.min(100, this.nitrogen + n);
        this.phosphorus = Math.min(100, this.phosphorus + p);
        this.potassium = Math.min(100, this.potassium + k);
    }

    /**
     * Serialize soil state for saving
     */
    public serialize(): SoilSaveData {
        return {
            nitrogen: this.nitrogen,
            phosphorus: this.phosphorus,
            potassium: this.potassium,
            pH: this.pH,
            drainage: this.drainage,
            waterLevel: this.waterLevel,
            lastWateredTime: this.lastWateredTime
        };
    }

    /**
     * Deserialize soil state from saved data
     */
    public static deserialize(data: SoilSaveData): Soil {
        const soil = new Soil(data.drainage);
        soil.nitrogen = data.nitrogen;
        soil.phosphorus = data.phosphorus;
        soil.potassium = data.potassium;
        soil.pH = data.pH;
        soil.waterLevel = data.waterLevel;
        soil.lastWateredTime = data.lastWateredTime || Date.now();
        return soil;
    }
}

