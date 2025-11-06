/**
 * PlantingPromptUI - UI for pot placement, soil addition, and planting
 * 
 * Shows context-appropriate prompts and item selection dialogs:
 * - Empty paver: "Place Pot" with pot type selection
 * - Empty pot: "Add Soil" with soil type selection
 * - Soil-filled pot: "Plant" with plant/seed selection
 */

import { Inventory } from '../inventory/Inventory';
import { PlantingSystem } from '../systems/PlantingSystem';
import { getItemById } from '../shop/ShopItems';
import type { InputManager } from '../systems/InputManager';
import type { ShopItem } from '../types';

export type PlantingAction = 'place-pot' | 'add-soil' | 'plant-seed';

interface PlantingPromptCallbacks {
    onPlacePot?: (potType: 'small' | 'large') => void;
    onAddSoil?: (soilItemId: string) => void;
    onPlantSeed?: (plantItemId: string) => void;
    onCancel?: () => void;
}

export class PlantingPromptUI {
    private container: HTMLDivElement;
    private inventory: Inventory;
    private plantingSystem: PlantingSystem;
    private inputManager: InputManager;
    private callbacks: PlantingPromptCallbacks = {};
    private visible: boolean = false;

    constructor(inventory: Inventory, plantingSystem: PlantingSystem, inputManager: InputManager) {
        this.inventory = inventory;
        this.plantingSystem = plantingSystem;
        this.inputManager = inputManager;
        this.container = this.createContainer();
    }

    /**
     * Create the prompt container
     */
    private createContainer(): HTMLDivElement {
        const container = document.createElement('div');
        container.className = 'planting-prompt';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 25px;
            border-radius: 12px;
            border: 2px solid #4CAF50;
            min-width: 350px;
            max-width: 500px;
            max-height: 70vh;
            overflow-y: auto;
            z-index: 2000;
            font-family: Arial, sans-serif;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            display: none;
            pointer-events: auto;
        `;

        // Prevent clicks from passing through to 3D world
        container.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        document.body.appendChild(container);
        return container;
    }

    /**
     * Show place pot prompt
     */
    public showPlacePotPrompt(callbacks: PlantingPromptCallbacks): void {
        this.callbacks = callbacks;

        // Get available pot types from inventory
        const availablePots: Array<{ itemId: string; item: ShopItem; potType: 'small' | 'large' }> = [];

        if (this.inventory.hasItem('pot-small-terracotta')) {
            const item = getItemById('pot-small-terracotta');
            if (item) availablePots.push({ itemId: item.id, item, potType: 'small' });
        }

        if (this.inventory.hasItem('pot-large-terracotta')) {
            const item = getItemById('pot-large-terracotta');
            if (item) availablePots.push({ itemId: item.id, item, potType: 'large' });
        }

        if (availablePots.length === 0) {
            this.showMessage('No Pots Available', 'You need to purchase a pot from the shop first!');
            return;
        }

        // Render pot selection
        this.container.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #4CAF50; font-size: 20px;">Place Pot</h3>
            <p style="margin: 0 0 15px 0; color: #ccc;">Choose which pot to place:</p>
            <div class="pot-list" style="margin-bottom: 15px;"></div>
            <button class="cancel-btn" style="width: 100%; padding: 10px; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">Cancel</button>
        `;

        const potList = this.container.querySelector('.pot-list') as HTMLDivElement;

        availablePots.forEach(({ item, potType }) => {
            const potBtn = document.createElement('button');
            potBtn.style.cssText = `
                width: 100%;
                padding: 12px;
                margin-bottom: 8px;
                background: #2d5016;
                color: white;
                border: 1px solid #4CAF50;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                text-align: left;
                transition: background 0.2s;
            `;
            potBtn.innerHTML = `
                <span style="font-size: 20px; margin-right: 8px;">${item.icon}</span>
                <strong>${item.name}</strong>
                <div style="font-size: 12px; color: #aaa; margin-top: 4px;">${item.description}</div>
            `;
            potBtn.onmouseover = () => potBtn.style.background = '#3d6621';
            potBtn.onmouseout = () => potBtn.style.background = '#2d5016';
            potBtn.onclick = () => {
                this.hide();
                this.callbacks.onPlacePot?.(potType);
            };
            potList.appendChild(potBtn);
        });

        const cancelBtn = this.container.querySelector('.cancel-btn') as HTMLButtonElement;
        cancelBtn.onclick = () => {
            this.hide();
            this.callbacks.onCancel?.();
        };

        this.show();
    }

    /**
     * Show add soil prompt
     */
    public showAddSoilPrompt(callbacks: PlantingPromptCallbacks): void {
        this.callbacks = callbacks;

        // Get available soil types from inventory
        const availableSoils: ShopItem[] = [];
        const soilIds = ['potting-soil', 'compost', 'perlite'];

        soilIds.forEach(soilId => {
            if (this.inventory.hasItem(soilId)) {
                const item = getItemById(soilId);
                if (item) availableSoils.push(item);
            }
        });

        if (availableSoils.length === 0) {
            this.showMessage('No Soil Available', 'You need to purchase soil from the shop first!');
            return;
        }

        // Render soil selection
        this.container.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #4CAF50; font-size: 20px;">Add Soil</h3>
            <p style="margin: 0 0 15px 0; color: #ccc;">Choose which soil to add:</p>
            <div class="soil-list" style="margin-bottom: 15px;"></div>
            <button class="cancel-btn" style="width: 100%; padding: 10px; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">Cancel</button>
        `;

        const soilList = this.container.querySelector('.soil-list') as HTMLDivElement;

        availableSoils.forEach(item => {
            const soilBtn = document.createElement('button');
            soilBtn.style.cssText = `
                width: 100%;
                padding: 12px;
                margin-bottom: 8px;
                background: #5d3a1a;
                color: white;
                border: 1px solid #8B6F47;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                text-align: left;
                transition: background 0.2s;
            `;
            soilBtn.innerHTML = `
                <span style="font-size: 20px; margin-right: 8px;">${item.icon}</span>
                <strong>${item.name}</strong>
                <div style="font-size: 12px; color: #aaa; margin-top: 4px;">${item.description}</div>
                <div style="font-size: 11px; color: #6cf; margin-top: 4px;">Quantity: ${this.inventory.getQuantity(item.id)}</div>
            `;
            soilBtn.onmouseover = () => soilBtn.style.background = '#6d4a2a';
            soilBtn.onmouseout = () => soilBtn.style.background = '#5d3a1a';
            soilBtn.onclick = () => {
                this.hide();
                this.callbacks.onAddSoil?.(item.id);
            };
            soilList.appendChild(soilBtn);
        });

        const cancelBtn = this.container.querySelector('.cancel-btn') as HTMLButtonElement;
        cancelBtn.onclick = () => {
            this.hide();
            this.callbacks.onCancel?.();
        };

        this.show();
    }

    /**
     * Show plant seed prompt
     */
    public showPlantSeedPrompt(callbacks: PlantingPromptCallbacks): void {
        this.callbacks = callbacks;

        // Get available plants/seeds from inventory
        const availablePlants: ShopItem[] = [];
        const plantIds = ['plant-young-avocado', 'plant-mature-avocado', 'plant-fern'];

        plantIds.forEach(plantId => {
            if (this.inventory.hasItem(plantId)) {
                const item = getItemById(plantId);
                if (item) availablePlants.push(item);
            }
        });

        if (availablePlants.length === 0) {
            this.showMessage('No Plants Available', 'You need to purchase plants or seeds from the shop first!');
            return;
        }

        // Render plant selection
        this.container.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #4CAF50; font-size: 20px;">Plant Seed</h3>
            <p style="margin: 0 0 15px 0; color: #ccc;">Choose what to plant:</p>
            <div class="plant-list" style="margin-bottom: 15px;"></div>
            <button class="cancel-btn" style="width: 100%; padding: 10px; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">Cancel</button>
        `;

        const plantList = this.container.querySelector('.plant-list') as HTMLDivElement;

        availablePlants.forEach(item => {
            const plantBtn = document.createElement('button');
            plantBtn.style.cssText = `
                width: 100%;
                padding: 12px;
                margin-bottom: 8px;
                background: #1a3d0f;
                color: white;
                border: 1px solid #4CAF50;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                text-align: left;
                transition: background 0.2s;
            `;
            plantBtn.innerHTML = `
                <span style="font-size: 20px; margin-right: 8px;">${item.icon}</span>
                <strong>${item.name}</strong>
                <div style="font-size: 12px; color: #aaa; margin-top: 4px;">${item.description}</div>
                <div style="font-size: 11px; color: #6cf; margin-top: 4px;">Quantity: ${this.inventory.getQuantity(item.id)}</div>
            `;
            plantBtn.onmouseover = () => plantBtn.style.background = '#2a4d1f';
            plantBtn.onmouseout = () => plantBtn.style.background = '#1a3d0f';
            plantBtn.onclick = () => {
                this.hide();
                this.callbacks.onPlantSeed?.(item.id);
            };
            plantList.appendChild(plantBtn);
        });

        const cancelBtn = this.container.querySelector('.cancel-btn') as HTMLButtonElement;
        cancelBtn.onclick = () => {
            this.hide();
            this.callbacks.onCancel?.();
        };

        this.show();
    }

    /**
     * Show a simple message dialog
     */
    private showMessage(title: string, message: string): void {
        this.container.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #ff6b6b; font-size: 20px;">${title}</h3>
            <p style="margin: 0 0 15px 0; color: #ccc;">${message}</p>
            <button class="ok-btn" style="width: 100%; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">OK</button>
        `;

        const okBtn = this.container.querySelector('.ok-btn') as HTMLButtonElement;
        okBtn.onclick = () => this.hide();

        this.show();
    }

    /**
     * Show the prompt
     */
    private show(): void {
        this.container.style.display = 'block';
        this.visible = true;
        this.inputManager.registerOverlay('planting-prompt');
    }

    /**
     * Hide the prompt
     */
    public hide(): void {
        this.container.style.display = 'none';
        this.visible = false;
        this.inputManager.unregisterOverlay('planting-prompt');
    }

    /**
     * Check if prompt is visible
     */
    public isVisible(): boolean {
        return this.visible;
    }

    /**
     * Dispose of the prompt UI
     */
    public dispose(): void {
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

