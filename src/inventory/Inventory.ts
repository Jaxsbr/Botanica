/**
 * Inventory - Item tracking system for Botanica
 * 
 * Manages player's owned items with mixed ownership model:
 * - Tools/pots: boolean ownership (quantity always 1, max 1 owned)
 * - Consumables (fertilizers/soil): quantity-based (can own multiple)
 * 
 * Persists to localStorage and notifies listeners of changes.
 */

import type { InventoryItem, InventorySaveData, ShopCategory } from '../types';

type InventoryChangeCallback = (items: InventoryItem[]) => void;

export class Inventory {
    private items: Map<string, InventoryItem> = new Map();
    private listeners: Set<InventoryChangeCallback> = new Set();
    private readonly STORAGE_KEY = 'botanica_inventory';

    // Categories that use boolean ownership (quantity always 1)
    private readonly BOOLEAN_CATEGORIES: ShopCategory[] = ['tools', 'pots'];

    constructor() {
        this.load();
    }

    /**
     * Check if item exists in inventory
     */
    public hasItem(itemId: string): boolean {
        return this.items.has(itemId);
    }

    /**
     * Get quantity of specific item (0 if not owned)
     */
    public getQuantity(itemId: string): number {
        const item = this.items.get(itemId);
        return item ? item.quantity : 0;
    }

    /**
     * Add item to inventory
     * For tools/pots: quantity is capped at 1
     * For consumables: quantity is added to existing amount
     */
    public addItem(itemId: string, category: ShopCategory, quantity: number = 1): void {
        if (quantity <= 0) {
            console.warn('Cannot add non-positive quantity');
            return;
        }

        const isBooleanCategory = this.BOOLEAN_CATEGORIES.includes(category);
        const existing = this.items.get(itemId);

        if (existing) {
            // Item already exists
            if (isBooleanCategory) {
                // Tools/pots - don't increase quantity
                console.log(`Item ${itemId} already owned (boolean category)`);
                return;
            } else {
                // Consumables - add to existing quantity
                existing.quantity += quantity;
            }
        } else {
            // New item
            const finalQuantity = isBooleanCategory ? 1 : quantity;
            this.items.set(itemId, {
                itemId,
                quantity: finalQuantity,
                category
            });
        }

        this.notifyListeners();
        this.save();
    }

    /**
     * Remove item from inventory
     * Returns true if successful, false if insufficient quantity
     */
    public removeItem(itemId: string, quantity: number = 1): boolean {
        if (quantity <= 0) {
            console.warn('Cannot remove non-positive quantity');
            return false;
        }

        const item = this.items.get(itemId);
        if (!item) {
            console.warn(`Cannot remove ${itemId}: not in inventory`);
            return false;
        }

        if (item.quantity < quantity) {
            console.warn(`Cannot remove ${quantity} of ${itemId}: only ${item.quantity} available`);
            return false;
        }

        item.quantity -= quantity;

        // Remove from map if quantity reaches 0
        if (item.quantity <= 0) {
            this.items.delete(itemId);
        }

        this.notifyListeners();
        this.save();
        return true;
    }

    /**
     * Get all items in a specific category
     */
    public getItemsByCategory(category: ShopCategory): InventoryItem[] {
        return Array.from(this.items.values())
            .filter(item => item.category === category);
    }

    /**
     * Get all items in inventory
     */
    public getAllItems(): InventoryItem[] {
        return Array.from(this.items.values());
    }

    /**
     * Subscribe to inventory change events
     */
    public subscribe(callback: InventoryChangeCallback): void {
        this.listeners.add(callback);
        // Immediately notify new listener of current state
        callback(this.getAllItems());
    }

    /**
     * Unsubscribe from inventory change events
     */
    public unsubscribe(callback: InventoryChangeCallback): void {
        this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of inventory changes
     */
    private notifyListeners(): void {
        const items = this.getAllItems();
        this.listeners.forEach(callback => callback(items));
    }

    /**
     * Save inventory state to localStorage
     */
    private save(): void {
        const saveData: InventorySaveData = {
            items: this.getAllItems(),
            lastSaved: Date.now()
        };

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saveData));
        } catch (error) {
            console.error('Failed to save inventory state:', error);
        }
    }

    /**
     * Load inventory state from localStorage
     */
    private load(): void {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const saveData: InventorySaveData = JSON.parse(saved);

                // Rebuild items map
                this.items.clear();
                saveData.items.forEach(item => {
                    this.items.set(item.itemId, item);
                });

                console.log(`🎒 Inventory loaded: ${this.items.size} items (saved ${new Date(saveData.lastSaved).toLocaleString()})`);
            } else {
                console.log('🎒 New inventory started (empty)');
            }
        } catch (error) {
            console.error('Failed to load inventory state:', error);
            console.log('🎒 Starting with empty inventory');
        }
    }

    /**
     * Reset inventory to empty state
     */
    public reset(): void {
        this.items.clear();
        this.notifyListeners();
        this.save();
        console.log('🎒 Inventory reset');
    }
}

