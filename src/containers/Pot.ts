import * as THREE from 'three';
import { POT_PRESETS, PotConfig } from './PotTypes';
import { Plant3D } from '../plants/Plant3D';

export class Pot {
    private group: THREE.Group;
    private config: PotConfig;
    private plant: Plant3D | null = null;

    constructor(presetName: 'small' | 'large' = 'small') {
        this.config = POT_PRESETS[presetName];
        this.group = new THREE.Group();
        this.createPot();
    }

    private createPot(): void {
        const { topRadius, bottomRadius, height, color, rimHeight } = this.config;

        // Create main pot body (tapered cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(
            topRadius,      // radiusTop
            bottomRadius,   // radiusBottom
            height,         // height
            64,            // radialSegments (increased for smoother lighting)
            8,             // heightSegments (increased for better vertical shading)
            false          // openEnded
        );

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.85, // Slightly rougher for more matte terracotta look
            metalness: 0,
            envMapIntensity: 0.3 // Add subtle environment reflections for depth
        });

        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        this.group.add(body);

        // Create rim detail
        const rimGeometry = new THREE.CylinderGeometry(
            topRadius + 0.02,  // Slightly wider than top
            topRadius,
            rimHeight,
            64  // Match body segments for consistent quality
        );

        const rim = new THREE.Mesh(rimGeometry, bodyMaterial);
        rim.position.y = (height / 2) + (rimHeight / 2);
        rim.castShadow = true;
        rim.receiveShadow = true;
        this.group.add(rim);

        // Position entire pot so bottom sits at y=0
        this.group.position.y = height / 2;
    }

    public addPlant(plant: Plant3D): void {
        if (this.plant) {
            this.removePlant();
        }

        this.plant = plant;

        // Position plant at soil level (slightly below pot rim)
        const plantMesh = plant.getMesh();
        plantMesh.position.copy(this.getPlantPosition());

        this.group.add(plantMesh);
    }

    public removePlant(): Plant3D | null {
        if (!this.plant) return null;

        const plantMesh = this.plant.getMesh();
        this.group.remove(plantMesh);

        const removedPlant = this.plant;
        this.plant = null;

        return removedPlant;
    }

    public getPlantPosition(): THREE.Vector3 {
        // Plants should be positioned at soil level
        // Soil at 50% allows more plant structure to be visible above pot rim
        const soilLevel = this.config.height * 0.5;
        return new THREE.Vector3(0, soilLevel - (this.config.height / 2), 0);
    }

    public getGroup(): THREE.Group {
        return this.group;
    }

    public setPosition(x: number, y: number, z: number): void {
        this.group.position.set(x, y, z);
    }

    public dispose(): void {
        if (this.plant) {
            this.plant.dispose();
        }

        this.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (child.material instanceof THREE.Material) {
                    child.material.dispose();
                }
            }
        });
    }
}

