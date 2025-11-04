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

// Plant-related types

export interface LSystemRules {
    axiom: string;
    rules: Record<string, string>;
    angle: number;
    segmentLength: number;
    iterations: number;
}

export interface TransformState {
    position: THREE.Vector3;
    direction: THREE.Vector3;
}

export interface PlantConfig {
    color: number;
    thickness: number;
    roughness: number;
}

