/**
 * PurchaseSystem - Bridge between shop, economy, and inventory
 * 
 * Handles purchase transactions:
 * - Validates purchase eligibility
 * - Deducts money from economy
 * - Adds items to inventory
 * - Returns success/failure messages
 */

import type { ShopItem, PurchaseResult } from '../types';
import { Economy } from '../economy/Economy';
import { Inventory } from '../inventory/Inventory';

export class PurchaseSystem {
    // Categories where only one can be owned
    private readonly SINGLE_OWNERSHIP_CATEGORIES = ['tools', 'pots'];

    constructor(
        private economy: Economy,
        private inventory: Inventory
    ) { }

    /**
     * Attempt to purchase an item
     * Returns result with success status and message
     */
    public attemptPurchase(item: ShopItem): PurchaseResult {
        // Check if item is unlocked
        if (!item.unlocked) {
            return {
                success: false,
                message: `${item.name} is locked. Complete requirements to unlock.`
            };
        }

        // Check if already owned (for single-ownership categories)
        const isSingleOwnership = this.SINGLE_OWNERSHIP_CATEGORIES.includes(item.category);
        if (isSingleOwnership && this.inventory.hasItem(item.id)) {
            return {
                success: false,
                message: `You already own ${item.name}.`
            };
        }

        // Check if player can afford
        if (!this.economy.canAfford(item.price)) {
            const currentMoney = this.economy.getMoney();
            const shortfall = item.price - currentMoney;
            return {
                success: false,
                message: `Not enough money. Need $${shortfall} more.`
            };
        }

        // Execute purchase
        const deducted = this.economy.spend(item.price);
        if (!deducted) {
            return {
                success: false,
                message: 'Transaction failed. Please try again.'
            };
        }

        // Add to inventory
        this.inventory.addItem(item.id, item.category, 1);

        // Success message varies by category
        const quantityOwned = this.inventory.getQuantity(item.id);
        const quantityMessage = isSingleOwnership
            ? ''
            : ` (Total: ${quantityOwned})`;

        return {
            success: true,
            message: `Purchased ${item.name}${quantityMessage}!`
        };
    }

    /**
     * Check if an item can be purchased
     * Returns true if item is unlocked, affordable, and not already owned (for single-ownership items)
     */
    public canPurchase(item: ShopItem): boolean {
        if (!item.unlocked) return false;
        if (!this.economy.canAfford(item.price)) return false;

        const isSingleOwnership = this.SINGLE_OWNERSHIP_CATEGORIES.includes(item.category);
        if (isSingleOwnership && this.inventory.hasItem(item.id)) {
            return false;
        }

        return true;
    }
}

