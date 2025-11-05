import './style.css';
import { SceneManager } from './scene/Scene';
import { CameraManager } from './scene/Camera';
import { LightingManager } from './scene/Lighting';
import { PoduleManager } from './podules/PoduleManager';
import { HomePodule } from './podules/HomePodule';
import { ShopPodule } from './podules/ShopPodule';
import { NavigationUI } from './ui/NavigationUI';
import { TransitionOverlay } from './ui/TransitionOverlay';
import type { PoduleConfig, LightingConfig, CameraConfig } from './types';

class Botanica {
    private sceneManager: SceneManager;
    private cameraManager: CameraManager;
    // Lighting manager is used for initialization but may be needed for future controls
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private lightingManager: LightingManager;
    private poduleManager: PoduleManager;
    private navigationUI: NavigationUI;
    private transitionOverlay: TransitionOverlay;
    private deltaTime: number = 0.0005; // Time delta for animations

    constructor() {
        // Configuration
        const poduleConfig: PoduleConfig = {
            radius: 4.0,
            soilColor: 0x654321,
            backgroundColor: 0xf0f0f0
        };

        const lightingConfig: LightingConfig = {
            ambientIntensity: 0.2,
            sunIntensity: 1.0,
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

        this.sceneManager = new SceneManager(container, poduleConfig);
        this.cameraManager = new CameraManager(this.sceneManager.renderer, cameraConfig);
        this.lightingManager = new LightingManager(this.sceneManager.scene, lightingConfig);

        // Initialize podule system
        this.poduleManager = new PoduleManager(this.sceneManager.scene);

        // Create podules
        const homePodule = new HomePodule(poduleConfig);
        const shopPodule = new ShopPodule(poduleConfig);

        this.poduleManager.addPodule(homePodule);
        this.poduleManager.addPodule(shopPodule);

        // Initialize UI
        this.transitionOverlay = new TransitionOverlay(300);
        this.navigationUI = new NavigationUI();

        // Wire up navigation
        this.navigationUI.onClick(async (type) => {
            await this.transitionOverlay.fadeOut();
            this.poduleManager.switchToPodule(type);
            this.navigationUI.setActive(type);
            await this.transitionOverlay.fadeIn();
        });

        // Start with home podule
        this.poduleManager.switchToPodule('home');
        this.navigationUI.setActive('home');

        // Start animation loop
        this.animate();

        console.log('🌿 Botanica initialized with podule system!');
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);

        // Update active podule
        this.poduleManager.update(this.deltaTime);

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
        this.poduleManager.dispose();
        this.navigationUI.dispose();
        this.transitionOverlay.dispose();
    }
}

// Initialize application
new Botanica();

