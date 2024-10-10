import { flyableRadius } from './constants.js';
import { controls } from './globals.js';

export function setupControls() {
  controls.movementSpeed = 400; // Increased speed
  controls.lookSpeed = 0.2;
  controls.noFly = true;
  controls.lookVertical = true;
  controls.constrainVertical = true;
  controls.verticalMin = Math.PI / 2 - 0.5;
  controls.verticalMax = Math.PI / 2 + 0.5;

  // Boundary constraints
  controls.minDistance = 100;
  controls.maxDistance = flyableRadius; // Updated to flyableRadius
}