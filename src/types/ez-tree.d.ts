/**
 * TypeScript type definitions for @dgreenheck/ez-tree
 * The ez-tree library provides procedural tree generation for Three.js
 */

declare module '@dgreenheck/ez-tree' {
    import * as THREE from 'three';

    /**
     * Tree types supported by ez-tree
     */
    export const TreeType: {
        Deciduous: 'deciduous';
        Evergreen: 'evergreen';
    };

    /**
     * Bark texture types available in ez-tree
     */
    export const BarkType: {
        Birch: 'birch';
        Oak: 'oak';
        Pine: 'pine';
        Willow: 'willow';
    };

    /**
     * Leaf texture types available in ez-tree
     */
    export const LeafType: {
        Ash: 'ash';
        Aspen: 'aspen';
        Pine: 'pine';
        Oak: 'oak';
    };

    /**
     * Billboard rendering modes for leaves
     */
    export const Billboard: {
        Single: 'single';
        Double: 'double';
    };

    /**
     * Configuration options for procedural tree generation
     */
    export class TreeOptions {
        /** Random seed for reproducible generation */
        seed: number;

        /** Type of tree (deciduous or evergreen) */
        type: 'deciduous' | 'evergreen';

        /** Bark appearance settings */
        bark: {
            /** Bark texture type */
            type: 'birch' | 'oak' | 'pine' | 'willow';
            /** Color tint applied to bark (hex color) */
            tint: number;
            /** Use flat shading for bark */
            flatShading: boolean;
            /** Apply texture to bark */
            textured: boolean;
            /** Texture scaling in x and y directions */
            textureScale: { x: number; y: number };
        };

        /** Branch generation parameters */
        branch: {
            /** Number of recursive branch levels (0 = trunk only) */
            levels: number;
            /** Angle of child branches relative to parent (degrees) per level */
            angle: Record<number, number>;
            /** Number of child branches per level */
            children: Record<number, number>;
            /** External force affecting tree growth */
            force: {
                direction: { x: number; y: number; z: number };
                strength: number;
            };
            /** Amount of curling/twisting per branch level */
            gnarliness: Record<number, number>;
            /** Length of each branch level */
            length: Record<number, number>;
            /** Radius (thickness) of each branch level */
            radius: Record<number, number>;
            /** Number of sections along each branch level */
            sections: Record<number, number>;
            /** Number of radial segments per branch level */
            segments: Record<number, number>;
            /** Where child branches start on parent (0-1) per level */
            start: Record<number, number>;
            /** Tapering amount per branch level (0-1) */
            taper: Record<number, number>;
            /** Twist amount per branch level */
            twist: Record<number, number>;
        };

        /** Leaf generation parameters */
        leaves: {
            /** Leaf texture type */
            type: 'ash' | 'aspen' | 'pine' | 'oak';
            /** Billboard rendering mode */
            billboard: 'single' | 'double';
            /** Angle of leaves relative to branch (degrees) */
            angle: number;
            /** Total number of leaves */
            count: number;
            /** Where leaves start on branch (0-1) */
            start: number;
            /** Base size of leaves */
            size: number;
            /** Size variation between leaves (0-1) */
            sizeVariance: number;
            /** Color tint applied to leaves (hex color) */
            tint: number;
            /** Alpha threshold for leaf transparency (0-1) */
            alphaTest: number;
        };

        /**
         * Copy values from another TreeOptions object
         */
        copy(source: Partial<TreeOptions>, target?: TreeOptions): void;
    }

    /**
     * Main Tree class that extends THREE.Group
     * Generates procedural 3D trees with customizable parameters
     */
    export class Tree extends THREE.Group {
        /** Tree generation options */
        options: TreeOptions;

        /** Random number generator */
        rng: any;

        /** Mesh containing branch geometry */
        branchesMesh: THREE.Mesh;

        /** Mesh containing leaf geometry */
        leavesMesh: THREE.Mesh;

        /**
         * Create a new tree
         * @param options - Optional tree generation parameters
         */
        constructor(options?: TreeOptions);

        /**
         * Generate the tree geometry
         * Must be called after changing options to regenerate the tree
         */
        generate(): void;

        /**
         * Load a preset tree configuration from JSON
         * @param name - Name of the preset
         */
        loadPreset(name: string): void;

        /**
         * Load tree configuration from JSON object
         * @param json - Tree options in JSON format
         */
        loadFromJson(json: Partial<TreeOptions>): void;

        /**
         * Update tree animation (for leaf swaying)
         * @param elapsedTime - Total elapsed time in seconds
         */
        update(elapsedTime: number): void;

        /** Get total vertex count */
        readonly vertexCount: number;

        /** Get total triangle count */
        readonly triangleCount: number;
    }
}

