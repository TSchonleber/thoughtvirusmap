import * as THREE from 'three';
import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js';

export let scene = new THREE.Scene();
export let camera = new THREE.PerspectiveCamera();
export let renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
export let controls = new FirstPersonControls(camera, renderer.domElement);
export const clock = new THREE.Clock();

export let nodes = new THREE.Group();
export let edges = new THREE.Group();
export let centralNode;
export let nodeParticles = [];
export let composer;