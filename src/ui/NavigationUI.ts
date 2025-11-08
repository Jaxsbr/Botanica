import type { PoduleType } from '../types';

/**
 * NavigationUI - Bottom navigation bar for switching between podules
 * 
 * Creates an icon-based navigation UI with Home, Shop, and Inventory buttons.
 * Highlights the currently active podule.
 */
export class NavigationUI {
    private container: HTMLDivElement;
    private buttons: Map<PoduleType, HTMLButtonElement>;
    private inventoryButton: HTMLButtonElement | null = null;
    private currentActive: PoduleType | null = null;
    private clickCallback?: (type: PoduleType) => void;
    private inventoryCallback?: () => void;

    constructor() {
        this.buttons = new Map();
        this.container = this.createNavigationBar();
        document.body.appendChild(this.container);
    }

    /**
     * Create the navigation bar HTML structure
     */
    private createNavigationBar(): HTMLDivElement {
        const nav = document.createElement('div');
        nav.className = 'navigation-bar';

        // Home button
        const homeBtn = this.createButton('home', '🏠', 'Home');
        this.buttons.set('home', homeBtn);
        nav.appendChild(homeBtn);

        // Shop button
        const shopBtn = this.createButton('shop', '🛒', 'Shop');
        this.buttons.set('shop', shopBtn);
        nav.appendChild(shopBtn);

        // Dev sandbox button
        const devBtn = this.createButton('dev', '🧪', 'Dev Lab');
        this.buttons.set('dev', devBtn);
        nav.appendChild(devBtn);

        // Inventory button (not a podule, just opens overlay)
        this.inventoryButton = this.createInventoryButton();
        nav.appendChild(this.inventoryButton);

        return nav;
    }

    /**
     * Create the inventory button
     */
    private createInventoryButton(): HTMLButtonElement {
        const button = document.createElement('button');
        button.className = 'nav-button inventory-button';
        button.setAttribute('aria-label', 'Inventory');
        button.innerHTML = `<span class="nav-icon">🎒</span>`;

        button.addEventListener('click', () => {
            if (this.inventoryCallback) {
                this.inventoryCallback();
            }
        });

        return button;
    }

    /**
     * Create a navigation button
     */
    private createButton(type: PoduleType, icon: string, label: string): HTMLButtonElement {
        const button = document.createElement('button');
        button.className = 'nav-button';
        button.setAttribute('data-podule', type);
        button.setAttribute('aria-label', label);
        button.innerHTML = `<span class="nav-icon">${icon}</span>`;

        button.addEventListener('click', () => {
            if (this.clickCallback) {
                this.clickCallback(type);
            }
        });

        return button;
    }

    /**
     * Set the callback function for button clicks
     */
    public onClick(callback: (type: PoduleType) => void): void {
        this.clickCallback = callback;
    }

    /**
     * Set the callback function for inventory button click
     */
    public onInventoryClick(callback: () => void): void {
        this.inventoryCallback = callback;
    }

    /**
     * Update the active button highlight
     */
    public setActive(type: PoduleType): void {
        // Remove active class from all buttons
        this.buttons.forEach(button => {
            button.classList.remove('active');
        });

        // Add active class to selected button
        const activeButton = this.buttons.get(type);
        if (activeButton) {
            activeButton.classList.add('active');
            this.currentActive = type;
        }
    }

    /**
     * Get the currently active podule type
     */
    public getActive(): PoduleType | null {
        return this.currentActive;
    }

    /**
     * Clean up the navigation UI
     */
    public dispose(): void {
        this.buttons.forEach(button => {
            button.removeEventListener('click', () => { });
        });
        this.container.remove();
    }
}

