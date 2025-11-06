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
import { ShopCategoryUI } from './ui/ShopCategoryUI';
import { InventoryUI } from './ui/InventoryUI';
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
    private economy: Economy;
    private inventory: Inventory;
    private purchaseSystem: PurchaseSystem;
    private moneyDisplay: MoneyDisplay;
    private shopUI: ShopCategoryUI;
    private inventoryUI: InventoryUI;
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

        // Initialize UI
        this.moneyDisplay = new MoneyDisplay();
        this.shopUI = new ShopCategoryUI(this.purchaseSystem, this.inventory);
        this.inventoryUI = new InventoryUI(this.inventory);
        this.transitionOverlay = new TransitionOverlay(300);
        this.navigationUI = new NavigationUI();

        // Wire up economy to money display
        this.economy.subscribe((money) => this.moneyDisplay.update(money));

        // Initialize podule system
        this.poduleManager = new PoduleManager(this.sceneManager.scene);

        // Create podules
        const homePodule = new HomePodule(poduleConfig);
        const shopPodule = new ShopPodule(poduleConfig, this.cameraManager.camera, this.shopUI);

        this.poduleManager.addPodule(homePodule);
        this.poduleManager.addPodule(shopPodule);

        // Wire up navigation
        this.navigationUI.onClick(async (type) => {
            await this.transitionOverlay.fadeOut();
            this.poduleManager.switchToPodule(type);
            this.navigationUI.setActive(type);
            await this.transitionOverlay.fadeIn();
        });

        // Wire up inventory button - disable shop hotspots when inventory opens
        this.navigationUI.onInventoryClick(() => {
            const isNowVisible = this.inventoryUI.toggle();

            // Disable shop hotspots when inventory opens to prevent click-through
            if (isNowVisible) {
                shopPodule.setHotspotsEnabled(false);
            }
        });

        // Re-enable shop hotspots when inventory closes (if shop is active)
        this.inventoryUI.onClose(() => {
            if (shopPodule.isActive) {
                shopPodule.setHotspotsEnabled(true);
            }
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
        this.moneyDisplay.dispose();
        this.shopUI.dispose();
        this.inventoryUI.dispose();
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

