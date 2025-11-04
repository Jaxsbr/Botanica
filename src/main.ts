import './style.css';
import * as THREE from 'three';
import { SceneManager } from './scene/Scene';
import { CameraManager } from './scene/Camera';
import { LightingManager } from './scene/Lighting';
import { GlassDome } from './terrarium/GlassDome';
import { Soil } from './terrarium/Soil';
import { Plant } from './plants/Plant';
import { FERN_RULES, DEFAULT_PLANT_CONFIG } from './plants/presets';
import type { TerrariumConfig, LightingConfig, CameraConfig } from './types';

class Botanica {
    private sceneManager: SceneManager;
    private cameraManager: CameraManager;
    // Lighting manager is used for initialization but may be needed for future controls
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private lightingManager: LightingManager;
    private glassDome: GlassDome;
    private soil: Soil;
    private plants: Plant[];

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
        this.addTestPlant();

        // Start animation loop
        this.animate();

        console.log('🌿 Botanica initialized!');
    }

    /**
     * Add a test plant to the terrarium
     */
    private addTestPlant(): void {
        const plant = new Plant(
            new THREE.Vector3(0, 0, 0), // Position at origin
            FERN_RULES,
            DEFAULT_PLANT_CONFIG
        );

        this.sceneManager.add(plant.getMesh());
        this.plants.push(plant);

        console.log('🌱 Test fern planted at origin');
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);

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

