/**
 * Core type definitions for Botanica
 */

import * as THREE from 'three';

export interface TerrariumConfig {
    radius: number;
    soilColor: number;
    backgroundColor: number;
}

export interface LightingConfig {
    ambientIntensity: number;
    sunIntensity: number;
    sunColor: number;
}

export interface CameraConfig {
    fov: number;
    near: number;
    far: number;
    initialPosition: { x: number; y: number; z: number };
    maxPanDistance: { x: number; y: number };  // Max pan from target
    minZoomDistance: number;  // Closest zoom
    maxZoomDistance: number;  // Farthest zoom
}

// Plant-related types (3D tree generation using ez-tree)

/**
 * Simplified configuration for Plant3D
 * These intuitive parameters are converted to ez-tree's detailed TreeOptions internally
 */
export interface Plant3DConfig {
    /** Random seed for reproducible generation */
    seed?: number;

    /** Tree type: deciduous (leafy) or evergreen (coniferous) */
    treeType?: 'deciduous' | 'evergreen';

    /** Size preset that scales the overall tree dimensions */
    size?: 'small' | 'medium' | 'large';

    /** Height of the main trunk (overrides size preset if specified) */
    trunkHeight?: number;

    /** Branch density: 0 (sparse) to 1 (dense) - controls number of branches */
    branchDensity?: number;

    /** Leaf density: 0 (few leaves) to 1 (many leaves) */
    leafDensity?: number;

    /** Size of individual leaves */
    leafSize?: number;

    /** Bark texture type */
    barkType?: 'birch' | 'oak' | 'pine' | 'willow';

    /** Leaf texture type */
    leafType?: 'ash' | 'aspen' | 'pine' | 'oak';

    /** Color customization */
    color?: {
        /** Bark color tint (hex number, e.g., 0x8B4513) */
        bark?: number;
        /** Leaf color tint (hex number, e.g., 0x228B22) */
        leaves?: number;
    };

    /** Growth force direction (-1 to 1 for drooping to upward growth) */
    growthDirection?: number;

    /** Number of branch recursion levels (1-5, more = more detailed) */
    branchLevels?: number;
}

/**
 * Serializable plant genetics for breeding and persistence
 * This is essentially Plant3DConfig but guaranteed to have all values
 */
export interface PlantGenetics extends Required<Omit<Plant3DConfig, 'color'>> {
    color: {
        bark: number;
        leaves: number;
    };
}

