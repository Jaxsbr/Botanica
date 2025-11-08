import * as THREE from 'three';
import { BasePodule } from './BasePodule';
import { GrassGround } from '../environment/GrassGround';
import { Plant3D } from '../plants/Plant3D';
import { PRESETS } from '../plants/presets3d';
import type { PoduleConfig, Plant3DConfig } from '../types';
import type { DevPlantConfigurator } from '../ui/devtools/DevPlantConfigurator';
import { InputManager } from '../systems/InputManager';

/**
 * DevPodule - Large sandbox environment for plant configuration experiments
 *
 * Provides a wide open space with dense paver grid plus a live-updating plant
 * that responds to configuration changes from the DevPlantConfigurator UI.
 */
export class DevPodule extends BasePodule {
    private readonly ground: GrassGround;
    private readonly paverGroup: THREE.Group;
    private readonly plantAnchor: THREE.Group;
    private readonly gridMeshes: THREE.Mesh[] = [];
    private paverGeometry: THREE.BoxGeometry | null = null;
    private paverMaterial: THREE.MeshStandardMaterial | null = null;
    private plant: Plant3D | null = null;
    private currentConfig: Plant3DConfig;
    private elapsedTime = 0;

    constructor(
        config: PoduleConfig,
        private readonly configurator: DevPlantConfigurator,
        private readonly inputManager: InputManager
    ) {
        super('dev', config, config.radius * 10);

        this.ground = new GrassGround(this.radius);
        this.ground.setPosition(0, 0, 0);
        this.group.add(this.ground.getMesh());

        this.paverGroup = this.createPaverGrid(20, 20, 1.4, 0.3);
        this.group.add(this.paverGroup);

        this.plantAnchor = new THREE.Group();
        this.plantAnchor.position.set(0, 0, 0);
        this.plantAnchor.scale.setScalar(3.5);
        this.group.add(this.plantAnchor);

        const defaultConfig = PRESETS.sapling ?? {};
        this.currentConfig = { ...defaultConfig };
        this.spawnPlant(this.currentConfig);

        this.configurator.setConfig(this.currentConfig, true);
        this.configurator.setOnConfigChange((config) => {
            this.applyConfig(config);
        });
    }

    public update(deltaTime: number): void {
        this.elapsedTime += deltaTime;
        if (this.plant) {
            this.plant.update(this.elapsedTime);
        }
    }

    protected onActivate(): void {
        this.inputManager.registerOverlay('dev-config');
        this.configurator.show();
    }

    protected onDeactivate(): void {
        this.inputManager.unregisterOverlay('dev-config');
        this.configurator.hide();
    }

    protected onDispose(): void {
        this.inputManager.unregisterOverlay('dev-config');
        this.configurator.hide();
        this.disposePlant();
        this.disposePavers();
        this.ground.dispose();
    }

    private applyConfig(config: Plant3DConfig): void {
        this.currentConfig = {
            ...config,
            color: config.color
                ? { ...config.color }
                : this.currentConfig.color
        };
        this.spawnPlant(this.currentConfig);
    }

    private spawnPlant(config: Plant3DConfig): void {
        this.disposePlant();

        this.plant = new Plant3D(config);
        const mesh = this.plant.getMesh();
        mesh.position.set(0, 0, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.plantAnchor.add(mesh);
    }

    private disposePlant(): void {
        if (this.plant) {
            this.plant.dispose();
            this.plant = null;
        }
        this.plantAnchor.clear();
    }

    private createPaverGrid(rows: number, cols: number, size: number, gap: number): THREE.Group {
        const group = new THREE.Group();
        this.paverGeometry = new THREE.BoxGeometry(size, 0.12, size);
        this.paverMaterial = new THREE.MeshStandardMaterial({
            color: 0xbbb5ac,
            roughness: 0.85,
            metalness: 0.05
        });

        const offsetX = ((cols - 1) * (size + gap)) / 2;
        const offsetZ = ((rows - 1) * (size + gap)) / 2;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const mesh = new THREE.Mesh(this.paverGeometry, this.paverMaterial);
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                const jitter = (Math.random() - 0.5) * 0.05;
                mesh.position.set(
                    col * (size + gap) - offsetX,
                    0.01 + jitter,
                    row * (size + gap) - offsetZ
                );

                group.add(mesh);
                this.gridMeshes.push(mesh);
            }
        }

        return group;
    }

    private disposePavers(): void {
        this.gridMeshes.forEach((mesh) => {
            if (mesh.parent) {
                mesh.parent.remove(mesh);
            }
        });
        this.gridMeshes.length = 0;

        if (this.paverGeometry) {
            this.paverGeometry.dispose();
            this.paverGeometry = null;
        }

        if (this.paverMaterial) {
            this.paverMaterial.dispose();
            this.paverMaterial = null;
        }
    }
}

