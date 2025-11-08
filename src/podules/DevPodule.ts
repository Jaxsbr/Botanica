import * as THREE from 'three';
import { BasePodule } from './BasePodule';
import { GrassGround } from '../environment/GrassGround';
import { AbstractPlant, type AbstractPlantConfig } from '../plants/abstract/AbstractPlant';
import { PLANT_PRESETS } from '../plants/abstract/PlantPresets';
import type { PoduleConfig } from '../types';
import type { DevPlantConfigurator } from '../ui/devtools/DevPlantConfigurator';
import type { DevPlantConfiguratorChange } from '../ui/devtools/DevPlantConfigurator';
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
    private readonly abstractPlant = new AbstractPlant();
    private plantMesh: THREE.Group | null = null;
    private currentConfig: AbstractPlantConfig;
    private currentGrowthPercent = 50;
    private autoAnimateGrowth = false;
    private autoGrowthSpeed = 15;
    private elapsedTime = 0;
    private lastGeneratedGrowth = -Infinity;

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

        const { config: defaultConfig, key: defaultPresetKey } = getDefaultPreset();
        this.currentConfig = cloneConfig(defaultConfig);
        this.spawnPlant();

        this.configurator.setConfig(this.currentConfig, this.currentGrowthPercent, true, defaultPresetKey ?? undefined);
        this.configurator.setOnConfigChange((change) => {
            this.applyConfiguratorChange(change);
        });
    }

    public update(deltaTime: number): void {
        this.elapsedTime += deltaTime;
        if (!this.autoAnimateGrowth) {
            return;
        }

        this.currentGrowthPercent += this.autoGrowthSpeed * deltaTime;
        if (this.currentGrowthPercent > 100) {
            this.currentGrowthPercent = this.currentGrowthPercent % 100;
        }
        if (this.currentGrowthPercent < 0) {
            this.currentGrowthPercent = (this.currentGrowthPercent % 100) + 100;
        }

        if (Math.abs(this.currentGrowthPercent - this.lastGeneratedGrowth) >= 0.5) {
            this.spawnPlant();
            this.configurator.setGrowthPercent(this.currentGrowthPercent, true);
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

    private applyConfiguratorChange(change: DevPlantConfiguratorChange): void {
        this.currentConfig = cloneConfig(change.config);
        this.currentGrowthPercent = THREE.MathUtils.clamp(change.growthPercent, 0, 100);
        this.autoAnimateGrowth = change.autoAnimate;
        this.autoGrowthSpeed = change.autoSpeed;
        this.spawnPlant();
    }

    private spawnPlant(): void {
        this.disposePlant();

        const mesh = this.abstractPlant.generate(this.currentConfig, this.currentGrowthPercent);
        mesh.position.set(0, 0, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });
        this.plantAnchor.add(mesh);
        this.plantMesh = mesh;
        this.lastGeneratedGrowth = this.currentGrowthPercent;
    }

    private disposePlant(): void {
        if (this.plantMesh) {
            if (typeof this.plantMesh.userData?.dispose === 'function') {
                this.plantMesh.userData.dispose();
            }
            this.plantAnchor.remove(this.plantMesh);
            this.plantMesh = null;
        }
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

function cloneColor(color: THREE.Color): THREE.Color {
    return new THREE.Color().copy(color);
}

function cloneConfig(config: AbstractPlantConfig): AbstractPlantConfig {
    return {
        ...config,
        leafColor: cloneColor(config.leafColor),
        trunkColor: cloneColor(config.trunkColor),
        trunkMetallic: config.trunkMetallic ?? 0.2,
        trunkRoughness: config.trunkRoughness ?? 0.7,
        branchChildren: config.branchChildren
            ? { ...config.branchChildren }
            : undefined,
        roots: config.roots
            ? { ...config.roots }
            : undefined,
        flowers: config.flowers
            ? {
                ...config.flowers,
                color: cloneColor(config.flowers.color),
            }
            : undefined,
        fruit: config.fruit
            ? {
                ...config.fruit,
                color: cloneColor(config.fruit.color),
            }
            : undefined,
        glow: config.glow
            ? {
                ...config.glow,
                color: cloneColor(config.glow.color),
            }
            : undefined,
        crystals: config.crystals
            ? {
                ...config.crystals,
                color: cloneColor(config.crystals.color),
                placement: config.crystals.placement ? [...config.crystals.placement] : undefined,
            }
            : undefined,
    };
}

function getDefaultPreset(): { config: AbstractPlantConfig; key: string | null } {
    if (PLANT_PRESETS.avocadoSapling) {
        return { config: PLANT_PRESETS.avocadoSapling, key: 'avocadoSapling' };
    }

    const fallbackEntry = Object.entries(PLANT_PRESETS)[0];
    if (!fallbackEntry) {
        throw new Error('No abstract plant presets available');
    }
    return { config: fallbackEntry[1], key: fallbackEntry[0] };
}

