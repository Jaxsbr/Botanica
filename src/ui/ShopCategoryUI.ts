import type { ShopCategory, ShopItem } from '../types';
import { getUnlockedItemsByCategory } from '../shop/ShopItems';

/**
 * ShopCategoryUI - Filtered shop overlay showing items from a specific category
 * 
 * Displays a grid of purchasable items when a hotspot is clicked.
 * Includes item details, prices, and mock purchase buttons.
 */
export class ShopCategoryUI {
    private container: HTMLDivElement;
    private isVisible: boolean = false;
    private currentCategory: ShopCategory | null = null;

    constructor() {
        this.container = this.createContainer();
        document.body.appendChild(this.container);
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
        this.currentCategory = category;
        this.isVisible = true;

        // Get items for this category
        const items = getUnlockedItemsByCategory(category);

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
    }

    /**
     * Check if currently visible
     */
    public getIsVisible(): boolean {
        return this.isVisible;
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

        // Price
        const price = document.createElement('div');
        price.className = 'shop-item-price';
        price.textContent = `$${item.price}`;

        // Buy button (mock - no actual purchase yet)
        const buyBtn = document.createElement('button');
        buyBtn.className = 'shop-item-buy-btn';
        buyBtn.textContent = 'Buy';
        buyBtn.addEventListener('click', () => this.handleMockPurchase(item));

        card.appendChild(icon);
        card.appendChild(name);
        card.appendChild(description);
        card.appendChild(price);
        card.appendChild(buyBtn);

        return card;
    }

    /**
     * Handle mock purchase (just visual feedback for now)
     */
    private handleMockPurchase(item: ShopItem): void {
        console.log(`🛒 Mock purchase: ${item.name} for $${item.price}`);

        // Show temporary feedback
        const feedback = document.createElement('div');
        feedback.className = 'shop-purchase-feedback';
        feedback.textContent = `Purchased ${item.name}! (Mock)`;
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

