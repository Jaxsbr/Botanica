import './style.css';
import { SceneManager } from './scene/Scene';
import { CameraManager } from './scene/Camera';
import { LightingManager } from './scene/Lighting';
import { PoduleManager } from './podules/PoduleManager';
import { HomePodule } from './podules/HomePodule';
import { ShopPodule } from './podules/ShopPodule';
import { NavigationUI } from './ui/NavigationUI';
import { TransitionOverlay } from './ui/TransitionOverlay';
import { Economy } from './economy/Economy';
import { MoneyDisplay } from './ui/MoneyDisplay';
import { Inventory } from './inventory/Inventory';
import { PurchaseSystem } from './systems/PurchaseSystem';
import { InputManager } from './systems/InputManager';
import { ShopCategoryUI } from './ui/ShopCategoryUI';
import { InventoryUI } from './ui/InventoryUI';
import { PlantInspectionUI } from './ui/PlantInspectionUI';
import { TutorialOverlay } from './ui/TutorialOverlay';
import { TutorialSystem } from './systems/TutorialSystem';
import { TimeControlsUI } from './ui/TimeControlsUI';
import { DebugCommands } from './systems/DebugCommands';
import type { PoduleConfig, LightingConfig, CameraConfig } from './types';
import { DevPodule } from './podules/DevPodule';
import { DevPlantConfigurator } from './ui/devtools/DevPlantConfigurator';
import { PRESETS } from './plants/presets3d';

class Botanica {
    private sceneManager: SceneManager;
    private cameraManager: CameraManager;
    // Lighting manager is used for initialization but may be needed for future controls
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private lightingManager: LightingManager;
    private poduleManager: PoduleManager;
    private inputManager: InputManager;
    private navigationUI: NavigationUI;
    private transitionOverlay: TransitionOverlay;
    private economy: Economy;
    private inventory: Inventory;
    private purchaseSystem: PurchaseSystem;
    private moneyDisplay: MoneyDisplay;
    private shopUI: ShopCategoryUI;
    private inventoryUI: InventoryUI;
    private plantInspectionUI: PlantInspectionUI;
    private tutorialOverlay: TutorialOverlay;
    private tutorialSystem: TutorialSystem;
    private timeControlsUI: TimeControlsUI;
    private debugCommands: DebugCommands;
    private homePodule: HomePodule;
    private shopPodule: ShopPodule;
    private devPodule: DevPodule;
    private devConfigurator: DevPlantConfigurator;
    private deltaTime: number = 0.0005; // Time delta for animations

    constructor() {
        // Configuration
        const poduleConfig: PoduleConfig = {
            radius: 4.0, // Base size - individual podules can override
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
            initialPosition: { x: 0, y: 4, z: 6 } // Good view for both podule sizes
        };

        // Initialize core systems
        const container = document.getElementById('app');
        if (!container) {
            throw new Error('App container not found');
        }

        this.sceneManager = new SceneManager(container, poduleConfig);
        this.cameraManager = new CameraManager(this.sceneManager.renderer, cameraConfig);
        this.lightingManager = new LightingManager(this.sceneManager.scene, lightingConfig);

        // Initialize economy and inventory systems
        this.economy = new Economy();
        this.inventory = new Inventory();
        this.purchaseSystem = new PurchaseSystem(this.economy, this.inventory);

        // Initialize tutorial system
        this.tutorialSystem = TutorialSystem.getInstance();

        // Give starter items to new players
        if (!this.tutorialSystem.isCompleted()) {
            this.inventory.initializeStarterItems();
        }

        // Initialize podule system (needed by InputManager)
        this.poduleManager = new PoduleManager(this.sceneManager.scene);

        // Initialize InputManager (before creating UI that needs it)
        this.inputManager = new InputManager(this.poduleManager, this.cameraManager.camera);
        this.inputManager.init();

        // Initialize UI (after InputManager is created)
        this.moneyDisplay = new MoneyDisplay();
        this.shopUI = new ShopCategoryUI(this.purchaseSystem, this.inventory, this.inputManager);
        this.inventoryUI = new InventoryUI(this.inventory);
        this.plantInspectionUI = new PlantInspectionUI(this.inventory);
        this.transitionOverlay = new TransitionOverlay(300);
        this.navigationUI = new NavigationUI();
        this.timeControlsUI = new TimeControlsUI();
        this.devConfigurator = new DevPlantConfigurator({ presets: PRESETS });

        // Wire up economy to money display
        this.economy.subscribe((money) => this.moneyDisplay.update(money));

        // Create TutorialOverlay now that InputManager exists
        this.tutorialOverlay = new TutorialOverlay(this.inputManager);

        // Create podules
        const homePodule = new HomePodule(poduleConfig, this.inventory, this.plantInspectionUI, this.inputManager);
        const shopPodule = new ShopPodule(poduleConfig, this.cameraManager.camera, this.shopUI, this.inputManager);
        const devPodule = new DevPodule(poduleConfig, this.devConfigurator, this.inputManager);
        this.homePodule = homePodule;
        this.shopPodule = shopPodule;
        this.devPodule = devPodule;

        this.poduleManager.addPodule(homePodule);
        this.poduleManager.addPodule(shopPodule);
        this.poduleManager.addPodule(devPodule);

        // Wire up navigation
        this.navigationUI.onClick(async (type) => {
            await this.transitionOverlay.fadeOut();
            this.poduleManager.switchToPodule(type);
            this.navigationUI.setActive(type);
            await this.transitionOverlay.fadeIn();
        });

        // Wire up inventory button with overlay awareness
        this.navigationUI.onInventoryClick(() => {
            const isNowVisible = this.inventoryUI.toggle();

            // Register/unregister overlay to block podule input
            if (isNowVisible) {
                this.inputManager.registerOverlay('inventory');
            } else {
                this.inputManager.unregisterOverlay('inventory');
            }
        });

        // Also handle inventory close via other methods (ESC, click outside)
        this.inventoryUI.onClose(() => {
            this.inputManager.unregisterOverlay('inventory');
        });

        // Wire up shop UI with overlay awareness
        this.shopUI.onClose(() => {
            this.inputManager.unregisterOverlay('shop-category');
        });

        // Wire up plant inspection UI with overlay awareness
        this.plantInspectionUI.onClose(() => {
            this.inputManager.unregisterOverlay('plant-inspection');
        });

        // Note: We don't need explicit open handler because HomePodule calls show() directly
        // But we need to ensure overlay is registered when opened
        const originalShow = this.plantInspectionUI.show.bind(this.plantInspectionUI);
        this.plantInspectionUI.show = (pot) => {
            originalShow(pot);
            this.inputManager.registerOverlay('plant-inspection');
        };

        // Start with home podule
        this.poduleManager.switchToPodule('home');
        this.navigationUI.setActive('home');

        // Initialize debug commands (keyboard shortcuts for development)
        this.debugCommands = DebugCommands.getInstance();
        this.debugCommands.init();

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
        this.inputManager.dispose(); // Clean up input listeners first!
        this.debugCommands.dispose(); // Clean up debug keyboard listeners
        this.sceneManager.dispose();
        this.cameraManager.dispose();
        this.poduleManager.dispose();
        this.navigationUI.dispose();
        this.transitionOverlay.dispose();
        this.moneyDisplay.dispose();
        this.shopUI.dispose();
        this.inventoryUI.dispose();
        this.plantInspectionUI.dispose();
        this.timeControlsUI.dispose();
    }

    /**
     * Expose systems for console testing
     */
    public getEconomy(): Economy {
        return this.economy;
    }

    public getInventory(): Inventory {
        return this.inventory;
    }

    public getPurchaseSystem(): PurchaseSystem {
        return this.purchaseSystem;
    }

    public getTutorialSystem(): TutorialSystem {
        return this.tutorialSystem;
    }

    public getHomePodule(): HomePodule {
        return this.homePodule;
    }
}

// Initialize application
const botanica = new Botanica();

// Expose to window for console testing
declare global {
    interface Window {
        botanica: Botanica;
    }
}
window.botanica = botanica;

