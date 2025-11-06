import * as THREE from 'three';
import { BasePodule } from './BasePodule';
import { GrassGround } from '../environment/GrassGround';
import { Pavers } from '../environment/Pavers';
import { Pot } from '../containers/Pot';
import { Plant3D } from '../plants/Plant3D';
import type { PoduleConfig, IClickable } from '../types';
import type { Inventory } from '../inventory/Inventory';
import type { PlantInspectionUI } from '../ui/PlantInspectionUI';

/**
 * HomePodule - The main garden/backyard area
 * 
 * Contains the player's garden with grass, pavers, pots, and plants.
 * This is where plant management and growth happens.
 */
export class HomePodule extends BasePodule implements IClickable {
    private grassGround: GrassGround;
    private pavers: Pavers;
    private pot: Pot;
    private plants: Plant3D[];
    private elapsedTime: number = 0;
    private raycaster: THREE.Raycaster;
    private inspectionUI: PlantInspectionUI | null = null;

    constructor(
        config: PoduleConfig,
        private inventory: Inventory,
        plantInspectionUI: PlantInspectionUI
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

        // Create pot container
        this.pot = new Pot('small');
        this.pot.setPosition(0, 0, 0); // Center of pavers
        this.group.add(this.pot.getGroup());

        // Initialize plants
        this.plants = [];
        this.addTestPlants();
    }

    /**
     * Add test plants to the pot
     * Demonstrates plant positioning inside container
     */
    private addTestPlants(): void {
        // Create a small fern and add it to the pot
        const fern = Plant3D.createFern();
        this.pot.addPlant(fern);
        this.plants.push(fern);
    }

    public update(deltaTime: number): void {
        // Update elapsed time (for leaf swaying animation)
        this.elapsedTime += deltaTime;

        // Update plants (for wind animation on leaves)
        this.plants.forEach(plant => plant.update(this.elapsedTime));

        // Update pot (water depletion)
        this.pot.update(deltaTime);
    }

    /**
     * Handle mouse click - check if pot was clicked
     */
    public handleClick(mouse: THREE.Vector2, camera: THREE.Camera): boolean {
        this.raycaster.setFromCamera(mouse, camera);

        // Check if pot was clicked
        const potGroup = this.pot.getGroup();
        const intersects = this.raycaster.intersectObjects(potGroup.children, true);

        if (intersects.length > 0) {
            // Pot clicked - open inspection UI
            if (this.inspectionUI) {
                this.inspectionUI.show(this.pot);
            }
            return true;
        }

        return false;
    }

    /**
     * Handle mouse move - show hover feedback
     */
    public handleMouseMove(mouse: THREE.Vector2, camera: THREE.Camera): void {
        this.raycaster.setFromCamera(mouse, camera);

        // Check if hovering over pot
        const potGroup = this.pot.getGroup();
        const intersects = this.raycaster.intersectObjects(potGroup.children, true);

        if (intersects.length > 0) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'default';
        }
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
        this.pot.dispose();
        this.plants.forEach(plant => plant.dispose());
    }
}

