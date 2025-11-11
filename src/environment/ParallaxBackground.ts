import * as THREE from 'three';

interface ParallaxLayer {
    mesh: THREE.Mesh | THREE.Group;
    parallaxStrength: number;
    basePosition: THREE.Vector3;
}

export class ParallaxBackground {
    private readonly group: THREE.Group;
    private readonly layers: ParallaxLayer[] = [];
    private mouseNormalized: { x: number; y: number } = { x: 0, y: 0 };
    private readonly scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.name = 'ParallaxBackground';
        this.createLayers();
        scene.add(this.group);
    }

    /**
     * Update mouse position for parallax effect (normalized to screen center: [-1, 1])
     */
    public updateMousePosition(clientX: number, clientY: number, width: number, height: number): void {
        // Normalize mouse position to [-1, 1] from screen center
        // Increase multiplier for more noticeable parallax effect
        this.mouseNormalized.x = ((clientX / width) * 2 - 1) * 0.8;
        this.mouseNormalized.y = -((clientY / height) * 2 - 1) * 0.8;
    }

    /**
     * Update parallax layers (call in animation loop)
     */
    public update(): void {
        for (const layer of this.layers) {
            const offsetX = this.mouseNormalized.x * layer.parallaxStrength;
            const offsetY = this.mouseNormalized.y * layer.parallaxStrength * 0.5; // Less vertical movement

            if (layer.mesh instanceof THREE.Mesh || layer.mesh instanceof THREE.Group) {
                layer.mesh.position.x = layer.basePosition.x + offsetX;
                layer.mesh.position.y = layer.basePosition.y + offsetY;
                layer.mesh.position.z = layer.basePosition.z;
            }
        }
    }

    /**
     * Create background layers with parallax effect
     */
    private createLayers(): void {
        // Layer 0: Distant sky gradient and horizon
        const skyLayer = this.createSkyLayer();
        const skyBasePos = new THREE.Vector3(0, -20, 0); // Position below ground, visible from top-down
        this.layers.push({
            mesh: skyLayer,
            parallaxStrength: 0.15, // Increased parallax
            basePosition: skyBasePos
        });
        this.group.add(skyLayer);

        // Layer 1: Mid-distance clouds
        const cloudLayer = this.createCloudLayer();
        const cloudBasePos = new THREE.Vector3(0, -15, 0); // Closer to ground
        this.layers.push({
            mesh: cloudLayer,
            parallaxStrength: 0.4, // Increased parallax
            basePosition: cloudBasePos
        });
        this.group.add(cloudLayer);

        // Layer 2: Near atmospheric effects
        const atmosphereLayer = this.createAtmosphereLayer();
        const atmosphereBasePos = new THREE.Vector3(0, -10, 0); // Even closer
        this.layers.push({
            mesh: atmosphereLayer,
            parallaxStrength: 0.6, // More noticeable parallax
            basePosition: atmosphereBasePos
        });
        this.group.add(atmosphereLayer);
    }

    /**
     * Create distant sky layer (gradient, horizon)
     */
    private createSkyLayer(): THREE.Mesh {
        // Large plane visible from top-down view
        const geometry = new THREE.PlaneGeometry(500, 500);
        const material = new THREE.MeshBasicMaterial({
            color: 0x6bb6ff, // Brighter sky blue for visibility
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7 // Increased opacity
        });

        const mesh = new THREE.Mesh(geometry, material);
        // Position below ground plane, flat (horizontal) for top-down view
        mesh.position.set(0, -20, 0);
        mesh.rotateX(-Math.PI / 2); // Lay flat horizontally

        return mesh;
    }

    /**
     * Create cloud layer with floating elements
     */
    private createCloudLayer(): THREE.Mesh {
        // Create a group for clouds
        const cloudGroup = new THREE.Group();

        // Add more, larger cloud-like shapes positioned for top-down visibility
        for (let i = 0; i < 15; i++) {
            const cloudSize = 3 + Math.random() * 5;
            const cloudGeometry = new THREE.SphereGeometry(cloudSize, 16, 16);
            const cloudMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.5 // Increased opacity
            });
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            // Position clouds in a horizontal plane below ground, spread out
            cloud.position.set(
                (Math.random() - 0.5) * 100,
                -15, // Fixed Y position for top-down visibility
                (Math.random() - 0.5) * 100
            );
            // Flatten clouds horizontally (visible from top)
            cloud.scale.set(1 + Math.random() * 0.5, 0.2 + Math.random() * 0.2, 1 + Math.random() * 0.5);
            cloudGroup.add(cloud);
        }

        return cloudGroup as unknown as THREE.Mesh;
    }

    /**
     * Create atmospheric effects layer (subtle fog, particles)
     */
    private createAtmosphereLayer(): THREE.Mesh {
        // Larger plane for better visibility
        const geometry = new THREE.PlaneGeometry(300, 300);
        const material = new THREE.MeshBasicMaterial({
            color: 0xa8d8e8, // Lighter powder blue
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.35 // Increased opacity
        });

        const mesh = new THREE.Mesh(geometry, material);
        // Position below ground, flat for top-down view
        mesh.position.set(0, -10, 0);
        mesh.rotateX(-Math.PI / 2); // Lay flat horizontally

        return mesh;
    }

    /**
     * Remove from scene and dispose
     */
    public dispose(): void {
        for (const layer of this.layers) {
            // Dispose all children in the layer
            layer.mesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach((mat) => mat.dispose());
                        } else if (child.material instanceof THREE.Material) {
                            child.material.dispose();
                        }
                    }
                }
            });
        }
        this.scene.remove(this.group);
        this.layers.length = 0;
    }
}

