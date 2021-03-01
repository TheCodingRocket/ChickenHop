"use strict";

let scene, camera, renderer, orbitControl, stats;
let clock = new THREE.Clock(), deltaTime;

const cellWidth = 2, columns = 21;
let laneTypes = ['car', 'car', 'car', 'forest', 'forest', 'forest', 'truck', 'truck', 'river', 'river', 'rail'], laneSpeeds, logSpeeds;
let cameraOffsetX, cameraOffsetZ;

let chicken;
let lanes;
let gameSounds, themeSong;
let gameOver;

const firstRun = () =>{
    document.getElementById("instructions").innerText = ((/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) ? "Swipe in the direction you wanna move." : "Use the arrow keys to move around.") + "\nCross as many roads as possible";
    stats = new Stats();
    stats.showPanel(0);
    //document.body.appendChild(stats.dom);

    camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 15, 18);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    cameraOffsetX = camera.position.x;
    cameraOffsetZ = camera.position.z;

    
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.shadowMap.enabled = false;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    //renderer.setClearColor(0x69ceec, 1);
    document.body.appendChild(renderer.domElement);

    // orbitControl = new THREE.OrbitControls(camera, renderer.domElement); //helper to rotate around in scene
    // orbitControl.addEventListener('change', render);
    // orbitControl.enableZoom = true;

    update();
    gameSounds = new Sound(camera);
    
}

const init = () =>{
    document.getElementById("score").innerText = "SCORE:0";
    document.getElementById("restart").style.visibility = "hidden";
    if(document.getElementById('splash'))
        document.body.removeChild(document.getElementById('splash'));
    
    scene = new THREE.Scene();

    gameOver = false;
    laneSpeeds = [3, 4, 5];
    logSpeeds = [2, 2.5, 3];

    camera.position.set(5, 15, 18);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    cameraOffsetX = camera.position.x;
    cameraOffsetZ = camera.position.z;

    //scene.add(new THREE.AxesHelper(10)); //show axes
    addLight();
    chicken = new Chicken();
    scene.add(chicken.model);
    lanes = [-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9].map(index => {
        const lane = new Lane(index);
        lane.mesh.position.z = -index * cellWidth;
        scene.add(lane.mesh);
        return lane;
    }).filter(lane => lane.index >= 0);

    gameSounds.themeSong.setVolume(0.25);
}

//lights up the scene
const addLight = () =>{
    let light = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(light);

    let hemisphere = new THREE.HemisphereLight(0xffffff, 0x000000, 0.4);
    scene.add(hemisphere);

    let sunlight = new THREE.DirectionalLight(0xffffff, 0.6);
    sunlight.position.set(0, 100, 0);
    sunlight.castShadow = true;
    sunlight.shadow.camera.near = 50;
    sunlight.shadow.camera.far = 120;
    sunlight.shadow.camera.top = 200 * cellWidth;
    sunlight.shadow.camera.bottom = -columns/2 * cellWidth;
    sunlight.shadow.camera.left = -columns/2 * cellWidth;
    sunlight.shadow.camera.right = columns/2 * cellWidth;
    //scene.add(new THREE.DirectionalLightHelper(sunlight));
    //scene.add(new THREE.CameraHelper(sunlight.shadow.camera));    //enable to show shadow properties in scene
    scene.add(sunlight);
}

//creates chicken
class Chicken{
    constructor(size = {x: 0.63, y: 0.6, z: 0.63}){
        this.model = new THREE.Group();
        this.currentLane = 0;
        this.maxLane = 0;
        this.currentColumn = Math.floor(columns/2);
        this.isMoving = false;
        this.feathers = new Feathers();
        this.splashes = new Splash();
        //this.model.add(gameSounds.buck);

        let red = new THREE.MeshLambertMaterial({color: 0xdc5a5a}),
            white = new THREE.MeshLambertMaterial({color: 0xffffff}),
            orange = new THREE.MeshLambertMaterial({color: 0xda6400}),
            black = new THREE.MeshLambertMaterial({color: 0x000000});

        let foot1 = new THREE.BoxBufferGeometry(0.1, 0.1, 0.6),
            foot2 = new THREE.BoxBufferGeometry(0.1, 0.1, 0.3),
            foot3 = new THREE.BoxBufferGeometry(0.1, 0.1, 0.6),
            foot4 = new THREE.BoxBufferGeometry(0.1, 0.5, 0.1),
            upperBeak = new THREE.BoxBufferGeometry(0.2, 0.2, 0.3);
        foot1.applyMatrix(new THREE.Matrix4().makeTranslation(0.1, foot1.parameters.height/2, 0.15));
        foot2.applyMatrix(new THREE.Matrix4().makeTranslation(0, foot2.parameters.height/2, 0));
        foot3.applyMatrix(new THREE.Matrix4().makeTranslation(-0.1, foot3.parameters.height/2, 0.15));
        foot4.applyMatrix(new THREE.Matrix4().makeTranslation(0, foot4.parameters.height/2, 0));
        upperBeak.applyMatrix(new THREE.Matrix4().makeTranslation(0, 1.5, upperBeak.parameters.depth/2 + 0.6));
        let leftFoot = THREE.BufferGeometryUtils.mergeBufferGeometries([foot1, foot2, foot3, foot4]), rightFoot = leftFoot.clone();
        leftFoot.applyMatrix(new THREE.Matrix4().makeTranslation(0.2, 0, 0));
        rightFoot.applyMatrix(new THREE.Matrix4().makeTranslation(-0.2, 0, 0));
        let feet = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([leftFoot, rightFoot, upperBeak]), orange);
        feet.castShadow = true;
        feet.receiveShadow = true;
        this.model.add(feet);

        let lowerBody = new THREE.BoxBufferGeometry(0.69, 0.6, 1.2),
            upperBody = new THREE.BoxBufferGeometry(0.69, 0.675, 0.8),
            leftWing = new THREE.BoxBufferGeometry(0.15, 0.4, 0.8),
            rightWing = new THREE.BoxBufferGeometry(0.15, 0.4, 0.8),
            tail = new THREE.BoxBufferGeometry(0.5, 0.4, 0.1);
        lowerBody.applyMatrix(new THREE.Matrix4().makeTranslation(0, lowerBody.parameters.height/2 + 0.5, 0));
        upperBody.applyMatrix(new THREE.Matrix4().makeTranslation(0, upperBody.parameters.height/2 + 1.1, 0.2));
        leftWing.applyMatrix(new THREE.Matrix4().makeTranslation(leftWing.parameters.width/2 + lowerBody.parameters.width/2, leftWing.parameters.height/2 + 0.6, 0));
        rightWing.applyMatrix(new THREE.Matrix4().makeTranslation(-rightWing.parameters.width/2 - lowerBody.parameters.width/2, rightWing.parameters.height/2 + 0.6, 0));
        tail.applyMatrix(new THREE.Matrix4().makeTranslation(0, lowerBody.parameters.height/2 + 0.5, -tail.parameters.depth/2 - 0.6));
        let body = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([lowerBody, upperBody, leftWing, rightWing, tail]), white);
        body.castShadow = true;
        body.receiveShadow = true;
        this.model.add(body);

        let eyeGeo = new THREE.BoxBufferGeometry(0.72, 0.12, 0.12);
        eyeGeo.applyMatrix(new THREE.Matrix4().makeTranslation(0, 1.55, 0.32));
        let eyes = new THREE.Mesh(eyeGeo, black);
        eyes.castShadow = true;
        eyes.receiveShadow = true;
        this.model.add(eyes);
        
        let lowerBeak = new THREE.BoxBufferGeometry(0.2, 0.2, 0.2),
            comb = new THREE.BoxBufferGeometry(0.2, 0.15, 0.5);
            lowerBeak.applyMatrix(new THREE.Matrix4().makeTranslation(0, 1.3, lowerBeak.parameters.depth/2 + 0.6));
            comb.applyMatrix(new THREE.Matrix4().makeTranslation(0, comb.parameters.height/2 + 1.775, 0.2));
        let lowerBeakAndComb = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([lowerBeak, comb]), red);
        lowerBeakAndComb.castShadow = true;
        lowerBeakAndComb.receiveShadow = true;
        this.model.add(lowerBeakAndComb);

        this.model.scale.set(size.x, size.y, size.z);
        this.model.rotation.y += Math.PI;
        if(columns%2 == 0)
            this.model.position.x += cellWidth/2;

        let maxHeight = 1.2, minHeight = 0.8, duration = 1.2;
        let sizeKeyframes = new THREE.VectorKeyframeTrack('.scale', [0, duration/4, duration/2, duration * 3/4, duration], [this.model.scale.x, this.model.scale.y * (maxHeight + minHeight)/2, this.model.scale.z, this.model.scale.x, this.model.scale.y * maxHeight, this.model.scale.z, this.model.scale.x, this.model.scale.y * (maxHeight + minHeight)/2, this.model.scale.z, this.model.scale.x, this.model.scale.y * minHeight, this.model.scale.z, this.model.scale.x, this.model.scale.y * (maxHeight + minHeight)/2, this.model.scale.z]);
        let clip = new THREE.AnimationClip('idle', duration, [sizeKeyframes]);
        this.sizeAnimation = {
            mixer: new THREE.AnimationMixer(this.model),
            clock: new THREE.Clock()
        };
        let anim = this.sizeAnimation.mixer.clipAction(clip);
        anim.setLoop(THREE.LoopRepeat);
        anim.play();
    }

    getLane(){
        return -Math.round(chicken.model.position.z/cellWidth);
    }

    jump(direction){
        if (!this.isMoving && !gameOver){
            let duration = 0.4;
            let dX = 0, dY = 1, dZ = 0;
            let currentX = -columns/2 * cellWidth + cellWidth/2 + this.currentColumn * cellWidth;
            let currentZ = -this.currentLane * cellWidth;
            switch (direction) {
                case 'left':
                    if (this.currentColumn <=0)
                        return;
                    if(lanes[this.currentLane].type == 'forest' && lanes[this.currentLane].occupiedPositions.has(this.currentColumn - 1))
                        return;
                    this.currentColumn--;
                    dX = -cellWidth;
                    this.model.rotation.y = THREE.Math.degToRad(-90);
                    break;
                case 'up':
                    if(lanes[this.currentLane + 1].type == 'forest' && lanes[this.currentLane + 1].occupiedPositions.has(this.currentColumn))
                        return;
                    this.currentLane++;
                    dZ = -cellWidth;
                    this.model.rotation.y = THREE.Math.degToRad(180);
                    break;
                case 'right':
                    if (this.currentColumn >=columns-1)
                        return;
                    if(lanes[this.currentLane].type == 'forest' && lanes[this.currentLane].occupiedPositions.has(this.currentColumn + 1))
                        return;
                    this.currentColumn++;
                    dX = cellWidth;
                    this.model.rotation.y = THREE.Math.degToRad(90);
                    break;
                case 'down':
                    if (this.currentLane <= 0)
                        return;
                    if(lanes[this.currentLane - 1].type == 'forest' && lanes[this.currentLane - 1].occupiedPositions.has(this.currentColumn))
                        return;
                    this.currentLane--;
                    dZ = cellWidth;
                    this.model.rotation.y = THREE.Math.degToRad(0);
                    break;
            }
            if(this.currentLane > this.maxLane){
                this.maxLane = this.currentLane;
                laneSpeeds[0] += 1.5/100;
                laneSpeeds[1] += 2/100;
                laneSpeeds[2] += 2.5/100;
                let lane = new Lane(lanes.length);
                lane.mesh.position.z = -lane.index * cellWidth;
                lanes.push(lane);
                scene.add(lane.mesh);
                document.getElementById("score").innerText = "SCORE:" + this.maxLane;
            }
            let finalX = currentX + dX;
            let finalZ = currentZ + dZ;
            let midwayX = (this.model.position.x + finalX)/2;
            let midwayZ = (this.model.position.z + finalZ)/2;
            let jumpKeyframes  = new THREE.VectorKeyframeTrack('.position', [0, duration/2, duration], [this.model.position.x, this.model.position.y, this.model.position.z, midwayX, this.model.position.y + dY, midwayZ, finalX, this.model.position.y, finalZ]);
            let clip = new THREE.AnimationClip('jump', duration, [jumpKeyframes]);
            this.jumpAnimation = {
                mixer: new THREE.AnimationMixer(this.model),
                clock: new THREE.Clock()
            };
            let instance = this;
            this.jumpAnimation.mixer.addEventListener('finished', () =>{
                instance.isMoving = false;
            });
            let anim = this.jumpAnimation.mixer.clipAction(clip);
            anim.setLoop(THREE.LoopOnce);
            anim.clampWhenFinished = true;
            this.isMoving = true;
            anim.play();
            gameSounds.buck.play();
        }
    }
    
    squish(){
        let ratio = 0.15, duration = 0.4;
        let heightKeyframes = new THREE.VectorKeyframeTrack('.scale', [0, duration], [this.model.scale.x, this.model.scale.y, this.model.scale.z, this.model.scale.x, this.model.scale.y * ratio, this.model.scale.z]);
        let clip = new THREE.AnimationClip('squish', duration, [heightKeyframes]);
        this.heightAnimation = {
            mixer: new THREE.AnimationMixer(this.model),
            clock: new THREE.Clock()
        };
        let anim = this.heightAnimation.mixer.clipAction(clip);
        anim.setLoop(THREE.LoopOnce);
        anim.clampWhenFinished = true;
        anim.play();
    }

    shred(){
        this.feathers.animate(this.model.position);
    }

    fall(){
        let depth = 3 * cellWidth/4, duration = 0.2;
        let fallKeyframes = new THREE.VectorKeyframeTrack('.position', [0, duration], [this.model.position.x, this.model.position.y, this.model.position.z, this.model.position.x, this.model.position.y - depth, this.model.position.z]);
        let clip = new THREE.AnimationClip('fall', duration, [fallKeyframes]);
        this.fallAnimation = {
            mixer: new THREE.AnimationMixer(this.model),
            clock: new THREE.Clock()
        };
        this.fallAnimation.mixer.addEventListener('finished', () =>{
            chicken.model.visible = false;
            this.splashes.animate(this.model.position);
            gameSounds.themeSong.setVolume(0);
            gameSounds.splash.play();
        });
        let anim = this.fallAnimation.mixer.clipAction(clip);
        anim.setLoop(THREE.LoopOnce);
        anim.clampWhenFinished = true;
        anim.play();
    }
}

//creates roads
class Road{
    constructor(){
        this.model = new THREE.Group();
        let leftRoadGeo = new THREE.BoxBufferGeometry(cellWidth * columns, cellWidth, cellWidth),
            middleRoadGeo = new THREE.BoxBufferGeometry(cellWidth * columns, cellWidth, cellWidth),
            rightRoadGeo = new THREE.BoxBufferGeometry(cellWidth * columns, cellWidth, cellWidth);
        leftRoadGeo.applyMatrix(new THREE.Matrix4().makeTranslation(-columns * cellWidth, -leftRoadGeo.parameters.height/2, 0));
        rightRoadGeo.applyMatrix(new THREE.Matrix4().makeTranslation(columns * cellWidth, -rightRoadGeo.parameters.height/2, 0));
        middleRoadGeo.applyMatrix(new THREE.Matrix4().makeTranslation(0, -middleRoadGeo.parameters.height/2, 0));
        let side = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([leftRoadGeo, rightRoadGeo]), new THREE.MeshPhongMaterial({color: 0x1C1E24}));
        this.model.add(side);
        let center = new THREE.Mesh(middleRoadGeo, new THREE.MeshPhongMaterial({color: 0x373A44}));
        center.receiveShadow = true;
        this.model.add(center);

        let markings = [];
        let offset = columns % 2? 0 : cellWidth/2;
        for(let column = 0; column < columns; column+=2){
            let left = new THREE.BoxBufferGeometry(cellWidth, cellWidth/20, cellWidth/20),
                right = new THREE.BoxBufferGeometry(cellWidth, cellWidth/20, cellWidth/20);
            left.applyMatrix(new THREE.Matrix4().makeTranslation(column * cellWidth, 0, cellWidth/2  - left.parameters.depth/2));
            right.applyMatrix(new THREE.Matrix4().makeTranslation(column * cellWidth, 0, -cellWidth/2 + right.parameters.depth/2));
            markings.push(left);
            markings.push(right);
        }
        let patternGeo = THREE.BufferGeometryUtils.mergeBufferGeometries(markings);
        patternGeo.applyMatrix(new THREE.Matrix4().makeTranslation(cellWidth/2 - cellWidth * columns/2  + offset, 0, 0));
        let pattern = new THREE.Mesh(patternGeo, new THREE.MeshPhongMaterial({color: 0xffffff}));
        this.model.add(pattern);
        return this.model;
    }
}

//creates lawns
class Lawn{
    constructor(allDark = false){
        if (!allDark){
            this.model = new THREE.Group();
            let leftLawnGeo = new THREE.BoxBufferGeometry(cellWidth * columns, cellWidth, cellWidth),
                middleLawnGeo = new THREE.BoxBufferGeometry(cellWidth * columns, cellWidth, cellWidth),
                rightLawnGeo = new THREE.BoxBufferGeometry(cellWidth * columns, cellWidth, cellWidth);
            leftLawnGeo.applyMatrix(new THREE.Matrix4().makeTranslation(-columns * cellWidth, -leftLawnGeo.parameters.height/2, 0));
            rightLawnGeo.applyMatrix(new THREE.Matrix4().makeTranslation(columns * cellWidth, -rightLawnGeo.parameters.height/2, 0));
            middleLawnGeo.applyMatrix(new THREE.Matrix4().makeTranslation(0, -middleLawnGeo.parameters.height/2, 0));
            let side = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([leftLawnGeo, rightLawnGeo]), new THREE.MeshPhongMaterial({color: 0x598800}));
            this.model.add(side);
            let center = new THREE.Mesh(middleLawnGeo, new THREE.MeshPhongMaterial({color: 0x78AE00}));
            center.receiveShadow = true;
            this.model.add(center);
        } else{
            let geometry = new THREE.BoxBufferGeometry(cellWidth * columns * 3, cellWidth, cellWidth);
            geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, -geometry.parameters.height/2, 0));
            this.model = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color: 0x598800}));
        }
        return this.model;
    }
}

//creates rivers
class River{
    constructor(){
        this.model = new THREE.Group();
        let leftRiverGeo = new THREE.BoxBufferGeometry(cellWidth * columns, 3 * cellWidth/4, cellWidth),
            middleRiverGeo = new THREE.BoxBufferGeometry(cellWidth * columns, 3 * cellWidth/4, cellWidth),
            rightRiverGeo = new THREE.BoxBufferGeometry(cellWidth * columns, 3 * cellWidth/4, cellWidth);
        leftRiverGeo.applyMatrix(new THREE.Matrix4().makeTranslation(-columns * cellWidth, -leftRiverGeo.parameters.height/2 - cellWidth/4, 0));
        rightRiverGeo.applyMatrix(new THREE.Matrix4().makeTranslation(columns * cellWidth, -rightRiverGeo.parameters.height/2 - cellWidth/4, 0));
        middleRiverGeo.applyMatrix(new THREE.Matrix4().makeTranslation(0, -middleRiverGeo.parameters.height/2 - cellWidth/4, 0));
        let side = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([leftRiverGeo, rightRiverGeo]), new THREE.MeshPhongMaterial({color: 0x17A7CB}));
        this.model.add(side);
        let center = new THREE.Mesh(middleRiverGeo, new THREE.MeshPhongMaterial({color: 0x46CFE1}));
        //center.receiveShadow = true;
        this.model.add(center);

        let planes = [];
        for(let i = 0; i < 4; ++i){
            let plane = new THREE.BoxBufferGeometry(cellWidth/3, cellWidth/60, cellWidth/3);
            plane.applyMatrix(new THREE.Matrix4().makeRotationY(Math.random() * 6.28));
            plane.applyMatrix(new THREE.Matrix4().makeTranslation(i%2? -cellWidth/8 : cellWidth/8, 0, (i - 1.5) * cellWidth/4));
            planes.push(plane);
        }
        let planeLeft = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(planes), new THREE.MeshBasicMaterial({color: 0xeeeeee})), planeRight = planeLeft.clone();
        planeLeft.position.set(-columns * cellWidth/2, -cellWidth/4, 0);
        this.model.add(planeLeft);
        planeRight.position.set(columns * cellWidth/2, -cellWidth/4, 0);
        this.model.add(planeRight);
        return this.model;
    }
}

//creates rails
class Rail{
    constructor(){
        this.model = new THREE.Group();
        let leftRoadGeo = new THREE.BoxBufferGeometry(cellWidth * columns, cellWidth, cellWidth),
            middleRoadGeo = new THREE.BoxBufferGeometry(cellWidth * columns, cellWidth, cellWidth),
            rightRoadGeo = new THREE.BoxBufferGeometry(cellWidth * columns, cellWidth, cellWidth);
        leftRoadGeo.applyMatrix(new THREE.Matrix4().makeTranslation(-columns * cellWidth, -leftRoadGeo.parameters.height/2, 0));
        rightRoadGeo.applyMatrix(new THREE.Matrix4().makeTranslation(columns * cellWidth, -rightRoadGeo.parameters.height/2, 0));
        middleRoadGeo.applyMatrix(new THREE.Matrix4().makeTranslation(0, -middleRoadGeo.parameters.height/2, 0));
        let side = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([leftRoadGeo, rightRoadGeo]), new THREE.MeshPhongMaterial({color: 0x1C1E24}));
        this.model.add(side);
        let center = new THREE.Mesh(middleRoadGeo, new THREE.MeshPhongMaterial({color: 0x373A44}));
        center.receiveShadow = true;
        this.model.add(center);

        let leftRailGeo1 = new THREE.BoxBufferGeometry(cellWidth * columns, cellWidth/20, cellWidth/10),
            leftRailGeo2 = new THREE.BoxBufferGeometry(cellWidth * columns, cellWidth/20, cellWidth/10),
            centerRailGeo1 = new THREE.BoxBufferGeometry(cellWidth * columns, cellWidth/20, cellWidth/10),
            centerRailGeo2 = new THREE.BoxBufferGeometry(cellWidth * columns, cellWidth/20, cellWidth/10),
            rightRailGeo1 = new THREE.BoxBufferGeometry(cellWidth * columns, cellWidth/20, cellWidth/10),
            rightRailGeo2 = new THREE.BoxBufferGeometry(cellWidth * columns, cellWidth/20, cellWidth/10);
        leftRailGeo1.applyMatrix(new THREE.Matrix4().makeTranslation(-columns * cellWidth, leftRailGeo1.parameters.height/2 + leftRailGeo1.parameters.height, -leftRailGeo1.parameters.depth/2 + cellWidth/2 - leftRailGeo1.parameters.depth));
        leftRailGeo2.applyMatrix(new THREE.Matrix4().makeTranslation(-columns * cellWidth, leftRailGeo2.parameters.height/2 + leftRailGeo2.parameters.height, leftRailGeo2.parameters.depth/2 - cellWidth/2 + leftRailGeo2.parameters.depth));
        centerRailGeo1.applyMatrix(new THREE.Matrix4().makeTranslation(0, centerRailGeo1.parameters.height/2 + centerRailGeo1.parameters.height, -centerRailGeo1.parameters.depth/2 + cellWidth/2 - centerRailGeo1.parameters.depth));
        centerRailGeo2.applyMatrix(new THREE.Matrix4().makeTranslation(0, centerRailGeo2.parameters.height/2 + centerRailGeo2.parameters.height, centerRailGeo2.parameters.depth/2 - cellWidth/2 + centerRailGeo2.parameters.depth));
        rightRailGeo1.applyMatrix(new THREE.Matrix4().makeTranslation(columns * cellWidth, rightRailGeo1.parameters.height/2 + rightRailGeo1.parameters.height, -rightRailGeo1.parameters.depth/2 + cellWidth/2 - rightRailGeo1.parameters.depth));
        rightRailGeo2.applyMatrix(new THREE.Matrix4().makeTranslation(columns * cellWidth, rightRailGeo2.parameters.height/2 + rightRailGeo2.parameters.height, rightRailGeo2.parameters.depth/2 - cellWidth/2 + rightRailGeo2.parameters.depth));
        let sideRail = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([leftRailGeo1, leftRailGeo2, rightRailGeo1, rightRailGeo2]), new THREE.MeshPhongMaterial({color: 0x5F636D}));
        this.model.add(sideRail);
        let centerRail = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([centerRailGeo1, centerRailGeo2]), new THREE.MeshPhongMaterial({color: 0x878D98}));
        centerRail.castShadow = true;
        centerRail.receiveShadow = true;
        this.model.add(centerRail);

        let offset = columns % 2? 0 : cellWidth/2;
        let sideBars = [], centerBars = [];
        for(let column = 0; column < columns; ++column){
            let left = new THREE.BoxBufferGeometry(cellWidth/10, cellWidth/20, cellWidth),
                middle = new THREE.BoxBufferGeometry(cellWidth/10, cellWidth/20, cellWidth),
                right = new THREE.BoxBufferGeometry(cellWidth/10, cellWidth/20, cellWidth);
            left.applyMatrix(new THREE.Matrix4().makeTranslation(column * cellWidth - columns * cellWidth - Math.floor(columns/2) * cellWidth + offset, left.parameters.height/2, 0));
            middle.applyMatrix(new THREE.Matrix4().makeTranslation(column * cellWidth - Math.floor(columns/2) * cellWidth + offset, middle.parameters.height/2, 0));
            right.applyMatrix(new THREE.Matrix4().makeTranslation(column * cellWidth + columns * cellWidth - Math.floor(columns/2) * cellWidth + offset, right.parameters.height/2, 0));
            sideBars.push(left);
            centerBars.push(middle);
            sideBars.push(right);
        }
        let sideRails = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(sideBars), new THREE.MeshPhongMaterial({color: 0x7b3c2a}));
        this.model.add(sideRails);
        let centerRails = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(centerBars), new THREE.MeshPhongMaterial({color: 0x9D5E4C}));
        this.model.add(centerRails);
        return this.model;
    }
}

//creates cars
class Car{
    constructor(color, size = {x: 0.95, y: 0.9, z: 0.8}){
        this.model = new THREE.Group();
        let colorNames = ['blue', 'green', 'yellow', 'orange', 'purple'];
        let colors = [
            {light: 0x04bcfa, dark: 0x0189c7},
            {light: 0xB9F210, dark: 0x90D700},
            {light: 0xffbb00, dark: 0xcc8800},
            {light: 0xFA6E10, dark: 0xED5800},
            {light: 0xA359FF, dark: 0x883bEC}
        ];
        let light = colors[colorNames.indexOf(color)].light, dark = colors[colorNames.indexOf(color)].dark;
        let lowerBody = new THREE.Mesh(new THREE.BoxBufferGeometry(4, 0.75, 1.8), new THREE.MeshLambertMaterial({color: light}));
        lowerBody.position.set(lowerBody.geometry.parameters.width/4, 3 * lowerBody.geometry.parameters.height/4, 0);
        lowerBody.castShadow = true;
        lowerBody.receiveShadow = true;
        this.model.add(lowerBody);

        let wheel1 = new THREE.BoxBufferGeometry(2 * lowerBody.geometry.parameters.height/3, 2 * lowerBody.geometry.parameters.height/3, 1.85),
            wheel2 = new THREE.BoxBufferGeometry(2 * lowerBody.geometry.parameters.height/3, 2 * lowerBody.geometry.parameters.height/3, 1.85),
            window1 = new THREE.BoxBufferGeometry(1, 0.65, 1.45),
            window2 = new THREE.BoxBufferGeometry(0.4, 0.65, 1.45),
            window3 = new THREE.BoxBufferGeometry(2.05, 0.65, 1.2);
        wheel1.applyMatrix(new THREE.Matrix4().makeTranslation(-0.2, wheel1.parameters.height/2, 0));
        wheel2.applyMatrix(new THREE.Matrix4().makeTranslation(lowerBody.geometry.parameters.width/2 + 0.2, wheel2.parameters.height/2, 0));
        window1.applyMatrix(new THREE.Matrix4().makeTranslation(1.2, 1.2125, 0));
        window2.applyMatrix(new THREE.Matrix4().makeTranslation(2.1, 1.2125, 0));
        window3.applyMatrix(new THREE.Matrix4().makeTranslation(1.5, 1.2125, 0));
        let wheelsAndWindows = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([wheel1, wheel2, window1, window2, window3]), new THREE.MeshLambertMaterial({color: 0x000000}));
        wheelsAndWindows.castShadow = true;
        wheelsAndWindows.receiveShadow = true;
        this.model.add(wheelsAndWindows);

        let upperBodyGeo = new THREE.BoxBufferGeometry(2, 0.75, 1.4),
            innerWheel1 =  new THREE.BoxBufferGeometry(wheel1.parameters.width * 0.5, wheel1.parameters.height * 0.5, wheel1.parameters.depth + 0.01),
            innerWheel2 =  new THREE.BoxBufferGeometry(wheel2.parameters.width * 0.5, wheel2.parameters.height * 0.5, wheel2.parameters.depth + 0.01);
        upperBodyGeo.applyMatrix(new THREE.Matrix4().makeTranslation(3 * upperBodyGeo.parameters.width/4, lowerBody.position.y + lowerBody.geometry.parameters.height/2 + upperBodyGeo.parameters.height/2, 0));
        innerWheel1.applyMatrix(new THREE.Matrix4().makeTranslation(-0.2, wheel1.parameters.height/2, 0));
        innerWheel2.applyMatrix(new THREE.Matrix4().makeTranslation(lowerBody.geometry.parameters.width/2 + 0.2, wheel2.parameters.height/2, 0));
        let upperBody = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([upperBodyGeo, innerWheel1, innerWheel2]), new THREE.MeshLambertMaterial({color: 0xffffff}));
        upperBody.castShadow = true;
        upperBody.receiveShadow = true;
        this.model.add(upperBody);

        let strip1 = new THREE.BoxBufferGeometry(4.005, 0.8, 1),
            strip2 = new THREE.BoxBufferGeometry(0.5, 0.25, 2.2),
            strip3 = new THREE.BoxBufferGeometry(4.01, 0.25, 1.81),
            strip4 = new THREE.BoxBufferGeometry(0.4, 0.2, 1);
        strip1.applyMatrix(new THREE.Matrix4().makeTranslation(lowerBody.position.x, lowerBody.position.y + 0.025, 0));
        strip2.applyMatrix(new THREE.Matrix4().makeTranslation(1, lowerBody.position.y + 0.15, 0));
        strip3.applyMatrix(new THREE.Matrix4().makeTranslation(lowerBody.position.x, lowerBody.position.y, lowerBody.position.z));
        strip4.applyMatrix(new THREE.Matrix4().makeTranslation(3 * upperBodyGeo.parameters.width/4 - 0.2, color == 'yellow'? 1.75 : 1, 0));
        let strips = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([strip1, strip2, strip3, strip4]), new THREE.MeshLambertMaterial({color: dark}));
        strips.castShadow = true;
        strips.receiveShadow = true;
        this.model.add(strips);

        let strip5 = new THREE.Mesh(new THREE.BoxBufferGeometry(4.01, 0.25, 1.81), new THREE.MeshLambertMaterial({color: 0x645991}));
        strip5.position.set(lowerBody.position.x, lowerBody.position.y - strip5.geometry.parameters.height, lowerBody.position.z);
        strip5.castShadow = true;
        strip5.receiveShadow = true;
        this.model.add(strip5);

        //this.model.add(new THREE.AxesHelper(2));
        this.model.scale.set(size.x, size.y, size.z);
        return this.model;
    }
}

//creates trucks
class Truck{
    constructor(color, size = {x: 0.95, y: 1, z: 1}){
        this.model = new THREE.Group();
        let colorNames = ['brown', 'teal', 'burgundy', 'cyan', 'magenta', 'beige'];
        let colors = [
            {light: 0x703500, dark: 0x551800},
            {light: 0x008080, dark: 0x005050},
            {light: 0x8d021f, dark: 0x650512},
            {light: 0x009999, dark: 0x006666},
            {light: 0xcc3355, dark: 0xaa2233},
            {light: 0xba8a5f, dark: 0x98683d}
        ];
        let light = colors[colorNames.indexOf(color)].light, dark = colors[colorNames.indexOf(color)].dark;
        
        let bodyGeo = new THREE.BoxBufferGeometry(1.6, 1.5, 1.4),
            stripGeo = new THREE.BoxBufferGeometry(0.2, 0.3, 1.8);
        bodyGeo.applyMatrix(new THREE.Matrix4().makeTranslation(-0.2, 0.1875 + bodyGeo.parameters.height/2, 0));
        stripGeo.applyMatrix(new THREE.Matrix4().makeTranslation(-0.6, 0.8, 0));
        let body = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([bodyGeo, stripGeo]), new THREE.MeshLambertMaterial({color: light}));
        body.castShadow = true;
        body.receiveShadow = true;
        this.model.add(body);

        let middleStrip = new THREE.Mesh(new THREE.BoxBufferGeometry(1.61, 0.5, 1.41), new THREE.MeshLambertMaterial({color: dark}));
        middleStrip.position.set(-0.21, middleStrip.geometry.parameters.height/2 + 0.5, 0);
        middleStrip.castShadow = true;
        middleStrip.receiveShadow = true;
        this.model.add(middleStrip);

        let window = new THREE.BoxBufferGeometry(0.85, 0.5, 1.45),
            wheel1 = new THREE.BoxBufferGeometry(0.5, 0.5, 1.45),
            wheel2 = new THREE.BoxBufferGeometry(0.5, 0.5, 1.45),
            wheel3 = new THREE.BoxBufferGeometry(0.5, 0.5, 1.45);
        window.applyMatrix(new THREE.Matrix4().makeTranslation(-0.6, window.parameters.height/2 + 1, 0));
        wheel1.applyMatrix(new THREE.Matrix4().makeTranslation(0, wheel1.parameters.height/2, 0));
        wheel2.applyMatrix(new THREE.Matrix4().makeTranslation(1.8, wheel2.parameters.height/2, 0));
        wheel3.applyMatrix(new THREE.Matrix4().makeTranslation(4.2, wheel3.parameters.height/2, 0));
        let wheelsAndWindows = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([window, wheel1, wheel2, wheel3]), new THREE.MeshLambertMaterial({color: 0x000000}));
        wheelsAndWindows.castShadow = true;
        wheelsAndWindows.receiveShadow = true;
        this.model.add(wheelsAndWindows);

        let top1 = new THREE.BoxBufferGeometry(0.6, 0.15, 1),
            top2 = new THREE.BoxBufferGeometry(0.3, 0.15, 1),
            trunk = new THREE.BoxBufferGeometry(4, 2, 1.8);
        top1.applyMatrix(new THREE.Matrix4().makeTranslation(0.3, 1.75, 0));
        top2.applyMatrix(new THREE.Matrix4().makeTranslation(0.45, 1.9, 0));
        trunk.applyMatrix(new THREE.Matrix4().makeTranslation(3, trunk.parameters.height/2 + 0.5, 0));
        let trunkAndCenter = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([top1, top2, trunk]), new THREE.MeshLambertMaterial({color: 0xd6bafe}));
        trunkAndCenter.castShadow = true;
        trunkAndCenter.receiveShadow = true;
        this.model.add(trunkAndCenter);

        let middle = new THREE.BoxBufferGeometry(0.4, 0.2, 1.2),
            lowerTrunkGeo = new THREE.BoxBufferGeometry(4, 0.3125, 1.4),
            lowerStripGeo = new THREE.BoxBufferGeometry(1.61, 0.3125, 1.41);
        middle.applyMatrix(new THREE.Matrix4().makeTranslation(0.8, 0.4, 0));
        lowerTrunkGeo.applyMatrix(new THREE.Matrix4().makeTranslation(3, 0.1875 + lowerTrunkGeo.parameters.height/2, 0));
        lowerStripGeo.applyMatrix(new THREE.Matrix4().makeTranslation(-0.21, 0.1875 + lowerStripGeo.parameters.height/2, 0));
        let lowerTrunk = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([middle, lowerTrunkGeo, lowerStripGeo]), new THREE.MeshLambertMaterial({color: 0x645991}));
        lowerTrunk.castShadow = true;
        lowerTrunk.receiveShadow = true;
        this.model.add(lowerTrunk);

        let innerWheel1 = new THREE.BoxBufferGeometry(0.25, 0.25, 1.46),
            innerWheel2 = new THREE.BoxBufferGeometry(0.25, 0.25, 1.46),
            innerWheel3 = new THREE.BoxBufferGeometry(0.25, 0.25, 1.46);
        innerWheel1.applyMatrix(new THREE.Matrix4().makeTranslation(0, innerWheel1.parameters.height, 0));
        innerWheel2.applyMatrix(new THREE.Matrix4().makeTranslation(1.8, innerWheel2.parameters.height, 0));
        innerWheel3.applyMatrix(new THREE.Matrix4().makeTranslation(4.2, innerWheel3.parameters.height, 0));
        let innerWheels = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([innerWheel1, innerWheel2, innerWheel3]), new THREE.MeshLambertMaterial({color: 0xffffff}));
        innerWheels.castShadow = true;
        innerWheels.receiveShadow = true;
        this.model.add(innerWheels);

        this.model.scale.set(size.x, size.y, size.z);
        return this.model;
    }
}

//creates trains
class ChewChewTrain{
    constructor(length, size = {x: 1, y: 1, z: 0.95}){
        this.length = length;
        //colors are in this order - yellow, light blue, dark blue, extra dark blue, white, black
        let meshes = [
            {geometries: [], color: 0xffff00},
            {geometries: [], color: 0x1365d6},
            {geometries: [], color: 0x1825b8},
            {geometries: [], color: 0x000396},
            {geometries: [], color: 0xffffff},
            {geometries: [], color: 0x000000}
        ];
        let startOffset = 3, spacing = 8, groundHeight = 0.2;
        this.model = new THREE.Group();
        for(let cabin = 0; cabin < length; ++cabin){
            let body = new THREE.BoxBufferGeometry(7.2, 2.5, 1.8);
            body.applyMatrix(new THREE.Matrix4().makeTranslation(spacing * cabin + startOffset, body.parameters.height/2 + groundHeight, 0));
            meshes[2].geometries.push(body);
            let body1 = new THREE.BoxBufferGeometry(4.8, 2.1, 1.85);
            body1.applyMatrix(new THREE.Matrix4().makeTranslation(spacing * cabin + startOffset, body1.parameters.height/2 + groundHeight + 0.2, 0));
            meshes[1].geometries.push(body1);
            let body2 = new THREE.BoxBufferGeometry(2.4, 2.1, 1.9);
            body2.applyMatrix(new THREE.Matrix4().makeTranslation(spacing * cabin + startOffset, body2.parameters.height/2 + groundHeight + 0.2, 0));
            meshes[4].geometries.push(body2);
            let top = new THREE.BoxBufferGeometry(6, groundHeight, 1.2);
            top.applyMatrix(new THREE.Matrix4().makeTranslation(spacing * cabin + startOffset, top.parameters.height/2 + groundHeight +body.parameters.height, 0));
            meshes[3].geometries.push(top);
            if(cabin == 0 || cabin == length - 1){
                let front = new THREE.BoxBufferGeometry(0.6, body.parameters.height + groundHeight, 2);
                front.applyMatrix(new THREE.Matrix4().makeTranslation(spacing * cabin + startOffset + body.parameters.width/2, body.parameters.height/2 + groundHeight, 0));
                if (cabin == 0){
                    front.applyMatrix(new THREE.Matrix4().makeTranslation(-body.parameters.width, 0, 0));
                    let frontWindow = new THREE.BoxBufferGeometry(0.8, 0.8, 1.6);
                    frontWindow.applyMatrix(new THREE.Matrix4().makeTranslation(spacing * cabin + startOffset - body.parameters.width/2, frontWindow.parameters.height/2 + 1.5, 0));
                    meshes[5].geometries.push(frontWindow);
                    let headlight1 = new THREE.BoxBufferGeometry(0.8, 0.2, 0.4);
                    headlight1.applyMatrix(new THREE.Matrix4().makeTranslation(spacing * cabin + startOffset - body.parameters.width/2, headlight1.parameters.height/2 + 0.8, -frontWindow.parameters.depth/2 + headlight1.parameters.depth/2));
                    meshes[4].geometries.push(headlight1);
                    let headlight2 = new THREE.BoxBufferGeometry(0.8, 0.2, 0.4);
                    headlight2.applyMatrix(new THREE.Matrix4().makeTranslation(spacing * cabin + startOffset - body.parameters.width/2, headlight2.parameters.height/2 + 0.8, frontWindow.parameters.depth/2 - headlight2.parameters.depth/2));
                    meshes[4].geometries.push(headlight2);
                }
                meshes[0].geometries.push(front);
            }
            if(cabin > 0){
                let middle = new THREE.BoxBufferGeometry(0.8, body.parameters.height - 0.4, body.parameters.depth - 0.4);
                middle.applyMatrix(new THREE.Matrix4().makeTranslation(spacing * cabin + startOffset - 8/2, middle.parameters.height/2 + groundHeight + (body.parameters.height - middle.parameters.height)/2, 0));
                meshes[0].geometries.push(middle);
            }
            for (let i = -2.5; i <= 2.5; ++i){
                let window = new THREE.BoxBufferGeometry(0.5, 1, 1.95);
                window.applyMatrix(new THREE.Matrix4().makeTranslation(spacing * cabin + startOffset + 1.2 * i, window.parameters.height/2 + 1.2, 0));
                meshes[5].geometries.push(window);
            }
        }
        meshes.forEach(mesh =>{
            if (mesh.geometries.length){
                let merged = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(mesh.geometries), new THREE.MeshLambertMaterial({color: mesh.color}));
                merged.castShadow = true;
                merged.receiveShadow = true;
                this.model.add(merged);
            }
        });

        this.model.scale.set(size.x, size.y, size.z);
    }
}

//creates trees
class Tree{
    constructor(layers, size = {x: 0.95, y: 1, z: 0.95}){
        let width = 1.5, height = 0.45, smallerHeight = 0.15;
        this.model = new THREE.Group();
        let trunk = new THREE.Mesh(new THREE.BoxBufferGeometry(width/2, height, width/2), new THREE.MeshLambertMaterial({color: 0x91654B}));
        trunk.position.y += trunk.geometry.parameters.height/2;
        this.model.add(trunk);
        let trunk1 = new THREE.BoxBufferGeometry(width/6, height, width/2 + 0.05),
            trunk2 = new THREE.BoxBufferGeometry(width/2 + 0.05, height, width/6);
        trunk1.applyMatrix(new THREE.Matrix4().makeTranslation(0, trunk1.parameters.height/2, 0));
        trunk2.applyMatrix(new THREE.Matrix4().makeTranslation(0, trunk2.parameters.height/2, 0));
        let trunks = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([trunk1, trunk2]), new THREE.MeshLambertMaterial({color: 0xD4C4AF}));
        this.model.add(trunks);
        let darkLeaves = [], brightLeaves = [];
        let lowerLeaf = new THREE.BoxBufferGeometry(width, smallerHeight, width);
        lowerLeaf.applyMatrix(new THREE.Matrix4().makeTranslation(0, lowerLeaf.parameters.height/2 + trunk.geometry.parameters.height, 0));
        darkLeaves.push(lowerLeaf);
        let startHeight = lowerLeaf.parameters.height + trunk.geometry.parameters.height, gap = startHeight;
        for(let layer = 0; layer < layers; ++layer){
            let middleLeaf = new THREE.BoxBufferGeometry(width, height, width)
            middleLeaf.applyMatrix(new THREE.Matrix4().makeTranslation(0, middleLeaf.parameters.height/2 + startHeight + layer * gap, 0));
            brightLeaves.push(middleLeaf);
            let upperLeaf = new THREE.BoxBufferGeometry(width, smallerHeight, width);
            upperLeaf.applyMatrix(new THREE.Matrix4().makeTranslation(0, upperLeaf.parameters.height/2 + startHeight + middleLeaf.parameters.height + layer * gap, 0));
            darkLeaves.push(upperLeaf);
        }
        let allDarkLeaves = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(darkLeaves), new THREE.MeshLambertMaterial({color: 0x09A440}));
        allDarkLeaves.castShadow = true;
        allDarkLeaves.receiveShadow = true;
        this.model.add(allDarkLeaves);
        let allBrightLeaves = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(brightLeaves), new THREE.MeshLambertMaterial({color: 0xabdf00}));
        allBrightLeaves.castShadow = true;
        allBrightLeaves.receiveShadow = true;
        this.model.add(allBrightLeaves);

        this.model.scale.set(size.x, size.y, size.z);
        return this.model;
    }
}

//creates logs
class Log{
    constructor(size = {x: 0.95, y: 1, z: 0.8}){
        this.model = new THREE.Group();
        let whiteMeshes = [], lightMeshes = [], darkMeshes = [];
        let offset = 1;
        let middle = new THREE.BoxBufferGeometry(3.6, 0.25, 1.2),
            front = new THREE.BoxBufferGeometry(3.6, 0.5, 0.2),
            back = new THREE.BoxBufferGeometry(3.6, 0.5, 0.2);
        middle.applyMatrix(new THREE.Matrix4().makeTranslation(offset, -middle.parameters.height/2, 0));
        front.applyMatrix(new THREE.Matrix4().makeTranslation(offset, -front.parameters.height/2, front.parameters.depth/2 - middle.parameters.depth/2));
        back.applyMatrix(new THREE.Matrix4().makeTranslation(offset, -back.parameters.height/2, -back.parameters.depth/2 + middle.parameters.depth/2));
        lightMeshes.push(middle);
        lightMeshes.push(front);
        lightMeshes.push(back);
        this.model.add(new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(lightMeshes), new THREE.MeshLambertMaterial({color: 0x8d5358})));

        let middle1 = new THREE.BoxBufferGeometry(0.2, 0.25, 1.2),
            front1 = new THREE.BoxBufferGeometry(0.2, 0.5, 0.2),
            back1 = new THREE.BoxBufferGeometry(0.2, 0.5, 0.2),
            middle2 = new THREE.BoxBufferGeometry(0.2, 0.25, 1.2),
            front2 = new THREE.BoxBufferGeometry(0.2, 0.5, 0.2),
            back2 = new THREE.BoxBufferGeometry(0.2, 0.5, 0.2);
        middle1.applyMatrix(new THREE.Matrix4().makeTranslation(-middle1.parameters.width/2 - middle.parameters.width/2 + offset, -middle1.parameters.height/2, 0));
        front1.applyMatrix(new THREE.Matrix4().makeTranslation(-front1.parameters.width/2 - middle.parameters.width/2 + offset, -front1.parameters.height/2, front1.parameters.depth/2 - middle1.parameters.depth/2));
        back1.applyMatrix(new THREE.Matrix4().makeTranslation(-back1.parameters.width/2 - middle.parameters.width/2 + offset, -back1.parameters.height/2, -back1.parameters.depth/2 + middle1.parameters.depth/2));
        middle2.applyMatrix(new THREE.Matrix4().makeTranslation(middle2.parameters.width/2 + middle.parameters.width/2 + offset, -middle2.parameters.height/2, 0));
        front2.applyMatrix(new THREE.Matrix4().makeTranslation(front2.parameters.width/2 + middle.parameters.width/2 + offset, -front2.parameters.height/2, front2.parameters.depth/2 - middle2.parameters.depth/2));
        back2.applyMatrix(new THREE.Matrix4().makeTranslation(back2.parameters.width/2 + middle.parameters.width/2 + offset, -back2.parameters.height/2, -back2.parameters.depth/2 + middle2.parameters.depth/2));
        whiteMeshes.push(middle1);
        whiteMeshes.push(front1);
        whiteMeshes.push(back1);
        whiteMeshes.push(middle2);
        whiteMeshes.push(front2);
        whiteMeshes.push(back2);
        this.model.add(new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(whiteMeshes), new THREE.MeshLambertMaterial({color: 0xefb9be})));

        let patternPositions = [
            [0, 0, 0, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            [0, 1, 0, 0, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 0, 1, 0, 0, 0, 0, 0]
        ];
        for(let row = 0; row < patternPositions.length; ++row){
            let zPos = row * 0.3 - 0.45;
            for(let column = 0; column < patternPositions[row].length; ++column){
                let xPos = column * 0.4 - 1.8;
                if (patternPositions[row][column]){
                    let cube = new THREE.BoxBufferGeometry(0.4, 0.02, 0.3);
                    cube.applyMatrix(new THREE.Matrix4().makeTranslation(xPos + offset, 0, zPos));
                    darkMeshes.push(cube);
                }
            }
        }
        this.model.add(new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(darkMeshes), new THREE.MeshLambertMaterial({color: 0x491025})));

        this.model.scale.set(size.x, size.y, size.z);
        return this.model;
    }
}

//creates animated feathers
class Feathers{
    constructor(range = 2, height = 6.3){
        this.coordinates = [
            {x: 0, y: height, z: 0},
            {x: range/2, y: 3 * height/4, z: range/2},
            {x: range/2, y: 3 * height/4, z: -range/2},
            {x: -range/2, y: 3 * height/4, z: range/2},
            {x: -range/2, y: 3 * height/4, z: -range/2},
            {x: range, y: height/2, z: 0},
            {x: 0, y: height/2, z: range},
            {x: -range, y: height/2, z: 0},
            {x: 0, y: height/2, z: -range}
        ];
        this.feathers = [];
        this.animations = [];
        this.coordinates.forEach(() =>{
            let size = 0.25 + Math.random() * 0.25;
            let geo = new THREE.PlaneBufferGeometry(size, size);
            let mat = new THREE.MeshLambertMaterial({color: 0xffffff, side: THREE.DoubleSide});
            let feather = new THREE.Mesh(geo, mat);
            feather.rotation.set(Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI);
            feather.visible = false;
            scene.add(feather);
            this.feathers.push(feather);
            this.animations.push(undefined);
        });
    }

    animate(initialPos, duration = 5){
        this.feathers.forEach((feather, index) =>{
            feather.visible = true;
            feather.position.set(initialPos.x, initialPos.y, initialPos.z);
            this.firstInterval = duration/20;
            let finalPosition = new THREE.Vector3(initialPos.x + this.coordinates[index].x, initialPos.y + this.coordinates[index].y, initialPos.z + this.coordinates[index].z);
            let movement = new THREE.VectorKeyframeTrack('.position', [0, this.firstInterval, duration], [feather.position.x, feather.position.y, feather.position.z, finalPosition.x, finalPosition.y, finalPosition.z, finalPosition.x, 0, finalPosition.z]);
            let clip = new THREE.AnimationClip('feathers', duration, [movement]);
            this.animations[index] = {
                mixer: new THREE.AnimationMixer(feather),
                clock: new THREE.Clock(),
                rotationSpeed: THREE.Math.degToRad(Math.random() * 360),
                firstInterval: this.firstInterval
            };
            let anim = this.animations[index].mixer.clipAction(clip);
            anim.setLoop(THREE.LoopOnce);
            this.animations[index].mixer.addEventListener('finished', () =>{
                feather.visible = false;
            });
            anim.play();
        });
    }
}

//creates water splash effect
class Splash{
    constructor(range = 2, height = 5){
        let middleHeightCoeff = 7/8, lowerHeightCoeff = 6/8;
        this.coordinates = [
            {x: 0, y: height, z: 0},
            {x: range/2, y: middleHeightCoeff * height, z: range/2},
            {x: range/2, y: middleHeightCoeff * height, z: -range/2},
            {x: -range/2, y: middleHeightCoeff * height, z: range/2},
            {x: -range/2, y: middleHeightCoeff * height, z: -range/2},
            {x: range, y: lowerHeightCoeff * height, z: 0},
            {x: 0, y: lowerHeightCoeff * height, z: range},
            {x: -range, y: lowerHeightCoeff * height, z: 0},
            {x: 0, y: lowerHeightCoeff * height, z: -range}
        ];
        this.splashes = [];
        this.animations = [];
        this.coordinates.forEach(() =>{
            let size = 0.25 + Math.random() * 0.25;
            let geo = new THREE.BoxBufferGeometry(size, size, size);
            let mat = new THREE.MeshLambertMaterial({color: 0x46CFE1});
            let splash = new THREE.Mesh(geo, mat);
            splash.visible = false;
            scene.add(splash);
            this.splashes.push(splash);
            this.animations.push(undefined);
        });
    }

    animate(initialPos, duration = 1){
        this.splashes.forEach((splash, index) =>{
            splash.visible = true;
            splash.position.set(initialPos.x, initialPos.y, initialPos.z);
            this.firstInterval = duration/4;
            let finalPosition = new THREE.Vector3(initialPos.x + this.coordinates[index].x, initialPos.y + this.coordinates[index].y, initialPos.z + this.coordinates[index].z, THREE.InterpolateSmooth);
            let movement = new THREE.VectorKeyframeTrack('.position', [0, this.firstInterval, duration], [splash.position.x, splash.position.y, splash.position.z, finalPosition.x, finalPosition.y, finalPosition.z, finalPosition.x, 0, finalPosition.z]);
            let clip = new THREE.AnimationClip('water splash', duration, [movement]);
            this.animations[index] = {
                mixer: new THREE.AnimationMixer(splash),
                clock: new THREE.Clock()
            };
            let anim = this.animations[index].mixer.clipAction(clip);
            anim.setLoop(THREE.LoopOnce);
            this.animations[index].mixer.addEventListener('finished', () =>{
                splash.visible = false;
            });
            anim.play();
        });
    }
}

//creates lanes
class Lane{
    constructor(index){
        this.index = index;
        this.type = index <= 0 ? 'field' : laneTypes[Math.floor(Math.random()*laneTypes.length)];
        let offset = columns/2 * cellWidth - cellWidth/2;
        switch(this.type) {
            case 'field': {
                this.mesh = new Lawn(index < 0);
                break;
            }
            case 'forest': {
                this.mesh = new Lawn();
                
                this.occupiedPositions = new Set();
                this.trees = [1,2,3,4,5,6].map(() => {
                    const tree = new Tree(1 + Math.floor(Math.random() * 5));
                    let position;
                    do {
                        position = Math.floor(Math.random()*columns);
                    }while(this.occupiedPositions.has(position));
                    this.occupiedPositions.add(position);
                    tree.position.x = position*cellWidth - offset;
                    this.mesh.add(tree);
                    return tree;
                });
                break;
            }
            case 'car' : {
                this.mesh = new Road();
                this.direction = Math.random() >= 0.5;
                
                const occupiedPositions = new Set();
                this.vehicles = [1,2,3].map(() => {
                    const colors = ['blue', 'purple', 'yellow', 'green', 'orange'];
                    const vehicle = new Car(colors[Math.floor(Math.random()*colors.length)]);
                    let position;
                    do {
                        position = Math.floor(Math.random()*columns);
                    }while(occupiedPositions.has(position) || occupiedPositions.has(this.direction? position - 1: position + 1));
                    occupiedPositions.add(position);
                    occupiedPositions.add(this.direction? position - 1: position + 1);
                    vehicle.position.x = position*cellWidth - offset;
                    if (this.direction)
                        vehicle.rotation.y += Math.PI;
                    this.mesh.add(vehicle);
                    return vehicle;
                });

                this.speed = laneSpeeds[Math.floor(Math.random()*laneSpeeds.length)];
                break;
            }
            case 'truck' : {
                this.mesh = new Road();
                this.direction = Math.random() >= 0.5;

                const occupiedPositions = new Set();
                this.vehicles = [1,2].map(() => {
                    const colors = ['cyan', 'magenta', 'beige'];
                    const vehicle = new Truck(colors[Math.floor(Math.random()*colors.length)]);
                    let position;
                    do {
                        position = Math.floor(Math.random()*columns);
                    }while(occupiedPositions.has(position) || occupiedPositions.has(this.direction? position - 1: position + 1) || occupiedPositions.has(this.direction? position - 2: position + 2));
                    occupiedPositions.add(position);
                    occupiedPositions.add(this.direction? position - 1: position + 1);
                    occupiedPositions.add(this.direction? position - 2: position + 2);
                    vehicle.position.x = position*cellWidth - offset;
                    if (this.direction)
                        vehicle.rotation.y += Math.PI;
                    this.mesh.add(vehicle);
                    return vehicle;
                });

                this.speed = laneSpeeds[Math.floor(Math.random()*laneSpeeds.length)];
                break;
            }
            case 'river' : {
                this.mesh = new River();
                this.direction = Math.random() >= 0.5;
                //makes sure logs in adjacent lanes move in opposite direction
                if (lanes && lanes[this.index - 1].type == 'river')
                        this.direction = !(lanes[this.index - 1].direction);
                
                const occupiedPositions = new Set();
                this.logs = [1,2,3].map(() => {
                    const log = new Log();
                    let position;
                    do {
                        position = Math.floor(Math.random()*columns);
                    }while(occupiedPositions.has(position) || occupiedPositions.has(this.direction? position - 1: position + 1));
                    occupiedPositions.add(position);
                    occupiedPositions.add(this.direction? position - 1: position + 1);
                    log.position.x = position*cellWidth - offset;
                    if (this.direction)
                        log.rotation.y += Math.PI;
                    this.mesh.add(log);
                    return log;
                });

                this.speed = logSpeeds[Math.floor(Math.random()*logSpeeds.length)];
                break;
            }
            case 'rail' : {
                this.mesh = new Rail();
                this.direction = Math.random() >= 0.5;
                this.speed = 20 + Math.random() * 10;
                let duration = 8 + Math.random() * 7;
                let distance = this.speed * duration;
                let startPos = Math.random() * distance/2;
                
                let train = new ChewChewTrain(2 + Math.floor(Math.random() * 7));
                this.train = train.model;
                this.trainLength = train.length;
                if (this.direction){
                    this.train.rotation.y += Math.PI;
                    this.train.position.x = -offset - cellWidth - startPos;
                    this.initialPosition = this.train.position.x;
                    this.finalPosition = this.initialPosition + distance;
                } else{
                    this.train.position.x = offset + cellWidth + startPos;
                    this.initialPosition = this.train.position.x;
                    this.finalPosition = this.initialPosition - distance;
                }
                this.mesh.add(this.train);
                break;
            }
        }
    }
}

//audio
class Sound{
    constructor(listenerParent){
        let loadManager = new THREE.LoadingManager(() =>{
            //init();
            document.getElementById("loading").style.opacity = "0";
            document.getElementById("play").style.opacity = "1";
            document.getElementById("pressPlay").disabled = false;
        });
        let listener = new THREE.AudioListener();
        listenerParent.add(listener);
        let audioLoader = new THREE.AudioLoader(loadManager);
        this.buck = new THREE.Audio(listener);
        audioLoader.load( 'assets/audio/buck.wav', buffer =>{
            this.buck.setBuffer( buffer );
            this.buck.setLoop( false );
            this.buck.setVolume( 0.5 );
        });
        this.themeSong = new THREE.Audio(listener);
        audioLoader.load( 'assets/audio/katamari.mp3', buffer =>{
            this.themeSong.setBuffer( buffer );
            this.themeSong.setLoop( true );
            this.themeSong.setVolume( 0.25 );
            this.themeSong.play();
        });
        this.death = new THREE.Audio(listener);
        audioLoader.load( 'assets/audio/death.wav', buffer =>{
            this.death.setBuffer( buffer );
            this.death.setLoop( false );
            this.death.setVolume( 0.5 );
        });
        this.death2 = new THREE.Audio(listener);
        audioLoader.load( 'assets/audio/death2.wav', buffer =>{
            this.death2.setBuffer( buffer );
            this.death2.setLoop( false );
            this.death2.setVolume( 0.5 );
        });
        this.hit = new THREE.Audio(listener);
        audioLoader.load( 'assets/audio/hit.mp3', buffer =>{
            this.hit.setBuffer( buffer );
            this.hit.setLoop( false );
            this.hit.setVolume( 0.5 );
            this.hit.onEnded = () =>{
                this.hit.isPlaying = false;
                this.death.play();
            };
        });
        this.shred = new THREE.Audio(listener);
        audioLoader.load( 'assets/audio/shred.mp3', buffer =>{
            this.shred.setBuffer( buffer );
            this.shred.setLoop( false );
            this.shred.setVolume( 0.25 );
            // this.shred.onEnded = () =>{
            //     this.shred.isPlaying = false;
            //     this.death2.play();
            // };
        });
        this.splash = new THREE.Audio(listener);
        audioLoader.load( 'assets/audio/splash.mp3', buffer =>{
            this.splash.setBuffer( buffer );
            this.splash.setLoop( false );
            this.splash.setVolume( 0.5 );
        });
    }
}

//game loop
const update = () =>{
    stats.begin();
    deltaTime = clock.getDelta();
    
    if(chicken){
        //animations
        if (chicken.jumpAnimation && chicken.jumpAnimation.mixer)
            chicken.jumpAnimation.mixer.update(chicken.jumpAnimation.clock.getDelta());
        if (chicken.sizeAnimation && chicken.sizeAnimation.mixer && !gameOver)
            chicken.sizeAnimation.mixer.update(chicken.sizeAnimation.clock.getDelta());
        if (chicken.heightAnimation && chicken.heightAnimation.mixer)
            chicken.heightAnimation.mixer.update(chicken.heightAnimation.clock.getDelta());
        if (chicken.fallAnimation && chicken.fallAnimation.mixer)
            chicken.fallAnimation.mixer.update(chicken.fallAnimation.clock.getDelta());
        chicken.feathers.animations.forEach((animation, index) =>{
            if(animation && animation.mixer){
                animation.mixer.update(animation.clock.getDelta());
                if (animation.mixer.time > animation.firstInterval)
                    chicken.feathers.feathers[index].rotation.x += animation.rotationSpeed * deltaTime;
            }
        });
        chicken.splashes.animations.forEach(animation =>{
            if(animation && animation.mixer)
                animation.mixer.update(animation.clock.getDelta());
        });

        //makes camera follow player
        camera.position.x = chicken.model.position.x + cameraOffsetX;
        camera.position.z = chicken.model.position.z + cameraOffsetZ;
    }

    if(lanes){
        //moves vehicles and logs in field of view and checks collision with chicken
        lanes.filter(lane => lane.index >= chicken.getLane() - 9 && lane.index <= chicken.getLane() + 9).forEach(lane => {
            if (lane.type == 'car'){
                const leftPos = -columns/2 * cellWidth + cellWidth/2 - 2 * cellWidth;
                const rightPos = -leftPos;
                lane.vehicles.forEach(car => {
                    if(lane.direction) {
                        car.position.x = car.position.x > rightPos? leftPos : car.position.x + lane.speed * deltaTime;
                    }else{
                        car.position.x = car.position.x < leftPos? rightPos : car.position.x - lane.speed * deltaTime;
                    }
                    const carLeftEdge = car.position.x + (lane.direction? (-cellWidth * 1.5) : (-cellWidth * 0.5));
                    const carRightEdge = car.position.x + (lane.direction? (cellWidth * 0.5) : (cellWidth * 1.5));
                    const chickenLeftEdge = chicken.model.position.x - cellWidth/2 * 0.2;
                    const chickenRightEdge = chicken.model.position.x + cellWidth/2 * 0.2;
                    if(chickenRightEdge > carLeftEdge && chickenLeftEdge < carRightEdge && chicken.getLane() == lane.index){
                        if (!gameOver){
                            chicken.squish();
                            gameSounds.themeSong.setVolume(0);
                            gameSounds.hit.play();
                            gameOver = true;
                            setTimeout(() => {
                                document.getElementById("restart").style.visibility = "visible";
                                // if (confirm("Game Over.\nRestart?"))
                                //     init();
                            }, 2000);
                        }
                    }
                });
            }
            else if (lane.type == 'truck'){
                const leftPos = -columns/2 * cellWidth + cellWidth/2 - 3 * cellWidth;
                const rightPos = -leftPos;
                lane.vehicles.forEach(truck => {
                    if(lane.direction) {
                        truck.position.x = truck.position.x > rightPos? leftPos : truck.position.x + lane.speed * deltaTime;
                    }else{
                        truck.position.x = truck.position.x < leftPos? rightPos : truck.position.x - lane.speed * deltaTime;
                    }
                    const truckLeftEdge = truck.position.x + (lane.direction? (-cellWidth * 2.5) : (-cellWidth * 0.5));
                    const truckRightEdge = truck.position.x + (lane.direction? (cellWidth * 0.5) : (cellWidth * 2.5));
                    const chickenLeftEdge = chicken.model.position.x - cellWidth/2 * 0.2;
                    const chickenRightEdge = chicken.model.position.x + cellWidth/2 * 0.2;
                    if(chickenRightEdge > truckLeftEdge && chickenLeftEdge < truckRightEdge && chicken.getLane() == lane.index){
                        if (!gameOver){
                            chicken.squish();
                            gameSounds.themeSong.setVolume(0);
                            gameSounds.hit.play();
                            gameOver = true;
                            setTimeout(() => {
                                document.getElementById("restart").style.visibility = "visible";
                                // if (confirm("Game Over.\nRestart?"))
                                //     init();
                            }, 3000);
                        }
                    }
                });
            }
            else if (lane.type == 'river'){
                const leftPos = -columns/2 * cellWidth + cellWidth/2 - 2 * cellWidth;
                const rightPos = -leftPos;
                let logsBelowChicken = 0;
                lane.logs.forEach(log => {
                    if(lane.direction) {
                        log.position.x = log.position.x > rightPos? leftPos : log.position.x + lane.speed * deltaTime;
                    }else{
                        log.position.x = log.position.x < leftPos? rightPos : log.position.x - lane.speed * deltaTime;
                    }
                    const logLeftEdge = log.position.x + (lane.direction? (-cellWidth * 1.5) : (-cellWidth * 0.5));
                    const logRightEdge = log.position.x + (lane.direction? (cellWidth * 0.5) : (cellWidth * 1.5));
                    const chickenLeftEdge = chicken.model.position.x - cellWidth/2 * 0.2;
                    const chickenRightEdge = chicken.model.position.x + cellWidth/2 * 0.2;
                    const farLeft = -columns/2 * cellWidth;
                    const farRight = columns/2 * cellWidth;
                    if(chickenRightEdge > logLeftEdge && chickenLeftEdge < logRightEdge && chicken.getLane() == lane.index && chicken.isMoving == false && !gameOver){
                        logsBelowChicken++;
                        chicken.currentColumn = Math.floor((chicken.model.position.x + columns/2 * cellWidth)/cellWidth);
                        if (chicken.currentColumn >= columns)
                            chicken.currentColumn = columns - 1;
                        if (chicken.currentColumn < 0)
                            chicken.currentColumn = 0;
                        if (chickenRightEdge < farRight && chickenLeftEdge > farLeft)
                            chicken.model.position.x += lane.direction? lane.speed * deltaTime : -lane.speed * deltaTime;
                    }
                });
                if(logsBelowChicken == 0 && chicken.getLane() == lane.index && chicken.isMoving == false){
                    if (!gameOver){
                        chicken.fall();
                        gameOver = true;
                        setTimeout(() => {
                            document.getElementById("restart").style.visibility = "visible";
                            // if (confirm("Game Over.\nRestart?"))
                            //     init();
                        }, 2000);
                    }
                }
            }
            else if (lane.type == 'rail'){
                if(lane.direction){
                    lane.train.position.x = ((lane.train.position.x > lane.finalPosition)? lane.initialPosition : (lane.train.position.x + lane.speed * deltaTime));
                } else{
                    lane.train.position.x = ((lane.train.position.x < lane.finalPosition)? lane.initialPosition : (lane.train.position.x - lane.speed * deltaTime));
                }
                const trainLength = 4 * cellWidth * lane.trainLength;
                const trainLeftEdge = lane.train.position.x + (lane.direction? -(trainLength - cellWidth * 0.5) : -(cellWidth * 0.5));
                const trainRightEdge = lane.train.position.x + (lane.direction? (cellWidth * 0.5) : (trainLength - cellWidth * 0.5));
                const chickenLeftEdge = chicken.model.position.x - cellWidth/2 * 0.2;
                const chickenRightEdge = chicken.model.position.x + cellWidth/2 * 0.2;
                if(chickenRightEdge > trainLeftEdge && chickenLeftEdge < trainRightEdge && chicken.getLane() == lane.index){
                    if (!gameOver){
                        chicken.shred();
                        chicken.model.visible = false;
                        gameSounds.themeSong.setVolume(0);
                        gameSounds.shred.play();
                        gameSounds.death2.play();
                        gameOver = true;
                        setTimeout(() => {
                            document.getElementById("restart").style.visibility = "visible";
                            // if (confirm("Game Over.\nRestart?"))
                            //     init();
                        }, 5000);
                    }
                }
            }
        });
    }
    
    render();
    stats.end();
    requestAnimationFrame(update);
}

//resize
const onPageResize = () =>{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onPageResize, false);

//render
const render = () =>{
    if (scene)
        renderer.render(scene, camera);
}

//controls
//arrow keys(computer)
const onKeyDown = event => {
    switch (event.keyCode) {
        case 37:
            if (chicken)
                chicken.jump("left");
            break;
        case 38:
            if (chicken)
                chicken.jump("up");
            break;
        case 39:
            if (chicken)
                chicken.jump("right");
            break;
        case 40:
            if (chicken)
               chicken.jump("down");
            //splashes.animate(chicken.model.position);
            break;
        case 32:
            document.body.removeChild(document.getElementById('splash'));
            break;
    }
}
document.onkeydown = onKeyDown;
//swipe(mobile)
let xDown = null;
let yDown = null;
const getTouches = evt =>{
    return evt.touches || evt.originalEvent.touches;
}
const handleTouchStart = evt =>{
    const firstTouch = getTouches(evt)[0];
    xDown = firstTouch.clientX;
    yDown = firstTouch.clientY;
};
const handleTouchMove = evt =>{
    if (!xDown || !yDown) {
        return;
    }
    let xUp = evt.touches[0].clientX;
    let yUp = evt.touches[0].clientY;
    let xDiff = xDown - xUp;
    let yDiff = yDown - yUp;
    if (Math.abs(xDiff) > Math.abs(yDiff)) {
        if (xDiff > 0) {
            if (chicken)
                chicken.jump("left");
        } else {
            if (chicken)
                chicken.jump("right");
        }
    } else {
        if (yDiff > 0) {
            if (chicken)
                chicken.jump("up");
        } else {
            if (chicken)
                chicken.jump("down");
        }
    }
    xDown = null;
    yDown = null;
};
document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchmove', handleTouchMove, false);