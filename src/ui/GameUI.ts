import { Inventory, PlantDefinition } from '../core/GameState';

export interface SeedOption {
    id: string;
    label: string;
}

export interface GameUIBindings {
    onSeedSelected: (seedId: string) => void;
    onBuySoilTile: () => void;
}

export class GameUI {
    private readonly bindings: GameUIBindings;
    private readonly root: HTMLElement;
    private readonly seedContainer: HTMLElement;
    private readonly seedButtons: Map<string, HTMLButtonElement> = new Map();
    private readonly inventoryFruit: HTMLElement;
    private readonly inventorySeeds: HTMLElement;
    private readonly buyTileButton: HTMLButtonElement;
    private lastFruitValue = 0;

    constructor(bindings: GameUIBindings) {
        this.bindings = bindings;
        this.root = this.createRoot();
        this.seedContainer = this.root.querySelector('[data-ui="seed-options"]') as HTMLElement;
        this.inventoryFruit = this.root.querySelector('[data-ui="inventory-fruit"]') as HTMLElement;
        this.inventorySeeds = this.root.querySelector('[data-ui="inventory-seeds"]') as HTMLElement;
        this.buyTileButton = this.root.querySelector('[data-ui="buy-tile"]') as HTMLButtonElement;

        this.buyTileButton.addEventListener('click', () => {
            this.bindings.onBuySoilTile();
        });
    }

    public setSeedOptions(options: SeedOption[], definitions: Map<string, PlantDefinition>): void {
        this.seedContainer.innerHTML = '';
        this.seedButtons.clear();

        for (const option of options) {
            const definition = definitions.get(option.id);
            if (!definition) {
                continue;
            }

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'game-ui__seed-button';
            button.textContent = `${option.label}`;
            button.addEventListener('click', () => {
                this.bindings.onSeedSelected(option.id);
            });

            this.seedContainer.appendChild(button);
            this.seedButtons.set(option.id, button);
        }
    }

    public setSelectedSeed(seedId: string | null): void {
        for (const [id, button] of this.seedButtons.entries()) {
            if (id === seedId) {
                button.classList.add('is-selected');
            } else {
                button.classList.remove('is-selected');
            }
        }
    }

    public updateInventory(inventory: Inventory, definitions: Map<string, PlantDefinition>): void {
        this.inventoryFruit.textContent = `${inventory.fruit}`;

        if (inventory.fruit > this.lastFruitValue) {
            this.triggerFruitPulse();
        }
        this.lastFruitValue = inventory.fruit;

        const seedStrings: string[] = [];
        for (const [seedId, count] of Object.entries(inventory.seeds)) {
            const definition = definitions.get(seedId);
            if (!definition) {
                continue;
            }

            seedStrings.push(`${definition.displayName}: ${count}`);
        }

        if (seedStrings.length === 0) {
            this.inventorySeeds.textContent = 'None';
        } else {
            this.inventorySeeds.textContent = seedStrings.join(', ');
        }

        for (const [seedId, button] of this.seedButtons.entries()) {
            const count = inventory.seeds[seedId] ?? 0;
            button.disabled = count <= 0;
            button.dataset.count = `${count}`;
        }
    }

    public triggerFruitPulse(): void {
        this.inventoryFruit.classList.remove('is-pulsing');
        void this.inventoryFruit.getBoundingClientRect();
        this.inventoryFruit.classList.add('is-pulsing');
    }

    public setBuyTileState(options: {
        enabled: boolean;
        costFruit: number;
        message?: string;
        placementMode?: boolean;
    }): void {
        const { enabled, costFruit, message, placementMode } = options;
        this.buyTileButton.disabled = !enabled;

        if (placementMode) {
            this.buyTileButton.classList.add('is-selected');
            this.buyTileButton.textContent = message ?? `Select highlighted spot (${costFruit} fruit)`;
            return;
        }

        this.buyTileButton.classList.remove('is-selected');
        if (message) {
            this.buyTileButton.textContent = message;
            return;
        }

        this.buyTileButton.textContent = `Buy Soil Tile (${costFruit} fruit)`;
    }

    public destroy(): void {
        this.root.remove();
        this.seedButtons.clear();
    }

    private createRoot(): HTMLElement {
        const panel = document.createElement('section');
        panel.className = 'game-ui';
        panel.innerHTML = `
            <div class="game-ui__section">
                <h2 class="game-ui__heading">Seeds</h2>
                <div class="game-ui__seed-options" data-ui="seed-options"></div>
            </div>
            <div class="game-ui__section">
                <h2 class="game-ui__heading">Inventory</h2>
                <div class="game-ui__row">
                    <span>Fruit:</span>
                    <strong class="game-ui__fruit-count" data-ui="inventory-fruit">0</strong>
                </div>
                <div class="game-ui__row">
                    <span>Seeds:</span>
                    <strong data-ui="inventory-seeds">None</strong>
                </div>
            </div>
            <div class="game-ui__section">
                <h2 class="game-ui__heading">Shop</h2>
                <button type="button" class="game-ui__buy-button" data-ui="buy-tile">
                    Buy Soil Tile
                </button>
            </div>
        `;

        document.body.appendChild(panel);
        return panel;
    }
}
