// entities/PlayerController.js
import * as THREE from 'three';

export class PlayerController {
    constructor(player, cameraController) {
        this.player = player;
        this.cameraController = cameraController;
        this.moveSpeed = 0.2;
        this.keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };
        this.mouseSensitivity = 0.002;
    }

    handleKeyDown(keyCode) {
        if (keyCode in this.keys) {
            this.keys[keyCode] = true;
        }
    }

    handleKeyUp(keyCode) {
        if (keyCode in this.keys) {
            this.keys[keyCode] = false;
        }
    }

    handleMouseMove(movementX, movementY) {
        this.cameraController.updateRotation(movementX, movementY, this.mouseSensitivity);
    }

    getMoveVector() {
        const cameraDirection = this.cameraController.getCameraDirection();
        const moveVector = new THREE.Vector3(0, 0, 0);
        if (this.keys.KeyW) moveVector.add(cameraDirection.forward.clone().multiplyScalar(this.moveSpeed));
        if (this.keys.KeyS) moveVector.add(cameraDirection.forward.clone().multiplyScalar(-this.moveSpeed));
        if (this.keys.KeyA) moveVector.add(cameraDirection.right.clone().multiplyScalar(-this.moveSpeed));
        if (this.keys.KeyD) moveVector.add(cameraDirection.right.clone().multiplyScalar(this.moveSpeed));
        return moveVector;
    }

    update(physicsSystem, buildings, deltaTime = 1) {
        const moveVector = this.getMoveVector().multiplyScalar(deltaTime * 60);

        if (moveVector.lengthSq() > 0) {
            const collisionInfo = physicsSystem.checkCollision(this.player.position, moveVector);

            if (collisionInfo.collision) {
                const newPosition = physicsSystem.handleSlideMovement(
                    this.player.position,
                    moveVector,
                    collisionInfo
                );
                this.player.position.copy(newPosition);
            } else {
                const newPosition = this.player.position.clone().add(moveVector);
                let isInside = false;
                buildings.forEach(building => {
                    if (building.buildingBox.containsPoint(newPosition)) {
                        isInside = true;
                    }
                });

                if (!isInside) {
                    newPosition.y = 0.5;
                } else {
                    const rampInfo = physicsSystem.calculateRampPosition(newPosition, buildings);
                    newPosition.y = rampInfo.y;
                }

                this.player.position.copy(newPosition);
            }

            // Update camera environment type
            let isInsideBuilding = false;
            buildings.forEach(building => {
                if (building.buildingBox.containsPoint(this.player.position)) {
                    isInsideBuilding = true;
                }
            });
            this.cameraController.setEnvironmentType(isInsideBuilding);
        }
    }
}