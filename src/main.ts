import './style.css';
import * as THREE from 'three';
import { SceneManager } from './scene/Scene';
import { CameraManager } from './scene/Camera';
import { LightingManager } from './scene/Lighting';
import { GlassDome } from './terrarium/GlassDome';
import { Soil } from './terrarium/Soil';
import { Plant3D } from './plants/Plant3D';
import type { TerrariumConfig, LightingConfig, CameraConfig } from './types';

class Botanica {
    private sceneManager: SceneManager;
    private cameraManager: CameraManager;
    // Lighting manager is used for initialization but may be needed for future controls
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private lightingManager: LightingManager;
    private glassDome: GlassDome;
    private soil: Soil;
    private plants: Plant3D[];
    private elapsedTime: number;

    constructor() {
        // Configuration
        const terrariumConfig: TerrariumConfig = {
            radius: 1.5,
            soilColor: 0x654321,
            backgroundColor: 0xf0f0f0
        };

        const lightingConfig: LightingConfig = {
            ambientIntensity: 0.4,
            sunIntensity: 0.8,
            sunColor: 0xfff4e6
        };

        const cameraConfig: CameraConfig = {
            fov: 75,
            near: 0.1,
            far: 1000,
            initialPosition: { x: 0, y: 2, z: 3 }
        };

        // Initialize core systems
        const container = document.getElementById('app');
        if (!container) {
            throw new Error('App container not found');
        }

        this.sceneManager = new SceneManager(container, terrariumConfig);
        this.cameraManager = new CameraManager(this.sceneManager.renderer, cameraConfig);
        this.lightingManager = new LightingManager(this.sceneManager.scene, lightingConfig);

        // Create terrarium
        this.soil = new Soil(terrariumConfig.radius, terrariumConfig.soilColor);
        this.sceneManager.add(this.soil.getMesh());

        this.glassDome = new GlassDome(terrariumConfig.radius);
        this.sceneManager.add(this.glassDome.getMesh());

        // Create plants
        this.plants = [];
        this.elapsedTime = 0;
        this.addTestPlants();

        // Start animation loop
        this.animate();

        console.log('🌿 Botanica initialized!');
    }

    /**
     * Add test plants to the terrarium
     * Demonstrates different plant types using the new Plant3D system
     */
    private addTestPlants(): void {
        // Create a small fern at the center
        const fern = Plant3D.createFern();
        fern.getMesh().position.set(0, 0, 0);
        this.sceneManager.add(fern.getMesh());
        this.plants.push(fern);

        console.log('🌱 3D fern planted at origin');
        console.log('   Config:', fern.getConfig());
        console.log('   Performance:', fern.getMetrics());
        console.log('   Bounding box:', fern.getMesh().children[0]?.geometry?.boundingBox);

        // Uncomment to add more plants:

        // Add a small bush to the left
        // const bush = Plant3D.createBush({ size: 'small' });
        // bush.getMesh().position.set(-0.8, 0, 0.3);
        // this.sceneManager.add(bush.getMesh());
        // this.plants.push(bush);

        // Add a small tree to the right
        // const tree = Plant3D.createTree({ size: 'small', trunkHeight: 5 });
        // tree.getMesh().position.set(0.8, 0, -0.3);
        // this.sceneManager.add(tree.getMesh());
        // this.plants.push(tree);
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);

        // Update elapsed time (for leaf swaying animation)
        this.elapsedTime += 0.016; // Approximate delta time

        // Update plants (for wind animation on leaves)
        this.plants.forEach(plant => plant.update(this.elapsedTime));

        // Update controls
        this.cameraManager.update();

        // Render scene
        this.sceneManager.renderer.render(
            this.sceneManager.scene,
            this.cameraManager.camera
        );
    };

    public dispose(): void {
        this.sceneManager.dispose();
        this.cameraManager.dispose();
        this.glassDome.dispose();
        this.soil.dispose();
        this.plants.forEach(plant => plant.dispose());
    }
}

// Initialize application
new Botanica();

