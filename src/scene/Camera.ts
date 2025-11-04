import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CameraConfig } from '../types';

export class CameraManager {
    public camera: THREE.PerspectiveCamera;
    public controls: OrbitControls;
    private maxPanDistance: { x: number; y: number };
    private initialTarget: THREE.Vector3;

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

        // Store pan limits
        this.maxPanDistance = config.maxPanDistance;
        this.initialTarget = new THREE.Vector3(0, 0.5, 0);

        // Create orbit controls
        this.controls = new OrbitControls(this.camera, renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Disable rotation, enable pan-only mode
        this.controls.enableRotate = false;
        this.controls.enablePan = true;
        this.controls.screenSpacePanning = true;

        // Set zoom limits
        this.controls.minDistance = config.minZoomDistance;
        this.controls.maxDistance = config.maxZoomDistance;

        this.controls.target.copy(this.initialTarget);
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

        // Clamp pan distance from initial target
        const targetOffset = this.controls.target.clone().sub(this.initialTarget);

        targetOffset.x = Math.max(-this.maxPanDistance.x, Math.min(this.maxPanDistance.x, targetOffset.x));
        targetOffset.y = Math.max(-this.maxPanDistance.y, Math.min(this.maxPanDistance.y, targetOffset.y));

        this.controls.target.copy(this.initialTarget).add(targetOffset);
    }

    public dispose(): void {
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        this.controls.dispose();
    }
}

