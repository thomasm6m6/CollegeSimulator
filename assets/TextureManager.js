import * as THREE from 'three';

export class TextureManager {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        this.textures = {};
        this.materials = {};

        // Initialize with default texture size
        this.textureSize = 256;
    }

    async loadTextures() {
        // Load all textures at once
        const textureFiles = {
            outerWall: 'textures/outer_wall.png',
            innerWall: 'textures/inner_wall.png',
            floor: 'textures/floor.png',
            ramp: 'textures/ramp.png',
            path: 'textures/path.png',
            grass: 'textures/grass.png'
        };

        const promises = [];

        for (const [name, url] of Object.entries(textureFiles)) {
            const promise = new Promise((resolve) => {
                this.textureLoader.load(url,
                    (texture) => {
                        // Apply pixel art settings
                        texture.minFilter = THREE.NearestFilter;
                        texture.magFilter = THREE.NearestFilter;
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        texture.repeat.set(1, 1);

                        this.textures[name] = texture;
                        resolve();
                    },
                    undefined,
                    (error) => {
                        console.error(`Failed to load texture ${name} from ${url}:`, error);
                        this.textures[name] = new THREE.Texture();
                        resolve();
                    }
                );
            });

            promises.push(promise);
        }

        return Promise.all(promises).then(() => {
            this.createMaterials();
            return this;
        });
    }

    createMaterials() {
        // Create and store all materials
        this.materials = {
            outerWall: new THREE.MeshBasicMaterial({
                map: this.textures.outerWall
            }),
            innerWall: new THREE.MeshBasicMaterial({
                map: this.textures.innerWall,
                polygonOffset: true,
                polygonOffsetFactor: 1,
                polygonOffsetUnits: 1
            }),
            floor: new THREE.MeshBasicMaterial({
                map: this.textures.floor
            }),
            ramp: new THREE.MeshBasicMaterial({
                map: this.textures.ramp
            }),
            path: new THREE.MeshBasicMaterial({
                map: this.textures.path
            }),
            ground: new THREE.MeshBasicMaterial({
                map: this.textures.grass,
                side: THREE.DoubleSide
            }),
            shrub: new THREE.MeshBasicMaterial({
                color: 0x228B22
            }),
            lampPole: new THREE.MeshBasicMaterial({
                color: 0x333333
            }),
            lampLight: new THREE.MeshBasicMaterial({
                color: 0xFFFF99
            }),
            grass: new THREE.MeshBasicMaterial({
                color: 0x32CD32
            })
        };
    }

    // Utility functions for UV mapping with proper aspect ratio
    adjustBoxUVs(geometry, width, height, depth, textureWidthInWorldUnits = 4) {
        const uvAttribute = geometry.attributes.uv;
        // Assume texture is square (256x256); adjust if different
        const textureAspect = 1; // textureWidth / textureHeight (1 for square)

        const faces = [
            { start: 0, uDim: width, vDim: height },  // Front
            { start: 4, uDim: width, vDim: height },  // Back
            { start: 8, uDim: depth, vDim: height },  // Left
            { start: 12, uDim: depth, vDim: height }, // Right
            { start: 16, uDim: width, vDim: depth },  // Top
            { start: 20, uDim: width, vDim: depth }   // Bottom
        ];

        faces.forEach(face => {
            const faceAspect = face.uDim / face.vDim;
            let uScale = face.uDim / textureWidthInWorldUnits;
            let vScale = face.vDim / textureWidthInWorldUnits;

            // Adjust scaling to match texture aspect ratio
            if (faceAspect > textureAspect) {
                vScale = uScale / textureAspect; // Increase vScale to avoid stretching
            } else {
                uScale = vScale * textureAspect; // Increase uScale to avoid stretching
            }

            for (let i = face.start; i < face.start + 4; i++) {
                uvAttribute.setXY(
                    i,
                    uvAttribute.getX(i) * uScale,
                    uvAttribute.getY(i) * vScale
                );
            }
        });

        uvAttribute.needsUpdate = true;
    }

    adjustPlaneUVs(geometry, width, depth, textureWidthInWorldUnits = 4) {
        const uvAttribute = geometry.attributes.uv;
        const textureAspect = 1; // Assume square texture (256x256)
        const faceAspect = width / depth;

        let uScale = width / textureWidthInWorldUnits;
        let vScale = depth / textureWidthInWorldUnits;

        if (faceAspect > textureAspect) {
            vScale = uScale / textureAspect; // Adjust v to match texture aspect
        } else {
            uScale = vScale * textureAspect; // Adjust u to match texture aspect
        }

        for (let i = 0; i < uvAttribute.count; i++) {
            uvAttribute.setXY(
                i,
                uvAttribute.getX(i) * uScale,
                uvAttribute.getY(i) * vScale
            );
        }

        uvAttribute.needsUpdate = true;
    }
}