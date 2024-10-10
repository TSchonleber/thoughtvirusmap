import * as THREE from 'three';
import { scene, camera, renderer, nodes, edges } from './globals.js';
import {
  flyableRadius,
  blackwallRadius,
  blackwallColor,
} from './constants.js';

export function setupScene() {
  scene.fog = new THREE.FogExp2(0x000000, 0.0010);
  scene.add(nodes);
  scene.add(edges);
}

export function setupCamera() {
  camera.fov = 75;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.near = 1;
  camera.far = flyableRadius * 2; // Updated far plane
  camera.position.set(0, 0, flyableRadius); // Position at the edge of flyableRadius
  camera.lookAt(new THREE.Vector3(0, 0, 0));
}

export function setupRenderer() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  document.getElementById('network').appendChild(renderer.domElement);
}

export function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0x404040, 5);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 5);
  camera.add(pointLight);
  scene.add(camera);
}