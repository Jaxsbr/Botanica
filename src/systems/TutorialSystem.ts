/**
 * TutorialSystem - Manages tutorial state and progression
 * 
 * Tracks tutorial completion and current step.
 * Persists state to localStorage so returning players skip the tutorial.
 */

export enum TutorialStep {
    WELCOME = 'welcome',
    PLACE_POT = 'place_pot',
    ADD_SOIL = 'add_soil',
    PLANT_SEED = 'plant_seed',
    COMPLETE = 'complete'
}

interface TutorialState {
    completed: boolean;
    currentStep: TutorialStep;
    lastUpdated: number;
}

type TutorialStepCallback = (step: TutorialStep) => void;

export class TutorialSystem {
    private static instance: TutorialSystem;
    private readonly STORAGE_KEY = 'botanica_tutorial_state';

    private state: TutorialState;
    private listeners: Set<TutorialStepCallback> = new Set();

    private constructor() {
        this.state = this.load();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): TutorialSystem {
        if (!TutorialSystem.instance) {
            TutorialSystem.instance = new TutorialSystem();
        }
        return TutorialSystem.instance;
    }

    /**
     * Check if tutorial is completed
     */
    public isCompleted(): boolean {
        return this.state.completed;
    }

    /**
     * Get current tutorial step
     */
    public getCurrentStep(): TutorialStep {
        return this.state.currentStep;
    }

    /**
     * Advance to next tutorial step
     */
    public nextStep(): void {
        const steps = Object.values(TutorialStep);
        const currentIndex = steps.indexOf(this.state.currentStep);

        if (currentIndex < steps.length - 1) {
            this.state.currentStep = steps[currentIndex + 1] as TutorialStep;
            this.state.lastUpdated = Date.now();

            // Mark as completed if we reach the COMPLETE step
            if (this.state.currentStep === TutorialStep.COMPLETE) {
                this.state.completed = true;
                console.log('🎓 Tutorial completed!');
            }

            this.save();
            this.notifyListeners();
        }
    }

    /**
     * Skip tutorial (mark as completed)
     */
    public skip(): void {
        this.state.completed = true;
        this.state.currentStep = TutorialStep.COMPLETE;
        this.state.lastUpdated = Date.now();
        this.save();
        this.notifyListeners();
        console.log('🎓 Tutorial skipped');
    }

    /**
     * Reset tutorial (for testing/debugging)
     */
    public reset(): void {
        this.state = {
            completed: false,
            currentStep: TutorialStep.WELCOME,
            lastUpdated: Date.now()
        };
        this.save();
        this.notifyListeners();
        console.log('🎓 Tutorial reset');
    }

    /**
     * Subscribe to tutorial step changes
     */
    public subscribe(callback: TutorialStepCallback): void {
        this.listeners.add(callback);
        // Immediately notify new listener of current state
        callback(this.state.currentStep);
    }

    /**
     * Unsubscribe from tutorial step changes
     */
    public unsubscribe(callback: TutorialStepCallback): void {
        this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of step changes
     */
    private notifyListeners(): void {
        this.listeners.forEach(callback => callback(this.state.currentStep));
    }

    /**
     * Save tutorial state to localStorage
     */
    private save(): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
        } catch (error) {
            console.error('Failed to save tutorial state:', error);
        }
    }

    /**
     * Load tutorial state from localStorage
     */
    private load(): TutorialState {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const state: TutorialState = JSON.parse(saved);
                console.log(`🎓 Tutorial state loaded: ${state.completed ? 'completed' : `step ${state.currentStep}`}`);
                return state;
            }
        } catch (error) {
            console.error('Failed to load tutorial state:', error);
        }

        // Default state for new players
        console.log('🎓 New player - starting tutorial');
        return {
            completed: false,
            currentStep: TutorialStep.WELCOME,
            lastUpdated: Date.now()
        };
    }
}


