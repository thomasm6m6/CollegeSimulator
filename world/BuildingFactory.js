import * as THREE from 'three';
import { TextureManager } from '../assets/TextureManager.js';

export class BuildingFactory {
    constructor() {
        this.textureManager = new TextureManager();
        // Load textures asynchronously
        this.ready = this.textureManager.loadTextures();
        this.Z_OFFSET = 0.01;
        this.wallThickness = 0.2;
    }

    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    generateFloorLayout(type, width, depth, floor, seed, buildingPosition) {
        const cellSize = 4;
        const gridX = Math.floor(width / cellSize);
        const gridZ = Math.floor(depth / cellSize);
        const layout = new Array(gridX * gridZ).fill('empty');
        const meshes = [];
        const collisionBoxes = [];
        const floorSeed = seed + floor;

        if (type === 'dorm') {
            const corridorX = Math.floor(gridX / 2);
            for (let z = 0; z < gridZ; z++) layout[corridorX * gridZ + z] = 'corridor';
            for (let x = 0; x < gridX; x++) {
                if (x !== corridorX && this.seededRandom(floorSeed + x) > 0.4) {
                    const z = Math.floor(this.seededRandom(floorSeed + x + 1) * gridZ);
                    layout[x * gridZ + z] = 'room';
                    const wallGeometry = new THREE.BoxGeometry(this.wallThickness, 3, cellSize);
                    this.textureManager.adjustBoxUVs(wallGeometry, this.wallThickness, 3, cellSize);
                    const wall = new THREE.Mesh(wallGeometry, this.textureManager.materials.innerWall);
                    wall.position.set(
                        buildingPosition.x + (x < corridorX ? (x + 0.5) : (x - 0.5)) * cellSize - width / 2,
                        buildingPosition.y + floor * 3 + 1.5,
                        buildingPosition.z + z * cellSize - depth / 2 + cellSize / 2
                    );
                    meshes.push(wall);
                    collisionBoxes.push(new THREE.Box3().setFromObject(wall));
                }
            }
        } else if (type === 'classroom') {
            const roomCount = Math.floor(this.seededRandom(floorSeed) * 3) + 1;
            for (let i = 0; i < roomCount; i++) {
                const sizeX = Math.floor(this.seededRandom(floorSeed + i) * 3 + 1) * cellSize;
                const sizeZ = Math.floor(this.seededRandom(floorSeed + i + 1) * 2 + 1) * cellSize;
                const x = Math.floor(this.seededRandom(floorSeed + i + 2) * (gridX - sizeX / cellSize));
                const z = Math.floor(this.seededRandom(floorSeed + i + 3) * (gridZ - sizeZ / cellSize));
                for (let dx = x; dx < x + sizeX / cellSize; dx++) {
                    for (let dz = z; dz < z + sizeZ / cellSize; dz++) {
                        if (dx < gridX && dz < gridZ) layout[dx * gridZ + dz] = 'room';
                    }
                }
                const walls = [
                    { geo: new THREE.BoxGeometry(sizeX, 3, this.wallThickness), pos: [x * cellSize - width / 2 + sizeX / 2, floor * 3 + 1.5, z * cellSize - depth / 2 + sizeZ + this.Z_OFFSET] },
                    { geo: new THREE.BoxGeometry(sizeX, 3, this.wallThickness), pos: [x * cellSize - width / 2 + sizeX / 2, floor * 3 + 1.5, z * cellSize - depth / 2 - this.Z_OFFSET] },
                    { geo: new THREE.BoxGeometry(this.wallThickness, 3, sizeZ), pos: [x * cellSize - width / 2 - this.Z_OFFSET, floor * 3 + 1.5, z * cellSize - depth / 2 + sizeZ / 2] },
                    { geo: new THREE.BoxGeometry(this.wallThickness, 3, sizeZ), pos: [x * cellSize - width / 2 + sizeX + this.Z_OFFSET, floor * 3 + 1.5, z * cellSize - depth / 2 + sizeZ / 2] }
                ];
                walls.forEach(w => {
                    this.textureManager.adjustBoxUVs(w.geo, w.geo.parameters.width, w.geo.parameters.height, w.geo.parameters.depth);
                    const wall = new THREE.Mesh(w.geo, this.textureManager.materials.innerWall);
                    wall.position.set(buildingPosition.x + w.pos[0], buildingPosition.y + w.pos[1], buildingPosition.z + w.pos[2]);
                    meshes.push(wall);
                    collisionBoxes.push(new THREE.Box3().setFromObject(wall));
                });
            }
        } else if (type === 'misc') {
            for (let i = 0; i < 3; i++) {
                const x = Math.floor(this.seededRandom(floorSeed + i) * gridX);
                const z = Math.floor(this.seededRandom(floorSeed + i + 1) * gridZ);
                layout[x * gridZ + z] = 'room';
                const wallGeometry = new THREE.BoxGeometry(cellSize, 3, this.wallThickness);
                this.textureManager.adjustBoxUVs(wallGeometry, cellSize, 3, this.wallThickness);
                const wall = new THREE.Mesh(wallGeometry, this.textureManager.materials.innerWall);
                wall.position.set(
                    buildingPosition.x + x * cellSize - width / 2 + cellSize / 2,
                    buildingPosition.y + floor * 3 + 1.5,
                    buildingPosition.z + z * cellSize - depth / 2 + cellSize + this.Z_OFFSET
                );
                meshes.push(wall);
                collisionBoxes.push(new THREE.Box3().setFromObject(wall));
            }
        }

        return { meshes, collisionBoxes };
    }

    async createBuilding(type, position) {
        await this.ready; // Ensure textures are loaded
        const posVec = new THREE.Vector3(position.x, position.y, position.z);

        let floors, width, depth;
        if (type === 'dorm') { floors = 4; width = 20; depth = 20; }
        else if (type === 'classroom') { floors = 3; width = 25; depth = 25; }
        else { floors = 1; width = 15; depth = 15; }

        const floorHeight = 3;
        const totalHeight = floors * floorHeight;
        const meshes = [];
        const floorMeshes = [];
        const outerCollisionBoxes = Array(floors).fill().map(() => []);
        const innerCollisionBoxes = Array(floors).fill().map(() => []);
        const rampPositions = [];

        const seed = Math.abs(Math.floor(position.x * 100 + position.z * 1000));

        // Generate exterior walls and floors
        for (let f = 0; f < floors; f++) {
            if (f === 0) {
                const doorWidth = 8;
                const frontWallLeftGeo = new THREE.BoxGeometry((width - doorWidth) / 2, floorHeight, this.wallThickness);
                this.textureManager.adjustBoxUVs(frontWallLeftGeo, (width - doorWidth) / 2, floorHeight, this.wallThickness);
                const frontWallLeft = new THREE.Mesh(frontWallLeftGeo, this.textureManager.materials.outerWall);
                frontWallLeft.position.set(posVec.x - width / 4, posVec.y + f * floorHeight + floorHeight / 2, posVec.z - depth / 2 - this.Z_OFFSET);

                const frontWallRightGeo = new THREE.BoxGeometry((width - doorWidth) / 2, floorHeight, this.wallThickness);
                this.textureManager.adjustBoxUVs(frontWallRightGeo, (width - doorWidth) / 2, floorHeight, this.wallThickness);
                const frontWallRight = new THREE.Mesh(frontWallRightGeo, this.textureManager.materials.outerWall);
                frontWallRight.position.set(posVec.x + width / 4, posVec.y + f * floorHeight + floorHeight / 2, posVec.z - depth / 2 - this.Z_OFFSET);

                meshes.push(frontWallLeft, frontWallRight);
                outerCollisionBoxes[f].push(
                    new THREE.Box3().setFromObject(frontWallLeft),
                    new THREE.Box3().setFromObject(frontWallRight)
                );
            } else {
                const frontWallGeo = new THREE.BoxGeometry(width, floorHeight, this.wallThickness);
                this.textureManager.adjustBoxUVs(frontWallGeo, width, floorHeight, this.wallThickness);
                const frontWall = new THREE.Mesh(frontWallGeo, this.textureManager.materials.outerWall);
                frontWall.position.set(posVec.x, posVec.y + f * floorHeight + floorHeight / 2, posVec.z - depth / 2 - this.Z_OFFSET);
                meshes.push(frontWall);
                outerCollisionBoxes[f].push(new THREE.Box3().setFromObject(frontWall));
            }

            const backWallGeo = new THREE.BoxGeometry(width, floorHeight, this.wallThickness);
            this.textureManager.adjustBoxUVs(backWallGeo, width, floorHeight, this.wallThickness);
            const backWall = new THREE.Mesh(backWallGeo, this.textureManager.materials.outerWall);
            backWall.position.set(posVec.x, posVec.y + f * floorHeight + floorHeight / 2, posVec.z + depth / 2 + this.Z_OFFSET);
            meshes.push(backWall);
            outerCollisionBoxes[f].push(new THREE.Box3().setFromObject(backWall));

            const leftWallGeo = new THREE.BoxGeometry(this.wallThickness, floorHeight, depth);
            this.textureManager.adjustBoxUVs(leftWallGeo, this.wallThickness, floorHeight, depth);
            const leftWall = new THREE.Mesh(leftWallGeo, this.textureManager.materials.outerWall);
            leftWall.position.set(posVec.x - width / 2 - this.Z_OFFSET, posVec.y + f * floorHeight + floorHeight / 2, posVec.z);
            meshes.push(leftWall);
            outerCollisionBoxes[f].push(new THREE.Box3().setFromObject(leftWall));

            const rightWallGeo = new THREE.BoxGeometry(this.wallThickness, floorHeight, depth);
            this.textureManager.adjustBoxUVs(rightWallGeo, this.wallThickness, floorHeight, depth);
            const rightWall = new THREE.Mesh(rightWallGeo, this.textureManager.materials.outerWall);
            rightWall.position.set(posVec.x + width / 2 + this.Z_OFFSET, posVec.y + f * floorHeight + floorHeight / 2, posVec.z);
            meshes.push(rightWall);
            outerCollisionBoxes[f].push(new THREE.Box3().setFromObject(rightWall));

            // Floor
            const floorGeometry = new THREE.PlaneGeometry(width, depth);
            this.textureManager.adjustPlaneUVs(floorGeometry, width, depth);
            const floorMesh = new THREE.Mesh(floorGeometry, this.textureManager.materials.floor);
            floorMesh.rotation.x = -Math.PI / 2;
            floorMesh.position.set(posVec.x, posVec.y + f * floorHeight + this.Z_OFFSET, posVec.z);
            meshes.push(floorMesh);
            floorMeshes.push(floorMesh);

            // Interior layout
            const { meshes: innerMeshes, collisionBoxes } = this.generateFloorLayout(type, width, depth, f, seed, posVec);
            meshes.push(...innerMeshes);
            innerCollisionBoxes[f] = collisionBoxes;
        }

        // Add ramps for multi-floor buildings
        if (floors > 1 && (type === 'classroom' || type === 'dorm')) {
            for (let f = 0; f < floors - 1; f++) {
                const rampWidth = 2;
                const rampLength = 4;
                const rampHeight = floorHeight;
                const rampGeometry = new THREE.PlaneGeometry(rampWidth, Math.sqrt(rampLength * rampLength + rampHeight * rampHeight));
                this.textureManager.adjustPlaneUVs(rampGeometry, rampWidth, Math.sqrt(rampLength * rampLength + rampHeight * rampHeight));
                const rampMesh = new THREE.Mesh(rampGeometry, this.textureManager.materials.ramp);
                const rampX = posVec.x + (type === 'classroom' ? 10 : 8);
                const rampZ = posVec.z - 10;
                const rampY = posVec.y + f * floorHeight + rampHeight / 2;
                rampMesh.position.set(rampX, rampY, rampZ);
                const angle = Math.atan2(rampHeight, rampLength);
                rampMesh.rotation.x = -angle;
                rampMesh.position.y += this.Z_OFFSET;
                meshes.push(rampMesh);

                const rampStartZ = rampZ - rampLength / 2;
                const rampEndZ = rampZ + rampLength / 2;
                const rampStartY = posVec.y + f * floorHeight;
                const rampEndY = posVec.y + (f + 1) * floorHeight;
                rampPositions[f] = {
                    x: rampX,
                    startZ: rampStartZ,
                    endZ: rampEndZ,
                    startY: rampStartY,
                    endY: rampEndY,
                    floor: f
                };
            }
        }

        const buildingBox = new THREE.Box3().setFromCenterAndSize(posVec, new THREE.Vector3(width, totalHeight, depth));

        return {
            meshes,
            floorMeshes,
            outerCollisionBoxes,
            innerCollisionBoxes,
            rampPositions,
            buildingBox,
            floors,
            floorHeight,
            position: posVec
        };
    }
}