import * as THREE from 'three';
import { TextureManager } from '../assets/TextureManager.js';

export class WorldGenerator {
    constructor(scene) {
        this.scene = scene;
        this.textureManager = new TextureManager();
        this.ready = this.textureManager.loadTextures();
        this.Z_OFFSET = 0.01;
        this.globalSeed = 42;
    }

    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    async generateGround() {
        await this.ready;
        const tileSize = 10;
        const gridSize = 20;
        const totalSize = tileSize * gridSize;

        const groundGeometry = new THREE.PlaneGeometry(totalSize, totalSize, gridSize, gridSize);
        this.textureManager.materials.ground.map.repeat.set(gridSize, gridSize);
        const ground = new THREE.Mesh(groundGeometry, this.textureManager.materials.ground);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, 0, 0);

        return [ground];
    }

    async generateEnvironment(buildings) {
        await this.ready;
        const envMeshes = [];

        // Generate paths between building entrances
        const entrances = buildings.map(b => ({
            x: b.position.x,
            z: b.position.z - (b.buildingBox.max.z - b.buildingBox.min.z) / 2
        }));

        const paths = [];
        for (let i = 1; i < entrances.length; i++) {
            const start = entrances[i - 1];
            const end = entrances[i];
            const pathWidth = 2;
            const length = Math.sqrt((end.x - start.x) ** 2 + (end.z - start.z) ** 2);
            const pathGeometry = new THREE.PlaneGeometry(length, pathWidth);
            this.textureManager.adjustPlaneUVs(pathGeometry, length, pathWidth);
            const pathMesh = new THREE.Mesh(pathGeometry, this.textureManager.materials.path);
            pathMesh.position.set((start.x + end.x) / 2, 0.01 + this.Z_OFFSET, (start.z + end.z) / 2);
            pathMesh.rotation.y = Math.atan2(end.x - start.x, end.z - start.z);
            pathMesh.rotation.x = -Math.PI / 2;
            paths.push(pathMesh);
            envMeshes.push(pathMesh);
        }

        // Generate lamps along paths
        paths.forEach((path, index) => {
            const pathLength = path.geometry.parameters.width;
            const lampCount = Math.floor(pathLength / 10);
            const startPos = new THREE.Vector3().copy(entrances[index]);
            const endPos = new THREE.Vector3().copy(entrances[index + 1]);
            const direction = endPos.clone().sub(startPos).normalize();

            for (let i = 0; i < lampCount; i++) {
                const t = (i + 1) / (lampCount + 1);
                const pos = startPos.clone().lerp(endPos, t);
                pos.y = 0;
                const offset = direction.clone().cross(new THREE.Vector3(0, 1, 0))
                    .multiplyScalar((this.seededRandom(this.globalSeed + i + index) > 0.5 ? 1 : -1) * 1.5);

                const pole = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.1, 0.1, 4, 8),
                    this.textureManager.materials.lampPole
                );
                pole.position.copy(pos).add(offset);
                pole.position.y = 2;

                const light = new THREE.Mesh(
                    new THREE.SphereGeometry(0.3, 8, 8),
                    this.textureManager.materials.lampLight
                );
                light.position.copy(pole.position).add(new THREE.Vector3(0, 2, 0));

                envMeshes.push(pole, light);
            }
        });

        // Generate shrubs
        const shrubCount = 50;
        for (let i = 0; i < shrubCount; i++) {
            const x = (this.seededRandom(this.globalSeed + i) * 200) - 100;
            const z = (this.seededRandom(this.globalSeed + i + 1) * 200) - 100;
            let valid = true;

            for (let b of buildings) {
                if (b.buildingBox.containsPoint(new THREE.Vector3(x, 0, z))) {
                    valid = false;
                    break;
                }
            }
            for (let p of paths) {
                const box = new THREE.Box3().setFromObject(p).expandByScalar(1);
                if (box.containsPoint(new THREE.Vector3(x, 0, z))) {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                const shrub = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.5, 0.8, 1.5, 8),
                    this.textureManager.materials.shrub
                );
                shrub.position.set(x, 0.75, z);
                envMeshes.push(shrub);
            }
        }

        // Generate grass patches
        const grassCount = 30;
        for (let i = 0; i < grassCount; i++) {
            const x = (this.seededRandom(this.globalSeed + i + shrubCount) * 200) - 100;
            const z = (this.seededRandom(this.globalSeed + i + shrubCount + 1) * 200) - 100;
            let valid = true;

            for (let b of buildings) {
                if (b.buildingBox.containsPoint(new THREE.Vector3(x, 0, z))) {
                    valid = false;
                    break;
                }
            }
            for (let p of paths) {
                const box = new THREE.Box3().setFromObject(p).expandByScalar(1);
                if (box.containsPoint(new THREE.Vector3(x, 0, z))) {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                const grass = new THREE.Mesh(
                    new THREE.PlaneGeometry(3, 3),
                    this.textureManager.materials.grass
                );
                grass.rotation.x = -Math.PI / 2;
                grass.position.set(x, 0.01 + this.Z_OFFSET * 2, z);
                envMeshes.push(grass);
            }
        }

        return envMeshes;
    }
}