/**
 * Economy - Core money tracking system for Botanica
 * 
 * Manages player's money balance with persistence and event notifications.
 * Handles earning, spending, and validation of transactions.
 */

interface EconomySaveData {
    money: number;
    lastSaved: number;
}

type MoneyChangeCallback = (money: number) => void;

export class Economy {
    private money: number = 100; // Starting balance
    private listeners: Set<MoneyChangeCallback> = new Set();
    private readonly STORAGE_KEY = 'botanica_economy';

    constructor() {
        this.load();
    }

    /**
     * Get current money balance
     */
    public getMoney(): number {
        return this.money;
    }

    /**
     * Check if player can afford a purchase
     */
    public canAfford(amount: number): boolean {
        return this.money >= amount;
    }

    /**
     * Spend money (deduct from balance)
     * Returns false if insufficient funds
     */
    public spend(amount: number): boolean {
        if (amount < 0) {
            console.warn('Cannot spend negative amount');
            return false;
        }

        if (!this.canAfford(amount)) {
            console.warn(`Insufficient funds: need $${amount}, have $${this.money}`);
            return false;
        }

        this.money -= amount;
        this.notifyListeners();
        this.save();
        return true;
    }

    /**
     * Earn money (add to balance)
     */
    public earn(amount: number): void {
        if (amount < 0) {
            console.warn('Cannot earn negative amount');
            return;
        }

        this.money += amount;
        this.notifyListeners();
        this.save();
    }

    /**
     * Subscribe to money change events
     */
    public subscribe(callback: MoneyChangeCallback): void {
        this.listeners.add(callback);
        // Immediately notify new listener of current state
        callback(this.money);
    }

    /**
     * Unsubscribe from money change events
     */
    public unsubscribe(callback: MoneyChangeCallback): void {
        this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of money change
     */
    private notifyListeners(): void {
        this.listeners.forEach(callback => callback(this.money));
    }

    /**
     * Save economy state to localStorage
     */
    private save(): void {
        const saveData: EconomySaveData = {
            money: this.money,
            lastSaved: Date.now()
        };

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saveData));
        } catch (error) {
            console.error('Failed to save economy state:', error);
        }
    }

    /**
     * Load economy state from localStorage
     */
    private load(): void {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const saveData: EconomySaveData = JSON.parse(saved);
                this.money = saveData.money;
                console.log(`💰 Economy loaded: $${this.money} (saved ${new Date(saveData.lastSaved).toLocaleString()})`);
            } else {
                console.log(`💰 New economy started with $${this.money}`);
            }
        } catch (error) {
            console.error('Failed to load economy state:', error);
            console.log(`💰 Using default balance: $${this.money}`);
        }
    }

    /**
     * Reset economy to starting state
     */
    public reset(): void {
        this.money = 100;
        this.notifyListeners();
        this.save();
        console.log('💰 Economy reset to $100');
    }
}

