/**
 * PlantingSystem - Coordinates pot placement, soil application, and planting
 * 
 * Manages the three-step planting workflow:
 * 1. Place pot on paver
 * 2. Add soil to pot
 * 3. Plant seed/plant in soil
 */

import { Pot } from '../containers/Pot';
import { Inventory } from '../inventory/Inventory';
import { Plant3D } from '../plants/Plant3D';
import { TutorialSystem, TutorialStep } from './TutorialSystem';
import type { DrainageType } from '../types';

export interface PotData {
    potId: string; // Unique identifier for this placed pot
    potType: 'small' | 'large';
    paverIndex: number; // Which paver spot it's on
    position: { x: number; y: number; z: number };
    hasSoil: boolean;
    soilType?: string; // Shop item ID (e.g., 'potting-soil')
    drainage?: DrainageType;
    hasPlant: boolean;
    plantType?: string; // Shop item ID (e.g., 'plant-young-avocado')
    plantPreset?: string; // Plant preset name (e.g., 'sapling')
}

export class PlantingSystem {
    private pots: Map<string, { pot: Pot; data: PotData }> = new Map();
    private inventory: Inventory;
    private tutorialSystem: TutorialSystem;
    private nextPotId: number = 1;
    private readonly STORAGE_KEY = 'botanica_placed_pots';

    constructor(inventory: Inventory) {
        this.inventory = inventory;
        this.tutorialSystem = TutorialSystem.getInstance();
        this.load();
    }

    /**
     * Place a pot on a paver spot
     * Returns the created pot instance and its ID
     */
    public placePot(
        paverIndex: number,
        position: { x: number; y: number; z: number },
        potType: 'small' | 'large'
    ): { pot: Pot; potId: string } | null {
        // Check if player owns this pot type in inventory
        const potItemId = potType === 'small' ? 'pot-small-terracotta' : 'pot-large-terracotta';

        if (!this.inventory.hasItem(potItemId)) {
            console.warn(`Cannot place pot: ${potItemId} not in inventory`);
            return null;
        }

        // Check if paver spot is already occupied
        for (const { data } of this.pots.values()) {
            if (data.paverIndex === paverIndex) {
                console.warn(`Paver spot ${paverIndex} already has a pot`);
                return null;
            }
        }

        // Create pot
        const pot = new Pot(potType);
        pot.setPosition(position.x, position.y, position.z);

        // Create pot data
        const potId = `pot-${this.nextPotId++}`;
        const potData: PotData = {
            potId,
            potType,
            paverIndex,
            position,
            hasSoil: false,
            hasPlant: false
        };

        // Store pot
        this.pots.set(potId, { pot, data: potData });

        // Consume pot from inventory (pots are single-use placements)
        this.inventory.removeItem(potItemId, 1);

        // Advance tutorial if on PLACE_POT step
        if (this.tutorialSystem.getCurrentStep() === TutorialStep.PLACE_POT) {
            this.tutorialSystem.nextStep();
        }

        this.save();
        console.log(`🪴 Placed ${potType} pot at paver ${paverIndex}`);

        return { pot, potId };
    }

    /**
     * Add soil to an empty pot
     */
    public addSoil(potId: string, soilItemId: string): boolean {
        const potEntry = this.pots.get(potId);
        if (!potEntry) {
            console.warn(`Cannot add soil: pot ${potId} not found`);
            return false;
        }

        if (potEntry.data.hasSoil) {
            console.warn(`Cannot add soil: pot ${potId} already has soil`);
            return false;
        }

        // Check if player has this soil in inventory
        if (!this.inventory.hasItem(soilItemId)) {
            console.warn(`Cannot add soil: ${soilItemId} not in inventory`);
            return false;
        }

        // Determine drainage type based on soil
        const drainage = this.getSoilDrainage(soilItemId);

        // Apply soil to pot
        potEntry.pot.getSoil().setDrainage(drainage);
        potEntry.pot.showSoil(); // Make soil visible
        potEntry.data.hasSoil = true;
        potEntry.data.soilType = soilItemId;
        potEntry.data.drainage = drainage;

        // Consume soil from inventory
        this.inventory.removeItem(soilItemId, 1);

        // Advance tutorial if on ADD_SOIL step
        if (this.tutorialSystem.getCurrentStep() === TutorialStep.ADD_SOIL) {
            this.tutorialSystem.nextStep();
        }

        this.save();
        console.log(`🟤 Added ${soilItemId} to pot ${potId}`);

        return true;
    }

    /**
     * Plant a seed or plant in a soil-filled pot
     */
    public plantSeed(potId: string, plantItemId: string): boolean {
        const potEntry = this.pots.get(potId);
        if (!potEntry) {
            console.warn(`Cannot plant: pot ${potId} not found`);
            return false;
        }

        if (!potEntry.data.hasSoil) {
            console.warn(`Cannot plant: pot ${potId} has no soil`);
            return false;
        }

        if (potEntry.data.hasPlant) {
            console.warn(`Cannot plant: pot ${potId} already has a plant`);
            return false;
        }

        // Check if player has this plant/seed in inventory
        if (!this.inventory.hasItem(plantItemId)) {
            console.warn(`Cannot plant: ${plantItemId} not in inventory`);
            return false;
        }

        // Create plant based on item type
        const plant = this.createPlantFromItem(plantItemId);
        if (!plant) {
            console.warn(`Cannot plant: unknown plant item ${plantItemId}`);
            return false;
        }

        // Add plant to pot
        potEntry.pot.addPlant(plant);
        potEntry.data.hasPlant = true;
        potEntry.data.plantType = plantItemId;
        potEntry.data.plantPreset = this.getPlantPreset(plantItemId);

        // Consume plant/seed from inventory
        this.inventory.removeItem(plantItemId, 1);

        // Advance tutorial if on PLANT_SEED step
        if (this.tutorialSystem.getCurrentStep() === TutorialStep.PLANT_SEED) {
            this.tutorialSystem.nextStep();
        }

        this.save();
        console.log(`🌱 Planted ${plantItemId} in pot ${potId}`);

        return true;
    }

    /**
     * Get all placed pots
     */
    public getAllPots(): Map<string, { pot: Pot; data: PotData }> {
        return this.pots;
    }

    /**
     * Get pot by ID
     */
    public getPot(potId: string): { pot: Pot; data: PotData } | undefined {
        return this.pots.get(potId);
    }

    /**
     * Check if a paver spot is occupied
     */
    public isPaverOccupied(paverIndex: number): boolean {
        for (const { data } of this.pots.values()) {
            if (data.paverIndex === paverIndex) {
                return true;
            }
        }
        return false;
    }

    /**
     * Update all pots (water depletion, etc.)
     */
    public update(deltaTime: number): void {
        for (const { pot } of this.pots.values()) {
            pot.update(deltaTime);
        }
    }

    /**
     * Determine drainage type based on soil item
     */
    private getSoilDrainage(soilItemId: string): DrainageType {
        switch (soilItemId) {
            case 'potting-soil':
                return 'medium';
            case 'compost':
                return 'poor'; // Rich organic matter retains water
            case 'perlite':
                return 'good'; // Excellent drainage
            default:
                return 'medium';
        }
    }

    /**
     * Create plant from shop item ID
     */
    private createPlantFromItem(plantItemId: string): Plant3D | null {
        switch (plantItemId) {
            case 'plant-young-avocado':
                return Plant3D.createSapling();
            case 'plant-mature-avocado':
                return Plant3D.createTree();
            case 'plant-fern':
                return Plant3D.createFern();
            default:
                return null;
        }
    }

    /**
     * Get plant preset name from item ID
     */
    private getPlantPreset(plantItemId: string): string {
        switch (plantItemId) {
            case 'plant-young-avocado':
                return 'sapling';
            case 'plant-mature-avocado':
                return 'tree';
            case 'plant-fern':
                return 'fern';
            default:
                return 'sapling';
        }
    }

    /**
     * Save placed pots to localStorage
     */
    private save(): void {
        const saveData = Array.from(this.pots.values()).map(({ data }) => data);

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                pots: saveData,
                nextPotId: this.nextPotId,
                lastSaved: Date.now()
            }));
        } catch (error) {
            console.error('Failed to save placed pots:', error);
        }
    }

    /**
     * Load placed pots from localStorage
     */
    private load(): void {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const saveData = JSON.parse(saved);
                this.nextPotId = saveData.nextPotId || 1;

                // Note: We don't reconstruct the pots here because they need
                // to be added to the scene. The HomePodule will call this
                // during initialization and handle scene integration.

                console.log(`🪴 Found ${saveData.pots.length} saved pots (will be loaded by HomePodule)`);
            } else {
                console.log('🪴 No saved pots found');
            }
        } catch (error) {
            console.error('Failed to load placed pots:', error);
        }
    }

    /**
     * Get saved pot data for restoration
     */
    public getSavedPotData(): PotData[] {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const saveData = JSON.parse(saved);
                return saveData.pots || [];
            }
        } catch (error) {
            console.error('Failed to get saved pot data:', error);
        }
        return [];
    }

    /**
     * Restore a pot from saved data (called by HomePodule during load)
     */
    public restorePot(data: PotData): Pot {
        const pot = new Pot(data.potType);
        pot.setPosition(data.position.x, data.position.y, data.position.z);

        // Restore soil if present
        if (data.hasSoil && data.drainage) {
            pot.getSoil().setDrainage(data.drainage);
            pot.showSoil(); // Show soil mesh for saved pots with soil
        }

        // Restore plant if present
        if (data.hasPlant && data.plantType) {
            const plant = this.createPlantFromItem(data.plantType);
            if (plant) {
                pot.addPlant(plant);
            }
        }

        // Store in active pots map
        this.pots.set(data.potId, { pot, data });

        return pot;
    }

    /**
     * Reset all pots (for testing)
     */
    public reset(): void {
        this.pots.clear();
        this.nextPotId = 1;
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('🪴 All pots reset');
    }
}


