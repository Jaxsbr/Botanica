import * as THREE from 'three';
import { LSystemGenerator } from './LSystemGenerator';
import { PlantGeometryBuilder } from './PlantGeometryBuilder';
import type { LSystemRules, PlantConfig } from '../types';

/**
 * Plant entity that manages a procedurally-generated plant
 */
export class Plant {
    private mesh: THREE.Group;
    private lSystemRules: LSystemRules;
    private config: PlantConfig;

    constructor(
        position: THREE.Vector3,
        lSystemRules: LSystemRules,
        config: PlantConfig
    ) {
        this.lSystemRules = lSystemRules;
        this.config = config;
        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);

        // Generate the plant immediately
        this.generate();
    }

    /**
     * Generate the plant geometry using L-system rules
     */
    private generate(): void {
        // Clear any existing geometry
        this.mesh.clear();

        // Generate L-system string
        const generator = new LSystemGenerator();
        const lString = generator.generate(
            this.lSystemRules,
            this.lSystemRules.iterations
        );

        // Build geometry from string
        const builder = new PlantGeometryBuilder(this.config);
        const plantGeometry = builder.buildFromLSystem(lString, this.lSystemRules);

        // Add to mesh
        this.mesh.add(plantGeometry);
    }

    /**
     * Get the Three.js mesh for this plant
     */
    getMesh(): THREE.Group {
        return this.mesh;
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.mesh.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (object.material instanceof THREE.Material) {
                    object.material.dispose();
                }
            }
        });
    }
}

