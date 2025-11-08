import {
    Color,
    ConeGeometry,
    CylinderGeometry,
    Group,
    Mesh,
    MeshStandardMaterial,
    Object3D,
    SphereGeometry,
    TorusGeometry
} from 'three';
import { GrowthPhase } from '../../core/GameState';

interface PhaseVisual {
    group: Group;
    baseScale: number;
    interactiveMeshes: Mesh[];
}

interface TransitionState {
    fromPhase: GrowthPhase;
    toPhase: GrowthPhase;
    startTimeMs: number;
}

interface TransitionParticle {
    mesh: Mesh;
    createdAt: number;
    baseOffsetY: number;
}

interface PhaseBlueprint {
    stemHeight: number;
    stemRadius: number;
    leafLength: number;
    leafWidth: number;
    leafTiltRadians: number;
    centerType: 'none' | 'flower' | 'fruit';
}

const PULSE_INTENSITY = 0.05;
const PULSE_SPEED = 1.2;
const PLANTING_ANIMATION_DURATION = 450;
const PLANTING_START_SCALE = 0.6;
const TRANSITION_DURATION_MS = 650;
const TRANSITION_PARTICLE_DURATION_MS = 900;
const SHAKE_DURATION_MS = 220;
const SHAKE_AMPLITUDE = 0.18;
const GLOW_EMISSIVE_BOOST = 0.4;

const STEM_COLOR = new Color(0x356026);
const LEAF_COLOR = new Color(0x4dbf3b);
const BLOOM_COLOR = new Color(0xffc26e);
const FRUIT_COLOR = new Color(0xff5578);

const PHASE_BLUEPRINTS: Record<GrowthPhase, PhaseBlueprint> = {
    [GrowthPhase.Seedling]: {
        stemHeight: 0.45,
        stemRadius: 0.05,
        leafLength: 0.42,
        leafWidth: 0.18,
        leafTiltRadians: Math.PI / 6,
        centerType: 'none'
    },
    [GrowthPhase.Sproutspire]: {
        stemHeight: 0.65,
        stemRadius: 0.06,
        leafLength: 0.55,
        leafWidth: 0.2,
        leafTiltRadians: Math.PI / 7,
        centerType: 'none'
    },
    [GrowthPhase.VerdantCrown]: {
        stemHeight: 0.8,
        stemRadius: 0.07,
        leafLength: 0.65,
        leafWidth: 0.22,
        leafTiltRadians: Math.PI / 8,
        centerType: 'none'
    },
    [GrowthPhase.Bloomflare]: {
        stemHeight: 0.85,
        stemRadius: 0.075,
        leafLength: 0.68,
        leafWidth: 0.22,
        leafTiltRadians: Math.PI / 9,
        centerType: 'flower'
    },
    [GrowthPhase.Fruitburst]: {
        stemHeight: 0.9,
        stemRadius: 0.08,
        leafLength: 0.7,
        leafWidth: 0.24,
        leafTiltRadians: Math.PI / 10,
        centerType: 'fruit'
    }
};

export class PlantVisual {
    public readonly group: Group;

    private readonly phaseVisuals: Map<GrowthPhase, PhaseVisual> = new Map();
    private currentPhase: GrowthPhase;
    private readonly basePulseOffset: number;
    private plantingAnimationStart: number | null = null;
    private readonly baseLeafAngle: number;
    private transition: TransitionState | null = null;
    private readonly transitionParticles: TransitionParticle[] = [];
    private readonly transitionParticleGeometry = new SphereGeometry(0.06, 14, 12);
    private readonly materialBaseEmissive = new WeakMap<MeshStandardMaterial, number>();
    private harvestGlowIntensity = 0;
    private shakeState: { startTime: number } | null = null;

    constructor(initialPhase: GrowthPhase) {
        this.group = new Group();
        this.group.castShadow = true;
        this.group.receiveShadow = false;

        this.currentPhase = initialPhase;
        this.basePulseOffset = Math.random() * Math.PI * 2;
        this.baseLeafAngle = Math.random() * Math.PI * 2;

        this.createPhaseVisuals();
        this.applyPhaseImmediately(initialPhase);
    }

    public setPhase(phase: GrowthPhase, transitionStartMs?: number): void {
        if (phase === this.currentPhase && !this.transition) {
            return;
        }

        const nextVisual = this.phaseVisuals.get(phase);
        if (!nextVisual) {
            return;
        }

        const previousPhase = this.transition?.fromPhase ?? this.currentPhase;
        const previousVisual = this.phaseVisuals.get(previousPhase);

        if (!transitionStartMs || !previousVisual) {
            this.hideAllBut(phase);
            nextVisual.group.visible = true;
            nextVisual.group.scale.setScalar(nextVisual.baseScale);
            this.currentPhase = phase;
            this.transition = null;
            return;
        }

        nextVisual.group.visible = true;
        nextVisual.group.scale.setScalar(nextVisual.baseScale * 0.4);

        this.transition = {
            fromPhase: previousPhase,
            toPhase: phase,
            startTimeMs: transitionStartMs
        };
        this.currentPhase = phase;

        if (previousPhase === GrowthPhase.Bloomflare && phase === GrowthPhase.Fruitburst) {
            this.spawnTransitionParticles(transitionStartMs, nextVisual.group);
        }
    }

    public getCurrentPhase(): GrowthPhase {
        return this.currentPhase;
    }

    public playPlantingAnimation(startTimestampMs: number): void {
        this.plantingAnimationStart = startTimestampMs;
        const activeVisual = this.phaseVisuals.get(this.currentPhase);
        if (!activeVisual) {
            return;
        }

        const startingScale = activeVisual.baseScale * PLANTING_START_SCALE;
        activeVisual.group.scale.setScalar(startingScale);
    }

    public update(currentTimeMs: number): void {
        const activeVisual = this.phaseVisuals.get(this.currentPhase);
        if (!activeVisual) {
            this.updateTransitionParticles(currentTimeMs);
            return;
        }

        const elapsedSeconds = currentTimeMs / 1000;
        const pulse = 1 + Math.sin(elapsedSeconds * PULSE_SPEED + this.basePulseOffset) * PULSE_INTENSITY;
        const plantingScale = this.getPlantingScale(currentTimeMs);

        if (this.transition) {
            this.updateTransition(currentTimeMs, pulse, plantingScale);
            this.updateTransitionParticles(currentTimeMs);
            return;
        }

        const glowScale = 1 + this.harvestGlowIntensity * 0.08;
        const finalScale = activeVisual.baseScale * pulse * plantingScale * glowScale;
        activeVisual.group.scale.setScalar(finalScale);
        this.applyHarvestGlow(activeVisual);
        this.updateShake(currentTimeMs);
        this.updateTransitionParticles(currentTimeMs);
    }

    public getInteractiveObjects(): Mesh[] {
        const meshes: Mesh[] = [];
        for (const visual of this.phaseVisuals.values()) {
            meshes.push(...visual.interactiveMeshes);
        }

        return meshes;
    }

    public dispose(): void {
        for (const visual of this.phaseVisuals.values()) {
            this.disposeObject(visual.group);
        }

        for (const particle of this.transitionParticles) {
            particle.mesh.removeFromParent();
            const material = particle.mesh.material as MeshStandardMaterial;
            material.dispose();
        }
        this.transitionParticles.length = 0;
        this.transitionParticleGeometry.dispose();

        this.group.removeFromParent();
        this.phaseVisuals.clear();
    }

    public setHarvestGlow(intensity: number): void {
        this.harvestGlowIntensity = Math.min(Math.max(intensity, 0), 1);
    }

    public playShake(): void {
        this.shakeState = { startTime: performance.now() };
    }

    private applyPhaseImmediately(phase: GrowthPhase): void {
        this.hideAllBut(phase);
        const visual = this.phaseVisuals.get(phase);
        if (!visual) {
            return;
        }

        visual.group.visible = true;
        visual.group.scale.setScalar(visual.baseScale);
        this.currentPhase = phase;
        this.transition = null;
    }

    private createPhaseVisuals(): void {
        for (const phase of Object.values(GrowthPhase)) {
            const blueprint = PHASE_BLUEPRINTS[phase];
            if (!blueprint) {
                continue;
            }

            const { group, interactiveMeshes } = this.buildPhaseGroup(phase, blueprint);
            group.visible = false;
            this.group.add(group);
            this.phaseVisuals.set(phase, {
                group,
                baseScale: 1,
                interactiveMeshes
            });
        }
    }

    private buildPhaseGroup(phase: GrowthPhase, blueprint: PhaseBlueprint): {
        group: Group;
        interactiveMeshes: Mesh[];
    } {
        const group = new Group();
        const interactiveMeshes: Mesh[] = [];

        const stem = this.createStemMesh(blueprint.stemHeight, blueprint.stemRadius);
        stem.position.y = blueprint.stemHeight / 2;
        group.add(stem);
        interactiveMeshes.push(stem);

        const leafAngles = this.computeLeafAngles(phase);
        const leafOriginY = blueprint.stemHeight * 0.65;
        const leafOffset = blueprint.leafLength * 0.75;
        for (const angle of leafAngles) {
            const leafGroup = new Group();
            leafGroup.rotation.y = angle;
            leafGroup.position.y = leafOriginY;

            const leaf = this.createLeafMesh(blueprint.leafLength, blueprint.leafWidth, blueprint.leafTiltRadians);
            leaf.position.set(0, 0, leafOffset);

            leafGroup.add(leaf);
            group.add(leafGroup);
            interactiveMeshes.push(leaf);
        }

        if (blueprint.centerType !== 'none') {
            const center = this.createCenterObject(blueprint.centerType);
            center.object.position.set(0, leafOriginY + 0.08, 0);
            group.add(center.object);
            interactiveMeshes.push(...center.interactiveMeshes);
        }

        return {
            group,
            interactiveMeshes
        };
    }

    private createStemMesh(height: number, radius: number): Mesh {
        const geometry = new CylinderGeometry(radius * 0.7, radius, height, 10);
        const material = this.trackMaterial(
            new MeshStandardMaterial({
                color: STEM_COLOR,
                roughness: 0.7,
                metalness: 0.1
            })
        );
        const mesh = new Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    private createLeafMesh(length: number, width: number, tiltRadians: number): Mesh {
        const geometry = new ConeGeometry(width, length, 14);
        const material = this.trackMaterial(
            new MeshStandardMaterial({
                color: LEAF_COLOR,
                roughness: 0.5,
                metalness: 0.05
            })
        );
        const mesh = new Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.rotation.x = Math.PI / 2 - tiltRadians;
        mesh.position.set(0, 0, length * 0.33);
        return mesh;
    }

    private createCenterObject(type: PhaseBlueprint['centerType']): {
        object: Object3D;
        interactiveMeshes: Mesh[];
    } {
        if (type === 'flower') {
            const flowerGroup = new Group();
            const interactiveMeshes: Mesh[] = [];

            const centerGeometry = new CylinderGeometry(0.1, 0.1, 0.055, 20);
            const centerMaterial = this.trackMaterial(
                new MeshStandardMaterial({
                    color: BLOOM_COLOR.clone().offsetHSL(0, -0.05, 0.08),
                    roughness: 0.2,
                    metalness: 0.2,
                    emissive: new Color(0xffc37a),
                    emissiveIntensity: 0.18
                })
            );
            const centerMesh = new Mesh(centerGeometry, centerMaterial);
            centerMesh.rotation.x = Math.PI / 2;
            centerMesh.castShadow = true;
            centerMesh.receiveShadow = true;
            flowerGroup.add(centerMesh);
            interactiveMeshes.push(centerMesh);

            const petals = this.createPetalRing({
                color: BLOOM_COLOR,
                radius: 0.18,
                scale: { x: 1.6, y: 0.42, z: 1 },
                verticalOffset: 0,
                tiltRadians: 0,
                emissiveColor: new Color(0xffd7a0),
                emissiveIntensity: 0.12
            });
            flowerGroup.add(petals.group);
            interactiveMeshes.push(...petals.meshes);

            return {
                object: flowerGroup,
                interactiveMeshes
            };
        }

        const fruitGroup = new Group();
        const interactiveMeshes: Mesh[] = [];

        const petals = this.createPetalRing({
            color: BLOOM_COLOR.clone().offsetHSL(0, -0.05, -0.12),
            radius: 0.21,
            scale: { x: 1.7, y: 0.45, z: 1.05 },
            verticalOffset: -0.01,
            tiltRadians: -Math.PI / 24,
            emissiveColor: new Color(0xffdba8),
            emissiveIntensity: 0.08
        });
        fruitGroup.add(petals.group);
        interactiveMeshes.push(...petals.meshes);

        const receptacleGeometry = new CylinderGeometry(0.09, 0.09, 0.035, 18);
        const receptacleMaterial = this.trackMaterial(
            new MeshStandardMaterial({
                color: new Color(0x6ece75),
                roughness: 0.45,
                metalness: 0.18
            })
        );
        const receptacleMesh = new Mesh(receptacleGeometry, receptacleMaterial);
        receptacleMesh.rotation.x = Math.PI / 2;
        receptacleMesh.position.y = -0.02;
        receptacleMesh.castShadow = true;
        receptacleMesh.receiveShadow = true;
        fruitGroup.add(receptacleMesh);
        interactiveMeshes.push(receptacleMesh);

        const fruitGeometry = new SphereGeometry(0.19, 22, 18);
        const fruitMaterial = this.trackMaterial(
            new MeshStandardMaterial({
                color: FRUIT_COLOR,
                roughness: 0.32,
                metalness: 0.3,
                emissive: new Color(0xff6b85),
                emissiveIntensity: 0.12
            })
        );
        const fruitMesh = new Mesh(fruitGeometry, fruitMaterial);
        fruitMesh.position.y = 0.05;
        fruitMesh.castShadow = true;
        fruitMesh.receiveShadow = true;
        fruitGroup.add(fruitMesh);
        interactiveMeshes.push(fruitMesh);

        return {
            object: fruitGroup,
            interactiveMeshes
        };
    }

    private createPetalRing(config: {
        color: Color;
        radius: number;
        scale: { x: number; y: number; z: number };
        verticalOffset?: number;
        tiltRadians?: number;
        count?: number;
        geometryRadius?: number;
        emissiveColor?: Color;
        emissiveIntensity?: number;
    }): {
        group: Group;
        meshes: Mesh[];
    } {
        const {
            color,
            radius,
            scale,
            verticalOffset = 0,
            tiltRadians = 0,
            count = 5,
            geometryRadius = 0.12,
            emissiveColor,
            emissiveIntensity = 0
        } = config;

        const group = new Group();
        const meshes: Mesh[] = [];

        for (let index = 0; index < count; index += 1) {
            const angle = (index / count) * Math.PI * 2;
            const petalGeometry = new SphereGeometry(geometryRadius, 20, 16);
            const petalMaterial = this.trackMaterial(
                new MeshStandardMaterial({
                    color: color.clone(),
                    roughness: 0.4,
                    metalness: 0.1,
                    emissive: emissiveColor ? emissiveColor.clone() : new Color(0x000000),
                    emissiveIntensity
                })
            );
            const petalMesh = new Mesh(petalGeometry, petalMaterial);
            petalMesh.scale.set(scale.x, scale.y, scale.z);
            petalMesh.position.set(Math.cos(angle) * radius, verticalOffset, Math.sin(angle) * radius);
            petalMesh.rotation.set(tiltRadians, angle, 0);
            petalMesh.castShadow = true;
            petalMesh.receiveShadow = true;
            group.add(petalMesh);
            meshes.push(petalMesh);
        }

        return {
            group,
            meshes
        };
    }

    private applyHarvestGlow(visual: PhaseVisual): void {
        const targetBoost = this.harvestGlowIntensity * GLOW_EMISSIVE_BOOST;

        visual.group.traverse((child) => {
            const mesh = child as Mesh;
            if (!mesh.isMesh) {
                return;
            }

            const material = mesh.material as MeshStandardMaterial;
            if (!material || !(material instanceof MeshStandardMaterial)) {
                return;
            }

            const base =
                this.materialBaseEmissive.get(material) ?? material.emissiveIntensity ?? 0;
            this.materialBaseEmissive.set(material, base);
            material.emissiveIntensity = base + targetBoost;
        });
    }

    private updateShake(currentTimeMs: number): void {
        if (!this.shakeState) {
            this.group.rotation.z = 0;
            return;
        }

        const elapsed = currentTimeMs - this.shakeState.startTime;
        if (elapsed >= SHAKE_DURATION_MS) {
            this.group.rotation.z = 0;
            this.shakeState = null;
            return;
        }

        const progress = elapsed / SHAKE_DURATION_MS;
        const strength = Math.sin(progress * Math.PI * 4) * (1 - progress);
        this.group.rotation.z = strength * SHAKE_AMPLITUDE;
    }

    private trackMaterial(material: MeshStandardMaterial): MeshStandardMaterial {
        this.materialBaseEmissive.set(material, material.emissiveIntensity ?? 0);
        return material;
    }

    private computeLeafAngles(phase: GrowthPhase): number[] {
        const leafCount = this.getLeafCountForPhase(phase);
        const angles: number[] = [];
        for (let index = 0; index < leafCount; index += 1) {
            angles.push(this.baseLeafAngle + (index * Math.PI * 2) / leafCount);
        }

        return angles;
    }

    private getLeafCountForPhase(phase: GrowthPhase): number {
        if (phase === GrowthPhase.Seedling) {
            return 1;
        }

        if (phase === GrowthPhase.Sproutspire) {
            return 2;
        }

        if (phase === GrowthPhase.Bloomflare || phase === GrowthPhase.Fruitburst) {
            return 5;
        }

        return 3;
    }

    private hideAllBut(phase: GrowthPhase): void {
        for (const [phaseKey, visual] of this.phaseVisuals.entries()) {
            if (phaseKey === phase) {
                continue;
            }

            visual.group.visible = false;
        }
    }

    private updateTransition(currentTimeMs: number, pulse: number, plantingScale: number): void {
        if (!this.transition) {
            return;
        }

        const { fromPhase, toPhase, startTimeMs } = this.transition;
        const progress = (currentTimeMs - startTimeMs) / TRANSITION_DURATION_MS;
        const clamped = Math.min(Math.max(progress, 0), 1);
        const eased = this.easeInOutCubic(clamped);

        const outgoingVisual = this.phaseVisuals.get(fromPhase);
        const incomingVisual = this.phaseVisuals.get(toPhase);

        if (incomingVisual) {
            const incomingScale = incomingVisual.baseScale * (0.4 + 0.6 * eased) * pulse * plantingScale;
            incomingVisual.group.scale.setScalar(incomingScale);
        }

        if (outgoingVisual) {
            const outgoingScale = outgoingVisual.baseScale * (1 - eased) * pulse;
            const safeScale = Math.max(outgoingScale, outgoingVisual.baseScale * 0.05);
            outgoingVisual.group.scale.setScalar(safeScale);
            if (clamped >= 1) {
                outgoingVisual.group.visible = false;
                outgoingVisual.group.scale.setScalar(outgoingVisual.baseScale);
            }
        }

        if (clamped >= 1) {
            this.transition = null;
        }
    }

    private spawnTransitionParticles(startTimeMs: number, parent: Group): void {
        const particleCount = 8;
        for (let index = 0; index < particleCount; index += 1) {
            const angle = (index / particleCount) * Math.PI * 2;
            const radius = 0.2 + Math.random() * 0.08;
            const material = new MeshStandardMaterial({
                color: BLOOM_COLOR,
                roughness: 0.25,
                metalness: 0.2,
                emissive: new Color(0xffe5a5),
                emissiveIntensity: 0.2,
                transparent: true,
                opacity: 0.75
            });
            const mesh = new Mesh(this.transitionParticleGeometry, material);
            const baseOffsetY = 0.12 + Math.random() * 0.05;
            mesh.position.set(Math.cos(angle) * radius, baseOffsetY, Math.sin(angle) * radius);
            mesh.scale.setScalar(0.7 + Math.random() * 0.2);
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            parent.add(mesh);

            this.transitionParticles.push({
                mesh,
                createdAt: startTimeMs,
                baseOffsetY
            });
        }
    }

    private updateTransitionParticles(currentTimeMs: number): void {
        for (let index = this.transitionParticles.length - 1; index >= 0; index -= 1) {
            const particle = this.transitionParticles[index];
            const elapsed = currentTimeMs - particle.createdAt;
            const progress = elapsed / TRANSITION_PARTICLE_DURATION_MS;

            if (progress >= 1) {
                const material = particle.mesh.material as MeshStandardMaterial;
                particle.mesh.removeFromParent();
                material.dispose();
                this.transitionParticles.splice(index, 1);
                continue;
            }

            const eased = 1 - (1 - progress) * (1 - progress);
            const rise = eased * 0.18;
            particle.mesh.position.y = particle.baseOffsetY + rise;

            const scale = 0.8 + eased * 0.6;
            particle.mesh.scale.setScalar(scale);

            const material = particle.mesh.material as MeshStandardMaterial;
            material.opacity = 0.75 * (1 - progress);
        }
    }

    private getPlantingScale(currentTimeMs: number): number {
        if (this.plantingAnimationStart === null) {
            return 1;
        }

        const progress = (currentTimeMs - this.plantingAnimationStart) / PLANTING_ANIMATION_DURATION;
        if (progress >= 1) {
            this.plantingAnimationStart = null;
            return 1;
        }

        const eased = progress * progress;
        return PLANTING_START_SCALE + eased * (1 - PLANTING_START_SCALE);
    }

    private disposeObject(object: Object3D): void {
        object.removeFromParent();
        object.traverse((child) => {
            const mesh = child as Mesh;
            if (!mesh.isMesh) {
                return;
            }

            mesh.geometry.dispose();
            if (Array.isArray(mesh.material)) {
                for (const material of mesh.material) {
                    material.dispose();
                }
            } else {
                mesh.material.dispose();
            }
        });
    }

    private easeInOutCubic(value: number): number {
        if (value < 0.5) {
            return 4 * value * value * value;
        }

        const adjusted = 2 * value - 2;
        return 0.5 * adjusted * adjusted * adjusted + 1;
    }
}
