import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';

/**
 * Three.js 场景图（Scene Graph）完整演示。
 *
 * 这个文件的目标不是做一个“复杂业务项目”，而是把文章里关于场景图的核心思想，
 * 直接拆成可以观察、可以交互、可以切换的 4 个小型演示场景。
 *
 * 4 个可切换场景：
 * 1. solar   —— 太阳系：展示经典的父子层级、公转与自转。
 * 2. car     —— 汽车模型：展示“按逻辑关系分组”，而不是按空间位置分组。
 * 3. group   —— Group 演示：展示逻辑分组，以及通过 pivot 改变旋转中心。
 * 4. pitfall —— 常见坑点：展示父子变换累积、`worldToLocal()` 的实际用途。
 *
 * 理解这个文件时，可以始终记住一个核心原则：
 * “子节点的局部变换，会叠加在父节点的世界变换之上”。
 */

// ────────────────────────────────────────────────────────────────────────────────
// DOM 引用
// ────────────────────────────────────────────────────────────────────────────────
// 左侧信息面板：用于显示当前场景的标题、树形层级结构与说明文字。
const panelTitle = document.getElementById('panel-title');
const panelTree = document.getElementById('panel-tree');
const panelHint = document.getElementById('panel-hint');

// 顶部 tab 按钮：点击后会切换不同的 SceneGraph 演示场景。
const tabButtons = [...document.querySelectorAll('.tab-btn')];

// ────────────────────────────────────────────────────────────────────────────────
// 渲染器
// ────────────────────────────────────────────────────────────────────────────────
// WebGLRenderer 负责把整个 three.js 场景绘制到 canvas 上。
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ────────────────────────────────────────────────────────────────────────────────
// 主场景与相机
// ────────────────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060612);

// 这里使用透视相机，比较符合“真实观察世界”的视觉效果。
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
);
camera.position.set(0, 28, 52);
camera.lookAt(0, 0, 0);

// ────────────────────────────────────────────────────────────────────────────────
// 轨道控制器
// ────────────────────────────────────────────────────────────────────────────────
// OrbitControls 允许用户拖拽旋转、缩放观察场景。
// 对于“看层级关系”这种演示类页面，轨道控制器非常适合。
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 4;
controls.maxDistance = 300;
controls.target.set(0, 6, 0);

// ────────────────────────────────────────────────────────────────────────────────
// 光照
// ────────────────────────────────────────────────────────────────────────────────
// 环境光：给所有物体一个基础亮度，避免背光面完全漆黑。
const ambientLight = new THREE.AmbientLight(0x334466, 2.5);
scene.add(ambientLight);

// 点光源：放在原点附近，尤其适合太阳系场景，让“太阳”附近更有中心光源的感觉。
const pointLight = new THREE.PointLight(0xffffff, 4, 800);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// 平行光：为汽车、Group、坑点场景提供更稳定的受光方向。
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(20, 30, 10);
scene.add(dirLight);

// ────────────────────────────────────────────────────────────────────────────────
// 辅助工厂函数
// ────────────────────────────────────────────────────────────────────────────────

/**
 * 快速创建一个 `MeshPhongMaterial`。
 *
 * 这里统一使用 Phong 材质，是因为它支持高光与基础受光，
 * 对教学演示足够直观，而且比 `MeshStandardMaterial` 更轻量一些。
 */
function makePhong(color, emissive = 0x000000, emissiveIntensity = 0) {
    return new THREE.MeshPhongMaterial({ color, emissive, emissiveIntensity });
}

/**
 * 创建轨道线。
 *
 * 本质上是按圆周采样一圈点，再用 `THREE.Line` 连起来。
 * 它不是物理轨道，只是一个“辅助观察父子层级”的可视化提示。
 */
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

/**
 * 给某个对象挂一个坐标轴辅助器。
 *
 * 这样可以非常直观地看到：
 * - 这个节点自己的局部坐标系在哪里；
 * - 当父节点旋转后，子节点坐标系是如何一起变化的。
 */
function ax(obj, s) {
    obj.add(new THREE.AxesHelper(s));
}

/**
 * 在多个根场景组之间切换显示。
 *
 * 这个函数只让目标组可见，其余组全部隐藏。
 * 注意：这里不是切换 three.js 的 `Scene`，而是在一个主场景中切换不同根节点的可见性。
 */
function setVisibleOnly(group) {
    allRootGroups.forEach((g) => {
        g.visible = g === group;
    });
}

/**
 * 切换相机预设位置。
 *
 * 每个演示场景关注点不同，因此切换场景时也同步切换相机观察角度，
 * 这样用户进入某个场景时就能直接看到最合适的构图。
 */
function setCameraPreset(pos, target) {
    camera.position.copy(pos);
    controls.target.copy(target);
    controls.update();
}

/**
 * 创建一个文字标签 Sprite。
 *
 * 这里使用 canvas 先绘制文字，再把 canvas 作为纹理贴到 `THREE.Sprite` 上。
 * Sprite 会始终朝向相机，适合做“漂浮说明文字”。
 */
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

// ────────────────────────────────────────────────────────────────────────────────
// 共用背景：星空粒子
// ────────────────────────────────────────────────────────────────────────────────
// 用自执行函数包起来，只是为了把初始化逻辑与外部变量作用域隔开。
(function buildStars() {
    const n = 3000;
    const pos = new Float32Array(n * 3);

    // 随机生成大量散点坐标，形成宇宙背景。
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
// 这个场景是最经典的 SceneGraph 示例。
// 思路是：
// - 太阳系根节点旋转 => 所有行星轨道整体一起旋转；
// - 地球轨道节点旋转 => 地球绕太阳公转；
// - 月球轨道节点旋转 => 月球绕地球公转；
// - 行星自身旋转 => 星球自转。

const solarGroup = new THREE.Group();
solarGroup.name = 'solarGroup';

// solarSystem 是太阳系的逻辑根节点。
// 后续如果整体旋转/整体移动，只操作它即可。
const solarSystem = new THREE.Object3D();
solarSystem.name = 'solarSystem';
solarGroup.add(solarSystem);
ax(solarSystem, 14);

// 太阳本体。
const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2, 32, 32),
    makePhong(0xffdd00, 0xff8800, 0.8)
);
sunMesh.name = 'sun';
solarSystem.add(sunMesh);
ax(sunMesh, 5);

// 地球轨道节点。
// 注意：地球并不是直接把自己的 position 设在太阳远处后自己旋转，
// 而是先建立一个“轨道父节点”，让地球挂在这个父节点下面。
// 这样只要旋转 earthOrbit，地球就会围绕太阳公转。
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

// 月球轨道节点。
// 因为它挂在 earthOrbit 下面，所以月球的整体世界变换会继承地球轨道节点的变换。
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

// 火星轨道与火星。
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

// 木星轨道与木星。
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

// 轨道辅助线。
// 这些线不是层级结构必需品，但能帮助用户理解“谁绕谁转”。
solarSystem.add(makeOrbitRing(15, 0x224466));
solarSystem.add(makeOrbitRing(22, 0x663322));
solarSystem.add(makeOrbitRing(31, 0x665544));
earthOrbit.add(makeOrbitRing(2.5, 0x446644));

// 太阳系各节点转速。
// 把速度提取成数据对象，便于后续在动画函数中统一使用或放大/缩小。
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
// 场景 2：汽车模型（按逻辑关系分组）
// ═══════════════════════════════════════════════════════════════════════════════
// 这个场景重点不在“写一个高精度汽车”，而在于演示：
// 场景图分组应该围绕“业务逻辑 / 控制逻辑”，而不是只看几何位置。
//
// 比如：
// - 整辆车的移动，只操作 car 根节点；
// - 左右车门的开关，只操作对应的 pivot；
// - 前轮转向，用 steeringGroup 控制；
// - 车轮自转，则操作轮子自身。

const carGroup = new THREE.Group();
carGroup.name = 'carGroup';

// car 是汽车的总根节点。
const car = new THREE.Group();
car.name = 'car';
carGroup.add(car);

// 网格地面，帮助观察车的移动轨迹与朝向。
const floor = new THREE.GridHelper(60, 30, 0x333333, 0x1a1a1a);
carGroup.add(floor);

// 车身主体。
const carBody = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.8, 2),
    makePhong(0xcc3322)
);
carBody.name = 'car_body';
carBody.position.y = 0.9;
car.add(carBody);

// 车顶挂在车身上，跟随车身一起移动、旋转。
const carRoof = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.7, 1.8),
    makePhong(0xaa2211)
);
carRoof.name = 'car_roof';
carRoof.position.set(0, 0.75, 0);
carBody.add(carRoof);

// 左门旋转轴（pivot）。
// 门本体并不直接围绕自身中心旋转，而是挂在一个位于门轴位置的 Group 上。
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

// 右门旋转轴（pivot）。
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

// 车轮按“功能”分组，而不是按“空间位置”分组。
// 这也是文章里非常重要的一个实践原则：
// 如果前轮要一起转向，就应该抽象出一个 steeringGroup，
// 而不是仅仅根据 left/right/front/rear 去堆结构。
const wheelsGroup = new THREE.Group();
wheelsGroup.name = 'wheels';
car.add(wheelsGroup);

// 前轮转向组。
// 当前轮整体偏航时，挂在它下面的左右两个前轮都会一起改变朝向。
const steeringGroup = new THREE.Group();
steeringGroup.name = 'steering_front';
steeringGroup.position.set(-1.5, 0.35, 0);
car.add(steeringGroup);

// 每个轮子的定义数据。
// parent 字段表明该轮子应该挂到哪个父节点下。
const wheelDefs = [
    { name: 'wheel_front_left', x: 0, z: 1.15, parent: steeringGroup },
    { name: 'wheel_front_right', x: 0, z: -1.15, parent: steeringGroup },
    { name: 'wheel_rear_left', x: 1.5, z: 1.15, parent: car },
    { name: 'wheel_rear_right', x: 1.5, z: -1.15, parent: car },
];

// 保存所有轮子网格，方便动画阶段统一驱动轮子旋转。
const wheels = [];
wheelDefs.forEach(({ name, x, z, parent }) => {
    // holder 的作用是作为轮子的“局部安装点”。
    // 这样一来：
    // - holder 控制轮子在车上的位置；
    // - wheel mesh 控制自己的滚动旋转。
    const holder = new THREE.Group();
    holder.name = `${name}_holder`;

    if (parent === steeringGroup) {
        // 前轮的 x 已经由 steeringGroup 决定，所以这里只设置 z。
        holder.position.set(0, 0.35, z);
        steeringGroup.add(holder);
    } else {
        // 后轮直接以 car 为父节点。
        holder.position.set(x, 0.35, z);
        parent.add(holder);
    }

    const w = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.35, 24),
        makePhong(0x222222, 0x111111, 0.1)
    );
    w.name = name;

    // 默认 Cylinder 的轴向不符合汽车轮胎方向，
    // 因此先绕 z 轴旋转 90°，让它“躺下来”。
    w.rotation.z = Math.PI / 2;
    holder.add(w);
    wheels.push(w);

    ax(holder, 0.8);

    // 注意：这里把 holder 也加入 wheelsGroup，
    // 主要是为了让“所有车轮节点”有一个逻辑总入口，方便理解和扩展。
    wheelsGroup.add(holder);
});

// 调试输出：验证通过名称是否能正确找到节点。
console.log('[场景2] getObjectByName =>', car.getObjectByName('wheel_front_left')?.name);

// 汽车相关状态。
// 这些数据一部分由 GUI 控制，一部分在动画循环里被实时更新。
const carState = {
    doorLeftOpen: false,
    doorRightOpen: false,
    speed: 0,
    steer: 0,
    autoDrive: true,
    wheelSpin: 0,
};

/**
 * 根据当前状态同步两侧车门的开合角度。
 *
 * 这里只转 pivot，不直接转门网格本体。
 * 这样才能保证门是围绕铰链位置打开，而不是围绕自身中心打转。
 */
function syncDoors() {
    leftDoorPivot.rotation.y = carState.doorLeftOpen ? -Math.PI / 3 : 0;
    rightDoorPivot.rotation.y = carState.doorRightOpen ? Math.PI / 3 : 0;
}

/**
 * 切换指定车门的开合状态。
 */
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
// 这个场景拆成两个部分：
// 1. furniture：演示 Group 的“逻辑分组”作用；
// 2. pivotBase：演示 Group 的“旋转中心”作用。

const groupScene = new THREE.Group();
groupScene.name = 'groupScene';

const groupGround = new THREE.GridHelper(40, 20, 0x333333, 0x1a1a1a);
groupScene.add(groupGround);

// 逻辑分组：家具。
// 桌子、灯、椅子实际上是多个网格，但在业务语义上它们构成一个“家具组合”。
// 所以后续如果想整体转动、平移、隐藏这套家具，只要操作 furniture 即可。
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

// 用双层循环创建 4 条桌腿。
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

// clone 可以快速复制相同结构的网格，适合这种重复物体。
const chairRight = chairLeft.clone();
chairRight.position.z = -1.8;
furniture.add(chairRight);

const furnitureLabel = makeLabelSprite('逻辑分组：家具 Group', '#7dd3fc');
furnitureLabel.position.set(0, 5.3, 0);
furniture.add(furnitureLabel);

// pivot：改变旋转中心。
// 这是 Group 最重要的用途之一。
// 只要把某个物体放在离 Group 原点一定距离的位置，再旋转 Group，
// 这个物体就会围绕 Group 原点“公转”。
const pivotBase = new THREE.Group();
pivotBase.name = 'pivotBase';
pivotBase.position.set(8, 2, 0);
groupScene.add(pivotBase);
ax(pivotBase, 4);

// 中心点小球，用来显示公转中心位置。
const pivotCenter = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 20, 20),
    makePhong(0xffffff)
);
pivotBase.add(pivotCenter);

// 把立方体偏移到 pivot 原点右侧。
// 这样后续旋转 pivotBase 时，它会绕中心公转。
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
// 这个场景专门演示两个非常常见、但又非常容易踩坑的问题：
// 1. 父子缩放会累积；
// 2. 子节点的 position 是局部坐标，不是世界坐标。

const pitfallGroup = new THREE.Group();
pitfallGroup.name = 'pitfallGroup';

const pitfallGrid = new THREE.GridHelper(50, 25, 0x333333, 0x1a1a1a);
pitfallGroup.add(pitfallGrid);

// 坑点 1：父子缩放累积。
// badScaleParent 已经放大 2 倍，如果 child 再放大 2 倍，
// 最终世界空间里看到的效果其实会接近 4 倍。
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

// goodScaleParent 同样放大 2 倍，
// 但 child 刻意缩小到 0.5 倍，等于用子节点抵消父节点缩放。
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

// 坑点 2：worldToLocal。
// localDemoRoot 自己有位置和旋转。
// 如果你把“世界坐标”直接赋值给它的子节点 position，结果通常不会正确。
// 因为 child.position 表示的是“相对于 localDemoRoot 的局部坐标”。
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

// 紫色球表示“我们想让子物体最终出现在这里”。
// 这个位置是世界空间中的目标点。
const desiredWorldMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 16, 16),
    makePhong(0xff00ff)
);
desiredWorldMarker.position.set(16, 1, 4);
pitfallGroup.add(desiredWorldMarker);

// 错误示例：把世界坐标直接当成局部坐标使用。
const wrongWorldChild = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.8, 0.8),
    makePhong(0xef4444)
);
wrongWorldChild.name = 'wrongWorldChild';
wrongWorldChild.position.set(16, 1, 4);
localDemoRoot.add(wrongWorldChild);

// 正确示例：
// 先复制目标世界坐标，再调用 `worldToLocal()` 把它转换成 localDemoRoot 的局部坐标，
// 最后把这个局部坐标赋值给子节点 position。
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

// ────────────────────────────────────────────────────────────────────────────────
// 把 4 个演示根节点统一挂到主场景中
// ────────────────────────────────────────────────────────────────────────────────
// 之后切换场景时，只需要控制这些根节点的 visible 即可。
const allRootGroups = [solarGroup, carGroup, groupScene, pitfallGroup];
allRootGroups.forEach((group) => scene.add(group));

// ────────────────────────────────────────────────────────────────────────────────
// 左侧 info-panel 的文案数据
// ────────────────────────────────────────────────────────────────────────────────
// 这里用纯数据对象来描述每个场景的标题、树结构和提示语，
// 避免把 UI 文案散落在逻辑代码各处，后续维护会更清晰。
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

// ────────────────────────────────────────────────────────────────────────────────
// 场景状态 & GUI
// ────────────────────────────────────────────────────────────────────────────────
// state 保存的是“页面级演示状态”，与前面的各个场景对象共同组成可交互系统。
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

/**
 * 统一控制所有坐标轴辅助器的显示与隐藏。
 *
 * 这里通过遍历整个场景，筛选 `AxesHelper` 类型对象来开关显示。
 */
function setAxesVisible(visible) {
    scene.traverse((obj) => {
        if (obj.type === 'AxesHelper') obj.visible = visible;
    });
}

/**
 * 更新左侧说明面板内容。
 */
function updatePanel(mode) {
    const cfg = panelData[mode];
    panelTitle.textContent = cfg.title;
    panelTree.textContent = cfg.tree;
    panelHint.textContent = cfg.hint;
}

/**
 * 应用场景预设。
 *
 * 它会同时完成几件事情：
 * 1. 更新当前场景状态；
 * 2. 切换可见根节点；
 * 3. 切换相机预设；
 * 4. 同步顶部 tab 激活态；
 * 5. 更新左侧 info-panel；
 * 6. 刷新 GUI 里“当前场景”的显示值。
 */
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

    // 如果当前场景是通过顶部 tab 或快捷键切换的，
    // 这里要手动刷新 GUI 控件显示，保证 GUI 与页面状态同步。
    sceneController?.updateDisplay?.();
}

/**
 * 重置汽车状态。
 *
 * 这里主要恢复：
 * - 汽车位置
 * - 汽车朝向
 * - 前轮转向
 * - 轮子转动角度
 */
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

// GUI 控制面板。
const gui = new GUI({ title: 'SceneGraph 控制面板' });

// 保存 sceneController 引用，后面切换 tab 时需要主动 updateDisplay。
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

// 初始化默认状态。
syncDoors();
setAxesVisible(state.showAxes);
applyScenePreset('solar');
resetCar();

// ────────────────────────────────────────────────────────────────────────────────
// 交互事件
// ────────────────────────────────────────────────────────────────────────────────
// 顶部 tab 点击切换场景。
tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        applyScenePreset(btn.dataset.scene);
    });
});

// 键盘快捷键：
// 1~4 切换场景，Q/E 切换左右车门。
window.addEventListener('keydown', (e) => {
    if (e.key === '1') applyScenePreset('solar');
    if (e.key === '2') applyScenePreset('car');
    if (e.key === '3') applyScenePreset('group');
    if (e.key === '4') applyScenePreset('pitfall');
    if (e.key.toLowerCase() === 'q') toggleDoor('left');
    if (e.key.toLowerCase() === 'e') toggleDoor('right');
});

// ────────────────────────────────────────────────────────────────────────────────
// 动画循环
// ────────────────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

/**
 * 更新太阳系场景动画。
 *
 * 这里通过分别旋转：
 * - solarSystem
 * - sunMesh
 * - earthOrbit
 * - earthMesh
 * - moonOrbit
 * 等节点
 * 来演示“父转带子转、子可独立再转”的叠加效果。
 */
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

/**
 * 更新汽车场景动画。
 *
 * 自动驾驶模式下：
 * - car 根节点沿圆周路径移动；
 * - car 根节点朝向运动切线方向；
 * - steeringGroup 左右摆动，模拟转向；
 * - wheels 根据速度持续自转。
 *
 * 手动模式下：
 * - 汽车不再自动跑圈；
 * - 仍然给轮子一个基础旋转速度，方便观察效果。
 */
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

/**
 * 更新 Group / pivot 演示动画。
 *
 * - furniture.rotation.y：展示“逻辑分组整体旋转”；
 * - pivotBase.rotation.y：展示围绕 pivot 中心公转；
 * - orbitCube.rotation.y：展示物体自身再叠加自转。
 */
function tickGroup() {
    furniture.rotation.y += state.furnitureSpin;
    pivotBase.rotation.y += state.pivotOrbit;
    orbitCube.rotation.y += state.pivotSelfSpin;
}

/**
 * 主动画循环。
 *
 * 这里采用“按当前场景只更新相关动画”的策略，
 * 让每个演示场景的逻辑更清晰，也避免无意义更新。
 */
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

// ────────────────────────────────────────────────────────────────────────────────
// 自适应：窗口大小变化时同步更新渲染器与相机
// ────────────────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
