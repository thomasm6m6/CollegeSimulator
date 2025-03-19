import * as THREE from 'three';

export class CameraController {
    constructor(camera, target) {
        this.camera = camera;
        this.target = target;

        // Camera settings
        this.cameraDistance = 10;
        this.cameraDistanceOutside = 10;
        this.cameraDistanceInside = 6;
        this.minCameraDistance = 2;
        this.maxCameraDistance = 15;
        this.targetCameraDistance = this.cameraDistanceOutside;

        // Camera angles
        this.cameraYaw = Math.PI;
        this.cameraPitch = Math.PI / 6;
        this.pitchMin = 0;
        this.pitchMax = Math.PI / 3;

        // Raycaster for camera collision
        this.raycaster = new THREE.Raycaster();
    }

    updateRotation(movementX, movementY, sensitivity) {
        this.cameraYaw -= movementX * sensitivity;
        this.cameraPitch -= movementY * sensitivity;
        this.cameraPitch = Math.max(this.pitchMin, Math.min(this.pitchMax, this.cameraPitch));
    }

    getCameraDirection() {
        const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        cameraForward.y = 0;
        cameraForward.normalize();

        const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        cameraRight.y = 0;
        cameraRight.normalize();

        return { forward: cameraForward, right: cameraRight };
    }

    setEnvironmentType(isInsideBuilding) {
        this.targetCameraDistance = isInsideBuilding ?
            this.cameraDistanceInside : this.cameraDistanceOutside;
    }

    update(scene) {
        // Smoothly adjust camera distance
        this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * 0.1;
        this.cameraDistance = Math.max(this.minCameraDistance,
                                      Math.min(this.maxCameraDistance, this.cameraDistance));

        // Calculate ideal camera position
        const cameraOffset = new THREE.Vector3(
            this.cameraDistance * Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch),
            this.cameraDistance * Math.sin(this.cameraPitch),
            this.cameraDistance * Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch)
        );

        const idealCameraPosition = this.target.position.clone().add(cameraOffset);

        // Perform collision detection for camera
        const direction = idealCameraPosition.clone().sub(this.target.position).normalize();
        this.raycaster.set(this.target.position, direction);
        const intersects = this.raycaster.intersectObjects(scene.children, true);

        // Adjust camera position if there's a collision
        let adjustedCameraPosition = idealCameraPosition.clone();
        if (intersects.length > 0 && intersects[0].distance < this.cameraDistance) {
            const maxDistance = Math.max(this.minCameraDistance, intersects[0].distance - 0.5);
            adjustedCameraPosition.copy(this.target.position)
                .add(direction.multiplyScalar(maxDistance));
        }

        // Ensure camera doesn't go below player height
        adjustedCameraPosition.y = Math.max(adjustedCameraPosition.y,
                                          this.target.position.y - 0.5);

        // Update camera position and look target
        this.camera.position.copy(adjustedCameraPosition);
        this.camera.lookAt(this.target.position);
    }
}