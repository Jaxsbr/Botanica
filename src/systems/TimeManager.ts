/**
 * TimeManager - Global time control singleton
 * 
 * Manages game time speed (pause, 1x, 5x, 10x).
 * All time-based systems (plant growth, water depletion, NPK consumption)
 * should query this manager for the current time multiplier.
 */

export enum TimeSpeed {
    PAUSED = 0,
    NORMAL = 1,
    FAST = 5,
    TURBO = 10
}

type TimeSpeedCallback = (speed: TimeSpeed, multiplier: number) => void;

export class TimeManager {
    private static instance: TimeManager;
    private currentSpeed: TimeSpeed = TimeSpeed.NORMAL;
    private listeners: Set<TimeSpeedCallback> = new Set();
    private readonly STORAGE_KEY = 'botanica_time_speed';

    private constructor() {
        this.load();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): TimeManager {
        if (!TimeManager.instance) {
            TimeManager.instance = new TimeManager();
        }
        return TimeManager.instance;
    }

    /**
     * Get current time speed
     */
    public getSpeed(): TimeSpeed {
        return this.currentSpeed;
    }

    /**
     * Get time multiplier (0 = paused, 1 = normal, 5 = fast, 10 = turbo)
     */
    public getMultiplier(): number {
        return this.currentSpeed;
    }

    /**
     * Set time speed
     */
    public setSpeed(speed: TimeSpeed): void {
        if (this.currentSpeed !== speed) {
            this.currentSpeed = speed;
            this.notifyListeners();
            this.save();

            const speedName = TimeSpeed[speed];
            console.log(`⏱️ Time speed set to: ${speedName} (${speed}x)`);
        }
    }

    /**
     * Cycle to next time speed (NORMAL → FAST → TURBO → PAUSED → NORMAL)
     */
    public cycleSpeed(): void {
        const speeds = [TimeSpeed.NORMAL, TimeSpeed.FAST, TimeSpeed.TURBO, TimeSpeed.PAUSED];
        const currentIndex = speeds.indexOf(this.currentSpeed);
        const nextIndex = (currentIndex + 1) % speeds.length;
        this.setSpeed(speeds[nextIndex]);
    }

    /**
     * Pause time
     */
    public pause(): void {
        this.setSpeed(TimeSpeed.PAUSED);
    }

    /**
     * Resume time (set to normal)
     */
    public resume(): void {
        this.setSpeed(TimeSpeed.NORMAL);
    }

    /**
     * Check if time is paused
     */
    public isPaused(): boolean {
        return this.currentSpeed === TimeSpeed.PAUSED;
    }

    /**
     * Apply time multiplier to a delta time value
     * Use this in update loops: adjustedDelta = timeManager.applyMultiplier(deltaTime)
     */
    public applyMultiplier(deltaTime: number): number {
        return deltaTime * this.currentSpeed;
    }

    /**
     * Subscribe to time speed changes
     */
    public subscribe(callback: TimeSpeedCallback): void {
        this.listeners.add(callback);
        // Immediately notify new listener of current state
        callback(this.currentSpeed, this.currentSpeed);
    }

    /**
     * Unsubscribe from time speed changes
     */
    public unsubscribe(callback: TimeSpeedCallback): void {
        this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of speed changes
     */
    private notifyListeners(): void {
        this.listeners.forEach(callback => {
            callback(this.currentSpeed, this.currentSpeed);
        });
    }

    /**
     * Save time speed preference to localStorage
     */
    private save(): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                speed: this.currentSpeed,
                lastSaved: Date.now()
            }));
        } catch (error) {
            console.error('Failed to save time speed:', error);
        }
    }

    /**
     * Load time speed preference from localStorage
     */
    private load(): void {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                this.currentSpeed = data.speed || TimeSpeed.NORMAL;
                console.log(`⏱️ Time speed loaded: ${TimeSpeed[this.currentSpeed]} (${this.currentSpeed}x)`);
            } else {
                console.log('⏱️ Time speed defaulted to NORMAL (1x)');
            }
        } catch (error) {
            console.error('Failed to load time speed:', error);
            this.currentSpeed = TimeSpeed.NORMAL;
        }
    }

    /**
     * Reset time speed to normal (for testing)
     */
    public reset(): void {
        this.setSpeed(TimeSpeed.NORMAL);
        console.log('⏱️ Time speed reset to NORMAL');
    }
}


