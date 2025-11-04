/**
 * Core type definitions for Botanica
 */

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
}

