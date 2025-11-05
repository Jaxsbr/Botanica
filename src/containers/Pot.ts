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
        const { topRadius, bottomRadius, height, thickness, color, rimHeight, soilHeight, soilColor } = this.config;

        // Calculate inner radii for hollow pot
        const innerTopRadius = topRadius - thickness;
        const innerBottomRadius = bottomRadius - thickness;

        const potMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.85,
            metalness: 0,
            envMapIntensity: 0.3
        });

        // Use LatheGeometry to create a proper hollow pot with thickness
        // Define the outer profile
        const outerPoints: THREE.Vector2[] = [];
        const innerPoints: THREE.Vector2[] = [];
        const segments = 16;

        // Build outer and inner profiles from bottom to top
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const y = -height / 2 + (height * t);
            const outerR = THREE.MathUtils.lerp(bottomRadius, topRadius, t);
            const innerR = THREE.MathUtils.lerp(innerBottomRadius, innerTopRadius, t);

            outerPoints.push(new THREE.Vector2(outerR, y));
            innerPoints.push(new THREE.Vector2(innerR, y));
        }

        // Create the pot walls using a shape with a hole
        const shape = new THREE.Shape();

        // Outer profile (clockwise)
        shape.moveTo(bottomRadius, -height / 2);
        for (let i = 1; i < outerPoints.length; i++) {
            shape.lineTo(outerPoints[i].x, outerPoints[i].y);
        }
        // Top rim extension
        shape.lineTo(topRadius + 0.02, height / 2);
        shape.lineTo(topRadius + 0.02, height / 2 + rimHeight);

        // Come back along rim
        shape.lineTo(innerTopRadius, height / 2 + rimHeight);
        shape.lineTo(innerTopRadius, height / 2);

        // Inner profile (counter-clockwise for hole)
        for (let i = innerPoints.length - 1; i >= 0; i--) {
            shape.lineTo(innerPoints[i].x, innerPoints[i].y);
        }

        // Close at bottom
        shape.lineTo(bottomRadius, -height / 2);

        // Extrude the shape as a lathe (rotate around Y axis)
        const extrudeSettings = {
            steps: 64,
            depth: 0.1,
            bevelEnabled: false
        };

        // Use LatheGeometry instead for proper circular pot
        const points: THREE.Vector2[] = [];

        // Bottom outer corner
        points.push(new THREE.Vector2(bottomRadius, -height / 2));

        // Outer wall
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const y = -height / 2 + (height * t);
            const r = THREE.MathUtils.lerp(bottomRadius, topRadius, t);
            points.push(new THREE.Vector2(r, y));
        }

        // Rim outer edge
        points.push(new THREE.Vector2(topRadius + 0.02, height / 2));
        points.push(new THREE.Vector2(topRadius + 0.02, height / 2 + rimHeight));

        // Rim top
        points.push(new THREE.Vector2(innerTopRadius, height / 2 + rimHeight));
        points.push(new THREE.Vector2(innerTopRadius, height / 2));

        // Inner wall (going down)
        for (let i = segments; i >= 0; i--) {
            const t = i / segments;
            const y = -height / 2 + (height * t);
            const r = THREE.MathUtils.lerp(innerBottomRadius, innerTopRadius, t);
            points.push(new THREE.Vector2(r, y));
        }

        // Bottom
        points.push(new THREE.Vector2(innerBottomRadius, -height / 2));

        const potGeometry = new THREE.LatheGeometry(points, 64);
        const pot = new THREE.Mesh(potGeometry, potMaterial);
        pot.castShadow = true;
        pot.receiveShadow = true;
        this.group.add(pot);

        // Create soil inside pot
        const actualSoilHeight = height * soilHeight;
        const soilY = (-height / 2) + (actualSoilHeight / 2);
        const soilTopRadius = THREE.MathUtils.lerp(innerBottomRadius, innerTopRadius, soilHeight);

        const soilGeometry = new THREE.CylinderGeometry(
            soilTopRadius * 0.99, // Slightly smaller to avoid z-fighting
            innerBottomRadius * 0.99,
            actualSoilHeight,
            64
        );

        const soilMaterial = new THREE.MeshStandardMaterial({
            color: soilColor,
            roughness: 0.95,
            metalness: 0
        });

        const soil = new THREE.Mesh(soilGeometry, soilMaterial);
        soil.position.y = soilY;
        soil.receiveShadow = true;
        soil.castShadow = false;
        this.group.add(soil);

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
        // Plants should be positioned at soil surface level
        const actualSoilHeight = this.config.height * this.config.soilHeight;
        const soilTopY = (-this.config.height / 2) + actualSoilHeight;
        return new THREE.Vector3(0, soilTopY, 0);
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

