import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type LeafShape = 'sphere' | 'ellipsoid' | 'cone' | 'spiky';
export type LeafDistribution = 'spiral' | 'opposite' | 'whorled' | 'clustered';
export type FruitShape = 'sphere' | 'ellipsoid' | 'cluster';
export type CrystalPlacement = 'trunk' | 'branches' | 'roots';

const LEAF_GEOMETRY_CACHE = new Map<LeafShape, THREE.BufferGeometry>();
const TEMP_MATRIX = new THREE.Matrix4();
const TEMP_QUATERNION = new THREE.Quaternion();
const TEMP_POSITION = new THREE.Vector3();
const TEMP_SCALE = new THREE.Vector3();

const DEFAULT_BARK_COLOR = new THREE.Color(0x654321);
const DEFAULT_LEAF_COLOR = new THREE.Color(0x2f844d);

function getLeafBaseGeometry(shape: LeafShape): THREE.BufferGeometry {
    if (LEAF_GEOMETRY_CACHE.has(shape)) {
        const cached = LEAF_GEOMETRY_CACHE.get(shape);
        if (cached) {
            return cached;
        }
    }

    let geometry: THREE.BufferGeometry;

    switch (shape) {
        case 'ellipsoid': {
            geometry = new THREE.SphereGeometry(0.5, 12, 12);
            geometry.scale(1, 0.6, 0.9);
            break;
        }
        case 'cone': {
            geometry = new THREE.ConeGeometry(0.4, 1, 10);
            geometry.translate(0, 0.5, 0);
            break;
        }
        case 'spiky': {
            geometry = new THREE.ConeGeometry(0.25, 1.4, 6);
            geometry.translate(0, 0.7, 0);
            break;
        }
        case 'sphere':
        default: {
            geometry = new THREE.SphereGeometry(0.5, 12, 12);
            break;
        }
    }

    LEAF_GEOMETRY_CACHE.set(shape, geometry);
    return geometry;
}

export class PlantParts {
    static createStem(
        height: number,
        radius: number,
        taper: number,
        color: THREE.Color,
        segments: number,
        materialOverrides: Partial<THREE.MeshStandardMaterialParameters> = {}
    ): THREE.Mesh {
        const topRadius = Math.max(radius * (1 - THREE.MathUtils.clamp(taper, 0, 1)), 0.01);
        const geometry = new THREE.CylinderGeometry(topRadius, radius, Math.max(height, 0.01), Math.max(segments, 3));
        geometry.translate(0, height / 2, 0);

        const material = new THREE.MeshStandardMaterial({
            color: color ?? DEFAULT_BARK_COLOR,
            roughness: 0.7,
            metalness: 0.1,
            ...materialOverrides,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = 'stem';
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        return mesh;
    }

    static createBranch(length: number, angle: number, curve: number, radius: number): THREE.Group {
        const branchGroup = new THREE.Group();
        branchGroup.name = 'branch';

        const clampedLength = Math.max(length, 0.1);
        const normalizedCurve = THREE.MathUtils.clamp(curve, -1, 1);
        const effectiveRadius = Math.max(radius, 0.005);

        const curveOffset = clampedLength * 0.25 * normalizedCurve;
        const spline = new THREE.CatmullRomCurve3(
            [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(curveOffset * 0.5, clampedLength * 0.4, -curveOffset * 0.25),
                new THREE.Vector3(curveOffset, clampedLength * 0.7, curveOffset * 0.35),
                new THREE.Vector3(curveOffset * 0.4, clampedLength, 0),
            ],
            false,
            'catmullrom',
            0.5
        );

        const geometry = new THREE.TubeGeometry(
            spline,
            Math.max(Math.round(clampedLength * 8), 6),
            effectiveRadius,
            6
        );

        const material = new THREE.MeshStandardMaterial({
            color: DEFAULT_BARK_COLOR,
            roughness: 0.6,
            metalness: 0.15,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = 'branchMesh';
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        branchGroup.add(mesh);

        const attachmentPoints: THREE.Object3D[] = [];
        const attachmentCount = 4;
        const tangent = new THREE.Vector3();

        for (let i = 1; i <= attachmentCount; i += 1) {
            const t = i / (attachmentCount + 1);
            const attachment = new THREE.Object3D();
            spline.getPointAt(t, attachment.position);
            spline.getTangentAt(t, tangent);
            const normalizedTangent = tangent.clone().normalize();
            attachment.userData.branchTangent = normalizedTangent;
            attachment.userData.branchRadius = effectiveRadius;
            const orientation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalizedTangent);
            attachment.quaternion.copy(orientation);
            branchGroup.add(attachment);
            attachmentPoints.push(attachment);
        }

        branchGroup.userData.attachments = attachmentPoints;
        branchGroup.userData.primaryMesh = mesh;
        branchGroup.userData.branchRadius = effectiveRadius;

        branchGroup.rotation.z = THREE.MathUtils.degToRad(angle);

        return branchGroup;
    }

    static createRoot(
        length: number,
        radius: number,
        taper: number,
        divergenceAngle: number,
        downwardAngle: number,
        color: THREE.Color
    ): THREE.Group {
        const rootGroup = new THREE.Group();
        rootGroup.name = 'root';

        const clampedLength = Math.max(length, 0.05);
        const topRadius = Math.max(radius, 0.005);
        const bottomRadius = Math.max(radius * (1 - THREE.MathUtils.clamp(taper, 0, 1)), 0.0025);

        const geometry = new THREE.CylinderGeometry(bottomRadius, topRadius, clampedLength, 8, 1, true);
        geometry.translate(0, -clampedLength / 2, 0);

        const material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.85,
            metalness: 0.1,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        rootGroup.add(mesh);

        rootGroup.rotation.y = divergenceAngle;
        rootGroup.rotation.x = downwardAngle;

        const attachmentPoints: THREE.Object3D[] = [];
        const attachmentCount = 3;
        for (let i = 1; i <= attachmentCount; i += 1) {
            const t = i / (attachmentCount + 1);
            const attachment = new THREE.Object3D();
            attachment.position.set(0, -clampedLength * t, 0);
            attachment.userData.branchTangent = new THREE.Vector3(0, -1, 0);
            attachment.userData.branchRadius = THREE.MathUtils.lerp(topRadius, bottomRadius, t);
            const orientation = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, -1, 0)
            );
            attachment.quaternion.copy(orientation);
            rootGroup.add(attachment);
            attachmentPoints.push(attachment);
        }

        rootGroup.userData.attachments = attachmentPoints;
        rootGroup.userData.primaryMesh = mesh;
        rootGroup.userData.branchRadius = topRadius;

        return rootGroup;
    }

    static createLeafCluster(
        count: number,
        size: number,
        shape: LeafShape,
        color: THREE.Color,
        pattern: LeafDistribution,
        emissive?: { color: THREE.Color; intensity: number }
    ): THREE.Group {
        if (count <= 0 || size <= 0) {
            return new THREE.Group();
        }

        const group = new THREE.Group();
        group.name = 'leafCluster';

        const geometry = getLeafBaseGeometry(shape);
        const material = new THREE.MeshStandardMaterial({
            color: color ?? DEFAULT_LEAF_COLOR,
            roughness: 0.5,
            metalness: 0.05,
            emissive: emissive?.color ?? new THREE.Color(0x000000),
            emissiveIntensity: emissive?.intensity ?? 0,
        });

        const instances = new THREE.InstancedMesh(geometry, material, count);
        instances.name = 'leafInstances';
        instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        instances.castShadow = true;
        instances.receiveShadow = true;

        const baseUp = new THREE.Vector3(0, 1, 0);
        const outward = new THREE.Vector3();
        const patternRadius = size * 0.8;
        const jitter = size * 0.2;

        for (let i = 0; i < count; i += 1) {
            const fraction = count === 1 ? 0.5 : i / (count - 1);

            let radialAngle = fraction * Math.PI * 2;
            let verticalOffset = fraction - 0.5;

            if (pattern === 'spiral') {
                radialAngle = i * 137.5 * THREE.MathUtils.DEG2RAD;
                verticalOffset = (i / count) - 0.3;
            }

            if (pattern === 'opposite') {
                radialAngle = Math.floor(i / 2) * 90 * THREE.MathUtils.DEG2RAD + (i % 2 === 0 ? 0 : Math.PI);
                verticalOffset = ((i % 2) * 2 - 1) * 0.25;
            }

            if (pattern === 'whorled') {
                const whorlIndex = Math.floor(i / 3);
                const indexWithin = i % 3;
                radialAngle = indexWithin * ((2 * Math.PI) / 3);
                verticalOffset = whorlIndex * 0.12 - 0.2;
            }

            if (pattern === 'clustered') {
                radialAngle += (Math.random() - 0.5) * 0.6;
                verticalOffset += (Math.random() - 0.5) * 0.3;
            }

            const radius = patternRadius + (Math.random() - 0.5) * jitter;
            outward.set(Math.cos(radialAngle), Math.max(-0.2, verticalOffset * 2), Math.sin(radialAngle));
            outward.normalize();

            TEMP_POSITION.copy(outward).multiplyScalar(radius);
            TEMP_POSITION.y += verticalOffset * size * 1.2;

            TEMP_QUATERNION.setFromUnitVectors(baseUp, outward);

            const sizeVariance = THREE.MathUtils.lerp(0.85, 1.15, Math.random());
            const xScale = shape === 'ellipsoid' ? 0.6 : 1;
            const zScale = shape === 'ellipsoid' ? 1.2 : 1;

            TEMP_SCALE.set(size * sizeVariance * xScale, size * sizeVariance, size * sizeVariance * zScale);
            TEMP_MATRIX.compose(TEMP_POSITION, TEMP_QUATERNION, TEMP_SCALE);

            instances.setMatrixAt(i, TEMP_MATRIX);
        }

        instances.instanceMatrix.needsUpdate = true;
        group.add(instances);

        return group;
    }

    static createFlower(petalCount: number, size: number, color: THREE.Color): THREE.Group {
        const group = new THREE.Group();
        group.name = 'flower';

        if (petalCount <= 0 || size <= 0) {
            return group;
        }

        const coreMaterial = new THREE.MeshStandardMaterial({
            color: color.clone().multiplyScalar(0.7),
            roughness: 0.4,
            metalness: 0.15,
        });
        const core = new THREE.Mesh(new THREE.SphereGeometry(size * 0.2, 8, 8), coreMaterial);
        core.castShadow = true;
        core.receiveShadow = true;
        group.add(core);

        const petalMaterial = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.35,
            metalness: 0.1,
        });

        const petalGeometry = new THREE.ConeGeometry(size * 0.25, size, 8, 1, true);
        petalGeometry.translate(0, size * 0.5, 0);

        for (let i = 0; i < petalCount; i += 1) {
            const petal = new THREE.Mesh(petalGeometry, petalMaterial);
            petal.name = `petal-${i}`;
            petal.castShadow = true;
            petal.receiveShadow = true;

            const azimuth = (i / petalCount) * Math.PI * 2;
            petal.rotation.y = azimuth;
            petal.rotation.x = THREE.MathUtils.degToRad(35 + Math.random() * 10);

            group.add(petal);
        }

        return group;
    }

    static createFruit(shape: FruitShape, size: number, color: THREE.Color): THREE.Mesh {
        const material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.3,
            metalness: 0.05,
        });

        if (shape === 'ellipsoid') {
            const geometry = new THREE.SphereGeometry(size * 0.5, 12, 12);
            geometry.scale(1, 1.4, 1);
            return new THREE.Mesh(geometry, material);
        }

        if (shape === 'cluster') {
            const baseGeometry = new THREE.SphereGeometry(size * 0.35, 10, 10);
            const translation = new THREE.Vector3();
            const geometries: THREE.BufferGeometry[] = [baseGeometry.clone()];

            for (let i = 0; i < 2; i += 1) {
                const clone = baseGeometry.clone();
                translation.set((i === 0 ? -1 : 1) * size * 0.3, size * 0.2, 0);
                clone.translate(translation.x, translation.y, translation.z);
                geometries.push(clone);
            }

            const merged = BufferGeometryUtils.mergeGeometries(geometries, false);
            if (!merged) {
                return new THREE.Mesh(baseGeometry, material);
            }

            return new THREE.Mesh(merged, material);
        }

        const geometry = new THREE.SphereGeometry(size * 0.5, 14, 14);
        return new THREE.Mesh(geometry, material);
    }

    static createCrystal(size: number, color: THREE.Color, emissive?: { color: THREE.Color; intensity: number }): THREE.Mesh {
        const geometry = new THREE.OctahedronGeometry(size * 0.6, 0);
        geometry.translate(0, size * 0.6, 0);

        const material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.15,
            metalness: 0.65,
            emissive: emissive?.color ?? new THREE.Color(0x000000),
            emissiveIntensity: emissive?.intensity ?? 0,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = 'crystal';
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        return mesh;
    }
}

