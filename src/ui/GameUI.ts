import { Inventory, PlantDefinition } from '../core/GameState';

export interface SeedOption {
    id: string;
    label: string;
}

export type ActionMode = 'plant' | 'till';

interface ActionConfig {
    mode: ActionMode;
    icon: string;
    label: string;
}

const ACTION_CONFIG: ActionConfig[] = [
    { mode: 'plant', icon: '🌱', label: 'Plant' },
    { mode: 'till', icon: '⛏️', label: 'Till' }
];

export interface GameUIBindings {
    onModeChanged: (mode: ActionMode) => void;
    onSeedSelected: (seedId: string | null) => void;
    onBuySoilTile: () => void;
}

interface RootElements {
    root: HTMLElement;
    seedCount: HTMLElement;
    fruitCount: HTMLElement;
    actionButtons: Map<ActionMode, HTMLButtonElement>;
    modeMessage: HTMLElement;
}

export class GameUI {
    private readonly bindings: GameUIBindings;
    private readonly root: HTMLElement;
    private readonly seedCountValue: HTMLElement;
    private readonly fruitCountValue: HTMLElement;
    private readonly actionButtons: Map<ActionMode, HTMLButtonElement>;
    private readonly modeMessage: HTMLElement;

    private currentMode: ActionMode = 'plant';
    private lastSeedTotal = 0;
    private lastFruitCount = 0;
    private isPlacementMode = false;
    private plantAvailable = false;
    private tillAvailable = false;
    private seedOptions: SeedOption[] = [];
    private primarySeedId: string | null = null;

    constructor(bindings: GameUIBindings) {
        this.bindings = bindings;

        const elements = this.createRoot();
        this.root = elements.root;
        this.seedCountValue = elements.seedCount;
        this.fruitCountValue = elements.fruitCount;
        this.actionButtons = elements.actionButtons;
        this.modeMessage = elements.modeMessage;

        this.attachActionHandlers();

        this.setMode('plant', { notify: false });
        this.updateActionButtonStates();
    }

    public setSeedOptions(options: SeedOption[], _definitions: Map<string, PlantDefinition>): void {
        this.seedOptions = options.slice();
        this.primarySeedId = null;
        this.updateActionButtonStates();
    }

    public updateInventory(inventory: Inventory, _definitions: Map<string, PlantDefinition>): void {
        let totalSeeds = 0;
        for (const count of Object.values(inventory.seeds)) {
            totalSeeds += count;
        }

        const seedDiff = totalSeeds - this.lastSeedTotal;
        this.seedCountValue.textContent = `${totalSeeds}`;
        if (seedDiff !== 0) {
            this.animateCounter(this.seedCountValue, seedDiff);
        }
        this.lastSeedTotal = totalSeeds;

        const fruitDiff = inventory.fruit - this.lastFruitCount;
        this.fruitCountValue.textContent = `${inventory.fruit}`;
        if (fruitDiff !== 0) {
            this.animateCounter(this.fruitCountValue, fruitDiff);
        }
        this.lastFruitCount = inventory.fruit;

        this.updatePrimarySeedSelection(inventory);
        this.updateActionButtonStates();
    }

    public triggerFruitPulse(): void {
        this.animateCounter(this.fruitCountValue, 1);
    }

    public setBuyTileState(options: {
        enabled: boolean;
        costFruit: number;
        message?: string;
        placementMode?: boolean;
    }): void {
        const { enabled, placementMode } = options;
        this.isPlacementMode = Boolean(placementMode);
        this.tillAvailable = enabled;

        this.modeMessage.textContent = '';
        this.modeMessage.classList.remove('is-visible');

        if (this.isPlacementMode) {
            this.setMode('till', { notify: false });
        }

        this.updateActionButtonStates();
    }

    public syncMode(mode: ActionMode): void {
        this.setMode(mode, { notify: false });
    }

    public destroy(): void {
        this.root.remove();
        this.actionButtons.clear();
    }

    private handleModeRequest(mode: ActionMode): void {
        if (mode === this.currentMode) {
            return;
        }

        if (!this.isModeAvailable(mode)) {
            return;
        }

        this.setMode(mode, { notify: true });

        if (mode === 'till' && !this.isPlacementMode) {
            this.bindings.onBuySoilTile();
        }
    }

    private setMode(mode: ActionMode, options: { notify: boolean }): void {
        const { notify } = options;
        this.currentMode = mode;

        for (const [buttonMode, button] of this.actionButtons.entries()) {
            const isActive = buttonMode === mode;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        }

        if (!notify) {
            return;
        }

        if (mode === 'plant') {
            this.bindings.onSeedSelected(this.primarySeedId ?? null);
        } else {
            this.bindings.onSeedSelected(null);
        }

        this.bindings.onModeChanged(mode);
    }

    private updatePrimarySeedSelection(inventory: Inventory): void {
        let nextSeedId: string | null = null;

        for (const option of this.seedOptions) {
            const count = inventory.seeds[option.id] ?? 0;
            if (count > 0) {
                nextSeedId = option.id;
                break;
            }
        }

        const seedChanged = this.primarySeedId !== nextSeedId;
        this.primarySeedId = nextSeedId;
        this.plantAvailable = this.primarySeedId !== null;

        if (!seedChanged || this.currentMode !== 'plant') {
            return;
        }

        this.bindings.onSeedSelected(this.primarySeedId ?? null);
    }

    private updateActionButtonStates(): void {
        for (const [mode, button] of this.actionButtons.entries()) {
            const available = this.isModeAvailable(mode);
            const isActive = mode === this.currentMode;
            const shouldDisable = !available && !isActive && !(mode === 'till' && this.isPlacementMode);

            button.disabled = shouldDisable;
            button.classList.toggle('is-disabled', shouldDisable);

            button.classList.toggle('is-placement', mode === 'till' && this.isPlacementMode);
        }
    }

    private isModeAvailable(mode: ActionMode): boolean {
        if (mode === 'plant') {
            return this.plantAvailable;
        }

        if (this.isPlacementMode) {
            return true;
        }

        return this.tillAvailable;
    }

    private animateCounter(element: HTMLElement, diff: number): void {
        element.classList.remove('is-increase', 'is-decrease');
        void element.getBoundingClientRect();

        if (diff > 0) {
            element.classList.add('is-increase');
        } else if (diff < 0) {
            element.classList.add('is-decrease');
        }
    }

    private attachActionHandlers(): void {
        for (const [mode, button] of this.actionButtons.entries()) {
            button.addEventListener('click', () => {
                this.handleModeRequest(mode);
            });
        }
    }

    private createRoot(): RootElements {
        const root = document.createElement('div');
        root.className = 'game-ui';

        const infoBar = this.createInfoBar();
        const actionDock = this.createActionDock();

        const modeMessage = document.createElement('div');
        modeMessage.className = 'game-ui__mode-message';
        modeMessage.setAttribute('role', 'status');
        modeMessage.setAttribute('aria-live', 'polite');

        root.appendChild(infoBar.container);
        root.appendChild(actionDock.container);
        root.appendChild(modeMessage);
        document.body.appendChild(root);

        return {
            root,
            seedCount: infoBar.seedCounterValue,
            fruitCount: infoBar.fruitCounterValue,
            actionButtons: actionDock.buttons,
            modeMessage
        };
    }

    private createInfoBar(): {
        container: HTMLElement;
        seedCounterValue: HTMLElement;
        fruitCounterValue: HTMLElement;
    } {
        const container = document.createElement('div');
        container.className = 'game-ui__info-bar';

        const seedCounter = this.createCounter('🌱', 'Seeds');
        const fruitCounter = this.createCounter('🍓', 'Fruit');

        container.appendChild(seedCounter.container);
        container.appendChild(fruitCounter.container);

        return {
            container,
            seedCounterValue: seedCounter.value,
            fruitCounterValue: fruitCounter.value
        };
    }

    private createActionDock(): {
        container: HTMLElement;
        buttons: Map<ActionMode, HTMLButtonElement>;
    } {
        const container = document.createElement('div');
        container.className = 'game-ui__action-dock';

        const buttons: Map<ActionMode, HTMLButtonElement> = new Map();

        for (const action of ACTION_CONFIG) {
            const button = this.createActionButton(action);
            container.appendChild(button);
            buttons.set(action.mode, button);
        }

        return { container, buttons };
    }

    private createActionButton(action: ActionConfig): HTMLButtonElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'game-ui__action-button';
        button.dataset.mode = action.mode;
        button.innerHTML = `
            <span class="game-ui__action-icon" aria-hidden="true">${action.icon}</span>
            <span class="game-ui__action-label">${action.label}</span>
        `;
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-label', action.label);
        return button;
    }

    private createCounter(
        icon: string,
        label: string
    ): { container: HTMLElement; value: HTMLElement } {
        const container = document.createElement('div');
        container.className = 'game-ui__counter';
        container.setAttribute('role', 'status');
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-label', label);

        const iconSpan = document.createElement('span');
        iconSpan.className = 'game-ui__counter-icon';
        iconSpan.textContent = icon;

        const valueSpan = document.createElement('span');
        valueSpan.className = 'game-ui__counter-value';
        valueSpan.textContent = '0';

        container.appendChild(iconSpan);
        container.appendChild(valueSpan);

        return { container, value: valueSpan };
    }
}
