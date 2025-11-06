import type { ShopCategory, ShopItem } from '../types';
import { getUnlockedItemsByCategory } from '../shop/ShopItems';
import { PurchaseSystem } from '../systems/PurchaseSystem';
import { Inventory } from '../inventory/Inventory';

/**
 * ShopCategoryUI - Filtered shop overlay showing items from a specific category
 * 
 * Displays a grid of purchasable items when a hotspot is clicked.
 * Includes item details, prices, purchase buttons, and owned quantities.
 * Integrates with PurchaseSystem and Inventory.
 */
export class ShopCategoryUI {
    private container: HTMLDivElement;
    private isVisible: boolean = false;
    private currentCategory: ShopCategory | null = null;
    private closeCallback?: () => void;

    constructor(
        private purchaseSystem: PurchaseSystem,
        private inventory: Inventory
    ) {
        this.container = this.createContainer();
        document.body.appendChild(this.container);

        // Subscribe to inventory changes to refresh UI
        this.inventory.subscribe(() => this.refreshCurrentView());
    }

    /**
     * Create the main container
     */
    private createContainer(): HTMLDivElement {
        const container = document.createElement('div');
        container.className = 'shop-category-overlay';
        container.style.display = 'none';
        return container;
    }

    /**
     * Show the shop UI for a specific category
     */
    public show(category: ShopCategory): void {
        console.log('📂 Opening shop UI for:', category);
        this.currentCategory = category;
        this.isVisible = true;

        // Get items for this category
        const items = getUnlockedItemsByCategory(category);
        console.log('🛍️ Items to display:', items.length);

        // Build the UI
        this.container.innerHTML = '';
        this.container.appendChild(this.createHeader(category));
        this.container.appendChild(this.createItemGrid(items));

        // Show with animation
        this.container.style.display = 'flex';
        setTimeout(() => {
            this.container.classList.add('visible');
        }, 10);
    }

    /**
     * Hide the shop UI
     */
    public hide(): void {
        this.isVisible = false;
        this.currentCategory = null;

        this.container.classList.remove('visible');
        setTimeout(() => {
            this.container.style.display = 'none';
        }, 300);

        // Trigger close callback
        if (this.closeCallback) {
            this.closeCallback();
        }
    }

    /**
     * Set callback for when UI is closed
     */
    public onClose(callback: () => void): void {
        this.closeCallback = callback;
    }

    /**
     * Check if currently visible
     */
    public getIsVisible(): boolean {
        return this.isVisible;
    }

    /**
     * Refresh the current view if visible
     * Called when inventory changes
     */
    private refreshCurrentView(): void {
        if (this.isVisible && this.currentCategory) {
            // Rebuild the UI with current category
            const items = getUnlockedItemsByCategory(this.currentCategory);
            this.container.innerHTML = '';
            this.container.appendChild(this.createHeader(this.currentCategory));
            this.container.appendChild(this.createItemGrid(items));
        }
    }

    /**
     * Create the header section
     */
    private createHeader(category: ShopCategory): HTMLElement {
        const header = document.createElement('div');
        header.className = 'shop-category-header';

        const title = document.createElement('h2');
        title.textContent = this.getCategoryDisplayName(category);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'shop-close-btn';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', () => this.hide());

        header.appendChild(title);
        header.appendChild(closeBtn);

        return header;
    }

    /**
     * Create the item grid
     */
    private createItemGrid(items: ShopItem[]): HTMLElement {
        const grid = document.createElement('div');
        grid.className = 'shop-item-grid';

        if (items.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'shop-empty-message';
            emptyMsg.textContent = 'No items available yet';
            grid.appendChild(emptyMsg);
            return grid;
        }

        items.forEach(item => {
            grid.appendChild(this.createItemCard(item));
        });

        return grid;
    }

    /**
     * Create an item card
     */
    private createItemCard(item: ShopItem): HTMLElement {
        const card = document.createElement('div');
        card.className = 'shop-item-card';

        // Icon
        const icon = document.createElement('div');
        icon.className = 'shop-item-icon';
        icon.textContent = item.icon;

        // Name
        const name = document.createElement('div');
        name.className = 'shop-item-name';
        name.textContent = item.name;

        // Description
        const description = document.createElement('div');
        description.className = 'shop-item-description';
        description.textContent = item.description;

        // Price and owned status
        const priceContainer = document.createElement('div');
        priceContainer.className = 'shop-item-price-container';

        const price = document.createElement('div');
        price.className = 'shop-item-price';
        price.textContent = `$${item.price}`;
        priceContainer.appendChild(price);

        // Show owned quantity if player owns this item
        const quantity = this.inventory.getQuantity(item.id);
        if (quantity > 0) {
            const owned = document.createElement('div');
            owned.className = 'shop-item-owned';

            // Different display for boolean vs quantity categories
            const isBooleanCategory = ['tools', 'pots'].includes(item.category);
            owned.textContent = isBooleanCategory ? 'Owned' : `Owned: ${quantity}`;

            priceContainer.appendChild(owned);
        }

        // Buy button
        const buyBtn = document.createElement('button');
        buyBtn.className = 'shop-item-buy-btn';
        buyBtn.textContent = 'Buy';

        // Check if item can be purchased
        const canPurchase = this.purchaseSystem.canPurchase(item);
        if (!canPurchase) {
            buyBtn.classList.add('disabled');
            buyBtn.disabled = true;
        }

        buyBtn.addEventListener('click', () => this.handlePurchase(item));

        card.appendChild(icon);
        card.appendChild(name);
        card.appendChild(description);
        card.appendChild(priceContainer);
        card.appendChild(buyBtn);

        return card;
    }

    /**
     * Handle purchase attempt
     */
    private handlePurchase(item: ShopItem): void {
        const result = this.purchaseSystem.attemptPurchase(item);

        console.log(result.success ? '✅' : '❌', result.message);

        // Show feedback message
        this.showPurchaseFeedback(result.message, result.success);
    }

    /**
     * Show purchase feedback message
     */
    private showPurchaseFeedback(message: string, success: boolean): void {
        const feedback = document.createElement('div');
        feedback.className = `shop-purchase-feedback ${success ? 'success' : 'failure'}`;
        feedback.textContent = message;
        document.body.appendChild(feedback);

        setTimeout(() => {
            feedback.classList.add('visible');
        }, 10);

        setTimeout(() => {
            feedback.classList.remove('visible');
            setTimeout(() => feedback.remove(), 300);
        }, 2000);
    }

    /**
     * Get display name for category
     */
    private getCategoryDisplayName(category: ShopCategory): string {
        const names: Record<ShopCategory, string> = {
            'tools': 'Garden Tools',
            'pots': 'Pots & Containers',
            'fertilizers': 'Fertilizers & Amendments',
            'soil': 'Soil & Growing Media',
            'outdoor-plants': 'Outdoor Plants',
            'indoor-plants': 'Indoor Plants'
        };
        return names[category] || category;
    }

    /**
     * Clean up
     */
    public dispose(): void {
        this.container.remove();
    }
}

