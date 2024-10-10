import { scene, camera, renderer, controls } from './globals.js';
import { setupScene, setupCamera, setupRenderer, setupLighting } from './sceneSetup.js';
import { setupControls } from './controls.js';
import { createNetwork } from './networkCreation.js';
import { animate } from './animations.js';
import { onWindowResize } from './utils.js';

function init() {
  console.log("Initializing...");
  setupScene();
  setupCamera();
  setupRenderer();
  setupControls();
  setupLighting();

  createFallingCode(); // Initialize falling code effect

  // Fetch neural network data from server
  fetchNeuralNetworkData();

  window.addEventListener('resize', onWindowResize, false);
  window.addEventListener('keydown', onKeyDown, false);
  console.log("Initialization complete.");
}

function fetchNeuralNetworkData() {
  fetch('/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: 'initial' })
  })
  .then(response => response.json())
  .then(data => {
    createNetwork(data);
  })
  .catch(error => {
    console.error('Error fetching neural network data:', error);
  });
}

function onKeyDown(event) {
  if (event.code === 'Space') {
    event.preventDefault();
    think(); // Make sure think() is imported or defined
  }
}

init();