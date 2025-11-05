import './style.css';
import * as THREE from 'three';
import { SceneManager } from './scene/Scene';
import { CameraManager } from './scene/Camera';
import { LightingManager } from './scene/Lighting';
import { GlassDome } from './environment/GlassDome';
import { GrassGround } from './environment/GrassGround';
import { Pavers } from './environment/Pavers';
import { Pot } from './containers/Pot';
import { Plant3D } from './plants/Plant3D';
import type { TerrariumConfig, LightingConfig, CameraConfig } from './types';

class Botanica {
    private sceneManager: SceneManager;
    private cameraManager: CameraManager;
    // Lighting manager is used for initialization but may be needed for future controls
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private lightingManager: LightingManager;
    private glassDome: GlassDome;
    private grassGround: GrassGround;
    private pavers: Pavers;
    private pot: Pot;
    private plants: Plant3D[];
    private elapsedTime: number;

    constructor() {
        // Configuration
        const terrariumConfig: TerrariumConfig = {
            radius: 4.0, // 10 = can fit tree
            soilColor: 0x654321,
            backgroundColor: 0xf0f0f0
        };

        const lightingConfig: LightingConfig = {
            ambientIntensity: 0.2, // Reduced from 0.4 for better 3D definition
            sunIntensity: 1.0, // Increased from 0.8 for stronger shadows
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

        // Create backyard environment inside dome
        this.grassGround = new GrassGround(terrariumConfig.radius);
        this.sceneManager.add(this.grassGround.getMesh());

        this.pavers = new Pavers(9, 0.8, 0.1);
        this.sceneManager.add(this.pavers.getGroup());

        this.glassDome = new GlassDome(terrariumConfig.radius);
        this.sceneManager.add(this.glassDome.getMesh());

        // Create pot container
        this.pot = new Pot('small');
        this.pot.setPosition(0, 0, 0); // Center of pavers
        this.sceneManager.add(this.pot.getGroup());

        // Create plants
        this.plants = [];
        this.elapsedTime = 0;
        this.addTestPlants();

        // Start animation loop
        this.animate();

        console.log('🌿 Botanica initialized!');
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

    private animate = (): void => {
        requestAnimationFrame(this.animate);

        // Update elapsed time (for leaf swaying animation)
        this.elapsedTime += 0.0005; // Very subtle animation - minimal swaying

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
        this.grassGround.dispose();
        this.pavers.dispose();
        this.pot.dispose();
        this.plants.forEach(plant => plant.dispose());
    }
}

// Initialize application
new Botanica();

