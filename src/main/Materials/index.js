// 引入 Three.js 核心库，提供场景、相机、几何体、材质、渲染器等 3D 能力。
import * as THREE from 'three';
// 引入轨道控制器，用于通过鼠标拖拽、缩放、旋转来观察场景。
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// 引入轻量级调试面板库，用来实时调节材质参数。
import GUI from 'lil-gui';

// ────────────────────────────────────────────────────────────────────────────────
// DOM 引用与数据配置
// ────────────────────────────────────────────────────────────────────────────────
// 面板标题区域：用于显示当前材质的名称。
const panelTitle = document.getElementById('panel-title');
// 面板内容区域：用于显示材质描述、示例代码和参数说明。
const panelBody = document.getElementById('panel-body');
// 页面上所有材质切换按钮，转换成数组后方便统一绑定事件。
const tabButtons = [...document.querySelectorAll('.tab-btn')];

// 性能对比区域中的 DOM 引用。
// key 与材质类型保持一致，后续切换材质时可直接通过类型高亮对应性能条目。
const perfItems = {
    basic: document.getElementById('pb-basic'),
    lambert: document.getElementById('pb-lambert'),
    phong: document.getElementById('pb-phong'),
    standard: document.getElementById('pb-standard'),
    physical: document.getElementById('pb-physical')
};

// 不同材质的说明数据。
// 这个对象相当于“材质知识库”，驱动右侧信息面板的文案展示。
const materialInfo = {
    basic: {
        title: 'MeshBasicMaterial (基础材质)',
        tags: '<span class="tag tag-perf-fast">性能最快</span><span class="tag tag-no-light">不受光照影响</span>',
        desc: '最简单的材质，物体始终以纯色显示，不管场景中有没有灯光。适合用于不需要光影效果的场景，比如 UI 元素、线框展示。',
        code: `const material = new THREE.MeshBasicMaterial({
  color: 0x44aa88
});`,
        params: [
            { name: 'color', desc: '材质的基本颜色' },
            { name: 'wireframe', desc: '是否渲染为线框' }
        ]
    },
    lambert: {
        title: 'MeshLambertMaterial (Lambert材质)',
        tags: '<span class="tag tag-perf-fast">性能较快</span><span class="tag tag-light">顶点光照</span>',
        desc: '使用 Lambertian 反射模型，只在几何体的顶点处计算光照，然后在三角面内做插值。能表现出基本的明暗效果，但不支持高光。',
        code: `const material = new THREE.MeshLambertMaterial({
  color: 0x44aa88,
  emissive: 0x000000
});`,
        params: [
            { name: 'color', desc: '材质的基本颜色' },
            { name: 'emissive', desc: '自发光颜色，不受光照影响' }
        ]
    },
    phong: {
        title: 'MeshPhongMaterial (Phong材质)',
        tags: '<span class="tag tag-perf-medium">性能中等</span><span class="tag tag-light">像素光照</span>',
        desc: '在每个像素上都计算光照，因此能产生平滑的光照过渡和镜面高光（specular highlight）效果。',
        code: `const material = new THREE.MeshPhongMaterial({
  color: 0x44aa88,
  shininess: 30
});`,
        params: [
            { name: 'color', desc: '材质的基本颜色' },
            { name: 'shininess', desc: '高光强度，默认 30' },
            { name: 'emissive', desc: '自发光颜色' }
        ]
    },
    toon: {
        title: 'MeshToonMaterial (卡通材质)',
        tags: '<span class="tag tag-perf-medium">性能中等</span><span class="tag tag-light">色阶着色</span>',
        desc: '类似 Phong，但使用渐变贴图实现卡通风格的色阶着色。不会平滑过渡光影，而是将光照分成几个离散的色阶。',
        code: `const material = new THREE.MeshToonMaterial({
  color: 0x44aa88
});`,
        params: [
            { name: 'color', desc: '材质的基本颜色' }
        ]
    },
    standard: {
        title: 'MeshStandardMaterial (标准PBR材质)',
        tags: '<span class="tag tag-perf-slow">性能较慢</span><span class="tag tag-light">PBR物理渲染</span>',
        desc: 'Three.js 中最常用的高质量材质。基于物理的光照模型，能更真实地模拟现实世界中光线与材质的交互。',
        code: `const material = new THREE.MeshStandardMaterial({
  color: 0x44aa88,
  roughness: 0.5,
  metalness: 0.5
});`,
        params: [
            { name: 'color', desc: '材质的基本颜色' },
            { name: 'roughness', desc: '粗糙度 (0~1)，0=光滑，1=粗糙' },
            { name: 'metalness', desc: '金属度 (0~1)，0=非金属，1=纯金属' }
        ]
    },
    physical: {
        title: 'MeshPhysicalMaterial (物理材质)',
        tags: '<span class="tag tag-perf-slow">性能最慢</span><span class="tag tag-light">PBR增强版</span>',
        desc: '标准材质的增强版，额外提供了清漆（clearcoat）等参数，可以模拟汽车漆面、贴膜表面等具有多层反射的材质。',
        code: `const material = new THREE.MeshPhysicalMaterial({
  color: 0x44aa88,
  roughness: 0.5,
  metalness: 0.5,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1
});`,
        params: [
            { name: 'color', desc: '材质的基本颜色' },
            { name: 'roughness', desc: '粗糙度 (0~1)' },
            { name: 'metalness', desc: '金属度 (0~1)' },
            { name: 'clearcoat', desc: '清漆强度 (0~1)' },
            { name: 'clearcoatRoughness', desc: '清漆粗糙度 (0~1)' }
        ]
    },
    special: {
        title: '特殊用途材质',
        tags: '<span class="tag tag-perf-medium">特殊用途</span>',
        desc: 'Three.js 提供了一些特殊用途的材质，用于特定的渲染需求。',
        code: `// 深度材质
new THREE.MeshDepthMaterial();
// 法线材质
new THREE.MeshNormalMaterial();`,
        params: [
            { name: 'MeshDepthMaterial', desc: '根据像素到相机的距离渲染灰度图' },
            { name: 'MeshNormalMaterial', desc: '用法线方向映射为颜色来渲染表面' }
        ]
    }
};

/**
 * 根据材质类型更新右侧说明面板。
 *
 * 这里做了三件事：
 * 1. 读取当前材质的文案配置；
 * 2. 生成参数说明 HTML；
 * 3. 同步更新性能对比区的高亮状态。
 *
 * @param {string} type 当前选中的材质类型，如 basic / phong / standard。
 */
function updateInfoPanel(type) {
    // 从材质说明表中取出对应配置。
    const info = materialInfo[type];

    // 如果传入了未知类型，直接终止，避免后续访问空对象报错。
    if (!info) return;

    // 更新面板标题。
    panelTitle.innerHTML = info.title;

    // 默认情况下参数区为空；只有当该材质声明了 params 时才渲染。
    let paramsHtml = '';
    if (info.params && info.params.length > 0) {
        // 通过 map 生成每一行参数说明，再拼成完整 HTML 字符串。
        paramsHtml = `
            <div class="panel-subtitle">关键参数</div>
            ${info.params.map(p => `
                <div class="param-row">
                    <span class="param-name">${p.name}</span>
                    <span class="param-desc">${p.desc}</span>
                </div>
            `).join('')}
        `;
    }

    // 将标签、描述、代码片段和参数区整体写入说明面板。
    panelBody.innerHTML = `
        <div style="margin-bottom: 10px;">${info.tags}</div>
        <div class="desc">${info.desc}</div>
        <div class="code-block">${info.code}</div>
        ${paramsHtml}
    `;

    // 更新性能条高亮：先移除全部高亮，再为当前类型添加高亮。
    Object.values(perfItems).forEach(el => {
        if (el) el.classList.remove('highlight');
    });

    if (perfItems[type]) {
        perfItems[type].classList.add('highlight');
    }
}

// ────────────────────────────────────────────────────────────────────────────────
// 场景初始化
// ────────────────────────────────────────────────────────────────────────────────
// 创建 WebGL 渲染器，并开启抗锯齿，让边缘显示更平滑。
const renderer = new THREE.WebGLRenderer({ antialias: true });
// 让画布尺寸与窗口同步。
renderer.setSize(window.innerWidth, window.innerHeight);
// 限制像素比，避免在高分屏设备上渲染成本过高。
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// 开启阴影计算，使方向光投射的阴影能够显示出来。
renderer.shadowMap.enabled = true;
// 使用较柔和的阴影算法，让边缘过渡更自然。
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// 将 Three.js 生成的 canvas 插入页面。
document.body.appendChild(renderer.domElement);

// 创建场景，所有 3D 对象、灯光都要加入到这个容器中。
const scene = new THREE.Scene();
// 设置深色背景，便于观察材质明暗与高光差异。
scene.background = new THREE.Color(0x111118);

// 创建透视相机：45 度视野、宽高比跟随窗口、近裁剪面 0.1、远裁剪面 100。
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
// 将相机摆放在稍高且后退的位置，便于一次性观察全部模型。
camera.position.set(0, 3, 8);

// 绑定轨道控制器，使用户可以交互查看不同角度下的材质表现。
const controls = new OrbitControls(camera, renderer.domElement);
// 开启阻尼，让相机运动有“惯性”，交互更顺滑。
controls.enableDamping = true;
// 阻尼系数越大，停止得越快；这里取一个较柔和的值。
controls.dampingFactor = 0.05;

// ────────────────────────────────────────────────────────────────────────────────
// 光照设置
// ────────────────────────────────────────────────────────────────────────────────
// 环境光：提供最基础的整体照明，避免阴影面完全漆黑。
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

// 方向光：模拟从固定方向照射过来的主光源，如太阳光。
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
// 将主光放在场景右上前方，方便形成明显的明暗关系。
dirLight.position.set(5, 5, 5);
// 允许方向光产生阴影。
dirLight.castShadow = true;
// 提高阴影贴图分辨率，减少阴影锯齿感。
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

// 点光源：从单点向四周发散，补充另一侧光照，增加层次感。
const pointLight = new THREE.PointLight(0xffffff, 0.5);
pointLight.position.set(-5, 3, -5);
scene.add(pointLight);

// ────────────────────────────────────────────────────────────────────────────────
// 几何体与网格
// ────────────────────────────────────────────────────────────────────────────────
// 创建三种不同外形的几何体，用来观察相同材质在不同曲率和棱角上的表现：
// 1. 球体：适合观察平滑高光；
// 2. 立方体：适合观察棱角面切换；
// 3. 圆环结：表面变化更复杂，便于观察细节。
const geometries = [
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.BoxGeometry(1.5, 1.5, 1.5),
    new THREE.TorusKnotGeometry(0.6, 0.25, 100, 16)
];

// 统一保存场景中的三个网格对象，后续切换材质和播放动画时都会用到。
const meshes = [];
// 几何体之间的水平间距，避免模型互相遮挡。
const spacing = 2.5;

// 为每个几何体创建一个网格对象。
geometries.forEach((geometry, index) => {
    // 初始材质统一使用基础材质，后续会通过切换逻辑覆盖。
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x44aa88 }));
    // 根据索引将三个模型沿 x 轴均匀排开。
    mesh.position.x = (index - 1) * spacing;
    // 允许该模型向地面投射阴影。
    mesh.castShadow = true;
    // 允许该模型接收其他物体投下的阴影。
    mesh.receiveShadow = true;
    // 加入场景中进行渲染。
    scene.add(mesh);
    // 保存到数组，便于后续批量更新材质和旋转动画。
    meshes.push(mesh);
});

// 添加地面，用于承接阴影，增强空间感。
const planeGeo = new THREE.PlaneGeometry(20, 20);
// 地面使用标准材质，让其能够响应光照并表现出一定粗糙感。
const planeMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
const plane = new THREE.Mesh(planeGeo, planeMat);
// 默认平面朝向屏幕，需要绕 x 轴旋转 -90 度使其水平铺开。
plane.rotation.x = -Math.PI / 2;
// 将地面稍微下移，给上方模型留出空间。
plane.position.y = -1.5;
// 只需要接收阴影，不需要自己投影。
plane.receiveShadow = true;
scene.add(plane);

// ────────────────────────────────────────────────────────────────────────────────
// 材质管理与 GUI
// ────────────────────────────────────────────────────────────────────────────────
// 当前激活的 GUI 面板实例。
// 每次切换材质都会销毁并重建，避免控件残留。
let currentGui = null;
// 所有普通材质共用的基础颜色。
const baseColor = 0x44aa88;

// 预创建各种材质实例。
// 优点是切换时无需重复 new，逻辑更简单，也便于保留已调过的参数状态。
const materials = {
    basic: new THREE.MeshBasicMaterial({ color: baseColor }),
    lambert: new THREE.MeshLambertMaterial({ color: baseColor }),
    phong: new THREE.MeshPhongMaterial({ color: baseColor, shininess: 30 }),
    toon: new THREE.MeshToonMaterial({ color: baseColor }),
    standard: new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.5, metalness: 0.5 }),
    physical: new THREE.MeshPhysicalMaterial({
        color: baseColor,
        roughness: 0.5,
        metalness: 0.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
    }),
    special_depth: new THREE.MeshDepthMaterial(),
    special_normal: new THREE.MeshNormalMaterial()
};

/**
 * 将指定类型的材质应用到场景中的模型上。
 *
 * 普通材质：三个模型共用同一个材质实例；
 * special 材质：为了展示差异，分别给模型分配不同的特殊材质。
 *
 * @param {string} type 目标材质类型。
 */
function applyMaterial(type) {
    let mat;

    if (type === 'special') {
        // 特殊材质演示：
        // - 球体：法线材质，能直接观察表面法线方向；
        // - 立方体：深度材质，观察与相机距离形成的灰度变化；
        // - 圆环结：继续使用法线材质，突出复杂曲面的色彩变化。
        meshes[0].material = materials.special_normal;
        meshes[1].material = materials.special_depth;
        meshes[2].material = materials.special_normal;

        // GUI 需要绑定一个具体材质实例，这里选用法线材质作为代表。
        mat = materials.special_normal;
    } else {
        // 普通材质则直接取出对应实例，统一应用给全部模型。
        mat = materials[type];
        meshes.forEach(mesh => {
            mesh.material = mat;
        });
    }

    // 切换材质后，同步更新说明面板。
    updateInfoPanel(type);
    // 重新生成与当前材质匹配的 GUI 控件。
    setupGUI(type, mat);
}

/**
 * 根据当前材质动态创建调参面板。
 *
 * 不同材质支持的属性不一样，因此这里采用条件分支按需生成控件。
 *
 * @param {string} type 当前材质类型。
 * @param {THREE.Material} material 当前正在被 GUI 控制的材质实例。
 */
function setupGUI(type, material) {
    // 如果已有 GUI，先销毁，防止旧控件残留在页面上。
    if (currentGui) {
        currentGui.destroy();
    }

    // 创建新的 GUI 面板实例。
    currentGui = new GUI({ title: '材质参数调节' });

    // 通用属性：大多数材质都继承自 Material 基类，因此这些参数通常都可用。
    const commonFolder = currentGui.addFolder('通用属性 (Material)');
    // 开启/关闭透明模式时，需要通知材质重新编译 shader，所以要设置 needsUpdate。
    commonFolder.add(material, 'transparent').name('transparent').onChange(() => material.needsUpdate = true);
    // 不透明度仅在 transparent 开启时才会有明显效果。
    commonFolder.add(material, 'opacity', 0, 1).name('opacity');
    // 控制材质是否可见。
    commonFolder.add(material, 'visible').name('visible');

    // wireframe 不是所有材质都支持，因此先判断属性是否存在。
    if (material.wireframe !== undefined) {
        commonFolder.add(material, 'wireframe').name('wireframe');
    }

    // flatShading 会影响法线插值方式，切换后同样需要重建材质。
    if (material.flatShading !== undefined) {
        commonFolder.add(material, 'flatShading').name('flatShading').onChange(() => material.needsUpdate = true);
    }

    // 颜色相关属性。
    // 并不是所有材质都有 color（例如某些特殊材质），因此需要做守卫判断。
    if (material.color) {
        const colorFolder = currentGui.addFolder('颜色 (Color)');
        // lil-gui 更适合控制普通对象属性，因此这里用一个中间对象承接颜色值。
        const colorData = { color: material.color.getHex() };
        colorFolder.addColor(colorData, 'color').name('color').onChange(v => material.color.setHex(v));

        // 自发光属性常见于 Lambert / Phong / Standard / Physical 等材质。
        if (material.emissive) {
            const emissiveData = { emissive: material.emissive.getHex() };
            colorFolder.addColor(emissiveData, 'emissive').name('emissive').onChange(v => material.emissive.setHex(v));
            colorFolder.add(material, 'emissiveIntensity', 0, 5).name('emissiveIntensity');
        }
    }

    // 根据具体材质补充专属属性。
    if (type === 'phong') {
        // Phong 材质最核心的特征之一就是高光，因此开放 shininess 控制。
        const specFolder = currentGui.addFolder('高光 (Phong)');
        specFolder.add(material, 'shininess', 0, 150).name('shininess');
    } else if (type === 'standard' || type === 'physical') {
        // Standard / Physical 都属于 PBR 材质，共享 roughness 和 metalness。
        const pbrFolder = currentGui.addFolder('PBR 属性');
        pbrFolder.add(material, 'roughness', 0, 1).name('roughness');
        pbrFolder.add(material, 'metalness', 0, 1).name('metalness');

        if (type === 'physical') {
            // Physical 是 Standard 的增强版，额外支持清漆、透光、折射率等更真实的物理参数。
            const physFolder = currentGui.addFolder('物理增强 (Physical)');
            physFolder.add(material, 'clearcoat', 0, 1).name('clearcoat');
            physFolder.add(material, 'clearcoatRoughness', 0, 1).name('clearcoatRoughness');
            physFolder.add(material, 'transmission', 0, 1).name('transmission (透光)');
            physFolder.add(material, 'ior', 1, 2.33).name('ior (折射率)');
        }
    }
}

// ────────────────────────────────────────────────────────────────────────────────
// 事件监听
// ────────────────────────────────────────────────────────────────────────────────
// 为每个材质切换按钮绑定点击事件。
tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // 切换前先移除所有按钮的激活态。
        tabButtons.forEach(b => b.classList.remove('active'));
        // 给当前点击的按钮添加激活样式。
        e.target.classList.add('active');
        // 从按钮的 data-mat 属性中读取材质类型。
        const type = e.target.dataset.mat;
        // 应用对应材质并刷新面板/GUI。
        applyMaterial(type);
    });
});

// 监听窗口尺寸变化，保证相机投影矩阵和渲染器尺寸始终正确。
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ────────────────────────────────────────────────────────────────────────────────
// 动画循环
// ────────────────────────────────────────────────────────────────────────────────
// 时钟对象：用于获取从程序启动到现在的累计时间。
const clock = new THREE.Clock();

/**
 * 主动画循环。
 *
 * 使用 requestAnimationFrame 让浏览器在下一帧继续调用自身，
 * 从而形成持续渲染的实时 3D 画面。
 */
function animate() {
    requestAnimationFrame(animate);

    // 获取已经过去的总时间，单位为秒。
    const time = clock.getElapsedTime();

    // 让三个模型持续旋转。
    // 加上 index 偏移后，每个模型会有略微不同的初始朝向，视觉上更丰富。
    meshes.forEach((mesh, index) => {
        mesh.rotation.x = time * 0.2 + index;
        mesh.rotation.y = time * 0.3 + index;
    });

    // 更新带阻尼的轨道控制器。
    controls.update();
    // 用当前相机视角将场景绘制到 canvas。
    renderer.render(scene, camera);
}

// 初始化默认显示基础材质，让页面首次加载时就有完整内容。
applyMaterial('basic');
// 启动动画循环。
animate();
