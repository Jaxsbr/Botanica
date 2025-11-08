import * as THREE from 'three';
import {
    PlantParts,
    LeafShape,
    LeafDistribution,
    FruitShape,
    CrystalPlacement,
} from './PlantParts';

export type GrowthStage = 'seedling' | 'young' | 'mature';

export interface BranchChildrenConfig {
    levels: number;
    branchesPerLevel: number;
    lengthScale: number;
    thicknessScale: number;
    angle: number;
    spread: number;
    curve: number;
    leafScale?: number;
}

export interface RootsConfig {
    enabled: boolean;
    count: number;
    length: number;
    thickness: number;
    taper: number;
    spread: number;
    flareHeight: number;
}

export interface CrystalConfig {
    enabled: boolean;
    size: number;
    count: number;
    color: THREE.Color;
    placement?: CrystalPlacement[];
    distribution?: 'uniform' | 'clustered';
}

export interface AbstractPlantConfig {
    maxHeight: number;
    trunkThickness: number;
    trunkTaper: number;
    branchLevels: number;
    branchesPerLevel: number;
    branchAngle: number;
    branchLength: number;
    branchCurve: number;
    branchThickness: number;
    branchThicknessFalloff: number;
    branchAtApex?: boolean;
    branchChildren?: BranchChildrenConfig;
    roots?: RootsConfig;
    leafShape: LeafShape;
    leafSize: number;
    leafCount: number;
    leafDistribution: LeafDistribution;
    leafColor: THREE.Color;
    flowers?: {
        enabled: boolean;
        petalCount: number;
        size: number;
        color: THREE.Color;
        position: 'top' | 'branches' | 'trunk';
    };
    fruit?: {
        enabled: boolean;
        shape: FruitShape;
        size: number;
        color: THREE.Color;
        count: number;
    };
    glow?: {
        enabled: boolean;
        intensity: number;
        color: THREE.Color;
    };
    crystals?: CrystalConfig;
    trunkColor: THREE.Color;
    trunkMetallic?: number;
    trunkRoughness?: number;
}

interface StageProfile {
    heightScale: number;
    trunkThicknessScale: number;
    branchLevelScale: number;
    branchLengthScale: number;
    branchThicknessScale: number;
    leafCountScale: number;
    leafSizeScale: number;
    branchTiltAdjust: number;
    branchTwist: number;
    specialFeatureScale: number;
}

const STAGE_KEYS: GrowthStage[] = ['seedling', 'young', 'mature'];

const STAGE_PROFILES: Record<GrowthStage, StageProfile> = {
    seedling: {
        heightScale: 0.35,
        trunkThicknessScale: 0.65,
        branchLevelScale: 0.25,
        branchLengthScale: 0.3,
        branchThicknessScale: 0.45,
        leafCountScale: 0.25,
        leafSizeScale: 0.6,
        branchTiltAdjust: -25,
        branchTwist: 0.35,
        specialFeatureScale: 0.1,
    },
    young: {
        heightScale: 0.7,
        trunkThicknessScale: 0.85,
        branchLevelScale: 0.7,
        branchLengthScale: 0.75,
        branchThicknessScale: 0.75,
        leafCountScale: 0.8,
        leafSizeScale: 0.9,
        branchTiltAdjust: -5,
        branchTwist: 0.5,
        specialFeatureScale: 0.6,
    },
    mature: {
        heightScale: 1,
        trunkThicknessScale: 1,
        branchLevelScale: 1,
        branchLengthScale: 1,
        branchThicknessScale: 1,
        leafCountScale: 1,
        leafSizeScale: 1.2,
        branchTiltAdjust: 10,
        branchTwist: 0.85,
        specialFeatureScale: 1,
    },
};

const STAGE_CENTERS: Record<GrowthStage, number> = {
    seedling: 0.15,
    young: 0.5,
    mature: 0.85,
};

const STAGE_SPREAD = 0.45;

type StageWeights = Record<GrowthStage, number>;

function computeStageWeights(normalizedGrowth: number): StageWeights {
    const weights: StageWeights = {
        seedling: 0,
        young: 0,
        mature: 0,
    };

    STAGE_KEYS.forEach((stage) => {
        const center = STAGE_CENTERS[stage];
        const distance = Math.abs(normalizedGrowth - center);
        const weight = Math.max(0, 1 - distance / STAGE_SPREAD);
        weights[stage] = weight * weight;
    });

    const total = weights.seedling + weights.young + weights.mature;
    if (total <= 0) {
        weights.seedling = 1;
        weights.young = 0;
        weights.mature = 0;
        return weights;
    }

    weights.seedling /= total;
    weights.young /= total;
    weights.mature /= total;
    return weights;
}

function blendStageValue(weights: StageWeights, projector: (profile: StageProfile) => number): number {
    let value = 0;
    STAGE_KEYS.forEach((stage) => {
        value += projector(STAGE_PROFILES[stage]) * weights[stage];
    });
    return value;
}

function cloneColor(color: THREE.Color): THREE.Color {
    return new THREE.Color().copy(color);
}

function disposeGroup(group: THREE.Group): void {
    group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) {
            return;
        }

        if (object.geometry) {
            object.geometry.dispose();
        }

        if (!object.material) {
            return;
        }

        if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
            return;
        }

        object.material.dispose();
    });
}

export class AbstractPlant {
    private readonly tempVector = new THREE.Vector3();
    private readonly tempVector2 = new THREE.Vector3();
    private readonly tempVector3 = new THREE.Vector3();
    private readonly tempQuaternion = new THREE.Quaternion();
    private readonly upVector = new THREE.Vector3(0, 1, 0);

    generate(config: AbstractPlantConfig, growthPercent: number): THREE.Group {
        const normalizedGrowth = THREE.MathUtils.clamp(growthPercent / 100, 0, 1);
        const stageWeights = computeStageWeights(normalizedGrowth);
        const group = new THREE.Group();
        group.name = 'abstractPlant';
        group.userData.stageWeights = stageWeights;

        const heightScale = blendStageValue(stageWeights, (profile) => profile.heightScale);
        const trunkHeight = config.maxHeight * heightScale;

        const trunkRadiusScale = blendStageValue(stageWeights, (profile) => profile.trunkThicknessScale);
        const trunkRadius = config.trunkThickness * trunkRadiusScale;

        const branchLevelScale = blendStageValue(stageWeights, (profile) => profile.branchLevelScale);
        const branchLevelCount = Math.max(
            0,
            Math.round(config.branchLevels * branchLevelScale)
        );

        const rawBranchesPerLevel = Math.max(1, Math.round(config.branchesPerLevel));
        const totalBranchSlots = branchLevelCount * rawBranchesPerLevel;

        const branchLengthScale = blendStageValue(stageWeights, (profile) => profile.branchLengthScale);
        const branchLength = config.branchLength * trunkHeight * THREE.MathUtils.clamp(branchLengthScale, 0.1, 1.2);

        const branchThicknessStageScale = blendStageValue(stageWeights, (profile) => profile.branchThicknessScale);
        const baseBranchRadius =
            trunkRadius * THREE.MathUtils.clamp(config.branchThickness, 0, 1.5) * branchThicknessStageScale;
        const branchThicknessFalloff = THREE.MathUtils.clamp(config.branchThicknessFalloff, 0, 1.5);

        const leafCountScale = blendStageValue(stageWeights, (profile) => profile.leafCountScale);
        const totalLeafCount = Math.max(0, Math.round(config.leafCount * leafCountScale));
        const leafSizeScale = blendStageValue(stageWeights, (profile) => profile.leafSizeScale);
        const effectiveLeafSize = config.leafSize * THREE.MathUtils.clamp(leafSizeScale, 0.4, 1.8);

        const branchTiltAdjust = blendStageValue(stageWeights, (profile) => profile.branchTiltAdjust);
        const branchTilt = THREE.MathUtils.clamp(config.branchAngle + branchTiltAdjust, -85, 85);
        const branchTwistIntensity = blendStageValue(stageWeights, (profile) => profile.branchTwist);
        const specialFeatureScale = THREE.MathUtils.clamp(
            blendStageValue(stageWeights, (profile) => profile.specialFeatureScale),
            0,
            1
        );

        const trunkSegments = Math.max(6, Math.round(heightScale * 10));
        const trunkColor = cloneColor(config.trunkColor);
        const trunkMesh = PlantParts.createStem(
            trunkHeight,
            trunkRadius,
            config.trunkTaper,
            trunkColor,
            trunkSegments,
            {
                metalness: config.trunkMetallic ?? 0.2,
                roughness: config.trunkRoughness ?? 0.7,
            }
        );
        group.add(trunkMesh);

        const branchColor = cloneColor(config.trunkColor);
        branchColor.offsetHSL(0.02, 0.05, 0.1);

        const attachmentsForParticles: THREE.Object3D[] = [];
        const branchAnchorsForCrystals: THREE.Object3D[] = [];
        const branchLeafShare =
            totalBranchSlots > 0 ? Math.max(1, Math.floor(totalLeafCount / totalBranchSlots)) : totalLeafCount;
        const branchGroups: THREE.Group[] = [];

        const rootAnchorsForCrystals = this.createRoots({
            group,
            config,
            trunkHeight,
            trunkRadius,
            trunkColor,
            attachmentsForParticles,
        });

        const includeApexBranches = config.branchAtApex ?? false;
        const leafEmissive = config.glow?.enabled
            ? {
                color: cloneColor(config.glow.color),
                intensity: config.glow.intensity * Math.max(specialFeatureScale, 0.3),
            }
            : undefined;

        if (branchLevelCount > 0) {
            const denominator = includeApexBranches ? branchLevelCount : branchLevelCount + 1;
            const minHeight = includeApexBranches ? 0.12 : 0.2;
            const maxHeight = includeApexBranches ? 0.98 : 0.9;

            for (let level = 0; level < branchLevelCount; level += 1) {
                const fraction = Math.min(1, (level + 1) / Math.max(1, denominator));
                const levelHeight = trunkHeight * THREE.MathUtils.lerp(minHeight, maxHeight, fraction);
                const radiusRatio = Math.max(0.1, 1 - config.trunkTaper * (levelHeight / trunkHeight));
                const levelRadius = trunkRadius * radiusRatio * 0.92;
                const twistOffset = level * branchTwistIntensity * Math.PI * 0.25;
                const branchRadius = Math.max(
                    baseBranchRadius * Math.pow(branchThicknessFalloff, level),
                    trunkRadius * 0.03
                );

                for (let branchIndex = 0; branchIndex < rawBranchesPerLevel; branchIndex += 1) {
                    const azimuth = (branchIndex / rawBranchesPerLevel) * Math.PI * 2 + twistOffset;

                    const branch = PlantParts.createBranch(
                        branchLength * THREE.MathUtils.lerp(0.85, 1.15, Math.random()),
                        branchTilt + THREE.MathUtils.randFloatSpread(6),
                        config.branchCurve,
                        branchRadius
                    );

                    branch.position.set(
                        Math.cos(azimuth) * levelRadius,
                        levelHeight,
                        Math.sin(azimuth) * levelRadius
                    );
                    branch.rotation.y = azimuth;
                    branch.rotation.x += THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(3));

                    const branchMesh = branch.userData.primaryMesh as THREE.Mesh | undefined;
                    if (branchMesh && branchMesh.material instanceof THREE.MeshStandardMaterial) {
                        branchMesh.material.color = branchColor.clone();
                        branchMesh.material.roughness = THREE.MathUtils.clamp(
                            (config.trunkRoughness ?? 0.7) + 0.1,
                            0,
                            1
                        );
                        branchMesh.material.metalness = THREE.MathUtils.clamp(
                            (config.trunkMetallic ?? 0.1) * 0.6,
                            0,
                            1
                        );
                    }

                    branchGroups.push(branch);
                    group.add(branch);

                    this.decorateBranch(branch, {
                        depth: 0,
                        branchRadius,
                        branchLength,
                        leafCount: branchLeafShare,
                        effectiveLeafSize,
                        config,
                        specialFeatureScale,
                        branchGroups,
                        attachmentsForParticles,
                        branchAnchors: branchAnchorsForCrystals,
                        branchColor,
                        leafEmissive,
                    });
                }
            }
        } else if (totalLeafCount > 0) {
            const canopy = PlantParts.createLeafCluster(
                totalLeafCount,
                effectiveLeafSize,
                config.leafShape,
                cloneColor(config.leafColor),
                'clustered',
                leafEmissive
            );
            canopy.position.set(0, trunkHeight * 0.85, 0);
            group.add(canopy);
        }

        const topAnchor = new THREE.Object3D();
        topAnchor.position.set(0, trunkHeight, 0);
        group.add(topAnchor);
        attachmentsForParticles.push(topAnchor);

        if (config.flowers?.enabled) {
            const bloomScale = Math.max(0, Math.min(1, specialFeatureScale));
            if (bloomScale > 0.15) {
                const flowerGroup = PlantParts.createFlower(
                    config.flowers.petalCount,
                    config.flowers.size * THREE.MathUtils.lerp(0.7, 1.3, bloomScale),
                    cloneColor(config.flowers.color)
                );
                flowerGroup.scale.multiplyScalar(bloomScale);

                if (config.flowers.position === 'top') {
                    flowerGroup.position.set(0, trunkHeight + config.flowers.size * bloomScale, 0);
                    group.add(flowerGroup);
                } else if (config.flowers.position === 'trunk') {
                    flowerGroup.position.set(0, trunkHeight * 0.6, 0);
                    group.add(flowerGroup);
                } else {
                    branchGroups.forEach((branch, index) => {
                        if ((index + 1) % Math.max(1, Math.floor(1 / bloomScale)) !== 0) {
                            return;
                        }
                        const blossom = flowerGroup.clone();
                        blossom.position.copy(this.sampleAlongBranch(branch, 0.75));
                        blossom.quaternion.copy(branch.quaternion);
                        branch.add(blossom);
                    });
                }
            }
        }

        if (config.fruit?.enabled && config.fruit.count > 0) {
            const fruitInstances = Math.max(
                1,
                Math.round(config.fruit.count * specialFeatureScale)
            );
            let placed = 0;

            for (let i = 0; i < branchGroups.length && placed < fruitInstances; i += 1) {
                const branch = branchGroups[i];
                const fruit = PlantParts.createFruit(
                    config.fruit.shape,
                    config.fruit.size,
                    cloneColor(config.fruit.color)
                );
                fruit.position.copy(this.sampleAlongBranch(branch, THREE.MathUtils.randFloat(0.6, 0.9)));
                fruit.quaternion.copy(branch.quaternion);
                branch.add(fruit);
                placed += 1;
            }

            while (placed < fruitInstances) {
                const fruit = PlantParts.createFruit(
                    config.fruit.shape,
                    config.fruit.size,
                    cloneColor(config.fruit.color)
                );
                fruit.position.set(
                    THREE.MathUtils.randFloatSpread(trunkRadius * 0.6),
                    trunkHeight * THREE.MathUtils.randFloat(0.3, 0.8),
                    THREE.MathUtils.randFloatSpread(trunkRadius * 0.6)
                );
                group.add(fruit);
                placed += 1;
            }
        }

        this.placeCrystals({
            group,
            config,
            trunkHeight,
            trunkRadius,
            trunkTaper: config.trunkTaper,
            branchAnchors: branchAnchorsForCrystals,
            rootAnchors: rootAnchorsForCrystals,
            specialFeatureScale,
        });

        if (config.glow?.enabled && config.glow.intensity > 0) {
            const glowGeometry = new THREE.SphereGeometry(trunkRadius * 0.4, 12, 12);
            const glowMaterial = new THREE.MeshStandardMaterial({
                color: cloneColor(config.glow.color),
                emissive: cloneColor(config.glow.color),
                emissiveIntensity: config.glow.intensity * 1.2,
                transparent: true,
                opacity: 0.45,
                roughness: 0.2,
                metalness: 0.4,
            });
            const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
            glowMesh.position.set(0, trunkHeight * THREE.MathUtils.clamp(heightScale, 0.4, 1), 0);
            group.add(glowMesh);
        }

        group.userData.particleAnchors = attachmentsForParticles;
        group.userData.dispose = () => disposeGroup(group);

        return group;
    }

    private decorateBranch(
        branch: THREE.Group,
        options: {
            depth: number;
            branchRadius: number;
            branchLength: number;
            leafCount: number;
            effectiveLeafSize: number;
            config: AbstractPlantConfig;
            specialFeatureScale: number;
            branchGroups: THREE.Group[];
            attachmentsForParticles: THREE.Object3D[];
            branchAnchors: THREE.Object3D[];
            branchColor: THREE.Color;
            leafEmissive?: { color: THREE.Color; intensity: number };
        }
    ): void {
        const attachments = (branch.userData.attachments ?? []) as THREE.Object3D[];
        if (attachments.length === 0) {
            return;
        }

        const leavesPerAttachment = Math.max(0, Math.round(options.leafCount));
        const leafEnabled = leavesPerAttachment > 0;

        attachments.forEach((anchor) => {
            options.attachmentsForParticles.push(anchor);
            options.branchAnchors.push(anchor);

            if (leafEnabled) {
                const leafCluster = PlantParts.createLeafCluster(
                    leavesPerAttachment,
                    options.effectiveLeafSize * THREE.MathUtils.lerp(0.9, 1.1, Math.random()),
                    options.config.leafShape,
                    cloneColor(options.config.leafColor),
                    options.config.leafDistribution,
                    options.leafEmissive
                );

                if (leafCluster.children.length > 0) {
                    anchor.add(leafCluster);
                    const branchRadiusLocal = (anchor.userData.branchRadius as number | undefined) ?? options.branchRadius;
                    leafCluster.position.set(0, branchRadiusLocal * 0.55, 0);
                    leafCluster.rotateX(THREE.MathUtils.degToRad(90 + THREE.MathUtils.randFloatSpread(15)));
                    leafCluster.rotateY(THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(180)));
                }
            }
        });

        const childConfig = options.config.branchChildren;
        if (!childConfig || options.depth >= childConfig.levels) {
            return;
        }

        const childLength = options.branchLength * childConfig.lengthScale;
        const childRadius = options.branchRadius * childConfig.thicknessScale;
        if (childLength < 0.05 || childRadius < 0.004) {
            return;
        }

        const childLeafCount = Math.max(0, options.leafCount * (childConfig.leafScale ?? 0.6));

        attachments.forEach((anchor) => {
            const tangent = (anchor.userData.branchTangent as THREE.Vector3 | undefined)?.clone().normalize() ?? this.upVector.clone();
            const outwardBase = this.tempVector2.copy(anchor.position).normalize();
            if (outwardBase.lengthSq() < 1e-4) {
                outwardBase.set(1, 0, 0).applyQuaternion(branch.quaternion);
            }
            outwardBase.normalize();

            for (let i = 0; i < Math.max(1, childConfig.branchesPerLevel); i += 1) {
                const childBranch = PlantParts.createBranch(
                    childLength * THREE.MathUtils.lerp(0.9, 1.05, Math.random()),
                    childConfig.angle,
                    options.config.branchCurve + childConfig.curve,
                    childRadius
                );
                childBranch.rotation.set(0, 0, 0);
                childBranch.position.copy(anchor.position);

                const alignQuat = new THREE.Quaternion().setFromUnitVectors(this.upVector, tangent);
                childBranch.quaternion.copy(alignQuat);

                const spreadAngle = THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(childConfig.spread ?? 25));
                const spreadQuat = new THREE.Quaternion().setFromAxisAngle(tangent, spreadAngle);
                childBranch.quaternion.multiply(spreadQuat);

                const tiltAxis = this.tempVector3.copy(outwardBase).normalize();
                const tiltAngle = THREE.MathUtils.degToRad(childConfig.angle);
                const tiltQuat = new THREE.Quaternion().setFromAxisAngle(tiltAxis, tiltAngle);
                childBranch.quaternion.multiply(tiltQuat);

                const offset = tangent.clone().multiplyScalar(options.branchRadius * 0.25);
                childBranch.position.add(offset);

                (anchor.parent ?? branch).add(childBranch);

                const childMesh = childBranch.userData.primaryMesh as THREE.Mesh | undefined;
                if (childMesh && childMesh.material instanceof THREE.MeshStandardMaterial) {
                    childMesh.material.color = options.branchColor.clone();
                    childMesh.material.roughness = THREE.MathUtils.clamp(
                        (options.config.trunkRoughness ?? 0.7) + 0.12,
                        0,
                        1
                    );
                    childMesh.material.metalness = THREE.MathUtils.clamp(
                        (options.config.trunkMetallic ?? 0.15) * 0.5,
                        0,
                        1
                    );
                }

                options.branchGroups.push(childBranch);

                this.decorateBranch(childBranch, {
                    depth: options.depth + 1,
                    branchRadius: childRadius,
                    branchLength: childLength,
                    leafCount: childLeafCount,
                    effectiveLeafSize: options.effectiveLeafSize * THREE.MathUtils.lerp(0.85, 0.95, Math.random()),
                    config: options.config,
                    specialFeatureScale: options.specialFeatureScale,
                    branchGroups: options.branchGroups,
                    attachmentsForParticles: options.attachmentsForParticles,
                    branchAnchors: options.branchAnchors,
                    branchColor: options.branchColor,
                    leafEmissive: options.leafEmissive,
                });
            }
        });
    }

    private createRoots(options: {
        group: THREE.Group;
        config: AbstractPlantConfig;
        trunkHeight: number;
        trunkRadius: number;
        trunkColor: THREE.Color;
        attachmentsForParticles: THREE.Object3D[];
    }): THREE.Object3D[] {
        const rootsConfig = options.config.roots;
        if (!rootsConfig?.enabled) {
            return [];
        }

        const rootAnchors: THREE.Object3D[] = [];
        const rootCount = Math.max(1, Math.round(rootsConfig.count));
        const rootLength = Math.max(0.1, rootsConfig.length * options.config.maxHeight);
        const rootRadius = options.trunkRadius * THREE.MathUtils.clamp(rootsConfig.thickness, 0.05, 1);
        const rootTaper = THREE.MathUtils.clamp(rootsConfig.taper, 0, 1);
        const flareHeight = THREE.MathUtils.clamp(rootsConfig.flareHeight, 0, 0.4);
        const spread = THREE.MathUtils.clamp(rootsConfig.spread, 0, 1);
        const downwardAngle = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(30, 70, spread));
        const originHeight = options.trunkHeight * flareHeight;
        const baseRadius = options.trunkRadius * 0.95;

        for (let i = 0; i < rootCount; i += 1) {
            const azimuth = (i / rootCount) * Math.PI * 2;
            const root = PlantParts.createRoot(
                rootLength,
                rootRadius,
                rootTaper,
                azimuth,
                downwardAngle,
                options.trunkColor.clone().offsetHSL(0, -0.05, -0.08)
            );
            root.position.set(
                Math.cos(azimuth) * baseRadius * THREE.MathUtils.lerp(0.85, 1.1, Math.random()),
                originHeight,
                Math.sin(azimuth) * baseRadius * THREE.MathUtils.lerp(0.85, 1.1, Math.random())
            );
            options.group.add(root);

            const attachments = (root.userData.attachments ?? []) as THREE.Object3D[];
            attachments.forEach((anchor) => {
                rootAnchors.push(anchor);
                options.attachmentsForParticles.push(anchor);
            });
        }

        return rootAnchors;
    }

    private placeCrystals(options: {
        group: THREE.Group;
        config: AbstractPlantConfig;
        trunkHeight: number;
        trunkRadius: number;
        trunkTaper: number;
        branchAnchors: THREE.Object3D[];
        rootAnchors: THREE.Object3D[];
        specialFeatureScale: number;
    }): void {
        const crystalsConfig = options.config.crystals;
        if (!crystalsConfig?.enabled || crystalsConfig.count <= 0) {
            return;
        }

        const placements = crystalsConfig.placement && crystalsConfig.placement.length > 0
            ? crystalsConfig.placement
            : ['trunk'];
        const totalCrystals = Math.max(1, Math.round(crystalsConfig.count * options.specialFeatureScale));
        const emissive = options.config.glow?.enabled
            ? {
                color: cloneColor(options.config.glow.color),
                intensity: options.config.glow.intensity * Math.max(0.3, options.specialFeatureScale),
            }
            : undefined;

        let remaining = totalCrystals;
        placements.forEach((placement, index) => {
            const isLast = index === placements.length - 1;
            const slotCount = isLast ? remaining : Math.max(1, Math.round(totalCrystals / placements.length));
            remaining -= slotCount;

            switch (placement) {
                case 'branches':
                    this.placeBranchCrystals(
                        options.branchAnchors,
                        crystalsConfig,
                        slotCount,
                        emissive
                    );
                    break;
                case 'roots':
                    this.placeRootCrystals(
                        options.rootAnchors,
                        crystalsConfig,
                        slotCount,
                        emissive
                    );
                    break;
                case 'trunk':
                default:
                    this.placeTrunkCrystals(
                        options.group,
                        options.trunkHeight,
                        options.trunkRadius,
                        options.trunkTaper,
                        crystalsConfig,
                        slotCount,
                        emissive
                    );
                    break;
            }
        });
    }

    private placeTrunkCrystals(
        group: THREE.Group,
        trunkHeight: number,
        trunkRadius: number,
        trunkTaper: number,
        config: NonNullable<AbstractPlantConfig['crystals']>,
        count: number,
        emissive?: { color: THREE.Color; intensity: number }
    ): void {
        for (let i = 0; i < count; i += 1) {
            const heightRatio = Math.random();
            const y = trunkHeight * heightRatio;
            const radiusAtHeight = trunkRadius * Math.max(0.05, 1 - trunkTaper * heightRatio);
            const angle = Math.random() * Math.PI * 2;

            const crystal = PlantParts.createCrystal(
                config.size * THREE.MathUtils.lerp(0.75, 1.25, Math.random()),
                cloneColor(config.color),
                emissive
            );

            const x = Math.cos(angle) * radiusAtHeight;
            const z = Math.sin(angle) * radiusAtHeight;
            crystal.position.set(x, y, z);

            const outward = this.tempVector.set(x, 0, z).normalize();
            if (outward.lengthSq() > 0) {
                crystal.lookAt(new THREE.Vector3().copy(crystal.position).add(outward));
            }

            crystal.rotation.y += THREE.MathUtils.randFloatSpread(Math.PI);
            crystal.rotation.x += THREE.MathUtils.randFloatSpread(Math.PI);
            group.add(crystal);
        }
    }

    private placeBranchCrystals(
        anchors: THREE.Object3D[],
        config: NonNullable<AbstractPlantConfig['crystals']>,
        count: number,
        emissive?: { color: THREE.Color; intensity: number }
    ): void {
        if (anchors.length === 0) {
            return;
        }

        for (let i = 0; i < count; i += 1) {
            const anchor = anchors[Math.floor(Math.random() * anchors.length)];
            const branchRadius = (anchor.userData.branchRadius as number | undefined) ?? 0.05;

            const crystal = PlantParts.createCrystal(
                config.size * THREE.MathUtils.lerp(0.7, 1.1, Math.random()),
                cloneColor(config.color),
                emissive
            );

            anchor.add(crystal);
            crystal.position.set(0, branchRadius * 0.6, 0);
            crystal.rotateX(Math.PI / 2 + THREE.MathUtils.randFloatSpread(0.4));
            crystal.rotateZ(THREE.MathUtils.randFloatSpread(Math.PI));
        }
    }

    private placeRootCrystals(
        anchors: THREE.Object3D[],
        config: NonNullable<AbstractPlantConfig['crystals']>,
        count: number,
        emissive?: { color: THREE.Color; intensity: number }
    ): void {
        if (anchors.length === 0) {
            return;
        }

        for (let i = 0; i < count; i += 1) {
            const anchor = anchors[Math.floor(Math.random() * anchors.length)];
            const branchRadius = (anchor.userData.branchRadius as number | undefined) ?? 0.04;

            const crystal = PlantParts.createCrystal(
                config.size * THREE.MathUtils.lerp(0.6, 1, Math.random()),
                cloneColor(config.color),
                emissive
            );

            anchor.add(crystal);
            crystal.position.set(0, -branchRadius * 0.6, 0);
            crystal.rotateX(-Math.PI / 2 + THREE.MathUtils.randFloatSpread(0.4));
            crystal.rotateZ(THREE.MathUtils.randFloatSpread(Math.PI));
        }
    }

    private sampleAlongBranch(branch: THREE.Group, t: number): THREE.Vector3 {
        const attachments = (branch.userData.attachments ?? []) as THREE.Object3D[];
        if (attachments.length === 0) {
            this.tempVector.set(0, 0, 0);
            return this.tempVector;
        }

        const clampedT = THREE.MathUtils.clamp(t, 0, 1);
        const scaledIndex = clampedT * (attachments.length - 1);
        const lowerIndex = Math.floor(scaledIndex);
        const upperIndex = Math.min(attachments.length - 1, lowerIndex + 1);
        const blend = scaledIndex - lowerIndex;

        this.tempVector.copy(attachments[lowerIndex].position).lerp(attachments[upperIndex].position, blend);
        return this.tempVector;
    }
}

