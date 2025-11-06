/**
 * Core type definitions for Botanica
 */

import * as THREE from 'three';

// Podule system types
export type PoduleType = 'home' | 'shop';

export interface PoduleConfig {
    radius: number;
    soilColor: number;
    backgroundColor: number;
}

// Legacy alias for backwards compatibility during refactor
export type TerrariumConfig = PoduleConfig;

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

// Shop system types

export type ShopCategory = 'tools' | 'pots' | 'fertilizers' | 'soil' | 'outdoor-plants' | 'indoor-plants';

export interface ShopItem {
    id: string;
    name: string;
    price: number;
    category: ShopCategory;
    description: string;
    icon: string; // emoji or simple indicator
    unlocked: boolean; // For future unlock system
}

// Inventory system types

export interface InventoryItem {
    itemId: string;
    quantity: number;
    category: ShopCategory;
}

export interface InventorySaveData {
    items: InventoryItem[];
    lastSaved: number;
}

// Purchase system types

export interface PurchaseResult {
    success: boolean;
    message: string;
}

// Soil system types

export type DrainageType = 'poor' | 'medium' | 'good';

export interface SoilStats {
    nitrogen: number;      // 0-100
    phosphorus: number;    // 0-100
    potassium: number;     // 0-100
    pH: number;           // 4.0-9.0
    drainage: DrainageType;
    waterLevel: number;   // 0-100
    maxWater: number;     // Based on drainage
}

export interface SoilSaveData {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    pH: number;
    drainage: DrainageType;
    waterLevel: number;
    lastWateredTime?: number; // Optional for backwards compatibility
}

// Input system types

/**
 * Interface for podules that need to handle mouse input
 * Podules implementing this will receive input events from InputManager
 */
export interface IClickable {
    /**
     * Handle mouse click at normalized coordinates
     * @param mouse - Normalized mouse coords (-1 to 1)
     * @param camera - Current camera for raycasting
     * @returns true if click was handled, false otherwise
     */
    handleClick(mouse: THREE.Vector2, camera: THREE.Camera): boolean;

    /**
     * Handle mouse move for hover effects
     * @param mouse - Normalized mouse coords (-1 to 1)
     * @param camera - Current camera for raycasting
     */
    handleMouseMove(mouse: THREE.Vector2, camera: THREE.Camera): void;
}

