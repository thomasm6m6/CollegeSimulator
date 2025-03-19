// main.js
import { GameEngine } from './engine/GameEngine.js';
import { UIManager } from './ui/UIManager.js';
import { WorldGenerator } from './world/WorldGenerator.js';
import { BuildingFactory } from './world/BuildingFactory.js';
import { PlayerController } from './entities/PlayerController.js';
import { CameraController } from './camera/CameraController.js';

async function initGame() {
    const gameEngine = new GameEngine();
    const uiManager = new UIManager();

    const worldGenerator = new WorldGenerator(gameEngine.scene);
    const buildingFactory = new BuildingFactory();

    const groundMeshes = await worldGenerator.generateGround();
    groundMeshes.forEach(mesh => gameEngine.scene.add(mesh));

    const player = gameEngine.createPlayer();
    const cameraController = new CameraController(gameEngine.camera, player);
    const playerController = new PlayerController(player, cameraController);

    // Set camera controller in game engine
    gameEngine.setCameraController(cameraController);

    const buildings = await Promise.all([
        buildingFactory.createBuilding('dorm', { x: 20, y: 0, z: 20 }),
        buildingFactory.createBuilding('classroom', { x: 50, y: 0, z: 50 }),
        buildingFactory.createBuilding('misc', { x: 80, y: 0, z: 80 }),
        buildingFactory.createBuilding('dorm', { x: -30, y: 0, z: -30 })
    ]);

    buildings.forEach(building => {
        building.meshes.forEach(mesh => gameEngine.scene.add(mesh));
    });

    const environment = await worldGenerator.generateEnvironment(buildings);
    environment.forEach(mesh => gameEngine.scene.add(mesh));

    gameEngine.setupCollisionSystem(buildings);
    gameEngine.setupInputHandlers(playerController);

    gameEngine.start();
}

document.addEventListener('DOMContentLoaded', () => {
    initGame().catch(console.error);
});