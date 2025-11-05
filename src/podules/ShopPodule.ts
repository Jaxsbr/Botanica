import * as THREE from 'three';
import { BasePodule } from './BasePodule';
import { Plant3D } from '../plants/Plant3D';
import { ShopHotspot } from '../shop/Hotspot';
import { HotspotManager } from '../shop/HotspotManager';
import { ShopCategoryUI } from '../ui/ShopCategoryUI';
import type { PoduleConfig } from '../types';

/**
 * ShopPodule - Interactive plant nursery with 3D environment and hotspots
 * 
 * Creates an immersive nursery scene with indoor building, outdoor covered area,
 * product displays, and interactive hotspots for browsing shop categories.
 */
export class ShopPodule extends BasePodule {
    private groundPlane: THREE.Mesh;
    private building!: THREE.Group;
    private outdoorArea!: THREE.Group;
    private plants: Plant3D[] = [];
    private hotspotManager: HotspotManager;
    private shopUI: ShopCategoryUI;
    private elapsedTime: number = 0;

    constructor(config: PoduleConfig, camera: THREE.Camera) {
        // Shop podule uses larger size (8.0 radius) for spacious nursery
        super('shop', config, 8.0);

        // Initialize UI and managers
        this.shopUI = new ShopCategoryUI();
        this.hotspotManager = new HotspotManager(camera);

        // Wire up hotspot clicks to show shop UI
        this.hotspotManager.onClick((category) => {
            this.shopUI.show(category);
        });

        // Create ground plane
        const geometry = new THREE.CircleGeometry(this.radius * 0.95, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0x8B7355, // Wood-like floor color
            roughness: 0.8,
            metalness: 0.1
        });

        this.groundPlane = new THREE.Mesh(geometry, material);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.receiveShadow = true;
        this.group.add(this.groundPlane);

        // Build the nursery scene
        this.createBuilding();
        this.createOutdoorArea();
        this.createProductDisplays();
        this.createHotspots();

        console.log('🛒 Plant nursery shop created with interactive hotspots');
    }

    /**
     * Create the indoor building structure
     */
    private createBuilding(): void {
        this.building = new THREE.Group();

        // Position at back of dome (doubled spacing)
        this.building.position.set(0, 0, -5.5);

        // Floor (doubled size)
        const floorGeometry = new THREE.BoxGeometry(5.0, 0.1, 3.0);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x6B4423,
            roughness: 0.9
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.y = 0.05;
        this.building.add(floor);

        // Back wall (doubled)
        const wallGeometry = new THREE.BoxGeometry(5.0, 3.0, 0.1);
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xDDDDDD,
            roughness: 0.8
        });
        const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
        backWall.position.set(0, 1.5, -1.5);
        this.building.add(backWall);

        // Side walls (doubled)
        const sideWallGeometry = new THREE.BoxGeometry(0.1, 3.0, 3.0);
        const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        leftWall.position.set(-2.5, 1.5, 0);
        this.building.add(leftWall);

        const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        rightWall.position.set(2.5, 1.5, 0);
        this.building.add(rightWall);

        // Counter at back (doubled)
        const counterGeometry = new THREE.BoxGeometry(4.0, 1.0, 0.8);
        const counterMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.6
        });
        const counter = new THREE.Mesh(counterGeometry, counterMaterial);
        counter.position.set(0, 0.5, -1.0);
        this.building.add(counter);

        // Tool display board on back wall (doubled)
        const toolBoardGeometry = new THREE.PlaneGeometry(3.0, 2.0);
        const toolBoardMaterial = new THREE.MeshStandardMaterial({
            color: 0x5D4E37,
            roughness: 0.9
        });
        const toolBoard = new THREE.Mesh(toolBoardGeometry, toolBoardMaterial);
        toolBoard.position.set(-1.0, 2.0, -1.44);
        this.building.add(toolBoard);

        // Small potted plants on counter (decoration, spaced out)
        const decorPlant1 = Plant3D.createFern();
        const decorMesh1 = decorPlant1.getMesh();
        decorMesh1.scale.setScalar(0.5);
        decorMesh1.position.set(1.5, 1.0, -1.0);
        this.building.add(decorMesh1);
        this.plants.push(decorPlant1);

        // Second decorative plant
        const decorPlant2 = Plant3D.createFern();
        const decorMesh2 = decorPlant2.getMesh();
        decorMesh2.scale.setScalar(0.5);
        decorMesh2.position.set(-1.5, 1.0, -1.0);
        this.building.add(decorMesh2);
        this.plants.push(decorPlant2);

        this.group.add(this.building);
    }

    /**
     * Create the outdoor covered area
     */
    private createOutdoorArea(): void {
        this.outdoorArea = new THREE.Group();

        // Shade cloth canopy (semi-transparent, doubled size)
        const canopyGeometry = new THREE.PlaneGeometry(7.0, 6.0);
        const canopyMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            roughness: 0.9
        });
        const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
        canopy.rotation.x = -Math.PI / 2;
        canopy.position.y = 3.5; // Higher ceiling
        canopy.position.z = 1.0;
        this.outdoorArea.add(canopy);

        // Support poles (taller and more spaced out)
        const poleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 3.5);
        const poleMaterial = new THREE.MeshStandardMaterial({
            color: 0x4A4A4A,
            metalness: 0.5,
            roughness: 0.5
        });

        const polePositions = [
            [-3.0, 1.75, -1.5],
            [3.0, 1.75, -1.5],
            [-3.0, 1.75, 3.5],
            [3.0, 1.75, 3.5]
        ];

        polePositions.forEach(pos => {
            const pole = new THREE.Mesh(poleGeometry, poleMaterial);
            pole.position.set(pos[0], pos[1], pos[2]);
            this.outdoorArea.add(pole);
        });

        // Plant rows under canopy
        this.createPlantRows();

        this.group.add(this.outdoorArea);
    }

    /**
     * Create rows of plants for sale
     */
    private createPlantRows(): void {
        // Row 1: Small ferns (more plants, wider spacing)
        for (let i = 0; i < 7; i++) {
            const plant = Plant3D.createFern();
            const mesh = plant.getMesh();
            mesh.scale.setScalar(0.6);
            mesh.position.set(-3.5 + i * 1.2, 0, -0.5);
            this.outdoorArea.add(mesh);
            this.plants.push(plant);
        }

        // Row 2: Bushes (more plants, wider spacing)
        for (let i = 0; i < 6; i++) {
            const plant = Plant3D.createBush();
            const mesh = plant.getMesh();
            mesh.scale.setScalar(0.8);
            mesh.position.set(-3.0 + i * 1.2, 0, 1.0);
            this.outdoorArea.add(mesh);
            this.plants.push(plant);
        }

        // Row 3: Small trees (more plants, wider spacing)
        for (let i = 0; i < 5; i++) {
            const plant = Plant3D.createSapling();
            const mesh = plant.getMesh();
            mesh.scale.setScalar(1.0);
            mesh.position.set(-2.5 + i * 1.3, 0, 2.5);
            this.outdoorArea.add(mesh);
            this.plants.push(plant);
        }
    }

    /**
     * Create product displays (soil bags, pots, etc.)
     */
    private createProductDisplays(): void {
        // Soil bag stacks (left side, bigger and more spread out)
        const soilBagGeometry = new THREE.BoxGeometry(0.6, 0.7, 0.4);
        const soilBagMaterial = new THREE.MeshStandardMaterial({
            color: 0x654321,
            roughness: 0.9
        });

        // Four stacks of soil bags (more inventory)
        for (let stack = 0; stack < 4; stack++) {
            for (let i = 0; i < 4; i++) {
                const bag = new THREE.Mesh(soilBagGeometry, soilBagMaterial);
                bag.position.set(-5.0 + stack * 0.7, 0.35 + i * 0.7, 3.5);
                this.group.add(bag);
            }
        }

        // Pot stacks (right side, bigger and more spread out)
        const potGeometry = new THREE.CylinderGeometry(0.25, 0.2, 0.4, 16);
        const potMaterial = new THREE.MeshStandardMaterial({
            color: 0xCD853F,
            roughness: 0.8
        });

        // Multiple pot stacks (more variety)
        for (let stack = 0; stack < 5; stack++) {
            for (let i = 0; i < 5; i++) {
                const pot = new THREE.Mesh(potGeometry, potMaterial);
                pot.position.set(3.5 + stack * 0.6, 0.2 + i * 0.4, 3.5);
                this.group.add(pot);
            }
        }

        // Fertilizer bottles on building counter (more bottles, spread out)
        const bottleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8);
        const bottleMaterial = new THREE.MeshStandardMaterial({
            color: 0x4169E1,
            roughness: 0.3,
            metalness: 0.2
        });

        for (let i = 0; i < 6; i++) {
            const bottle = new THREE.Mesh(bottleGeometry, bottleMaterial);
            bottle.position.set(-1.5 + i * 0.6, 1.2, -6.0);
            this.group.add(bottle);
        }
    }

    /**
     * Create interactive hotspots
     */
    private createHotspots(): void {
        // Tools hotspot (on tool board in building, larger and repositioned)
        const toolsHotspot = new ShopHotspot(
            'tools',
            'Garden Tools',
            new THREE.Vector3(-1.0, 2.0, -5.0),
            new THREE.Vector3(1.5, 1.2, 0.5)
        );
        this.hotspotManager.addHotspot(toolsHotspot);

        // Pots hotspot (right side pot stacks, larger area)
        const potsHotspot = new ShopHotspot(
            'pots',
            'Pots & Containers',
            new THREE.Vector3(4.5, 1.0, 3.5),
            new THREE.Vector3(2.0, 2.0, 1.0)
        );
        this.hotspotManager.addHotspot(potsHotspot);

        // Fertilizers hotspot (counter bottles, repositioned)
        const fertilizersHotspot = new ShopHotspot(
            'fertilizers',
            'Fertilizers',
            new THREE.Vector3(0, 1.2, -5.8),
            new THREE.Vector3(2.5, 0.8, 0.6)
        );
        this.hotspotManager.addHotspot(fertilizersHotspot);

        // Soil hotspot (left side bag stacks, larger area)
        const soilHotspot = new ShopHotspot(
            'soil',
            'Soil Products',
            new THREE.Vector3(-4.0, 1.2, 3.5),
            new THREE.Vector3(2.0, 2.5, 1.0)
        );
        this.hotspotManager.addHotspot(soilHotspot);

        // Outdoor plants hotspot (plant rows, much larger to cover all rows)
        const outdoorPlantsHotspot = new ShopHotspot(
            'outdoor-plants',
            'Outdoor Plants',
            new THREE.Vector3(0, 0.6, 1.0),
            new THREE.Vector3(6.0, 1.2, 3.0)
        );
        this.hotspotManager.addHotspot(outdoorPlantsHotspot);

        // Add all hotspot groups to scene
        this.hotspotManager.getHotspotGroups().forEach(group => {
            this.group.add(group);
        });
    }

    public update(deltaTime: number): void {
        this.elapsedTime += deltaTime;

        // Update plants (leaf animation)
        this.plants.forEach(plant => plant.update(this.elapsedTime));

        // Update hotspots (pulsing animation)
        this.hotspotManager.update(deltaTime);
    }

    protected onActivate(): void {
        console.log('🛒 Plant nursery activated');
        // Hotspots are always visible, shop UI opens on click
    }

    protected onDeactivate(): void {
        console.log('🛒 Plant nursery deactivated');
        // Hide shop UI if it's open
        if (this.shopUI.getIsVisible()) {
            this.shopUI.hide();
        }
    }

    protected onDispose(): void {
        this.groundPlane.geometry.dispose();
        if (this.groundPlane.material instanceof THREE.Material) {
            this.groundPlane.material.dispose();
        }

        this.plants.forEach(plant => plant.dispose());
        this.hotspotManager.dispose();
        this.shopUI.dispose();
    }
}

