import { clock, controls, nodes, nodeParticles } from './globals.js';
import { updateConnections, updateCameraBoundaries, updateFallingCode } from './utils.js';
import { TWEEN } from '@tweenjs/tween.js';

export function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  controls.update(delta);
  TWEEN.update();

  nodes.rotation.y += 0.0002;

  // Subtle pulsing
  const time = Date.now() * 0.001;
  nodeParticles.forEach((node, index) => {
    if (node.userData.id !== 'central') {
      const pulse = Math.sin(time + index * 0.1) * 0.1 + 1;
      node.scale.set(pulse, pulse, pulse);
      // Position oscillation
      node.position.x += Math.sin(time + index * 0.05) * 0.02;
      node.position.y += Math.cos(time + index * 0.05) * 0.02;
      node.position.z += Math.sin(time + index * 0.05) * 0.02;
    }
  });

  updateConnections();
  updateCameraBoundaries();
  updateFallingCode();

  composer.render();
}

// ... other animation functions like animatePropagation, think, etc. ...