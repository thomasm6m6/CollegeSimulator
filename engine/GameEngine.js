// engine/GameEngine.js
import * as THREE from 'three';
import { PhysicsSystem } from './PhysicsSystem.js';

export class GameEngine {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.logarithmicDepthBuffer = true;
        document.body.appendChild(this.renderer.domElement);

        this.physicsSystem = new PhysicsSystem();
        this.raycaster = new THREE.Raycaster();

        // Add properties to store controllers and buildings
        this.playerController = null;
        this.cameraController = null;
        this.buildings = [];

        this.lastTime = null;

        window.addEventListener('resize', this.handleResize.bind(this));
    }

    createPlayer() {
        const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
        const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const player = new THREE.Mesh(playerGeometry, playerMaterial);
        player.position.set(0, 0.5, 0);
        this.scene.add(player);
        return player;
    }

    setupCollisionSystem(buildings) {
        this.buildings = buildings; // Store buildings
        this.physicsSystem.registerBuildings(buildings);
    }

    setupInputHandlers(playerController) {
        this.playerController = playerController; // Store playerController
        document.addEventListener('keydown', (event) => {
            playerController.handleKeyDown(event.code);
        });
        document.addEventListener('keyup', (event) => {
            playerController.handleKeyUp(event.code);
        });
        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === document.body) {
                playerController.handleMouseMove(event.movementX, event.movementY);
            }
        });
        document.addEventListener('click', () => {
            document.body.requestPointerLock();
        });
        document.addEventListener('pointerlockchange', () => {
            const topButtons = document.querySelector('.top-buttons');
            topButtons.style.display = document.pointerLockElement === document.body ? 'none' : 'flex';
        });
    }

    setCameraController(cameraController) {
        this.cameraController = cameraController; // New method to store cameraController
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    start() {
        this.animate();
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const now = performance.now();
        const deltaTime = this.lastTime ? (now - this.lastTime) / 1000 : 0;
        this.lastTime = now;

        // Update player controller
        if (this.playerController && this.physicsSystem && this.buildings) {
            this.playerController.update(this.physicsSystem, this.buildings, deltaTime);
        }

        // Update camera controller
        if (this.cameraController) {
            this.cameraController.update(this.scene);
        }

        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
}