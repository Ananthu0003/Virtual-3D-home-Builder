document.addEventListener('DOMContentLoaded', function() {
    // Get model data from hidden JSON element
    const modelDataElement = document.getElementById('model-data');
    if (!modelDataElement) {
        console.error('No model data found');
        return;
    }
    
    const modelData = JSON.parse(modelDataElement.textContent);
    const loadingContainer = document.getElementById('loading-container');
    
    // Set up Three.js scene
    const container = document.getElementById('model-viewer');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Scene, camera, renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 5, 10);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Orbit controls for mouse interaction
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;
    
    // Handle window resize
    window.addEventListener('resize', function() {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    });
    
    // Add lights
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Directional light (sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);
    
    // Point lights for interior
    const pointLight1 = new THREE.PointLight(0xffffff, 0.5);
    pointLight1.position.set(0, 2, 0);
    scene.add(pointLight1);
    
    // Grid helper
    const grid = new THREE.GridHelper(20, 20, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);
    
    // Materials
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xd7cec7 });
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const windowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xadd8e6,
        transparent: true,
        opacity: 0.6
    });
    
    // Create a group to hold all building elements
    const buildingGroup = new THREE.Group();
    scene.add(buildingGroup);
    
    // Function to create walls from the model data
    function createWalls() {
        if (!modelData.walls || !modelData.walls.length) return;
        
        modelData.walls.forEach(wall => {
            const [x1, y1, z1] = wall.start;
            const [x2, y2, z2] = wall.end;
            
            // Calculate wall dimensions and position
            const length = Math.sqrt(
                Math.pow(x2 - x1, 2) + 
                Math.pow(y2 - y1, 2)
            );
            
            const thickness = wall.thickness || 0.2;
            const height = wall.height || 2.4;
            
            // Calculate wall center position
            const centerX = (x1 + x2) / 2;
            const centerY = (y1 + y2) / 2;
            const centerZ = height / 2;
            
            // Calculate rotation angle
            const angle = Math.atan2(y2 - y1, x2 - x1);
            
            // Create wall geometry
            const wallGeometry = new THREE.BoxGeometry(length, height, thickness);
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            
            // Position and rotate the wall
            wallMesh.position.set(centerX, centerZ, centerY);
            wallMesh.rotation.y = angle;
            
            // Add to group
            buildingGroup.add(wallMesh);
        });
    }
    
    // Function to create doors
    function createDoors() {
        if (!modelData.doors || !modelData.doors.length) return;
        
        modelData.doors.forEach(door => {
            const [x, y, z] = door.position;
            const width = door.width || 0.9;
            const height = door.height || 2.0;
            const orientation = door.orientation || 0;
            
            // Create door geometry
            const doorGeometry = new THREE.BoxGeometry(width, height, 0.05);
            const doorMesh = new THREE.Mesh(doorGeometry, doorMaterial);
            
            // Position and rotate the door
            doorMesh.position.set(x, z + height / 2, y);
            doorMesh.rotation.y = THREE.Math.degToRad(orientation);
            
            // Add to group
            buildingGroup.add(doorMesh);
        });
    }
    
    // Function to create windows
    function createWindows() {
        if (!modelData.windows || !modelData.windows.length) return;
        
        modelData.windows.forEach(window => {
            const [x, y, z] = window.position;
            const width = window.width || 1.2;
            const height = window.height || 1.2;
            const sill_height = window.sill_height || 0.9;
            const orientation = window.orientation || 0;
            
            // Create window geometry
            const windowGeometry = new THREE.BoxGeometry(width, height, 0.05);
            const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
            
            // Position and rotate the window
            windowMesh.position.set(x, z + sill_height + height / 2, y);
            windowMesh.rotation.y = THREE.Math.degToRad(orientation);
            
            // Add to group
            buildingGroup.add(windowMesh);
        });
    }
    
    // Function to create floors
    function createFloors() {
        if (!modelData.floors || !modelData.floors.length) return;
        
        modelData.floors.forEach(floor => {
            const shape = new THREE.Shape();
            
            // Create shape from corners
            const corners = floor.corners;
            if (corners && corners.length >= 3) {
                shape.moveTo(corners[0][0], corners[0][2]);
                for (let i = 1; i < corners.length; i++) {
                    shape.lineTo(corners[i][0], corners[i][2]);
                }
                shape.lineTo(corners[0][0], corners[0][2]);
                
                const extrudeSettings = {
                    steps: 1,
                    depth: 0.1,
                    bevelEnabled: false
                };
                
                const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                const mesh = new THREE.Mesh(geometry, floorMaterial);
                
                // Position the floor
                mesh.position.set(0, corners[0][1], 0);
                mesh.rotation.x = Math.PI / 2;
                
                // Add to group
                buildingGroup.add(mesh);
            }
        });
    }
    
    // Function to create ceilings
    function createCeilings() {
        if (!modelData.ceiling || !modelData.ceiling.length) return;
        
        modelData.ceiling.forEach(ceiling => {
            const shape = new THREE.Shape();
            
            // Create shape from corners
            const corners = ceiling.corners;
            if (corners && corners.length >= 3) {
                shape.moveTo(corners[0][0], corners[0][2]);
                for (let i = 1; i < corners.length; i++) {
                    shape.lineTo(corners[i][0], corners[i][2]);
                }
                shape.lineTo(corners[0][0], corners[0][2]);
                
                const extrudeSettings = {
                    steps: 1,
                    depth: 0.1,
                    bevelEnabled: false
                };
                
                const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0xffffff,
                    side: THREE.DoubleSide
                });
                const mesh = new THREE.Mesh(geometry, material);
                
                // Position the ceiling
                mesh.position.set(0, corners[0][1], 0);
                mesh.rotation.x = Math.PI / 2;
                
                // Add to group
                buildingGroup.add(mesh);
            }
        });
    }
    
    // Build the 3D model
    function buildModel() {
        createWalls();
        createDoors();
        createWindows();
        createFloors();
        createCeilings();
        
        // Center the building in the scene
        const box = new THREE.Box3().setFromObject(buildingGroup);
        const center = box.getCenter(new THREE.Vector3());
        buildingGroup.position.sub(center);
        buildingGroup.position.y = 0; // Keep it on the ground
        
        // Hide loading container
        if (loadingContainer) {
            loadingContainer.style.display = 'none';
        }
    }
    
    // Keyboard controls for navigation
    const moveSpeed = 0.2;
    const rotateSpeed = 0.05;
    
    const keyState = {};
    
    window.addEventListener('keydown', function(e) {
        keyState[e.code] = true;
    });
    
    window.addEventListener('keyup', function(e) {
        keyState[e.code] = false;
    });
    
    // Navigation buttons
    document.getElementById('control-forward').addEventListener('click', function() {
        moveCamera('forward');
    });
    
    document.getElementById('control-backward').addEventListener('click', function() {
        moveCamera('backward');
    });
    
    document.getElementById('control-left').addEventListener('click', function() {
        moveCamera('left');
    });
    
    document.getElementById('control-right').addEventListener('click', function() {
        moveCamera('right');
    });
    
    document.getElementById('control-rotate-left').addEventListener('click', function() {
        rotateCamera('left');
    });
    
    document.getElementById('control-rotate-right').addEventListener('click', function() {
        rotateCamera('right');
    });
    
    function moveCamera(direction) {
        // Get camera direction
        const vector = new THREE.Vector3();
        camera.getWorldDirection(vector);
        
        // Create perpendicular vector for strafing
        const perpVector = new THREE.Vector3(vector.z, 0, -vector.x).normalize();
        
        switch(direction) {
            case 'forward':
                camera.position.addScaledVector(vector, moveSpeed);
                controls.target.addScaledVector(vector, moveSpeed);
                break;
            case 'backward':
                camera.position.addScaledVector(vector, -moveSpeed);
                controls.target.addScaledVector(vector, -moveSpeed);
                break;
            case 'left':
                camera.position.addScaledVector(perpVector, -moveSpeed);
                controls.target.addScaledVector(perpVector, -moveSpeed);
                break;
            case 'right':
                camera.position.addScaledVector(perpVector, moveSpeed);
                controls.target.addScaledVector(perpVector, moveSpeed);
                break;
        }
    }
    
    function rotateCamera(direction) {
        const angle = direction === 'left' ? rotateSpeed : -rotateSpeed;
        
        // Get camera position relative to target
        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        
        // Rotate the offset
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        
        // Set new camera position
        camera.position.copy(offset).add(controls.target);
    }
    
    // View switching
    document.getElementById('view-3d').addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('view-top').classList.remove('active');
        
        // Set 3D perspective view
        camera.position.set(0, 5, 10);
        controls.target.set(0, 0, 0);
        camera.updateProjectionMatrix();
    });
    
    document.getElementById('view-top').addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('view-3d').classList.remove('active');
        
        // Set top-down orthographic view
        camera.position.set(0, 15, 0);
        controls.target.set(0, 0, 0);
        camera.updateProjectionMatrix();
    });
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Update controls
        controls.update();
        
        // Handle keyboard navigation
        if (keyState['KeyW']) moveCamera('forward');
        if (keyState['KeyS']) moveCamera('backward');
        if (keyState['KeyA']) moveCamera('left');
        if (keyState['KeyD']) moveCamera('right');
        if (keyState['KeyQ']) rotateCamera('left');
        if (keyState['KeyE']) rotateCamera('right');
        if (keyState['KeyR']) {
            // Reset camera
            camera.position.set(0, 5, 10);
            controls.target.set(0, 0, 0);
        }
        
        // Render scene
        renderer.render(scene, camera);
    }
    
    // Build model and start animation
    buildModel();
    animate();
});
