import * as THREE from 'three';

export class PhysicsSystem {
    constructor() {
        this.buildings = [];
        this.collisionObjects = [];

        // Physics constants
        this.playerRadius = 0.5;
        this.playerHeight = 1.0;
    }

    registerBuildings(buildings) {
        this.buildings = buildings;
        this.updateCollisionObjects();
    }

    updateCollisionObjects() {
        this.collisionObjects = this.buildings.flatMap(building =>
            building.outerCollisionBoxes.flat()
        );
    }

    getCollisionBoxesForPosition(position) {
        // Check which building the player is in
        let currentBuilding = null;
        let currentFloor = 0;

        this.buildings.forEach(building => {
            if (building.buildingBox.containsPoint(position)) {
                currentBuilding = building;
                currentFloor = Math.round((position.y - building.position.y - 0.5) / building.floorHeight);
                currentFloor = Math.max(0, Math.min(building.floors - 1, currentFloor));
            }
        });

        if (currentBuilding) {
            return [
                ...currentBuilding.outerCollisionBoxes[currentFloor],
                ...currentBuilding.innerCollisionBoxes[currentFloor]
            ];
        } else {
            return this.buildings.flatMap(building => building.outerCollisionBoxes.flat());
        }
    }

    checkCollision(position, velocity) {
        const newPosition = position.clone().add(velocity);

        // Create player bounding box
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            newPosition,
            new THREE.Vector3(this.playerRadius * 2, this.playerHeight, this.playerRadius * 2)
        );

        // Get relevant collision boxes
        const collisionBoxes = this.getCollisionBoxesForPosition(position);

        // Check for collisions
        let collision = false;
        let collisionNormal = new THREE.Vector3();
        let minPenetration = Infinity;

        for (let box of collisionBoxes) {
            if (playerBox.intersectsBox(box)) {
                collision = true;

                const boxCenter = new THREE.Vector3();
                box.getCenter(boxCenter);

                const boxSize = new THREE.Vector3();
                box.getSize(boxSize);

                const toBox = boxCenter.clone().sub(newPosition);

                // Calculate overlaps in each dimension
                const xOverlap = (this.playerRadius + boxSize.x / 2) - Math.abs(toBox.x);
                const yOverlap = (this.playerHeight / 2 + boxSize.y / 2) - Math.abs(toBox.y);
                const zOverlap = (this.playerRadius + boxSize.z / 2) - Math.abs(toBox.z);

                // Find minimum penetration axis
                if (xOverlap < yOverlap && xOverlap < zOverlap) {
                    collisionNormal.set(Math.sign(toBox.x), 0, 0);
                    minPenetration = Math.min(minPenetration, xOverlap);
                } else if (yOverlap < zOverlap) {
                    collisionNormal.set(0, Math.sign(toBox.y), 0);
                    minPenetration = Math.min(minPenetration, yOverlap);
                } else {
                    collisionNormal.set(0, 0, Math.sign(toBox.z));
                    minPenetration = Math.min(minPenetration, zOverlap);
                }
                break;
            }
        }

        return {
            collision,
            collisionNormal,
            minPenetration,
            collisionBoxes
        };
    }

    calculateRampPosition(position, buildings) {
        for (const building of buildings) {
            if (building.buildingBox.containsPoint(position)) {
                for (let f = 0; f < building.floors - 1; f++) {
                    const ramp = building.rampPositions[f];
                    if (Math.abs(position.x - ramp.x) < 1 &&
                        position.z >= ramp.startZ &&
                        position.z <= ramp.endZ) {

                        const t = (position.z - ramp.startZ) / (ramp.endZ - ramp.startZ);
                        const newY = ramp.startY + t * (ramp.endY - ramp.startY) + 0.5;
                        return { onRamp: true, y: newY };
                    }
                }

                const currentFloor = Math.round((position.y - building.position.y - 0.5) / building.floorHeight);
                const floorY = building.position.y + currentFloor * building.floorHeight + 0.5;
                return { onRamp: false, y: floorY };
            }
        }

        return { onRamp: false, y: 0.5 };
    }

    handleSlideMovement(position, velocity, collisionInfo) {
        if (!collisionInfo.collision) return position.clone().add(velocity);

        const movementDir = velocity.clone().normalize();
        const wallAngle = Math.acos(movementDir.dot(collisionInfo.collisionNormal));

        if (wallAngle > Math.PI / 4) {
            const dot = velocity.dot(collisionInfo.collisionNormal);
            const projection = collisionInfo.collisionNormal.clone().multiplyScalar(dot);
            const slideVector = velocity.clone().sub(projection);

            if (slideVector.lengthSq() > 0.0001) {
                slideVector.normalize().multiplyScalar(velocity.length() * 0.8);
                const newPosition = position.clone().add(slideVector);

                // Check if slide movement causes another collision
                const slideBox = new THREE.Box3().setFromCenterAndSize(
                    newPosition,
                    new THREE.Vector3(this.playerRadius * 2, this.playerHeight, this.playerRadius * 2)
                );

                let slideCollision = false;
                for (let box of collisionInfo.collisionBoxes) {
                    if (slideBox.intersectsBox(box)) {
                        slideCollision = true;
                        break;
                    }
                }

                if (!slideCollision) return newPosition;
            }
        }

        return position.clone(); // No movement if no valid slide
    }

    update() {
        // This would handle any global physics updates if needed
    }
}