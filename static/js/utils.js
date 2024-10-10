import * as THREE from 'three';
import { colorPalette, flyableRadius } from './constants.js';
import { camera, particleGeometry } from './globals.js';

export function getRandomColor() {
  return colorPalette[Math.floor(Math.random() * colorPalette.length)];
}

export function createClusters(numClusters) {
  const clusters = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const clusterRadius = networkRadius * 0.9;

  for (let i = 0; i < numClusters; i++) {
    const theta = i * goldenAngle;
    const phi = Math.acos(1 - 2 * ((i + 0.5) / numClusters));
    clusters.push({
      x: clusterRadius * Math.sin(phi) * Math.cos(theta),
      y: clusterRadius * Math.sin(phi) * Math.sin(theta),
      z: clusterRadius * Math.cos(phi),
    });
  }

  return clusters;
}

export function updateConnections() {
  edges.children.forEach(edge => {
    const sourceNode = nodeParticles.find(n => n.userData.id === edge.userData.sourceId);
    const targetNode = nodeParticles.find(n => n.userData.id === edge.userData.targetId);
    if (sourceNode && targetNode) {
      const positions = edge.geometry.attributes.position.array;
      positions[0] = sourceNode.position.x;
      positions[1] = sourceNode.position.y;
      positions[2] = sourceNode.position.z;
      positions[3] = targetNode.position.x;
      positions[4] = targetNode.position.y;
      positions[5] = targetNode.position.z;
      edge.geometry.attributes.position.needsUpdate = true;
    }
  });
}

export function updateCameraBoundaries() {
  const maxDistance = flyableRadius;
  const minDistance = 200;
  const distance = camera.position.length();

  if (distance > maxDistance) {
    camera.position.setLength(maxDistance);
  }

  if (distance < minDistance) {
    camera.position.setLength(minDistance);
  }
}

export function updateFallingCode() {
  // ... existing code ...
}

export function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}