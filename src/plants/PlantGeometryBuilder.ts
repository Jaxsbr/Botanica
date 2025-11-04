import * as THREE from 'three';
import type { LSystemRules, TransformState, PlantConfig } from '../types';

/**
 * Builds Three.js geometry from L-system strings using turtle graphics
 */
export class PlantGeometryBuilder {
    private config: PlantConfig;

    constructor(config: PlantConfig) {
        this.config = config;
    }

    /**
     * Build a plant mesh from an L-system instruction string
     * @param lString - The L-system instruction string
     * @param rules - The rules used to generate the string (for angle/length)
     * @returns A THREE.Group containing all plant segments
     */
    buildFromLSystem(lString: string, rules: LSystemRules): THREE.Group {
        const plant = new THREE.Group();
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: this.config.color,
            roughness: this.config.roughness,
            metalness: 0
        });

        // Turtle graphics state
        const stack: TransformState[] = [];
        let position = new THREE.Vector3(0, 0, 0);
        let direction = new THREE.Vector3(0, 1, 0); // Start pointing up
        const angle = rules.angle * Math.PI / 180; // Convert to radians

        // Interpret each character
        for (const char of lString) {
            switch (char) {
                case 'F':
                    // Move forward and draw segment
                    const segment = this.createStemSegment(
                        position,
                        direction,
                        rules.segmentLength,
                        stemMaterial
                    );
                    plant.add(segment);

                    // Update position
                    position = position.clone().add(
                        direction.clone().multiplyScalar(rules.segmentLength)
                    );
                    break;

                case '+':
                    // Turn left (rotate around Z-axis)
                    direction.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);
                    break;

                case '-':
                    // Turn right (rotate around Z-axis)
                    direction.applyAxisAngle(new THREE.Vector3(0, 0, 1), -angle);
                    break;

                case '[':
                    // Push current state to stack
                    stack.push({
                        position: position.clone(),
                        direction: direction.clone()
                    });
                    break;

                case ']':
                    // Pop state from stack
                    const state = stack.pop();
                    if (state) {
                        position = state.position;
                        direction = state.direction;
                    }
                    break;

                // Ignore other characters (like 'X' in axiom)
                default:
                    break;
            }
        }

        return plant;
    }

    /**
     * Create a single stem segment (cylinder)
     * @param start - Starting position
     * @param direction - Direction vector (normalized)
     * @param length - Length of the segment
     * @param material - Material to use
     * @returns A mesh representing the segment
     */
    private createStemSegment(
        start: THREE.Vector3,
        direction: THREE.Vector3,
        length: number,
        material: THREE.Material
    ): THREE.Mesh {
        // Create cylinder geometry
        const geometry = new THREE.CylinderGeometry(
            this.config.thickness,
            this.config.thickness,
            length,
            8 // segments
        );

        const segment = new THREE.Mesh(geometry, material);

        // Position at midpoint of segment
        segment.position.copy(start).add(
            direction.clone().multiplyScalar(length / 2)
        );

        // Rotate cylinder to align with direction
        // Default cylinder points up (0,1,0), so align with our direction
        segment.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.clone().normalize()
        );

        segment.castShadow = true;
        segment.receiveShadow = false;

        return segment;
    }
}

