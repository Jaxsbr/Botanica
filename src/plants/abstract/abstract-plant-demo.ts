import * as THREE from 'three';
import { AbstractPlant } from './AbstractPlant';
import { PLANT_PRESETS } from './PlantPresets';

interface DemoPlantSlot {
    presetKey: string;
    mesh?: THREE.Group;
    offset: number;
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e12);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 150);
camera.position.set(6, 4, 10);
camera.lookAt(0, 2.3, 0);

const ambientLight = new THREE.AmbientLight(0xf0f5ff, 0.55);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.05);
sunLight.position.set(6, 10, 4);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
scene.add(sunLight);

const groundGeometry = new THREE.CircleGeometry(15, 64);
groundGeometry.rotateX(-Math.PI / 2);
const groundMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x1a232b),
    roughness: 0.9,
    metalness: 0.05,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.receiveShadow = true;
scene.add(ground);

const abstractPlant = new AbstractPlant();
const presetEntries = Object.entries(PLANT_PRESETS);

const plantSlots: DemoPlantSlot[] = presetEntries.map(([presetKey], index) => ({
    presetKey,
    offset: index,
}));

const slotSpacing = 3.3;
const clock = new THREE.Clock();
let previousGrowthPhase = 0;
let cycleIndex = 0;

function disposeSlotMesh(slot: DemoPlantSlot): void {
    if (!slot.mesh) {
        return;
    }

    if (typeof slot.mesh.userData?.dispose === 'function') {
        slot.mesh.userData.dispose();
    }
    scene.remove(slot.mesh);
    slot.mesh = undefined;
}

function assignPresetCycle(): void {
    plantSlots.forEach((slot, index) => {
        const nextPresetIndex = (index + cycleIndex) % presetEntries.length;
        slot.presetKey = presetEntries[nextPresetIndex][0];
    });
}

function regeneratePlant(slot: DemoPlantSlot, growthPercent: number, index: number): void {
    disposeSlotMesh(slot);
    const config = PLANT_PRESETS[slot.presetKey];
    const mesh = abstractPlant.generate(config, growthPercent);
    mesh.position.set((index - (plantSlots.length - 1) / 2) * slotSpacing, 0, 0);
    mesh.rotation.y = THREE.MathUtils.degToRad(index * 7);
    mesh.castShadow = true;
    mesh.traverse((object) => {
        object.castShadow = true;
        object.receiveShadow = true;
    });
    scene.add(mesh);
    slot.mesh = mesh;
}

function animate(): void {
    const elapsed = clock.getElapsedTime();
    const growthPhase = (elapsed % 5) / 5;
    const growthPercent = growthPhase * 100;

    plantSlots.forEach((slot, index) => {
        regeneratePlant(slot, growthPercent, index);
    });

    renderer.render(scene, camera);

    if (growthPhase < previousGrowthPhase) {
        cycleIndex += 1;
        assignPresetCycle();
    }
    previousGrowthPhase = growthPhase;

    requestAnimationFrame(animate);
}

assignPresetCycle();
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as unknown as Record<string, unknown>).abstractPlantDemo = {
    scene,
    camera,
    renderer,
    regenerate: (presetKey: string, growthPercent: number) => {
        const slot = plantSlots[0];
        slot.presetKey = presetKey;
        regeneratePlant(slot, growthPercent, 0);
    },
    presets: PLANT_PRESETS,
};

