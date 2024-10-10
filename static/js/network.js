let scene, camera, renderer, composer;
let nodes, edges, centralNode;
let nodeParticles = [];
let particles, particleGeometry, particleMaterial;
const clock = new THREE.Clock();

// Network parameters
const flyableRadius = 800; // {{ edit_37 }} Compressed flyable area from 1000 to 800
const blackwallRadius = 1200; // {{ edit_47 }} Reduced blackwallRadius from 1600 to 1200 for a tighter boundary
const networkRadius = 1500; // {{ edit_48 }} Increased networkRadius from 1000 to 1500 for a more expansive network
const connectionDistance = 900; // {{ edit_2 }} Reduced from 1800 to 900 to maintain balanced connections
const maxConnections = 100; // {{ edit_3 }} Increased from 50 for denser connections in expanded network
const nodeDensity = 0.001; // {{ edit_4 }} Increased from 0.0005 for more nodes in larger space

// Visual parameters
const nodeSize = 6; // Increased node size for better visibility in larger network
const centralNodeSize = 150; // Increased size for better visibility
const centralNodeColor = 0x00ff00; // Changed central node to green
const centralNodeIntensity = 12.0; // Further increased for a more intense central node
const edgeOpacity = 0.5; // Increased opacity for better edge visibility
const nodeColor = 0x0088ff; // Changed nodes to blue
const edgeColor = 0x0088ff; // Changed edges to blue
const blackwallColor = 0xff0000; // Keeping the blackwall as bright red

// Define a color palette for initial node colors
const colorPalette = [0x0088ff, 0x00ff00, 0xffff00, 0x00ffff, 0xffffff, 0xffa500]; // Removed red shades

// Add a state flag to track infection
let isInfected = false;

// Function to initiate infection and start the color transition
function infectNetwork() { // {{ edit_36 }}
    if (isInfected) return; // Prevent multiple infections
    isInfected = true;
    
    const queue = [centralNode];
    const visited = new Set();

    while (queue.length > 0) {
        const currentNode = queue.shift();
        if (visited.has(currentNode.userData.id)) continue;
        visited.add(currentNode.userData.id);

        // Corrupt the current node
        animateNodeCorruption(currentNode, 1.0, 1.0);
        animateConnectedEdges(currentNode, 1.0);

        // Enqueue connected nodes
        currentNode.userData.connectedEdges.forEach(edge => {
            const neighborId = edge.userData.sourceId === currentNode.userData.id 
                ? edge.userData.targetId 
                : edge.userData.sourceId;
            const neighborNode = nodeParticles.find(n => n.userData.id === neighborId);
            if (neighborNode && !visited.has(neighborId)) {
                queue.push(neighborNode);
            }
        });
    }

    console.log("Network infection initiated with enhanced propagation through edges.");
}

// Initialize the scene
function init() {
    console.log("Initializing...");
    setupScene();
    setupCamera();
    setupRenderer();
    setupPostProcessing();
    setupControls();
    setupLighting();

    createFallingCode(); // Initialize falling code effect

    // Fetch neural network data from server
    fetchNeuralNetworkData();

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keydown', onKeyDown, false); // Added keydown listener for spacebar
    console.log("Initialization complete.");
}


// Keydown event handler
function onKeyDown(event) {
    if (event.code === 'Space') { // Check if the spacebar is pressed
        event.preventDefault(); // Prevent default spacebar scrolling
        think(); // Trigger the think function
    }
}

// Fetch network data from the server
function fetchNeuralNetworkData() {
    fetch('/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'initial' })
    })
    .then(response => response.json())
    .then(data => {
        createNetwork(data); // Pass the data to createNetwork
    })
    .catch(error => {
        console.error('Error fetching neural network data:', error);
    });
}

function setupScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0010); // {{ edit_5 }} Increased fog density for a more confined atmosphere
    nodes = new THREE.Group();
    edges = new THREE.Group();
    scene.add(nodes);
    scene.add(edges);
    
    // Add blackwall particle effect
    createBlackwallEffect();
}

function createBlackwallEffect() {
    // Enhanced geometry for a more intricate and visible blackwall with updated radius
    const blackwallGeometry = new THREE.TorusKnotGeometry(blackwallRadius * 1.5, 150, 75, 10, 3, 2); // {{ edit_51 }} Updated blackwallRadius to 1200
    
    // Load a texture that resembles flowing code
    const textureLoader = new THREE.TextureLoader();
    const codeTexture = textureLoader.load('/static/textures/code_flow.png', undefined, undefined, (err) => {
        console.error('Failed to load texture:', err);
    }); // {{ edit_10 }} Added error handling
    
    // Adjusted `blackwallMaterial` for brighter and more intense glow
    const blackwallMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0.0 },
            color: { value: new THREE.Color(blackwallColor) },
            texture: { value: codeTexture },
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            distortion: { value: 0.6 }, // {{ edit_27 }} Further increased distortion for stronger glitch effects
            envMap: { value: new THREE.TextureLoader().load('/static/textures/env_map.png') },
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying float vTime;
            varying vec3 vReflect;
            uniform samplerCube envMap;
    
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vTime = time;
                vUv = uv;
                vec3 I = normalize(position - cameraPosition);
                vReflect = reflect(I, normalize(normalMatrix * normal));
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 color;
            uniform sampler2D texture;
            uniform samplerCube envMap;
            uniform vec2 resolution;
            uniform float distortion;
            varying vec3 vNormal;
            varying float vTime;
            varying vec2 vUv;
            varying vec3 vReflect;
    
            // Simple random function
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }
    
            void main() {
                // Glitch effect: Enhanced RGB channel separation with increased distortion
                float glitch = sin(vTime * 40.0) * 0.15;
                vec2 uv = vUv;
                uv.x += glitch;
                uv.y += glitch * 0.7;
    
                // Additional noise-based distortion
                float noise = random(uv * time) * distortion;
                uv += vec2(noise, noise);
    
                // Sample the texture with time-based scrolling and advanced distortion
                vec2 scrollUv = vec2(uv.x, uv.y + time * 0.3);
                scrollUv.x += random(scrollUv * time) * distortion;
                vec4 texColor = texture2D(texture, scrollUv);
    
                // Pulsating glow with enhanced intensity
                float pulse = sin(vTime * 25.0) * 1.0 + 1.0; // {{ edit_15 }} Increased pulsation frequency and amplitude
                float intensity = pow(0.75 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
    
                // Combine texture color with increased intensity for a brighter effect
                gl_FragColor = vec4(color * intensity * pulse, 1.0) * texColor;
    
                // Add RGB channel shift for a more pronounced glitch effect
                if (fract(time * 20.0) < 0.2) {
                    gl_FragColor.r = texture2D(texture, scrollUv + vec2(0.05, 0.0)).r; // {{ edit_18 }} Increased shift magnitude
                }
                if (fract(time * 28.0) < 0.2) {
                    gl_FragColor.b = texture2D(texture, scrollUv + vec2(-0.05, 0.0)).b; // {{ edit_35 }} Increased shift magnitude
                }
    
                // Add reflections with increased brightness
                vec3 reflectedColor = textureCube(envMap, vReflect).rgb;
                gl_FragColor.rgb += reflectedColor * 1.5; // {{ edit_19 }} Further increased reflection contribution
    
                // Add additional glitch effects for a cooler look
                float glitchEffect = step(0.95, fract(time * 50.0));
                gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0), glitchEffect * 0.5);
            }
        `,
        transparent: true,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
    });

    const blackwallMesh = new THREE.Mesh(blackwallGeometry, blackwallMaterial);
    blackwallMesh.name = 'blackwallMesh'; // {{ edit_73a }} Name the mesh for easy access
    scene.add(blackwallMesh);

    // Add multiple glowing layers around the blackwall for depth
    const glowLayers = 7; // {{ edit_20 }} Further increased number of glow layers
    for (let i = 1; i <= glowLayers; i++) { // {{ edit_21 }} Rotate glow layers dynamically
        const glowGeometry = new THREE.TorusKnotGeometry(blackwallRadius * 1.5, 200, 300, 50, 3, 6); // {{ edit_22 }} Further increased size and detail
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000, // Bright red glow
            transparent: true,
            opacity: 1.0 / i, // {{ edit_31 }} Further increased opacity for brighter glow
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.rotation.y = Math.PI / 4 * i; // {{ edit_23 }} Rotate each layer differently
        scene.add(glowMesh);
    }

    // Updated glowing lines without using undefined 'time'
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.7,
        linewidth: 2,
    });

    const linesGeometry = new THREE.BufferGeometry();
    const linesCount = 4000; // {{ edit_52 }} Increased number of lines for more density
    const positions = [];

    for (let i = 0; i < linesCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = blackwallRadius + 300; // {{ edit_52 }} Adjusted radius based on updated blackwallRadius
        
        const x1 = radius * Math.sin(phi) * Math.cos(theta);
        const y1 = radius * Math.sin(phi) * Math.sin(theta);
        const z1 = radius * Math.cos(phi);
        
        const x2 = (radius + 150) * Math.sin(phi + 0.05) * Math.cos(theta + 0.05);
        const y2 = (radius + 150) * Math.sin(phi + 0.05) * Math.sin(theta + 0.05);
        const z2 = (radius + 150) * Math.cos(phi + 0.05);
        
        positions.push(x1, y1, z1, x2, y2, z2); // Removed dynamic 'time' offsets
    }

    linesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const linesMesh = new THREE.LineSegments(linesGeometry, lineMaterial);
    scene.add(linesMesh);

    // Function to update glowing lines dynamically
    function updateGlowingLines() {
        const positions = linesGeometry.attributes.position.array;
        const timeValue = blackwallMaterial.uniforms.time.value;

        for (let i = 0; i < positions.length; i += 6) {
            // Apply small distortions based on time with increased distortion
            positions[i + 3] += Math.sin(timeValue * 5 + i) * 0.1; // {{ edit_25 }} Increased distortion amplitude for more pronounced effect
            positions[i + 4] += Math.cos(timeValue * 5 + i) * 0.1;
            positions[i + 5] += Math.sin(timeValue * 5 + i) * 0.1;
        }
        linesGeometry.attributes.position.needsUpdate = true;
    }

    // Update the animateBlackwall function to include additional dynamics
    function animateBlackwall() {
        blackwallMaterial.uniforms.time.value += 0.01; // {{ edit_26 }} Further reduced time increment for slower animations
        blackwallMaterial.uniforms.distortion.value = 0.6 + Math.sin(blackwallMaterial.uniforms.time.value * 1.2) * 0.3;
    
        updateGlowingLines();
        
        // Animate blackwall rotation for added prominence
        blackwallMesh.rotation.y += 0.002;
        for (let i = 0; i < glowLayers; i++) {
            const glowMesh = scene.children[scene.children.length - 1 - i];
            glowMesh.rotation.y += 0.001 + i * 0.0005;
        }

        requestAnimationFrame(animateBlackwall);
    }
    animateBlackwall();
}


function setupCamera() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, flyableRadius * 2); // {{ edit_42 }} Updated far plane to flyableRadius * 2
    camera.position.set(0, 0, flyableRadius); // {{ edit_43 }} Position the camera at the edge of flyableRadius
    camera.lookAt(new THREE.Vector3(0, 0, 0));
}

function setupRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit to 2 for performance
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    document.getElementById('network').appendChild(renderer.domElement);
}


function setupPostProcessing() {
    composer = new THREE.EffectComposer(renderer);
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, 0.4, 0.85
    );
    bloomPass.threshold = 0;
    bloomPass.strength = 3; // Increased strength for more pronounced bloom
    bloomPass.radius = 0.5;
    composer.addPass(bloomPass);
}

function setupControls() {
    controls = new THREE.FirstPersonControls(camera, renderer.domElement);
    controls.movementSpeed = 400; // {{ edit_56 }} Increased movement speed for better navigation in larger network
    controls.lookSpeed = 0.2;
    controls.noFly = true; // Prevent flying
    controls.lookVertical = true;
    controls.constrainVertical = true;
    controls.verticalMin = Math.PI / 2 - 0.5;
    controls.verticalMax = Math.PI / 2 + 0.5;
    
    // {{ edit_45 }} Add boundary constraints based on flyableRadius
    controls.minDistance = 100; // Minimum distance from center
    controls.maxDistance = flyableRadius; // Maximum distance from center
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404040, 5); // Increased ambient light intensity
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 5); // Increased point light intensity
    camera.add(pointLight);
    scene.add(camera);
}

function createNetwork(data) {
    console.log("Creating network...");
    createCentralNode();
    createNodes(data.nodes);
    createEdges(data.edges);
    createInternalConnections(); // New function to add more internal connections
    console.log("Network created with", nodeParticles.length, "nodes and", edges.children.length, "connections.");
    animate();
}


function createCentralNode() {
    const geometry = new THREE.SphereGeometry(centralNodeSize, 64, 64);
    const material = new THREE.MeshPhongMaterial({ // Changed from MeshBasicMaterial to MeshPhongMaterial
        color: centralNodeColor,
        emissive: new THREE.Color(centralNodeColor), // Set emissive as color
        emissiveIntensity: centralNodeIntensity,
        shininess: 100,
    });
    centralNode = new THREE.Mesh(geometry, material);
    centralNode.position.set(0, 0, 0);
    centralNode.userData = { 
        id: 'central', 
        originalColor: material.color.clone() // Ensure originalColor is THREE.Color
    };
    nodes.add(centralNode);
    nodeParticles.push(centralNode);

    // Add pulsating effect to central node
    function pulsateCentralNode() {
        const scale = 1 + Math.sin(Date.now() * 0.002) * 0.1;
        centralNode.scale.set(scale, scale, scale);
        requestAnimationFrame(pulsateCentralNode);
    }
    pulsateCentralNode();
}

function createNodes(nodeData) {
    // {{ edit_49 }} Increased the minimum number of nodes from 4000 to 6000 for a larger network
    const totalNodes = Math.max(nodeData.length, 6000); // {{ edit_49 }} Ensure at least 6000 nodes for larger network
    
    // Removed InstancedMesh implementation
    const geometry = new THREE.SphereGeometry(nodeSize, 32, 32); // Adjusted for performance
    const clusters = createClusters(40); // {{ edit_57a }} Increased number of clusters to 40 for a more uniform distribution
    
    for (let i = 0; i < nodeData.length; i++) {
        const material = new THREE.MeshPhongMaterial({
            color: getRandomColor(),
            emissive: getRandomColor(),
            emissiveIntensity: 0.5,
            shininess: 100,
        });
        
        const node = new THREE.Mesh(geometry, material);
        // {{ edit_58 }} Assign clusters randomly to ensure even distribution
        const cluster = clusters[Math.floor(Math.random() * clusters.length)]; // {{ edit_58 }} Random cluster assignment
        const orbitRadius = networkRadius * 0.3 + Math.random() * networkRadius * 0.7; // {{ edit_54 }} Adjusted orbit radius for a more spherical distribution
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        node.position.set(
            cluster.x + orbitRadius * Math.sin(phi) * Math.cos(theta),
            cluster.y + orbitRadius * Math.sin(phi) * Math.sin(theta),
            cluster.z + orbitRadius * Math.cos(phi)
        );

        node.userData = { 
            id: i, 
            layer: nodeData[i].layer, // {{ edit_9 }} Use layer from nodeData
            originalColor: node.material.color.clone(), // Ensure originalColor is THREE.Color
            connectedEdges: [] // {{ edit_61 }} Initialize connectedEdges array
        };
        nodes.add(node);
        nodeParticles.push(node);
        console.log(`Node ${i} originalColor:`, node.userData.originalColor); // Log for debugging
    }
}

// {{ edit_57a }} Increase the number of clusters for a more uniform distribution
function createClusters(numClusters) {
    const clusters = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // Use golden angle for better distribution
    const clusterRadius = networkRadius * 0.9; // {{ edit_50 }} Increased cluster radius to 0.9 * networkRadius

    for (let i = 0; i < numClusters; i++) {
        const theta = i * goldenAngle;
        const phi = Math.acos(1 - 2 * ((i + 0.5) / numClusters)); // Fibonacci sphere algorithm for uniform distribution

        clusters.push({
            x: clusterRadius * Math.sin(phi) * Math.cos(theta),
            y: clusterRadius * Math.sin(phi) * Math.sin(theta),
            z: clusterRadius * Math.cos(phi)
        });
    }

    return clusters;
}

// Helper function to get a random color from the palette
function getRandomColor() {
    return colorPalette[Math.floor(Math.random() * colorPalette.length)];
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
                originalColor: edgeColor 
            };
            edges.add(edge);

            // {{ edit_60 }} Establish bidirectional references between nodes and edges
            sourceNode.userData.connectedEdges.push(edge);
            targetNode.userData.connectedEdges.push(edge);
            // {{ /edit_60 }}
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
            edge.userData = { sourceId: 'central', targetId: node.userData.id, originalColor: centralNodeColor };
            edges.add(edge);
        }
    });
}

// {{ edit_57a }} Enhance internal connections for more branching
function createInternalConnections() {
    const internalEdgeMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        opacity: 0.2,
        transparent: true,
    });

    // Use a spatial partitioning approach to find nearby nodes for connections
    const gridSize = 300; // Size of each grid cell
    const grid = {};

    // Populate the grid with nodes
    nodeParticles.forEach(node => {
        const x = Math.floor(node.position.x / gridSize);
        const y = Math.floor(node.position.y / gridSize);
        const z = Math.floor(node.position.z / gridSize);
        const key = `${x},${y},${z}`;
        if (!grid[key]) grid[key] = [];
        grid[key].push(node);
    });

    // Define neighbor cell offsets
    const neighborOffsets = [
        [0, 0, 0], [1, 0, 0], [-1, 0, 0],
        [0, 1, 0], [0, -1, 0],
        [0, 0, 1], [0, 0, -1],
        [1, 1, 0], [-1, -1, 0],
        [1, -1, 0], [-1, 1, 0],
        [1, 0, 1], [-1, 0, -1],
        [1, 0, -1], [-1, 0, 1],
        [0, 1, 1], [0, -1, -1],
        [0, 1, -1], [0, -1, 1],
        [1, 1, 1], [-1, -1, -1],
        [1, 1, -1], [-1, -1, 1],
        [1, -1, 1], [-1, 1, -1],
        [1, -1, -1], [-1, 1, 1],
        // Add more offsets if needed for wider searches
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
                    if (sourceNode === targetNode) return; // Skip self
                    // {{ edit_57b }} Further increase connection probability within nearby nodes
                    if (Math.random() < 0.05) { // Increased from 0.02 to 0.05
                        // Check if the connection already exists
                        const existing = edges.children.find(edge =>
                            (edge.userData.sourceId === sourceNode.userData.id && edge.userData.targetId === targetNode.userData.id) ||
                            (edge.userData.sourceId === targetNode.userData.id && edge.userData.targetId === sourceNode.userData.id)
                        );
                        if (!existing) {
                            const geometry = new THREE.BufferGeometry().setFromPoints([
                                sourceNode.position, targetNode.position
                            ]);
                            const edge = new THREE.Line(geometry, internalEdgeMaterial.clone());
                            edge.userData = { sourceId: sourceNode.userData.id, targetId: targetNode.userData.id, originalColor: 0x00ffff };
                            edges.add(edge);
                        }
                    }
                });
            }
        });
    });

    console.log("Internal connections enhanced for more branching.");
}

function updateNodePositions() {
    const time = Date.now() * 0.001;
    nodeParticles.forEach(node => {
        if (node !== centralNode) {
            node.position.x += Math.sin(time + node.userData.id) * 0.05;
            node.position.y += Math.cos(time + node.userData.id * 2) * 0.05;
            node.position.z += Math.sin(time + node.userData.id * 3) * 0.05;

            const distanceFromCenter = node.position.length();
            if (distanceFromCenter > networkRadius) {
                node.position.setLength(networkRadius);
            }
        }
    });
}

function updateConnections() {
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

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    controls.update(delta);
    TWEEN.update();

    nodes.rotation.y += 0.0002; // Slower overall rotation

    // Add subtle pulsing to all nodes
    const time = Date.now() * 0.001;
    nodeParticles.forEach((node, index) => {
        if (node.userData.id !== 'central') {
            const pulse = Math.sin(time + index * 0.1) * 0.1 + 1;
            node.scale.set(pulse, pulse, pulse);

            // Subtle position oscillation
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


function think() {
    fetch('/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'think' })
    })
    .then(response => response.json())
    .then(data => {
        animatePropagation(data.propagation);
    })
    .catch(error => {
        console.error('Error during thought propagation:', error);
    });
}

function animatePropagation(propagationData) {
    console.log("Animating propagation:", propagationData);
    let step = 0;
    const totalSteps = propagationData.length * 8;

    // Introduce the infectious orb starting from the blackwall
    const orb = createInfectiousOrb();
    scene.add(orb);
    let centralNodeInfected = false; // Flag to track central node infection

    animateOrb(orb, () => {
        // Once orb animation is complete, check if central node is infected
        if (centralNodeInfected) {
            orb.userData.infectedNodes.forEach(nodeId => {
                const node = nodeParticles.find(n => n.userData.id === nodeId);
                if (node) {
                    animateNodeCorruption(node, 1.0, 1.0);
                    animateConnectedEdges(node, 1.0);
                }
            });
            scene.remove(orb);
            resetNetworkColors();
            displayCorruptionDetected();
        } else {
            console.warn("Central node was not infected by the virus.");
            scene.remove(orb);
        }
    });

    const interval = setInterval(() => {
        if (step >= totalSteps) {
            clearInterval(interval);
            return;
        }

        const activeNodes = propagationData[Math.floor(step / 8)];
        activeNodes.forEach((nodeInfo, index) => {
            if (index < 100) { // Limit the number of nodes animated per step
                setTimeout(() => {
                    const node = nodeParticles.find(n => n.userData.id === nodeInfo.id);
                    if (node) {
                        // Only allow corruption if central node has been infected
                        if (centralNodeInfected) {
                            animateNodeCorruption(node, nodeInfo.value, step / totalSteps);
                            animateConnectedEdges(node, step / totalSteps);
                            createCorruptionWave(node.position, step / totalSteps);
                        }
                        // Check if the central node is being infected
                        if (node === centralNode && !centralNodeInfected) {
                            animateNodeCorruption(node, 1.0, 1.0);
                            animateConnectedEdges(node, 1.0);
                            createCorruptionWave(node.position, 1.0);
                            centralNodeInfected = true; // Set the flag to allow further corruption
                        }
                    }
                }, index * 50);
            }
        });

        pulseCentralNode(step / totalSteps);

        step++;
    }, 100); // Adjusted interval timing for performance
}


function createInfectiousOrb() {
    const orbGeometry = new THREE.SphereGeometry(100, 64, 64); // Increased size for prominence
    const orbMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000, // Pure red for the orb
        emissive: new THREE.Color(0xff0000), // Set emissive color
        emissiveIntensity: 5.0, // Further increased for a more glowing effect
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide
    });
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.position.set(0, 0, networkRadius * 1.8); // Start from the blackwall position
    orb.userData = { infectedNodes: [] };
    return orb;
}


function animateOrb(orb, onComplete) {
    const targetPosition = new THREE.Vector3(0, 0, 0); // Center of the network

    const tween = new TWEEN.Tween(orb.position)
        .to(targetPosition, 8000) // Extended duration for a more methodical movement
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => {
            // Detect and infect nodes within the orb's radius
            nodeParticles.forEach(node => {
                if (!orb.userData.infectedNodes.includes(node.userData.id)) {
                    const distance = node.position.distanceTo(orb.position);
                    if (distance < 80) { // Expanded infection radius
                        orb.userData.infectedNodes.push(node.userData.id);
                        animateNodeCorruption(node, 1.0, 1.0);
                        animateConnectedEdges(node, 1.0);
                        createCorruptionWave(node.position, 1.0);
                    }
                }
            });
        })
        .onComplete(() => {
            onComplete();
        })
        .start();
}

function createCorruptionWave(position, progress) {
    const waveGeometry = new THREE.RingGeometry(10 * progress, 20 * progress, 32);
    const waveMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.5 * (1 - progress),
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });
    const wave = new THREE.Mesh(waveGeometry, waveMaterial);
    wave.position.copy(position);
    wave.rotation.x = Math.PI / 2;
    scene.add(wave);

    new TWEEN.Tween(wave.scale)
        .to({ x: 50 * progress, y: 50 * progress, z: 50 * progress }, 3000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onComplete(() => {
            scene.remove(wave);
        })
        .start();

    new TWEEN.Tween(wave.material)
        .to({ opacity: 0 }, 3000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
}

function animateNodeCorruption(node, activationValue, progress) {
    if (!node.userData.originalColor || typeof node.userData.originalColor.clone !== 'function') {
        console.error(`Node ${node.userData.id} has invalid originalColor.`);
        return;
    }

    const corruptionColor = new THREE.Color(0x8B0000); // Dark red for corruption
    const mixedColor = node.userData.originalColor.clone().lerp(corruptionColor, progress);

    // Animate color
    new TWEEN.Tween(node.material.color)
        .to({ r: mixedColor.r, g: mixedColor.g, b: mixedColor.b }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    // Animate emissive intensity
    new TWEEN.Tween(node.material)
        .to({ emissiveIntensity: 0.5 + activationValue * 2 }, 500)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    // Subtle scale effect
    new TWEEN.Tween(node.scale)
        .to({ x: 1.2, y: 1.2, z: 1.2 }, 500)
        .easing(TWEEN.Easing.Quadratic.Out)
        .yoyo(true)
        .repeat(1)
        .start();
}

function animateConnectedEdges(node, progress) {
    edges.children.forEach(edge => {
        if (edge.userData.sourceId === node.userData.id || edge.userData.targetId === node.userData.id) {
            const corruptionColor = new THREE.Color(0x8B0000); // Dark red
            const mixedColor = corruptionColor.clone(); // Directly set to corruption color

            new TWEEN.Tween(edge.material)
                .to({ color: mixedColor, opacity: 0.7 }, 1000) // Increased opacity change
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
    });
}

function pulseCentralNode(progress) {
    const pulseIntensity = 5 + Math.sin(progress * Math.PI * 2) * 3;
    new TWEEN.Tween(centralNode.material)
        .to({ emissiveIntensity: pulseIntensity }, 100)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    const pulseScale = 1 + Math.sin(progress * Math.PI * 2) * 0.1;
    new TWEEN.Tween(centralNode.scale)
        .to({ x: pulseScale, y: pulseScale, z: pulseScale }, 100)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
}

function resetNetworkColors() {
    nodeParticles.forEach(node => {
        if (node.userData.id !== 'central') {
            new TWEEN.Tween(node.material.color)
                .to(new THREE.Color(node.userData.originalColor), 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();

            new TWEEN.Tween(node.material)
                .to({ emissiveIntensity: 0.5 }, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
    });

    edges.children.forEach(edge => {
        new TWEEN.Tween(edge.material)
            .to({ color: new THREE.Color(edge.userData.originalColor), opacity: edgeOpacity }, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    });

    // Reset central node
    new TWEEN.Tween(centralNode.material)
        .to({ emissiveIntensity: centralNodeIntensity }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    new TWEEN.Tween(centralNode.scale)
        .to({ x: 1, y: 1, z: 1 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
}

function updateCameraBoundaries() {
    const maxDistance = flyableRadius; // {{ edit_46 }} Updated to flyableRadius
    const minDistance = 200; // Unchanged
    const distance = camera.position.length();

    if (distance > maxDistance) {
        camera.position.setLength(maxDistance);
    }

    if (distance < minDistance) {
        camera.position.setLength(minDistance);
    }
}

function createFallingCode() {
    const particleCount = 3000; // Reduced from 5000 for better performance
    particleGeometry = new THREE.BufferGeometry();
    const positions = [];
    const sizes = [];
    const colors = [];

    for (let i = 0; i < particleCount; i++) {
        positions.push(
            (Math.random() - 0.5) * networkRadius * 4, // x
            Math.random() * networkRadius * 3,          // y
            (Math.random() - 0.5) * networkRadius * 4  // z
        );
        sizes.push(5 + Math.random() * 10); // Larger, varied sizes
        colors.push(0, 1, 0); // Green color
    }

    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    particleGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const particleShader = {
        vertexShader: `
            attribute float size;
            varying vec3 vColor;
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.475) discard;
                gl_FragColor = vec4(vColor, 1.0);
            }
        `,
        transparent: true
    };

    particleMaterial = new THREE.ShaderMaterial({
        vertexShader: particleShader.vertexShader,
        fragmentShader: particleShader.fragmentShader,
        transparent: true,
        vertexColors: true
    });

    particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
}


function updateFallingCode() {
    const positions = particleGeometry.attributes.position.array;
    const sizes = particleGeometry.attributes.size.array;
    const colors = particleGeometry.attributes.color.array;
    for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 1 + Math.random() * 3; // Faster falling speed
        if (positions[i + 1] < -networkRadius) {
            positions[i] = (Math.random() - 0.5) * networkRadius * 4;
            positions[i + 1] = networkRadius * 3;
            positions[i + 2] = (Math.random() - 0.5) * networkRadius * 4;
            sizes[i / 3] = 5 + Math.random() * 15; // Larger size variation
            // Random color variation (more green-blue for digital effect)
            colors[i] = 0.2 + Math.random() * 0.3; // R
            colors[i + 1] = 0.5 + Math.random() * 0.5; // G
            colors[i + 2] = 0.5 + Math.random() * 0.5; // B
        }
    }
    particleGeometry.attributes.position.needsUpdate = true;
    particleGeometry.attributes.size.needsUpdate = true;
    particleGeometry.attributes.color.needsUpdate = true;
}


// Display "Corruption detected" message with a "Restart" button
function displayCorruptionDetected() {
    // Create a div for the message
    const messageDiv = document.createElement('div');
    messageDiv.id = 'corruption-message';
    messageDiv.innerHTML = `
        <h1>Corruption Detected</h1>
        <button id="restart-button">RESTART</button>
    `;
    document.body.appendChild(messageDiv);

    // Style the message div
    const style = document.createElement('style');
    style.innerHTML = `
        #corruption-message {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #ff0000;
            background-color: rgba(0, 0, 0, 0.8);
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            z-index: 200;
            font-family: 'Courier New', monospace;
            box-shadow: 0 0 30px #ff0000;
        }
        #corruption-message h1 {
            margin-bottom: 20px;
        }
        #restart-button {
            padding: 10px 20px;
            font-size: 18px;
            background-color: #ff4500;
            color: #ffffff;
            border: none;
            cursor: pointer;
            border-radius: 10px;
            transition: background-color 0.3s, box-shadow 0.3s;
        }
        #restart-button:hover {
            background-color: #ff6347;
            box-shadow: 0 0 20px #ff6347;
        }
    `;
    document.head.appendChild(style);

    // Add event listener to the restart button
    document.getElementById('restart-button').addEventListener('click', () => {
        // Trigger "big bang" effect before restarting
        triggerBigBangEffect();
    });
}

// Trigger a "big bang" particle explosion effect before restarting
function triggerBigBangEffect() {
    // Create explosion particles
    const explosionGeometry = new THREE.BufferGeometry();
    const explosionParticles = 1000;
    const positions = [];
    const velocities = [];

    for (let i = 0; i < explosionParticles; i++) {
        // Start at central node position
        positions.push(centralNode.position.x, centralNode.position.y, centralNode.position.z);
        // Random velocities
        const speed = Math.random() * 10;
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        velocities.push(
            speed * Math.sin(phi) * Math.cos(theta),
            speed * Math.sin(phi) * Math.sin(theta),
            speed * Math.cos(phi)
        );
    }

    explosionGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    explosionGeometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));

    const explosionMaterial = new THREE.PointsMaterial({
        color: 0xff0000,
        size: 5,
        transparent: true,
        opacity: 1.0,
    });

    const explosion = new THREE.Points(explosionGeometry, explosionMaterial);
    scene.add(explosion);

    // Animate the explosion
    const explosionStartTime = Date.now();

    function animateExplosion() {
        const elapsed = Date.now() - explosionStartTime;
        const positions = explosion.geometry.attributes.position.array;
        const velocities = explosion.geometry.attributes.velocity.array;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i / 3] * 0.1;
            positions[i + 1] += velocities[i / 3 + 1] * 0.1;
            positions[i + 2] += velocities[i / 3 + 2] * 0.1;
        }

        explosion.geometry.attributes.position.needsUpdate = true;

        // Fade out the explosion
        const opacity = Math.max(1.0 - elapsed / 2000, 0);
        explosion.material.opacity = opacity;

        if (opacity > 0) {
            requestAnimationFrame(animateExplosion);
        } else {
            // Remove explosion and restart the simulation
            scene.remove(explosion);
            window.location.reload();
        }
    }

    animateExplosion();
}

init();

// Expose the think function to the global scope
window.think = think;

// Ensure 'triggerBigBangEffect' is accessible if needed elsewhere
window.triggerBigBangEffect = triggerBigBangEffect;

console.log("network.js loaded");