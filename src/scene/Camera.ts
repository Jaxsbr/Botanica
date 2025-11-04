import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CameraConfig } from '../types';

export class CameraManager {
    public camera: THREE.PerspectiveCamera;
    public controls: OrbitControls;

    constructor(renderer: THREE.WebGLRenderer, config: CameraConfig) {
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            config.fov,
            window.innerWidth / window.innerHeight,
            config.near,
            config.far
        );

        this.camera.position.set(
            config.initialPosition.x,
            config.initialPosition.y,
            config.initialPosition.z
        );

        // Create orbit controls
        this.controls = new OrbitControls(this.camera, renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2; // Don't go below ground
        this.controls.target.set(0, 0.5, 0); // Look at center of terrarium
        this.controls.update();

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }

    public update(): void {
        this.controls.update();
    }

    public dispose(): void {
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        this.controls.dispose();
    }
}

