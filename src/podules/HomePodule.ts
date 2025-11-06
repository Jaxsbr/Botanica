import * as THREE from 'three';
import { BasePodule } from './BasePodule';
import { GrassGround } from '../environment/GrassGround';
import { Pavers } from '../environment/Pavers';
import { Pot } from '../containers/Pot';
import { Plant3D } from '../plants/Plant3D';
import { PlantingSystem } from '../systems/PlantingSystem';
import { PlantingPromptUI } from '../ui/PlantingPromptUI';
import type { PoduleConfig, IClickable } from '../types';
import type { Inventory } from '../inventory/Inventory';
import type { PlantInspectionUI } from '../ui/PlantInspectionUI';
import { InputManager } from '../systems/InputManager';

/**
 * HomePodule - The main garden/backyard area
 * 
 * Contains the player's garden with grass, pavers, pots, and plants.
 * This is where plant management and growth happens.
 */
export class HomePodule extends BasePodule implements IClickable {
    private grassGround: GrassGround;
    private pavers: Pavers;
    private plants: Plant3D[];
    private elapsedTime: number = 0;
    private raycaster: THREE.Raycaster;
    private inspectionUI: PlantInspectionUI | null = null;
    private plantingSystem: PlantingSystem;
    private plantingPromptUI: PlantingPromptUI;

    constructor(
        config: PoduleConfig,
        private inventory: Inventory,
        plantInspectionUI: PlantInspectionUI,
        inputManager: InputManager
    ) {
        // Home podule uses original smaller size (4.0 radius)
        super('home', config, 4.0);

        this.raycaster = new THREE.Raycaster();
        this.inspectionUI = plantInspectionUI;

        // Create backyard environment inside dome
        this.grassGround = new GrassGround(this.radius);
        this.group.add(this.grassGround.getMesh());

        this.pavers = new Pavers(9, 0.8, 0.1);
        this.group.add(this.pavers.getGroup());

        // Initialize planting system
        this.plantingSystem = new PlantingSystem(inventory);
        this.plantingPromptUI = new PlantingPromptUI(inventory, this.plantingSystem, inputManager);

        // Initialize plants array
        this.plants = [];

        // Load any previously placed pots
        this.loadSavedPots();
    }

    /**
     * Load previously saved pots from localStorage
     */
    private loadSavedPots(): void {
        const savedPots = this.plantingSystem.getSavedPotData();

        if (savedPots.length === 0) {
            console.log('🏠 No saved pots to load');
            return;
        }

        savedPots.forEach(potData => {
            const pot = this.plantingSystem.restorePot(potData);
            this.group.add(pot.getGroup());

            // Track plants for animation updates
            const plant = pot.getPlant();
            if (plant) {
                this.plants.push(plant);
            }
        });

        console.log(`🏠 Loaded ${savedPots.length} pots from save data`);
    }

    public update(deltaTime: number): void {
        // Update elapsed time (for leaf swaying animation)
        this.elapsedTime += deltaTime;

        // Update plants (for wind animation on leaves)
        this.plants.forEach(plant => plant.update(this.elapsedTime));

        // Update all pots via planting system (water depletion)
        this.plantingSystem.update(deltaTime);
    }

    /**
     * Handle mouse click - check if paver or pot was clicked
     */
    public handleClick(mouse: THREE.Vector2, camera: THREE.Camera): boolean {
        this.raycaster.setFromCamera(mouse, camera);

        // First, check if a pot was clicked
        const allPots = this.plantingSystem.getAllPots();
        for (const [potId, { pot, data }] of allPots) {
            const potGroup = pot.getGroup();
            const potIntersects = this.raycaster.intersectObjects(potGroup.children, true);

            if (potIntersects.length > 0) {
                this.handlePotClick(potId, pot, data);
                return true;
            }
        }

        // Check if a paver was clicked (for pot placement)
        const pavers = this.pavers.getPavers();
        const paverIntersects = this.raycaster.intersectObjects(pavers, false);

        if (paverIntersects.length > 0) {
            const paver = paverIntersects[0].object as THREE.Mesh;
            const paverIndex = paver.userData.paverIndex as number;
            this.handlePaverClick(paverIndex);
            return true;
        }

        return false;
    }

    /**
     * Handle clicking on a paver (pot placement)
     */
    private handlePaverClick(paverIndex: number): void {
        // Check if paver is already occupied
        if (this.plantingSystem.isPaverOccupied(paverIndex)) {
            console.log('This spot already has a pot');
            return;
        }

        // Show pot placement UI
        this.plantingPromptUI.showPlacePotPrompt({
            onPlacePot: (potType) => {
                const position = this.pavers.getPaverPosition(paverIndex);
                if (!position) return;

                const result = this.plantingSystem.placePot(paverIndex, position, potType);
                if (result) {
                    // Add pot to scene
                    this.group.add(result.pot.getGroup());
                    console.log(`✅ Placed ${potType} pot on paver ${paverIndex}`);
                }
            },
            onCancel: () => {
                console.log('Pot placement cancelled');
            }
        });
    }

    /**
     * Handle clicking on a pot
     */
    private handlePotClick(potId: string, pot: Pot, data: any): void {
        // Determine what action to take based on pot state
        if (!data.hasSoil) {
            // Empty pot - add soil
            this.plantingPromptUI.showAddSoilPrompt({
                onAddSoil: (soilItemId) => {
                    const success = this.plantingSystem.addSoil(potId, soilItemId);
                    if (success) {
                        console.log(`✅ Added soil to pot ${potId}`);
                    }
                },
                onCancel: () => {
                    console.log('Soil addition cancelled');
                }
            });
        } else if (!data.hasPlant) {
            // Has soil but no plant - plant something
            this.plantingPromptUI.showPlantSeedPrompt({
                onPlantSeed: (plantItemId) => {
                    const success = this.plantingSystem.plantSeed(potId, plantItemId);
                    if (success) {
                        // Track the new plant for animations
                        const plant = pot.getPlant();
                        if (plant) {
                            this.plants.push(plant);
                        }
                        console.log(`✅ Planted ${plantItemId} in pot ${potId}`);
                    }
                },
                onCancel: () => {
                    console.log('Planting cancelled');
                }
            });
        } else {
            // Has plant - open inspection UI
            if (this.inspectionUI) {
                this.inspectionUI.show(pot);
            }
        }
    }

    /**
     * Handle mouse move - show hover feedback
     */
    public handleMouseMove(mouse: THREE.Vector2, camera: THREE.Camera): void {
        this.raycaster.setFromCamera(mouse, camera);

        // Check if hovering over any pot
        const allPots = this.plantingSystem.getAllPots();
        for (const { pot } of allPots.values()) {
            const potGroup = pot.getGroup();
            const potIntersects = this.raycaster.intersectObjects(potGroup.children, true);

            if (potIntersects.length > 0) {
                document.body.style.cursor = 'pointer';
                return;
            }
        }

        // Check if hovering over paver
        const pavers = this.pavers.getPavers();
        const paverIntersects = this.raycaster.intersectObjects(pavers, false);

        if (paverIntersects.length > 0) {
            const paver = paverIntersects[0].object as THREE.Mesh;
            const paverIndex = paver.userData.paverIndex as number;

            // Only show pointer if paver is empty
            if (!this.plantingSystem.isPaverOccupied(paverIndex)) {
                document.body.style.cursor = 'pointer';
                return;
            }
        }

        document.body.style.cursor = 'default';
    }

    protected onActivate(): void {
        // Resume any paused systems when returning to home
        console.log('🏠 Home podule activated');
    }

    protected onDeactivate(): void {
        // Pause any systems when leaving home
        console.log('🏠 Home podule deactivated');
    }

    protected onDispose(): void {
        this.grassGround.dispose();
        this.pavers.dispose();
        this.plantingPromptUI.dispose();

        // Dispose all pots through planting system
        const allPots = this.plantingSystem.getAllPots();
        for (const { pot } of allPots.values()) {
            pot.dispose();
        }

        // Dispose all plants (already tracked)
        this.plants.forEach(plant => plant.dispose());
    }
}

