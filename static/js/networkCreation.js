import * as THREE from 'three';
import { nodes, edges, centralNode, nodeParticles } from './globals.js';
import {
  centralNodeSize,
  centralNodeColor,
  centralNodeIntensity,
  nodeSize,
  nodeDensity,
  networkRadius,
} from './constants.js';
import { getRandomColor, createClusters } from './utils.js';

export function createNetwork(data) {
  console.log("Creating network...");
  createCentralNode();
  createNodes(data.nodes);
  createEdges(data.edges);
  createInternalConnections();
  console.log("Network created with", nodeParticles.length, "nodes and", edges.children.length, "connections.");
  animate();
}

function createCentralNode() {
  const geometry = new THREE.SphereGeometry(centralNodeSize, 64, 64);
  const material = new THREE.MeshPhongMaterial({
    color: centralNodeColor,
    emissive: new THREE.Color(centralNodeColor),
    emissiveIntensity: centralNodeIntensity,
    shininess: 100,
  });
  centralNode = new THREE.Mesh(geometry, material);
  centralNode.position.set(0, 0, 0);
  centralNode.userData = {
    id: 'central',
    originalColor: material.color.clone(),
  };
  nodes.add(centralNode);
  nodeParticles.push(centralNode);

  // Add pulsating effect
  pulsateCentralNode();
}

function pulsateCentralNode() {
  function animatePulse() {
    const scale = 1 + Math.sin(Date.now() * 0.002) * 0.1;
    centralNode.scale.set(scale, scale, scale);
    requestAnimationFrame(animatePulse);
  }
  animatePulse();
}

function createNodes(nodeData) {
  const totalNodes = Math.max(nodeData.length, 6000); // Ensure at least 6000 nodes
  const geometry = new THREE.SphereGeometry(nodeSize, 32, 32);
  const clusters = createClusters(40); // Increased to 40 clusters

  for (let i = 0; i < nodeData.length; i++) {
    const material = new THREE.MeshPhongMaterial({
      color: getRandomColor(),
      emissive: getRandomColor(),
      emissiveIntensity: 0.5,
      shininess: 100,
    });

    const node = new THREE.Mesh(geometry, material);
    const cluster = clusters[Math.floor(Math.random() * clusters.length)];
    const orbitRadius = networkRadius * 0.3 + Math.random() * networkRadius * 0.7;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    node.position.set(
      cluster.x + orbitRadius * Math.sin(phi) * Math.cos(theta),
      cluster.y + orbitRadius * Math.sin(phi) * Math.sin(theta),
      cluster.z + orbitRadius * Math.cos(phi)
    );

    node.userData = {
      id: i,
      layer: nodeData[i].layer,
      originalColor: node.material.color.clone(),
      connectedEdges: [],
    };
    nodes.add(node);
    nodeParticles.push(node);
  }
}

function createEdges(edgeData) {
  edgeData.forEach(edgeInfo => {
    const sourceNode = nodeParticles.find(n => n.userData.id === edgeInfo.source);
    const targetNode = nodeParticles.find(n => n.userData.id === edgeInfo.target);

    if (sourceNode && targetNode) {
      const points = [sourceNode.position, targetNode.position];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      // Blend colors of connected nodes for edges
      const edgeColor = sourceNode.material.color.clone().lerp(targetNode.material.color, 0.5);

      const edgeMaterial = new THREE.LineBasicMaterial({
        color: edgeColor,
        opacity: edgeOpacity,
        transparent: true,
      });

      const edge = new THREE.Line(geometry, edgeMaterial);
      edge.userData = {
        sourceId: edgeInfo.source,
        targetId: edgeInfo.target,
        originalColor: edgeColor,
      };
      edges.add(edge);

      // Establish bidirectional references
      sourceNode.userData.connectedEdges.push(edge);
      targetNode.userData.connectedEdges.push(edge);
    }
  });

  // Modify central node connections
  const centralEdgeMaterial = new THREE.LineBasicMaterial({
    color: centralNodeColor,
    opacity: 0.5,
    transparent: true,
  });

  nodeParticles.forEach(node => {
    if (node.userData.id !== 'central') {
      const points = [centralNode.position, node.position];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const edge = new THREE.Line(geometry, centralEdgeMaterial.clone());
      edge.userData = {
        sourceId: 'central',
        targetId: node.userData.id,
        originalColor: centralNodeColor,
      };
      edges.add(edge);
    }
  });
}

function createInternalConnections() {
  const internalEdgeMaterial = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    opacity: 0.2,
    transparent: true,
  });

  // Spatial partitioning
  const gridSize = 300;
  const grid = {};

  // Populate grid
  nodeParticles.forEach(node => {
    const x = Math.floor(node.position.x / gridSize);
    const y = Math.floor(node.position.y / gridSize);
    const z = Math.floor(node.position.z / gridSize);
    const key = `${x},${y},${z}`;
    if (!grid[key]) grid[key] = [];
    grid[key].push(node);
  });

  // Neighbor offsets
  const neighborOffsets = [
    [0, 0, 0], [1, 0, 0], [-1, 0, 0],
    // ... additional offsets ...
  ];

  nodeParticles.forEach(sourceNode => {
    const x = Math.floor(sourceNode.position.x / gridSize);
    const y = Math.floor(sourceNode.position.y / gridSize);
    const z = Math.floor(sourceNode.position.z / gridSize);

    neighborOffsets.forEach(offset => {
      const nx = x + offset[0];
      const ny = y + offset[1];
      const nz = z + offset[2];
      const key = `${nx},${ny},${nz}`;
      const neighbors = grid[key];
      if (neighbors) {
        neighbors.forEach(targetNode => {
          if (sourceNode === targetNode) return;
          if (Math.random() < 0.05) { // Increased connection probability
            const existing = edges.children.find(edge =>
              (edge.userData.sourceId === sourceNode.userData.id && edge.userData.targetId === targetNode.userData.id) ||
              (edge.userData.sourceId === targetNode.userData.id && edge.userData.targetId === sourceNode.userData.id)
            );
            if (!existing) {
              const geometry = new THREE.BufferGeometry().setFromPoints([
                sourceNode.position, targetNode.position,
              ]);
              const edge = new THREE.Line(geometry, internalEdgeMaterial.clone());
              edge.userData = {
                sourceId: sourceNode.userData.id,
                targetId: targetNode.userData.id,
                originalColor: 0x00ffff,
              };
              edges.add(edge);
            }
          }
        });
      }
    });
  });

  console.log("Internal connections enhanced for more branching.");
}