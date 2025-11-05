import * as THREE from 'three';
import type { LightingConfig } from '../types';

export class LightingManager {
    private ambientLight: THREE.AmbientLight;
    private sunLight: THREE.DirectionalLight;

    constructor(scene: THREE.Scene, config: LightingConfig) {
        // Ambient light - soft overall illumination
        this.ambientLight = new THREE.AmbientLight(0xffffff, config.ambientIntensity);
        scene.add(this.ambientLight);

        // Directional light - simulates sun
        this.sunLight = new THREE.DirectionalLight(config.sunColor, config.sunIntensity);
        this.sunLight.position.set(5, 10, 5);
        this.sunLight.castShadow = true;

        // Configure shadow properties
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 50;
        this.sunLight.shadow.camera.left = -10;
        this.sunLight.shadow.camera.right = 10;
        this.sunLight.shadow.camera.top = 10;
        this.sunLight.shadow.camera.bottom = -10;
        this.sunLight.shadow.bias = -0.0001; // Reduce shadow artifacts
        this.sunLight.shadow.normalBias = 0.02; // Additional bias for smoother shadows

        scene.add(this.sunLight);
    }

    public setSunPosition(x: number, y: number, z: number): void {
        this.sunLight.position.set(x, y, z);
    }

    public setAmbientIntensity(intensity: number): void {
        this.ambientLight.intensity = intensity;
    }

    public setSunIntensity(intensity: number): void {
        this.sunLight.intensity = intensity;
    }
}

