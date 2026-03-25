import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';

/**
 * Three.js 场景图 (SceneGraph) 完整演示
 * 
 * 
 * 4 个可切换场景：
 *   solar   —— 太阳系（最经典层级演示）
 *   car     —— 汽车模型（车身/轮子/车门 + 交互）
 *   group   —— Group 演示（逻辑分组 / pivot 公自转）
 *   pitfall —— 常见坑点（变换累积 / worldToLocal）
 */

// ─── DOM ──────────────────────────────────────────────────────────────────────
const panelTitle = document.getElementById('panel-title');
const panelTree = document.getElementById('panel-tree');
const panelHint = document.getElementById('panel-hint');
const tabButtons = [...document.querySelectorAll('.tab-btn')];

// ─── 渲染器 ───────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ─── 场景 & 相机 ──────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060612);

const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
);
camera.position.set(0, 28, 52);
camera.lookAt(0, 0, 0);

// ─── 轨道控制 ─────────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 4;
controls.maxDistance = 300;
controls.target.set(0, 6, 0);

// ─── 光照 ─────────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x334466, 2.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 4, 800);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(20, 30, 10);
scene.add(dirLight);

// ─── 辅助工厂 ─────────────────────────────────────────────────────────────────
function makePhong(color, emissive = 0x000000, emissiveIntensity = 0) {
    return new THREE.MeshPhongMaterial({ color, emissive, emissiveIntensity });
}

function makeOrbitRing(radius, color = 0x334455, segs = 128) {
    const pts = [];
    for (let i = 0; i <= segs; i++) {
        const t = (i / segs) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
    }
    return new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.65 })
    );
}

function ax(obj, s) {
    obj.add(new THREE.AxesHelper(s));
}

function setVisibleOnly(group) {
    allRootGroups.forEach((g) => {
        g.visible = g === group;
    });
}

function setCameraPreset(pos, target) {
    camera.position.copy(pos);
    controls.target.copy(target);
    controls.update();
}

function makeLabelSprite(text, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '24px sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 1, 1);
    return sprite;
}

// ─── 星空背景（共用） ─────────────────────────────────────────────────────────
(function buildStars() {
    const n = 3000;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) pos[i] = (Math.random() - 0.5) * 1400;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(
        new THREE.Points(
            geo,
            new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 })
        )
    );
})();

// ═══════════════════════════════════════════════════════════════════════════════
// 场景 1：太阳系
// ═══════════════════════════════════════════════════════════════════════════════
const solarGroup = new THREE.Group();
solarGroup.name = 'solarGroup';

const solarSystem = new THREE.Object3D();
solarSystem.name = 'solarSystem';
solarGroup.add(solarSystem);
ax(solarSystem, 14);

const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2, 32, 32),
    makePhong(0xffdd00, 0xff8800, 0.8)
);
sunMesh.name = 'sun';
solarSystem.add(sunMesh);
ax(sunMesh, 5);

const earthOrbit = new THREE.Object3D();
earthOrbit.name = 'earthOrbit';
earthOrbit.position.x = 15;
solarSystem.add(earthOrbit);
ax(earthOrbit, 7);

const earthMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 32, 32),
    makePhong(0x2255cc)
);
earthMesh.name = 'earth';
earthOrbit.add(earthMesh);
ax(earthMesh, 3);

const moonOrbit = new THREE.Object3D();
moonOrbit.name = 'moonOrbit';
moonOrbit.position.x = 2.5;
earthOrbit.add(moonOrbit);

const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 32, 32),
    makePhong(0xaaaaaa)
);
moonMesh.name = 'moon';
moonOrbit.add(moonMesh);
ax(moonMesh, 1.2);

const marsOrbit = new THREE.Object3D();
marsOrbit.name = 'marsOrbit';
marsOrbit.position.x = 22;
solarSystem.add(marsOrbit);

const marsMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.68, 32, 32),
    makePhong(0xcc5533)
);
marsMesh.name = 'mars';
marsOrbit.add(marsMesh);

const jupiterOrbit = new THREE.Object3D();
jupiterOrbit.name = 'jupiterOrbit';
jupiterOrbit.position.x = 31;
solarSystem.add(jupiterOrbit);

const jupiterMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 32, 32),
    makePhong(0xc8a27c)
);
jupiterMesh.name = 'jupiter';
jupiterOrbit.add(jupiterMesh);

solarSystem.add(makeOrbitRing(15, 0x224466));
solarSystem.add(makeOrbitRing(22, 0x663322));
solarSystem.add(makeOrbitRing(31, 0x665544));
earthOrbit.add(makeOrbitRing(2.5, 0x446644));

const solarSpeeds = {
    solarSystem: 0.002,
    sun: 0.004,
    earthOrbit: 0.01,
    earth: 0.05,
    moonOrbit: 0.03,
    marsOrbit: 0.008,
    jupiterOrbit: 0.004,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 场景 2：汽车模型（来自文章「真实场景：用场景图管理一辆汽车」）
// ═══════════════════════════════════════════════════════════════════════════════
const carGroup = new THREE.Group();
carGroup.name = 'carGroup';

const car = new THREE.Group();
car.name = 'car';
carGroup.add(car);

const floor = new THREE.GridHelper(60, 30, 0x333333, 0x1a1a1a);
carGroup.add(floor);

const carBody = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.8, 2),
    makePhong(0xcc3322)
);
carBody.name = 'car_body';
carBody.position.y = 0.9;
car.add(carBody);

const carRoof = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.7, 1.8),
    makePhong(0xaa2211)
);
carRoof.name = 'car_roof';
carRoof.position.set(0, 0.75, 0);
carBody.add(carRoof);

const leftDoorPivot = new THREE.Group();
leftDoorPivot.name = 'door_left_pivot';
leftDoorPivot.position.set(-1.96, 0, 0.52);
carBody.add(leftDoorPivot);

const doorLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.65, 0.85),
    makePhong(0xee4433)
);
doorLeft.name = 'door_left';
doorLeft.position.set(0, 0, -0.22);
leftDoorPivot.add(doorLeft);

const rightDoorPivot = new THREE.Group();
rightDoorPivot.name = 'door_right_pivot';
rightDoorPivot.position.set(1.96, 0, 0.52);
carBody.add(rightDoorPivot);

const doorRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.65, 0.85),
    makePhong(0xee4433)
);
doorRight.name = 'door_right';
doorRight.position.set(0, 0, -0.22);
rightDoorPivot.add(doorRight);

// 车轮按功能分组（文章原则1：按逻辑关系分组，不按位置）
const wheelsGroup = new THREE.Group();
wheelsGroup.name = 'wheels';
car.add(wheelsGroup);

const steeringGroup = new THREE.Group();
steeringGroup.name = 'steering_front';
steeringGroup.position.set(-1.5, 0.35, 0);
car.add(steeringGroup);

const wheelDefs = [
    { name: 'wheel_front_left', x: 0, z: 1.15, parent: steeringGroup },
    { name: 'wheel_front_right', x: 0, z: -1.15, parent: steeringGroup },
    { name: 'wheel_rear_left', x: 1.5, z: 1.15, parent: car },
    { name: 'wheel_rear_right', x: 1.5, z: -1.15, parent: car },
];

const wheels = [];
wheelDefs.forEach(({ name, x, z, parent }) => {
    const holder = new THREE.Group();
    holder.name = `${name}_holder`;

    if (parent === steeringGroup) {
        holder.position.set(0, 0.35, z);
        steeringGroup.add(holder);
    } else {
        holder.position.set(x, 0.35, z);
        parent.add(holder);
    }

    const w = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.35, 24),
        makePhong(0x222222, 0x111111, 0.1)
    );
    w.name = name;
    w.rotation.z = Math.PI / 2;
    holder.add(w);
    wheels.push(w);
    ax(holder, 0.8);
    wheelsGroup.add(holder);
});

console.log('[场景2] getObjectByName =>', car.getObjectByName('wheel_front_left')?.name);

const carState = {
    doorLeftOpen: false,
    doorRightOpen: false,
    speed: 0,
    steer: 0,
    autoDrive: true,
    wheelSpin: 0,
};

function syncDoors() {
    leftDoorPivot.rotation.y = carState.doorLeftOpen ? -Math.PI / 3 : 0;
    rightDoorPivot.rotation.y = carState.doorRightOpen ? Math.PI / 3 : 0;
}

function toggleDoor(side) {
    if (side === 'left') {
        carState.doorLeftOpen = !carState.doorLeftOpen;
    } else {
        carState.doorRightOpen = !carState.doorRightOpen;
    }
    syncDoors();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 场景 3：Group 演示（逻辑分组 / pivot 公自转）
// ═══════════════════════════════════════════════════════════════════════════════
const groupScene = new THREE.Group();
groupScene.name = 'groupScene';

const groupGround = new THREE.GridHelper(40, 20, 0x333333, 0x1a1a1a);
groupScene.add(groupGround);

// 逻辑分组：家具
const furniture = new THREE.Group();
furniture.name = 'furniture';
furniture.position.set(-8, 0, 0);
groupScene.add(furniture);
ax(furniture, 3);

const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.25, 2.2),
    makePhong(0x7a5230)
);
tableTop.position.y = 2.2;
furniture.add(tableTop);

[-1.7, 1.7].forEach((x) => {
    [-0.8, 0.8].forEach((z) => {
        const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 2.2, 0.18),
            makePhong(0x5c3a22)
        );
        leg.position.set(x, 1.1, z);
        furniture.add(leg);
    });
});

const lampBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.35, 0.1, 24),
    makePhong(0x666666)
);
lampBase.position.set(0, 2.38, 0);
furniture.add(lampBase);

const lampPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.8, 16),
    makePhong(0x888888)
);
lampPole.position.set(0, 2.78, 0);
furniture.add(lampPole);

const lampHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 20, 20),
    makePhong(0xffd36b, 0xffaa00, 0.35)
);
lampHead.position.set(0, 3.22, 0);
furniture.add(lampHead);

const chairLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.2, 0.9),
    makePhong(0x557799)
);
chairLeft.position.set(-2.9, 0.6, 1.8);
furniture.add(chairLeft);

const chairRight = chairLeft.clone();
chairRight.position.z = -1.8;
furniture.add(chairRight);

const furnitureLabel = makeLabelSprite('逻辑分组：家具 Group', '#7dd3fc');
furnitureLabel.position.set(0, 5.3, 0);
furniture.add(furnitureLabel);

// pivot：改变旋转中心
const pivotBase = new THREE.Group();
pivotBase.name = 'pivotBase';
pivotBase.position.set(8, 2, 0);
groupScene.add(pivotBase);
ax(pivotBase, 4);

const pivotCenter = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 20, 20),
    makePhong(0xffffff)
);
pivotBase.add(pivotCenter);

const orbitCube = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    makePhong(0x33aaff)
);
orbitCube.position.x = 4.5;
pivotBase.add(orbitCube);
ax(orbitCube, 2);

const pivotRing = makeOrbitRing(4.5, 0x2277aa, 96);
pivotBase.add(pivotRing);

const pivotLabel = makeLabelSprite('pivot：公转 + 自转', '#86efac');
pivotLabel.position.set(0, 4.8, 0);
pivotBase.add(pivotLabel);

// ═══════════════════════════════════════════════════════════════════════════════
// 场景 4：常见坑点（变换累积 / worldToLocal）
// ═══════════════════════════════════════════════════════════════════════════════
const pitfallGroup = new THREE.Group();
pitfallGroup.name = 'pitfallGroup';

const pitfallGrid = new THREE.GridHelper(50, 25, 0x333333, 0x1a1a1a);
pitfallGroup.add(pitfallGrid);

// 坑点1：父子缩放累积
const badScaleParent = new THREE.Group();
badScaleParent.name = 'badScaleParent';
badScaleParent.position.set(-10, 2, 0);
badScaleParent.scale.set(2, 2, 2);
pitfallGroup.add(badScaleParent);
ax(badScaleParent, 3);

const badScaleChild = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    makePhong(0xf97316)
);
badScaleChild.name = 'badScaleChild';
badScaleChild.position.set(2.4, 0, 0);
badScaleChild.scale.set(2, 2, 2);
badScaleParent.add(badScaleChild);

const goodScaleParent = new THREE.Group();
goodScaleParent.name = 'goodScaleParent';
goodScaleParent.position.set(-10, 2, -8);
goodScaleParent.scale.set(2, 2, 2);
pitfallGroup.add(goodScaleParent);
ax(goodScaleParent, 3);

const goodScaleChild = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    makePhong(0x22c55e)
);
goodScaleChild.name = 'goodScaleChild';
goodScaleChild.position.set(2.4, 0, 0);
goodScaleChild.scale.set(0.5, 0.5, 0.5);
goodScaleParent.add(goodScaleChild);

const badLabel = makeLabelSprite('错误：父2倍 × 子2倍 = 实际4倍', '#fbbf24');
badLabel.position.set(0, 4, 0);
badScaleParent.add(badLabel);

const goodLabel = makeLabelSprite('正确：子节点用 1 / parent.scale 抵消', '#86efac');
goodLabel.position.set(0, 4, 0);
goodScaleParent.add(goodLabel);

// 坑点2：worldToLocal
const localDemoRoot = new THREE.Group();
localDemoRoot.name = 'localDemoRoot';
localDemoRoot.position.set(12, 1, 0);
localDemoRoot.rotation.y = Math.PI / 5;
pitfallGroup.add(localDemoRoot);
ax(localDemoRoot, 3);

const localContainer = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.2, 4),
    makePhong(0x334155)
);
localContainer.position.y = -0.1;
localDemoRoot.add(localContainer);

const desiredWorldMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 16, 16),
    makePhong(0xff00ff)
);
desiredWorldMarker.position.set(16, 1, 4);
pitfallGroup.add(desiredWorldMarker);

const wrongWorldChild = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.8, 0.8),
    makePhong(0xef4444)
);
wrongWorldChild.name = 'wrongWorldChild';
wrongWorldChild.position.set(16, 1, 4);
localDemoRoot.add(wrongWorldChild);

const correctWorldChild = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.8, 0.8),
    makePhong(0x3b82f6)
);
correctWorldChild.name = 'correctWorldChild';
const worldPos = desiredWorldMarker.position.clone();
localDemoRoot.worldToLocal(worldPos);
correctWorldChild.position.copy(worldPos);
localDemoRoot.add(correctWorldChild);

const worldLabel = makeLabelSprite('紫球 = 目标世界坐标', '#f9a8d4');
worldLabel.position.set(16, 3, 4);
pitfallGroup.add(worldLabel);

const worldDemoLabel = makeLabelSprite('红：直接设 position（错） / 蓝：worldToLocal 后（对）', '#7dd3fc');
worldDemoLabel.position.set(12, 5.2, 0);
pitfallGroup.add(worldDemoLabel);

// ─── 挂入主场景 ───────────────────────────────────────────────────────────────
const allRootGroups = [solarGroup, carGroup, groupScene, pitfallGroup];
allRootGroups.forEach((group) => scene.add(group));

// ─── info panel 数据 ──────────────────────────────────────────────────────────
const panelData = {
    solar: {
        title: '太阳系 - 场景图层级',
        tree: [
            'scene',
            '└─ solarGroup',
            '   └─ solarSystem',
            '      ├─ sun',
            '      ├─ earthOrbit',
            '      │  ├─ earth',
            '      │  └─ moonOrbit',
            '      │     └─ moon',
            '      ├─ marsOrbit',
            '      │  └─ mars',
            '      └─ jupiterOrbit',
            '         └─ jupiter',
        ].join('\n'),
        hint: '父节点旋转会自动传递给子节点。只需要转轨道节点，就能得到“公转”；只需要转星体本身，就能得到“自转”。',
    },
    car: {
        title: '汽车 - 按逻辑关系分组',
        tree: [
            'scene',
            '└─ carGroup',
            '   └─ car',
            '      ├─ car_body',
            '      │  ├─ car_roof',
            '      │  ├─ door_left_pivot',
            '      │  │  └─ door_left',
            '      │  └─ door_right_pivot',
            '      │     └─ door_right',
            '      ├─ steering_front',
            '      │  ├─ wheel_front_left',
            '      │  └─ wheel_front_right',
            '      └─ rear wheels',
        ].join('\n'),
        hint: '整辆车前进/转弯只操作 car 根节点；车门只转对应 pivot；轮子按“功能”分组，而不是按“左右位置”分组。',
    },
    group: {
        title: 'Group - 逻辑分组与 pivot',
        tree: [
            'scene',
            '└─ groupScene',
            '   ├─ furniture',
            '   │  ├─ tableTop / legs / lamp / chairs',
            '   │  └─ label',
            '   └─ pivotBase',
            '      ├─ pivotCenter',
            '      ├─ orbitCube',
            '      └─ pivotRing',
        ].join('\n'),
        hint: 'Group 本身不渲染，但能提供“组织结构”和“新的旋转中心”。把物体偏移后挂到 Group 上，再转 Group，就是公转。',
    },
    pitfall: {
        title: '常见坑点 - 变换累积 / worldToLocal',
        tree: [
            'scene',
            '└─ pitfallGroup',
            '   ├─ badScaleParent -> badScaleChild',
            '   ├─ goodScaleParent -> goodScaleChild',
            '   └─ localDemoRoot',
            '      ├─ wrongWorldChild',
            '      └─ correctWorldChild',
        ].join('\n'),
        hint: '坑点1：父子缩放会相乘。坑点2：position 永远是“局部坐标”，想放到某个世界位置，要先用 worldToLocal 转换。',
    },
};

// ─── 场景状态 & GUI ──────────────────────────────────────────────────────────
const state = {
    scene: 'solar',
    showAxes: true,
    autoRotateSolar: true,
    solarSpeedScale: 1,
    autoDriveCar: true,
    carSpeed: 0.06,
    carSteer: 0.5,
    wheelSpinBoost: 1,
    furnitureSpin: 0.01,
    pivotOrbit: 0.02,
    pivotSelfSpin: 0.04,
};

function setAxesVisible(visible) {
    scene.traverse((obj) => {
        if (obj.type === 'AxesHelper') obj.visible = visible;
    });
}

function updatePanel(mode) {
    const cfg = panelData[mode];
    panelTitle.textContent = cfg.title;
    panelTree.textContent = cfg.tree;
    panelHint.textContent = cfg.hint;
}

function applyScenePreset(mode) {
    state.scene = mode;
    setVisibleOnly({
        solar: solarGroup,
        car: carGroup,
        group: groupScene,
        pitfall: pitfallGroup,
    }[mode]);

    if (mode === 'solar') {
        setCameraPreset(new THREE.Vector3(0, 28, 52), new THREE.Vector3(0, 3, 0));
    } else if (mode === 'car') {
        setCameraPreset(new THREE.Vector3(14, 9, 16), new THREE.Vector3(0, 2, 0));
    } else if (mode === 'group') {
        setCameraPreset(new THREE.Vector3(2, 12, 24), new THREE.Vector3(0, 3, 0));
    } else if (mode === 'pitfall') {
        setCameraPreset(new THREE.Vector3(8, 11, 28), new THREE.Vector3(0, 2.5, 0));
    }

    tabButtons.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.scene === mode);
    });

    updatePanel(mode);
    sceneController?.updateDisplay?.();
}

function resetCar() {
    car.position.set(0, 0, 0);
    car.rotation.set(0, 0, 0);
    steeringGroup.rotation.y = 0;
    carState.wheelSpin = 0;
    wheels.forEach((wheel) => {
        wheel.rotation.x = 0;
        wheel.rotation.z = Math.PI / 2;
    });
}

const gui = new GUI({ title: 'SceneGraph 控制面板' });

const sceneController = gui.add(state, 'scene', {
    solar: 'solar',
    car: 'car',
    group: 'group',
    pitfall: 'pitfall',
}).name('当前场景').onChange(applyScenePreset);

gui.add(state, 'showAxes').name('显示坐标轴').onChange(setAxesVisible);

const solarFolder = gui.addFolder('太阳系');
solarFolder.add(state, 'autoRotateSolar').name('自动旋转');
solarFolder.add(state, 'solarSpeedScale', 0, 3, 0.01).name('速度倍率');

const carFolder = gui.addFolder('汽车');
carFolder.add(state, 'autoDriveCar').name('自动驾驶');
carFolder.add(state, 'carSpeed', 0, 0.2, 0.001).name('移动速度');
carFolder.add(state, 'carSteer', 0, 1, 0.01).name('转向幅度');
carFolder.add(state, 'wheelSpinBoost', 0, 3, 0.01).name('轮子转速');
carFolder.add({ openLeft: () => toggleDoor('left') }, 'openLeft').name('切换左门');
carFolder.add({ openRight: () => toggleDoor('right') }, 'openRight').name('切换右门');
carFolder.add({ resetCar }, 'resetCar').name('重置汽车');

const groupFolder = gui.addFolder('Group');
groupFolder.add(state, 'furnitureSpin', 0, 0.05, 0.001).name('家具组旋转');
groupFolder.add(state, 'pivotOrbit', 0, 0.1, 0.001).name('公转速度');
groupFolder.add(state, 'pivotSelfSpin', 0, 0.1, 0.001).name('自转速度');

syncDoors();
setAxesVisible(state.showAxes);
applyScenePreset('solar');
resetCar();

// ─── 交互 ─────────────────────────────────────────────────────────────────────
tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        applyScenePreset(btn.dataset.scene);
    });
});

window.addEventListener('keydown', (e) => {
    if (e.key === '1') applyScenePreset('solar');
    if (e.key === '2') applyScenePreset('car');
    if (e.key === '3') applyScenePreset('group');
    if (e.key === '4') applyScenePreset('pitfall');
    if (e.key.toLowerCase() === 'q') toggleDoor('left');
    if (e.key.toLowerCase() === 'e') toggleDoor('right');
});

// ─── 动画 ─────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function tickSolar() {
    if (!state.autoRotateSolar) return;
    const s = state.solarSpeedScale;
    solarSystem.rotation.y += solarSpeeds.solarSystem * s;
    sunMesh.rotation.y += solarSpeeds.sun * s;
    earthOrbit.rotation.y += solarSpeeds.earthOrbit * s;
    earthMesh.rotation.y += solarSpeeds.earth * s;
    moonOrbit.rotation.y += solarSpeeds.moonOrbit * s;
    marsOrbit.rotation.y += solarSpeeds.marsOrbit * s;
    jupiterOrbit.rotation.y += solarSpeeds.jupiterOrbit * s;
}

function tickCar(dt, elapsed) {
    if (state.autoDriveCar) {
        car.position.x = Math.cos(elapsed * state.carSpeed * 3.2) * 8;
        car.position.z = Math.sin(elapsed * state.carSpeed * 3.2) * 8;
        car.rotation.y = -elapsed * state.carSpeed * 3.2 + Math.PI / 2;
        steeringGroup.rotation.y = Math.sin(elapsed * 2.2) * state.carSteer * 0.35;
        carState.wheelSpin += state.carSpeed * 10 * state.wheelSpinBoost;
    }

    wheels.forEach((wheel) => {
        wheel.rotation.x = carState.wheelSpin;
    });

    if (!state.autoDriveCar) {
        carState.wheelSpin += dt * 4 * state.wheelSpinBoost;
    }
}

function tickGroup() {
    furniture.rotation.y += state.furnitureSpin;
    pivotBase.rotation.y += state.pivotOrbit;
    orbitCube.rotation.y += state.pivotSelfSpin;
}

function animate() {
    const dt = clock.getDelta();
    const elapsed = clock.elapsedTime;

    controls.update();

    if (state.scene === 'solar') tickSolar();
    if (state.scene === 'car') tickCar(dt, elapsed);
    if (state.scene === 'group') tickGroup();

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();

// ─── 自适应 ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
