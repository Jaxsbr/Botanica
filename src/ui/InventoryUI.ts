/**
 * InventoryUI - Full-screen inventory panel
 * 
 * Displays player's owned items with category filtering.
 * Shows item icons, names, and quantities.
 */

import type { ShopCategory, InventoryItem } from '../types';
import { Inventory } from '../inventory/Inventory';
import { getItemById } from '../shop/ShopItems';

type InventoryFilter = 'all' | ShopCategory;

export class InventoryUI {
    private container: HTMLDivElement;
    private isVisible: boolean = false;
    private currentFilter: InventoryFilter = 'all';
    private closeCallback?: () => void;

    constructor(private inventory: Inventory) {
        this.container = this.createContainer();
        document.body.appendChild(this.container);

        // Subscribe to inventory changes
        this.inventory.subscribe(() => this.refresh());

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * Create the main container
     */
    private createContainer(): HTMLDivElement {
        const container = document.createElement('div');
        container.className = 'inventory-modal';
        container.style.display = 'none';

        // Click outside to close, and stop propagation to prevent 3D world clicks
        container.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent clicks from reaching 3D world
            if (e.target === container) {
                this.hide();
            }
        });

        return container;
    }

    /**
     * Show the inventory UI
     */
    public show(): void {
        this.isVisible = true;
        this.refresh();

        this.container.style.display = 'flex';
        setTimeout(() => {
            this.container.classList.add('visible');
        }, 10);
    }

    /**
     * Hide the inventory UI
     */
    public hide(): void {
        this.isVisible = false;

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
     * Toggle visibility
     * Returns the new visibility state (true if now visible)
     */
    public toggle(): boolean {
        if (this.isVisible) {
            this.hide();
            return false;
        } else {
            this.show();
            return true;
        }
    }

    /**
     * Refresh the UI with current inventory
     */
    private refresh(): void {
        if (!this.isVisible) return;

        this.container.innerHTML = '';

        const content = document.createElement('div');
        content.className = 'inventory-content';

        content.appendChild(this.createHeader());
        content.appendChild(this.createTabs());
        content.appendChild(this.createItemGrid());

        this.container.appendChild(content);
    }

    /**
     * Create the header section
     */
    private createHeader(): HTMLElement {
        const header = document.createElement('div');
        header.className = 'inventory-header';

        const title = document.createElement('h2');
        title.textContent = 'Inventory';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'inventory-close-btn';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', () => this.hide());

        header.appendChild(title);
        header.appendChild(closeBtn);

        return header;
    }

    /**
     * Create category filter tabs
     */
    private createTabs(): HTMLElement {
        const tabs = document.createElement('div');
        tabs.className = 'inventory-tabs';

        const filters: { label: string; value: InventoryFilter }[] = [
            { label: 'All', value: 'all' },
            { label: 'Tools', value: 'tools' },
            { label: 'Pots', value: 'pots' },
            { label: 'Fertilizers', value: 'fertilizers' },
            { label: 'Soil', value: 'soil' }
        ];

        filters.forEach(filter => {
            const tab = document.createElement('button');
            tab.className = 'inventory-tab';
            tab.textContent = filter.label;

            if (this.currentFilter === filter.value) {
                tab.classList.add('active');
            }

            tab.addEventListener('click', () => {
                this.currentFilter = filter.value;
                this.refresh();
            });

            tabs.appendChild(tab);
        });

        return tabs;
    }

    /**
     * Create the item grid
     */
    private createItemGrid(): HTMLElement {
        const grid = document.createElement('div');
        grid.className = 'inventory-grid';

        // Get filtered items
        const items = this.getFilteredItems();

        if (items.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'inventory-empty';
            emptyMsg.textContent = this.currentFilter === 'all'
                ? 'Your inventory is empty. Visit the shop to purchase items!'
                : `No ${this.currentFilter} in inventory yet.`;
            grid.appendChild(emptyMsg);
            return grid;
        }

        items.forEach(item => {
            grid.appendChild(this.createItemCard(item));
        });

        return grid;
    }

    /**
     * Get filtered inventory items
     */
    private getFilteredItems(): InventoryItem[] {
        if (this.currentFilter === 'all') {
            return this.inventory.getAllItems();
        } else {
            return this.inventory.getItemsByCategory(this.currentFilter);
        }
    }

    /**
     * Create an item card
     */
    private createItemCard(inventoryItem: InventoryItem): HTMLElement {
        const card = document.createElement('div');
        card.className = 'inventory-item';

        // Get full item details from shop catalog
        const shopItem = getItemById(inventoryItem.itemId);
        if (!shopItem) {
            console.warn(`Item ${inventoryItem.itemId} not found in shop catalog`);
            return card;
        }

        // Icon
        const icon = document.createElement('div');
        icon.className = 'inventory-item-icon';
        icon.textContent = shopItem.icon;

        // Name
        const name = document.createElement('div');
        name.className = 'inventory-item-name';
        name.textContent = shopItem.name;

        // Quantity badge
        const isBooleanCategory = ['tools', 'pots'].includes(inventoryItem.category);
        if (!isBooleanCategory) {
            const quantity = document.createElement('div');
            quantity.className = 'inventory-item-quantity';
            quantity.textContent = `×${inventoryItem.quantity}`;
            card.appendChild(quantity);
        }

        card.appendChild(icon);
        card.appendChild(name);

        return card;
    }

    /**
     * Clean up
     */
    public dispose(): void {
        this.container.remove();
    }
}

