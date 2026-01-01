document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let scene, camera, renderer, controls;
    let walls = [], floors = [], ceilings = [], doors = [], windows = [];
    let furnitureItems = [];
    let lightSources = [];
    let selectedObject = null;
    let currentMode = 'navigate'; // navigate, place, paint, light, delete
    let currentItem = null;
    let draggables = null; // Shopify Draggable instance
    let isDragging = false;
    let draggedFurnitureId = null;
    let mouse = new THREE.Vector2();
    let raycaster = new THREE.Raycaster();
    
    // DOM elements
    const modelViewerContainer = document.getElementById('model-viewer-container');
    const modelViewer = document.getElementById('model-viewer');
    const loadingContainer = document.getElementById('loading-container');
    const modeIndicator = document.getElementById('mode-indicator');
    const selectedItemInfo = document.getElementById('selected-item-info');
    const selectedItemName = document.getElementById('selected-item-name');
    
    // Customization sidebar
    const customizationSidebar = document.getElementById('customization-sidebar');
    const toggleCustomizeBtn = document.getElementById('toggle-customize');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    
    // Mode buttons
    const modeButtons = document.querySelectorAll('[data-mode]');
    const navigateBtn = document.getElementById('mode-navigate');
    const placeBtn = document.getElementById('mode-place');
    const paintBtn = document.getElementById('mode-paint');
    const lightBtn = document.getElementById('mode-light');
    const deleteBtn = document.getElementById('mode-delete');
    
    // Navigation controls
    const controlLeft = document.getElementById('control-left');
    const controlForward = document.getElementById('control-forward');
    const controlBackward = document.getElementById('control-backward');
    const controlRight = document.getElementById('control-right');
    const controlRotateLeft = document.getElementById('control-rotate-left');
    const controlRotateRight = document.getElementById('control-rotate-right');
    
    // Customization controls
    const furnitureCategorySelect = document.getElementById('furniture-category-select');
    const furnitureItemsContainer = document.getElementById('furniture-items-container');
    const saveCustomizationBtn = document.getElementById('save-customization-btn');
    const loadCustomizationBtn = document.getElementById('load-customization-btn');
    const savedCustomizationSelect = document.getElementById('saved-customization-select');
    const materialTypeSelect = document.getElementById('material-type-select');
    const materialsContainer = document.getElementById('materials-container');
    
    // Save customization modal
    const saveCustomizationModal = new bootstrap.Modal(document.getElementById('saveCustomizationModal'));
    const customizationNameInput = document.getElementById('customization-name');
    const customizationIdInput = document.getElementById('customization-id');
    const confirmSaveBtn = document.getElementById('confirm-save-btn');
    const loginRequiredMessage = document.getElementById('login-required-message');
    
    // Material containers
    const wallMaterials = document.getElementById('wall-materials');
    const lightingOptionsContainer = document.getElementById('lighting-options-container');
    
    // Get data from Django template
    const modelData = JSON.parse(document.getElementById('model-data').textContent);
    
    // Initialize the 3D scene
    function init() {
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);
        
        // Create camera
        camera = new THREE.PerspectiveCamera(
            75, 
            modelViewerContainer.clientWidth / modelViewerContainer.clientHeight, 
            0.1, 
            1000
        );
        camera.position.set(0, 5, 10);
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(modelViewerContainer.clientWidth, modelViewerContainer.clientHeight);
        renderer.shadowMap.enabled = true;
        modelViewer.appendChild(renderer.domElement);
        
        // Add orbit controls
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(10, 20, 15);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        
        // Add a grid helper to visualize the ground plane
        const gridHelper = new THREE.GridHelper(50, 50, 0x888888, 0xcccccc);
        scene.add(gridHelper);
        
        // Add a default floor if none exists in the model data
        if (!modelData.floors || modelData.floors.length === 0) {
            const defaultFloor = {
                id: 'default-floor',
                width: 30,
                height: 0.1,
                depth: 30,
                x: 0,
                y: -0.05, // Slightly below the grid
                z: 0,
                color: 0xdddddd,
                name: 'Default Floor'
            };
            
            const floor = createFloor(defaultFloor);
            floors.push(floor);
            scene.add(floor);
        }
        
        // Setup resize listener
        window.addEventListener('resize', onWindowResize);
        
        // Build the 3D model from JSON data
        buildModel();
        
        // Setup event listeners
        setupEventListeners();
        
        // Start animation loop
        animate();
    }
    
    // Resize handler
    function onWindowResize() {
        camera.aspect = modelViewerContainer.clientWidth / modelViewerContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(modelViewerContainer.clientWidth, modelViewerContainer.clientHeight);
    }
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    
    // Build 3D model from JSON data
    function buildModel() {
        // Create walls
        if (modelData.walls) {
            modelData.walls.forEach(wallData => {
                const wall = createWall(wallData);
                walls.push(wall);
                scene.add(wall);
            });
        }
        
        // Create floors
        if (modelData.floors) {
            modelData.floors.forEach(floorData => {
                const floor = createFloor(floorData);
                floors.push(floor);
                scene.add(floor);
            });
        }
        
        // Create ceilings
        if (modelData.ceilings) {
            modelData.ceilings.forEach(ceilingData => {
                const ceiling = createCeiling(ceilingData);
                ceilings.push(ceiling);
                scene.add(ceiling);
            });
        }
        
        // Create doors
        if (modelData.doors) {
            modelData.doors.forEach(doorData => {
                const door = createDoor(doorData);
                doors.push(door);
                scene.add(door);
            });
        }
        
        // Create windows
        if (modelData.windows) {
            modelData.windows.forEach(windowData => {
                const window = createWindow(windowData);
                windows.push(window);
                scene.add(window);
            });
        }
        
        // Hide loading indicator
        loadingContainer.style.display = 'none';
    }
    
    // Create a wall mesh
    function createWall(wallData) {
        const geometry = new THREE.BoxGeometry(
            wallData.width, 
            wallData.height, 
            wallData.depth
        );
        const material = new THREE.MeshStandardMaterial({ 
            color: wallData.color || 0xffffff
        });
        const wall = new THREE.Mesh(geometry, material);
        
        wall.position.set(wallData.x, wallData.y, wallData.z);
        wall.rotation.set(
            wallData.rotationX || 0, 
            wallData.rotationY || 0, 
            wallData.rotationZ || 0
        );
        
        wall.castShadow = true;
        wall.receiveShadow = true;
        
        // Add custom properties
        wall.userData = {
            type: 'wall',
            id: wallData.id,
            name: wallData.name || 'Wall'
        };
        
        return wall;
    }
    
    // Create a floor mesh
    function createFloor(floorData) {
        const geometry = new THREE.BoxGeometry(
            floorData.width, 
            floorData.height, 
            floorData.depth
        );
        const material = new THREE.MeshStandardMaterial({ 
            color: floorData.color || 0xcccccc
        });
        const floor = new THREE.Mesh(geometry, material);
        
        floor.position.set(floorData.x, floorData.y, floorData.z);
        floor.rotation.set(
            floorData.rotationX || 0, 
            floorData.rotationY || 0, 
            floorData.rotationZ || 0
        );
        
        floor.receiveShadow = true;
        
        // Add custom properties
        floor.userData = {
            type: 'floor',
            id: floorData.id,
            name: floorData.name || 'Floor'
        };
        
        return floor;
    }
    
    // Create a ceiling mesh
    function createCeiling(ceilingData) {
        const geometry = new THREE.BoxGeometry(
            ceilingData.width, 
            ceilingData.height, 
            ceilingData.depth
        );
        const material = new THREE.MeshStandardMaterial({ 
            color: ceilingData.color || 0xffffff
        });
        const ceiling = new THREE.Mesh(geometry, material);
        
        ceiling.position.set(ceilingData.x, ceilingData.y, ceilingData.z);
        ceiling.rotation.set(
            ceilingData.rotationX || 0, 
            ceilingData.rotationY || 0, 
            ceilingData.rotationZ || 0
        );
        
        ceiling.receiveShadow = true;
        
        // Add custom properties
        ceiling.userData = {
            type: 'ceiling',
            id: ceilingData.id,
            name: ceilingData.name || 'Ceiling'
        };
        
        return ceiling;
    }
    
    // Create a door mesh
    function createDoor(doorData) {
        const geometry = new THREE.BoxGeometry(
            doorData.width, 
            doorData.height, 
            doorData.depth
        );
        const material = new THREE.MeshStandardMaterial({ 
            color: doorData.color || 0x8B4513
        });
        const door = new THREE.Mesh(geometry, material);
        
        door.position.set(doorData.x, doorData.y, doorData.z);
        door.rotation.set(
            doorData.rotationX || 0, 
            doorData.rotationY || 0, 
            doorData.rotationZ || 0
        );
        
        door.castShadow = true;
        door.receiveShadow = true;
        
        // Add custom properties
        door.userData = {
            type: 'door',
            id: doorData.id,
            name: doorData.name || 'Door'
        };
        
        return door;
    }
    
    // Create a window mesh
    function createWindow(windowData) {
        const geometry = new THREE.BoxGeometry(
            windowData.width, 
            windowData.height, 
            windowData.depth
        );
        const material = new THREE.MeshStandardMaterial({ 
            color: windowData.color || 0xadd8e6,
            transparent: true,
            opacity: 0.7
        });
        const window = new THREE.Mesh(geometry, material);
        
        window.position.set(windowData.x, windowData.y, windowData.z);
        window.rotation.set(
            windowData.rotationX || 0, 
            windowData.rotationY || 0, 
            windowData.rotationZ || 0
        );
        
        // Add custom properties
        window.userData = {
            type: 'window',
            id: windowData.id,
            name: windowData.name || 'Window'
        };
        
        return window;
    }
    
    // Create a furniture item
    function createFurniture(furnitureData) {
        // Create a placeholder box for now
        // In a real application, this would load a 3D model
        const geometry = new THREE.BoxGeometry(
            furnitureData.width, 
            furnitureData.height, 
            furnitureData.depth
        );
        
        // Convert color string to hex value if needed
        let colorHex = furnitureData.color;
        if (typeof colorHex === 'string' && colorHex.startsWith('#')) {
            colorHex = parseInt(colorHex.replace('#', '0x'));
        }
        
        const material = new THREE.MeshStandardMaterial({ 
            color: colorHex || 0x8B4513
        });
        const furniture = new THREE.Mesh(geometry, material);
        
        // Position furniture with y offset to make sure it's visible and sits on the floor
        furniture.position.set(
            furnitureData.position.x,
            furnitureData.height / 2, // Position y to half height to sit on floor
            furnitureData.position.z
        );
        
        furniture.rotation.set(
            furnitureData.rotation.x || 0, 
            furnitureData.rotation.y || 0, 
            furnitureData.rotation.z || 0
        );
        
        furniture.castShadow = true;
        furniture.receiveShadow = true;
        
        // Add custom properties
        furniture.userData = {
            type: 'furniture',
            id: furnitureData.id,
            furnitureId: furnitureData.furnitureId,
            name: furnitureData.name || 'Furniture'
        };
        
        console.log('Created furniture:', furnitureData.name, 'at position:', furniture.position);
        
        return furniture;
    }
    
    // Create a light source
    function createLight(lightData) {
        let light;
        
        switch (lightData.lightType) {
            case 'point':
                light = new THREE.PointLight(
                    lightData.color || 0xffffff, 
                    lightData.intensity || 1, 
                    lightData.distance || 0
                );
                break;
            case 'spot':
                light = new THREE.SpotLight(
                    lightData.color || 0xffffff, 
                    lightData.intensity || 1,
                    lightData.distance || 0, 
                    lightData.angle || Math.PI/4
                );
                break;
            case 'directional':
                light = new THREE.DirectionalLight(
                    lightData.color || 0xffffff, 
                    lightData.intensity || 1
                );
                break;
            default:
                // Default to point light
                light = new THREE.PointLight(
                    lightData.color || 0xffffff, 
                    lightData.intensity || 1, 
                    lightData.distance || 0
                );
        }
        
        light.position.set(
            lightData.position.x, 
            lightData.position.y, 
            lightData.position.z
        );
        
        light.castShadow = true;
        
        // Add a small sphere to represent the light
        const helper = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            new THREE.MeshBasicMaterial({ color: lightData.color || 0xffffff })
        );
        light.add(helper);
        
        // Add custom properties
        light.userData = {
            type: 'light',
            id: lightData.id,
            lightingId: lightData.lightingId,
            name: lightData.name || 'Light',
            lightType: lightData.lightType
        };
        
        return light;
    }
    
    // Change material color/texture
    function changeMaterial(object, materialData) {
        if (!object) return;
        
        // Get the current material
        const currentMaterial = object.material;
        
        // Create new material based on the provided data
        const newMaterial = new THREE.MeshStandardMaterial({ 
            color: materialData.color_hex || 0xffffff
        });
        
        // TODO: Add texture support when texture_map is available
        
        // Apply the new material
        object.material = newMaterial;
        
        // Update user data to track material
        object.userData.materialId = materialData.id;
    }
    
    // Set up all event listeners
    function setupEventListeners() {
        // Sidebar toggle
        if (toggleCustomizeBtn) {
            toggleCustomizeBtn.addEventListener('click', function() {
                customizationSidebar.classList.toggle('active');
                if (customizationSidebar.classList.contains('active')) {
                    // Show mode selector when customization is active
                    if (modeSelector) modeSelector.classList.remove('d-none');
                    if (modeIndicator) modeIndicator.classList.remove('d-none');
                } else {
                    // Reset to navigate mode when sidebar is closed
                    setMode('navigate');
                    if (modeSelector) modeSelector.classList.add('d-none');
                    if (modeIndicator) modeIndicator.classList.add('d-none');
                }
            });
        }
        
        // Close sidebar button
        if (closeSidebarBtn) {
            closeSidebarBtn.addEventListener('click', function() {
                customizationSidebar.classList.remove('active');
                // Reset to navigate mode
                setMode('navigate');
                if (modeSelector) modeSelector.classList.add('d-none');
                if (modeIndicator) modeIndicator.classList.add('d-none');
            });
        }
        
        // Mode switching
        modeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const mode = this.dataset.mode;
                setMode(mode);
            });
        });
        
        // Navigation controls
        if (controlLeft) controlLeft.addEventListener('click', () => moveCamera('left'));
        if (controlForward) controlForward.addEventListener('click', () => moveCamera('forward'));
        if (controlBackward) controlBackward.addEventListener('click', () => moveCamera('backward'));
        if (controlRight) controlRight.addEventListener('click', () => moveCamera('right'));
        if (controlRotateLeft) controlRotateLeft.addEventListener('click', () => rotateCamera('left'));
        if (controlRotateRight) controlRotateRight.addEventListener('click', () => rotateCamera('right'));
        
        // Keyboard controls
        document.addEventListener('keydown', handleKeyDown);
        
        // Mouse interaction
        renderer.domElement.addEventListener('click', handleCanvasClick);
        
        // Mouse move tracking for drag and drop
        renderer.domElement.addEventListener('mousemove', function(event) {
            // Update mouse position in normalized device coordinates (-1 to +1)
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Handle furniture drag
            if (isDragging && draggedFurnitureId) {
                handleFurnitureDragMove(event);
            }
        });
        
        // Furniture category select
        if (furnitureCategorySelect) {
            furnitureCategorySelect.addEventListener('change', fetchFurniture);
        }
        
        // Material type select
        if (materialTypeSelect) {
            materialTypeSelect.addEventListener('change', function() {
                const materialType = this.value;
                // Hide all material containers
                document.querySelectorAll('[id$="-materials"]').forEach(container => {
                    container.style.display = 'none';
                });
                
                // Show selected material type
                const selectedContainer = document.getElementById(`${materialType}-materials`);
                if (selectedContainer) {
                    selectedContainer.style.display = 'block';
                }
            });
        }
        
        // Save customization
        if (saveCustomizationBtn) {
            saveCustomizationBtn.addEventListener('click', openSaveModal);
        }
        
        // Confirm save button
        if (confirmSaveBtn) {
            confirmSaveBtn.addEventListener('click', saveCustomization);
        }
        
        // Load customization
        if (loadCustomizationBtn && savedCustomizationSelect) {
            loadCustomizationBtn.addEventListener('click', loadSelectedCustomization);
        }
        
        // Setup drag and drop for furniture items
        setupDragAndDrop();
        
        // Delete key to remove selected object
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Delete' && selectedObject) {
                deleteObject(selectedObject);
                selectedObject = null;
            }
        });
        
        // Initial furniture load
        fetchFurniture();
        
        // Initially hide mode selector and indicator until customization is activated
        if (modeSelector) modeSelector.classList.add('d-none');
        if (modeIndicator) modeIndicator.classList.add('d-none');
    }
    
    // Setup drag and drop functionality using Shopify Draggable
    function setupDragAndDrop() {
        if (typeof Draggable === 'undefined') {
            console.warn('Draggable library not loaded');
            return;
        }
        
        // Initialize draggable for furniture items
        draggables = new Draggable.Draggable(document.querySelectorAll('.furniture-items-list'), {
            draggable: '.draggable-item',
            delay: 0,
            distance: 0,
            mirror: {
                constrainDimensions: true,
                xAxis: false,
                yAxis: false,
                appendTo: document.body
            }
        });
        
        // Draggable events
        draggables.on('drag:start', (event) => {
            const item = event.originalSource;
            draggedFurnitureId = item.dataset.furnitureId;
            
            // Get the furniture data for the dragged item
            const furnitureData = getFurnitureDataById(draggedFurnitureId);
            
            if (furnitureData) {
                // Set as current item
                currentItem = furnitureData;
                isDragging = true;
                
                // Add dragging class
                item.classList.add('dragging');
                
                // Switch to place mode
                setMode('place');
            }
        });
        
        draggables.on('drag:stop', (event) => {
            const item = event.originalSource;
            
            // Remove dragging class
            item.classList.remove('dragging');
            
            // Check if drop was over the 3D canvas area
            const rect = renderer.domElement.getBoundingClientRect();
            const mouseX = event.sensorEvent.clientX;
            const mouseY = event.sensorEvent.clientY;
            
            if (
                mouseX >= rect.left && 
                mouseX <= rect.right && 
                mouseY >= rect.top && 
                mouseY <= rect.bottom
            ) {
                handleFurnitureDrop(mouseX, mouseY);
            }
            
            isDragging = false;
            draggedFurnitureId = null;
        });
    }
    
    // Set the current interaction mode
    function setMode(mode) {
        currentMode = mode;
        
        // Update UI
        modeButtons.forEach(button => {
            button.classList.remove('active');
        });
        
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        
        // Update mode indicator text
        let modeText = 'Navigation Mode';
        let modeIcon = 'fas fa-hand-pointer';
        
        switch (mode) {
            case 'place':
                modeText = 'Furniture Placement Mode';
                modeIcon = 'fas fa-couch';
                break;
            case 'paint':
                modeText = 'Material Application Mode';
                modeIcon = 'fas fa-paint-roller';
                break;
            case 'light':
                modeText = 'Lighting Placement Mode';
                modeIcon = 'fas fa-lightbulb';
                break;
            case 'delete':
                modeText = 'Delete Mode';
                modeIcon = 'fas fa-trash';
                break;
        }
        
        modeIndicator.innerHTML = `<i class="${modeIcon} me-1"></i>${modeText}`;
        
        // Control behavior based on mode
        if (mode === 'navigate') {
            controls.enabled = true;
        } else {
            controls.enabled = false;
        }
        
        // Reset current item when switching modes
        if (mode === 'navigate' || mode === 'delete') {
            currentItem = null;
        }
    }
    
    // Handle canvas click for object interaction
    function handleCanvasClick(event) {
        if (currentMode === 'navigate') return;
        
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = {
            x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((event.clientY - rect.top) / rect.height) * 2 + 1
        };
        
        // Create a raycaster
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        // Get all objects in the scene for intersection
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        if (intersects.length > 0) {
            const intersectedObject = findParentObject(intersects[0].object);
            
            switch (currentMode) {
                case 'paint':
                    // Apply material to the object
                    if (currentItem && intersectedObject) {
                        applyMaterial(intersectedObject, currentItem);
                    }
                    break;
                    
                case 'place':
                    // Place furniture at click position
                    if (currentItem) {
                        placeFurniture(intersects[0].point);
                    }
                    break;
                    
                case 'light':
                    // Place light at click position
                    if (currentItem) {
                        placeLight(intersects[0].point);
                    }
                    break;
                    
                case 'delete':
                    // Delete the clicked object if it's furniture or light
                    if (intersectedObject) {
                        deleteObject(intersectedObject);
                    }
                    break;
            }
        } else if (currentMode === 'place' && currentItem) {
            // If no intersection but in place mode, place furniture at a default position
            // This ensures furniture can be placed even if raycasting doesn't hit anything
            const defaultPoint = new THREE.Vector3(
                camera.position.x + Math.random() * 2 - 1, 
                0, // Place on the ground
                camera.position.z + Math.random() * 2 - 1
            );
            placeFurniture(defaultPoint);
        }
    }
    
    // Find the parent object that has userData
    function findParentObject(object) {
        let current = object;
        
        while (current) {
            if (current.userData && current.userData.type) {
                return current;
            }
            current = current.parent;
        }
        
        return null;
    }
    
    // Apply material to object
    function applyMaterial(object, materialData) {
        if (!object || !materialData) return;
        
        const objectType = object.userData.type;
        const materialType = materialData.material_type_name.toLowerCase();
        
        // Check if material type is appropriate for the object type
        let canApply = false;
        
        switch (objectType) {
            case 'wall':
                canApply = materialType === 'wall paint';
                break;
            case 'floor':
                canApply = materialType === 'flooring';
                break;
            case 'ceiling':
                canApply = materialType === 'ceiling';
                break;
            case 'door':
                canApply = materialType === 'door';
                break;
            case 'window':
                canApply = materialType === 'window';
                break;
            case 'furniture':
                canApply = materialType === 'furniture';
                break;
        }
        
        if (canApply) {
            changeMaterial(object, materialData);
            
            // Show notification
            showNotification(`Applied ${materialData.name} to ${object.userData.name}`, 'success');
        } else {
            showNotification(`Cannot apply ${materialData.name} to ${object.userData.name}`, 'warning');
        }
    }
    
    // Place furniture at specified position
    function placeFurniture(position) {
        if (!currentItem) return;
        
        // Create furniture data
        const furnitureData = {
            id: generateUniqueId(),
            furnitureId: currentItem.id,
            name: currentItem.name,
            width: currentItem.width || 1,
            height: currentItem.height || 1,
            depth: currentItem.depth || 1,
            color: currentItem.color_hex || 0x8B4513,
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            rotation: {
                x: 0,
                y: 0,
                z: 0
            }
        };
        
        // Create and add furniture to scene
        const furniture = createFurniture(furnitureData);
        scene.add(furniture);
        furnitureItems.push(furniture);
        
        showNotification(`Placed ${currentItem.name}`, 'success');
    }
    
    // Place light at specified position
    function placeLight(position) {
        if (!currentItem) return;
        
        // Create light data
        const lightData = {
            id: generateUniqueId(),
            lightingId: currentItem.id,
            name: currentItem.name,
            lightType: currentItem.light_type,
            color: currentItem.color_hex || 0xffffff,
            intensity: currentItem.intensity || 1,
            position: {
                x: position.x,
                y: position.y + 1, // Raise it a bit above the click point
                z: position.z
            }
        };
        
        // Create and add light to scene
        const light = createLight(lightData);
        scene.add(light);
        lightSources.push(light);
        
        showNotification(`Added ${currentItem.name} light`, 'success');
    }
    
    // Delete an object (furniture or light)
    function deleteObject(object) {
        if (!object) return;
        
        if (object.userData.type === 'furniture') {
            // Remove from furniture array
            const index = furnitureItems.indexOf(object);
            if (index > -1) {
                furnitureItems.splice(index, 1);
            }
            
            // Remove from scene
            scene.remove(object);
            showNotification(`Deleted ${object.userData.name}`, 'success');
            
        } else if (object.userData.type === 'light') {
            // Remove from light sources array
            const index = lightSources.indexOf(object);
            if (index > -1) {
                lightSources.splice(index, 1);
            }
            
            // Remove from scene
            scene.remove(object);
            showNotification(`Deleted ${object.userData.name}`, 'success');
            
        } else {
            showNotification(`Cannot delete ${object.userData.name}`, 'warning');
        }
    }
    
    // Move camera in the specified direction
    function moveCamera(direction) {
        const step = 1;
        
        switch (direction) {
            case 'left':
                camera.position.x -= step;
                break;
            case 'right':
                camera.position.x += step;
                break;
            case 'forward':
                camera.position.z -= step;
                break;
            case 'backward':
                camera.position.z += step;
                break;
        }
        
        controls.update();
    }
    
    // Rotate camera
    function rotateCamera(direction) {
        const angle = Math.PI / 18; // 10 degrees
        
        if (direction === 'left') {
            controls.rotateLeft(angle);
        } else {
            controls.rotateRight(angle);
        }
        
        controls.update();
    }
    
    // Handle keyboard controls
    function handleKeyDown(event) {
        // Only handle keys if in navigate mode
        if (currentMode !== 'navigate') return;
        
        switch (event.key.toLowerCase()) {
            case 'w':
                moveCamera('forward');
                break;
            case 's':
                moveCamera('backward');
                break;
            case 'a':
                moveCamera('left');
                break;
            case 'd':
                moveCamera('right');
                break;
            case 'q':
                rotateCamera('left');
                break;
            case 'e':
                rotateCamera('right');
                break;
            case 'r':
                resetCamera();
                break;
        }
    }
    
    // Reset camera to default position
    function resetCamera() {
        camera.position.set(0, 5, 10);
        controls.reset();
    }
    
    // Handle furniture drag move
    function handleFurnitureDragMove(event) {
        // We keep the logic simple for performance reasons
        // Just update the normalized mouse position which will be used for placement
        raycaster.setFromCamera(mouse, camera);
    }
    
    // Handle furniture drop on the 3D canvas
    function handleFurnitureDrop(mouseX, mouseY) {
        if (!currentItem) return;
        
        // Convert client coordinates to normalized device coordinates (-1 to +1)
        const rect = renderer.domElement.getBoundingClientRect();
        const normalizedX = ((mouseX - rect.left) / rect.width) * 2 - 1;
        const normalizedY = -((mouseY - rect.top) / rect.height) * 2 + 1;
        
        // Set up the raycaster
        const rayMouse = new THREE.Vector2(normalizedX, normalizedY);
        raycaster.setFromCamera(rayMouse, camera);
        
        // Check for intersections
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        if (intersects.length > 0) {
            // Place furniture at the point of intersection
            placeFurniture(intersects[0].point);
        } else {
            // If no intersection, place at a position in front of the camera
            const defaultPoint = new THREE.Vector3(
                camera.position.x + Math.random() * 2 - 1, 
                0, // Place on the ground
                camera.position.z - 5 // A bit in front of the camera
            );
            placeFurniture(defaultPoint);
        }
        
        // Show success notification
        showNotification(`Placed ${currentItem.name} successfully`, 'success');
    }
    
    // Get furniture data by ID
    function getFurnitureDataById(id) {
        // Our predefined furniture data
        const furnitureData = [
            {
                id: 1,
                name: 'Sofa',
                category_id: 1,
                description: 'Comfortable 3-seater sofa',
                width: 2,
                depth: 0.8,
                height: 0.9,
                color_hex: '#8B4513'
            },
            {
                id: 2,
                name: 'Coffee Table',
                category_id: 1,
                description: 'Small coffee table',
                width: 1.2,
                depth: 0.6,
                height: 0.4,
                color_hex: '#A0522D'
            },
            {
                id: 3,
                name: 'Dining Table',
                category_id: 2,
                description: '4-person dining table',
                width: 1.5,
                depth: 0.9,
                height: 0.75,
                color_hex: '#DEB887'
            },
            {
                id: 4,
                name: 'Bed',
                category_id: 3,
                description: 'Queen size bed',
                width: 1.6,
                depth: 2,
                height: 0.5,
                color_hex: '#8B4513'
            }
        ];
        
        return furnitureData.find(item => item.id === parseInt(id));
    }
    
    // Fetch furniture items based on category
    function fetchFurniture() {
        const categoryId = furnitureCategorySelect ? furnitureCategorySelect.value : 'all';
        
        // Use our predefined furniture data
        const furnitureData = [
            {
                id: 1,
                name: 'Sofa',
                category_id: 1,
                description: 'Comfortable 3-seater sofa',
                width: 2,
                depth: 0.8,
                height: 0.9,
                color_hex: '#8B4513'
            },
            {
                id: 2,
                name: 'Coffee Table',
                category_id: 1,
                description: 'Small coffee table',
                width: 1.2,
                depth: 0.6,
                height: 0.4,
                color_hex: '#A0522D'
            },
            {
                id: 3,
                name: 'Dining Table',
                category_id: 2,
                description: '4-person dining table',
                width: 1.5,
                depth: 0.9,
                height: 0.75,
                color_hex: '#DEB887'
            },
            {
                id: 4,
                name: 'Bed',
                category_id: 3,
                description: 'Queen size bed',
                width: 1.6,
                depth: 2,
                height: 0.5,
                color_hex: '#8B4513'
            }
        ];
        
        let filteredFurniture = furnitureData;
        
        if (categoryId !== 'all') {
            filteredFurniture = furnitureData.filter(item => item.category_id === parseInt(categoryId));
        }
        
        updateFurnitureUI(filteredFurniture);
    }
    
    // Update furniture UI with items
    function updateFurnitureUI(furnitureItems) {
        if (!furnitureItemsContainer) return;
        
        furnitureItemsContainer.innerHTML = '';
        
        if (furnitureItems.length === 0) {
            furnitureItemsContainer.innerHTML = `
                <div class="alert alert-info">No furniture items available</div>
            `;
            return;
        }
        
        // Create furniture items as draggable elements
        furnitureItems.forEach(item => {
            // Get the appropriate icon based on furniture type
            let icon = 'fa-couch';
            if (item.name.toLowerCase().includes('table')) {
                icon = item.name.toLowerCase().includes('coffee') ? 'fa-coffee' : 'fa-utensils';
            } else if (item.name.toLowerCase().includes('bed')) {
                icon = 'fa-bed';
            } else if (item.name.toLowerCase().includes('chair')) {
                icon = 'fa-chair';
            }
            
            const itemElement = document.createElement('div');
            itemElement.className = 'furniture-item draggable-item';
            itemElement.setAttribute('data-furniture-id', item.id);
            itemElement.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="me-2">
                        <i class="fas ${icon} fa-lg" style="color: ${item.color_hex};"></i>
                    </div>
                    <div>
                        <div class="fw-bold">${item.name}</div>
                        <small class="text-muted">${item.width}m × ${item.depth}m × ${item.height}m</small>
                    </div>
                </div>
            `;
            
            // Add click handler
            itemElement.addEventListener('click', () => {
                // Highlight selected item
                document.querySelectorAll('.furniture-item').forEach(item => {
                    item.classList.remove('selected');
                });
                itemElement.classList.add('selected');
                
                // Set as current item
                currentItem = item;
                
                // Switch to place mode if not already in it
                if (currentMode !== 'place') {
                    setMode('place');
                }
                
                // Update selected item info
                selectedItemInfo.classList.remove('d-none');
                selectedItemName.textContent = `Selected: ${item.name}`;
            });
            
            furnitureItemsContainer.appendChild(itemElement);
        });
        
        // Reinitialize drag and drop if we've already set it up
        if (draggables) {
            draggables.destroy();
            setupDragAndDrop();
        }
    }
    
    // Setup material selection
    function setupMaterialSelection() {
        // Wall materials
        const wallCards = document.querySelectorAll('#wall-materials-container .item-card');
        wallCards.forEach(card => {
            card.addEventListener('click', () => {
                // Highlight selected item
                document.querySelectorAll('#wall-materials-container .item-card').forEach(c => {
                    c.classList.remove('selected');
                });
                card.classList.add('selected');
                
                // Set as current item
                const materialId = card.dataset.materialId;
                // In real app, would fetch from API
                currentItem = {
                    id: materialId,
                    name: card.querySelector('.card-text').textContent,
                    material_type_name: 'Wall Paint',
                    color_hex: card.querySelector('.color-swatch').style.backgroundColor
                };
                
                // Switch to paint mode if not already in it
                if (currentMode !== 'paint') {
                    setMode('paint');
                }
                
                // Update selected item info
                selectedItemInfo.classList.remove('d-none');
                selectedItemName.textContent = `Selected: ${currentItem.name} (Wall Paint)`;
            });
        });
        
        // Repeat for other material types...
        // Floor materials, ceiling materials, door materials, window materials
        
        // Lighting options
        const lightingCards = document.querySelectorAll('#lighting-options-container .item-card');
        lightingCards.forEach(card => {
            card.addEventListener('click', () => {
                // Highlight selected item
                document.querySelectorAll('#lighting-options-container .item-card').forEach(c => {
                    c.classList.remove('selected');
                });
                card.classList.add('selected');
                
                // Set as current item
                const lightingId = card.dataset.lightingId;
                // In real app, would fetch from API
                currentItem = {
                    id: lightingId,
                    name: card.querySelector('.card-text').textContent,
                    light_type: 'point', // Default to point light
                    color_hex: card.querySelector('.fa-lightbulb').style.color
                };
                
                // Switch to light mode if not already in it
                if (currentMode !== 'light') {
                    setMode('light');
                }
                
                // Update selected item info
                selectedItemInfo.classList.remove('d-none');
                selectedItemName.textContent = `Selected: ${currentItem.name} Light`;
            });
        });
    }
    
    // Open save customization modal
    function openSaveModal() {
        // Check if user is authenticated
        const isAuthenticated = true; // Replace with actual authentication check
        
        if (!isAuthenticated) {
            loginRequiredMessage.classList.remove('d-none');
            confirmSaveBtn.disabled = true;
        } else {
            loginRequiredMessage.classList.add('d-none');
            confirmSaveBtn.disabled = false;
        }
        
        // Set default name if empty
        if (!customizationNameInput.value) {
            customizationNameInput.value = `My Design - ${new Date().toLocaleDateString()}`;
        }
        
        saveCustomizationModal.show();
    }
    
    // Save customization
    function saveCustomization() {
        const name = customizationNameInput.value || `My Design - ${new Date().toLocaleDateString()}`;
        const id = customizationIdInput.value;
        
        // Collect customization data
        const customizationData = {
            name: name,
            customization_id: id || null,
            furniture_items: getFurnitureData(),
            wall_materials: getMaterialsData('wall'),
            floor_materials: getMaterialsData('floor'),
            ceiling_materials: getMaterialsData('ceiling'),
            door_materials: getMaterialsData('door'),
            window_materials: getMaterialsData('window'),
            lighting_setup: getLightingData()
        };
        
        // In a real app, this would send data to server
        console.log('Saving customization:', customizationData);
        
        // For now, just show success notification
        showNotification('Design saved successfully', 'success');
        
        // Close modal
        saveCustomizationModal.hide();
        
        // In a real app, would refresh the saved designs list here
    }
    
    // Get furniture data for saving
    function getFurnitureData() {
        return furnitureItems.map(item => {
            return {
                id: item.userData.id,
                furnitureId: item.userData.furnitureId,
                name: item.userData.name,
                position: {
                    x: item.position.x,
                    y: item.position.y,
                    z: item.position.z
                },
                rotation: {
                    x: item.rotation.x,
                    y: item.rotation.y,
                    z: item.rotation.z
                },
                materialId: item.userData.materialId
            };
        });
    }
    
    // Get materials data for saving
    function getMaterialsData(type) {
        let elements = [];
        
        switch (type) {
            case 'wall':
                elements = walls;
                break;
            case 'floor':
                elements = floors;
                break;
            case 'ceiling':
                elements = ceilings;
                break;
            case 'door':
                elements = doors;
                break;
            case 'window':
                elements = windows;
                break;
        }
        
        const materialsData = {};
        
        elements.forEach(element => {
            if (element.userData.materialId) {
                materialsData[element.userData.id] = element.userData.materialId;
            }
        });
        
        return materialsData;
    }
    
    // Get lighting data for saving
    function getLightingData() {
        return lightSources.map(light => {
            return {
                id: light.userData.id,
                lightingId: light.userData.lightingId,
                name: light.userData.name,
                position: {
                    x: light.position.x,
                    y: light.position.y,
                    z: light.position.z
                },
                lightType: light.userData.lightType,
                color: light.userData.color || 0xffffff,
                intensity: light.intensity || 1
            };
        });
    }
    
    // Load a customization
    function loadSelectedCustomization() {
        const customizationId = savedCustomizationSelect.value;
        
        if (!customizationId) {
            showNotification('Please select a design to load', 'warning');
            return;
        }
        
        // In a real app, would fetch customization data from server
        // For now, use placeholder data
        const customizationData = {
            id: customizationId,
            name: savedCustomizationSelect.options[savedCustomizationSelect.selectedIndex].text,
            furniture_items: [],
            wall_materials: {},
            floor_materials: {},
            ceiling_materials: {},
            door_materials: {},
            window_materials: {},
            lighting_setup: []
        };
        
        // Apply customization
        applyCustomization(customizationData);
        
        showNotification(`Loaded design "${customizationData.name}"`, 'success');
    }
    
    // Apply a customization to the scene
    function applyCustomization(customizationData) {
        // Clear existing furniture and lights
        furnitureItems.forEach(item => scene.remove(item));
        lightSources.forEach(light => scene.remove(light));
        
        furnitureItems = [];
        lightSources = [];
        
        // In a real application, this would fetch data for furniture, materials, etc.
        
        // Placeholder behavior for demo
        console.log('Applied customization:', customizationData);
    }
    
    // Helper function to generate unique ID
    function generateUniqueId() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        // Create a toast notification
        const toastId = 'notification-' + Math.random().toString(36).substr(2, 9);
        
        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center border-0 position-fixed bottom-0 end-0 m-3" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body ${type === 'success' ? 'bg-success' : type === 'warning' ? 'bg-warning' : 'bg-info'} text-white">
                        ${message}
                    </div>
                    <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', toastHTML);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();
        
        // Also log to console
        console.log(`[${type}]`, message);
        
        // Remove toast from DOM after it's hidden
        toastElement.addEventListener('hidden.bs.toast', function() {
            toastElement.remove();
        });
    }
    
    // Initialize the app
    init();
    setupMaterialSelection();
});