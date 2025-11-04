import * as THREE from 'three';
import type { TerrariumConfig } from '../types';

export class SceneManager {
    public scene: THREE.Scene;
    public renderer: THREE.WebGLRenderer;
    private config: TerrariumConfig;

    constructor(container: HTMLElement, config: TerrariumConfig) {
        this.config = config;

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.config.backgroundColor);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        container.appendChild(this.renderer.domElement);

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    private onWindowResize(): void {
        // Camera will handle its own aspect ratio update
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public add(object: THREE.Object3D): void {
        this.scene.add(object);
    }

    public remove(object: THREE.Object3D): void {
        this.scene.remove(object);
    }

    public dispose(): void {
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        this.renderer.dispose();
    }
}

