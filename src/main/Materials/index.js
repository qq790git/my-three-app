import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';

// ────────────────────────────────────────────────────────────────────────────────
// DOM 引用与数据配置
// ────────────────────────────────────────────────────────────────────────────────
const panelTitle = document.getElementById('panel-title');
const panelBody = document.getElementById('panel-body');
const tabButtons = [...document.querySelectorAll('.tab-btn')];
const perfItems = {
    basic: document.getElementById('pb-basic'),
    lambert: document.getElementById('pb-lambert'),
    phong: document.getElementById('pb-phong'),
    standard: document.getElementById('pb-standard'),
    physical: document.getElementById('pb-physical')
};

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

function updateInfoPanel(type) {
    const info = materialInfo[type];
    if (!info) return;

    panelTitle.innerHTML = info.title;
    
    let paramsHtml = '';
    if (info.params && info.params.length > 0) {
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

    panelBody.innerHTML = `
        <div style="margin-bottom: 10px;">${info.tags}</div>
        <div class="desc">${info.desc}</div>
        <div class="code-block">${info.code}</div>
        ${paramsHtml}
    `;

    // 更新性能条高亮
    Object.values(perfItems).forEach(el => {
        if(el) el.classList.remove('highlight');
    });
    if (perfItems[type]) {
        perfItems[type].classList.add('highlight');
    }
}

// ────────────────────────────────────────────────────────────────────────────────
// 场景初始化
// ────────────────────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// 开启阴影
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111118);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 3, 8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// ────────────────────────────────────────────────────────────────────────────────
// 光照设置
// ────────────────────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 5, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

const pointLight = new THREE.PointLight(0xffffff, 0.5);
pointLight.position.set(-5, 3, -5);
scene.add(pointLight);

// ────────────────────────────────────────────────────────────────────────────────
// 几何体与网格
// ────────────────────────────────────────────────────────────────────────────────
// 创建一个球体、一个立方体、一个圆环结来展示材质
const geometries = [
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.BoxGeometry(1.5, 1.5, 1.5),
    new THREE.TorusKnotGeometry(0.6, 0.25, 100, 16)
];

const meshes = [];
const spacing = 2.5;

geometries.forEach((geometry, index) => {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x44aa88 }));
    mesh.position.x = (index - 1) * spacing;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    meshes.push(mesh);
});

// 添加一个地板接收阴影
const planeGeo = new THREE.PlaneGeometry(20, 20);
const planeMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
const plane = new THREE.Mesh(planeGeo, planeMat);
plane.rotation.x = -Math.PI / 2;
plane.position.y = -1.5;
plane.receiveShadow = true;
scene.add(plane);

// ────────────────────────────────────────────────────────────────────────────────
// 材质管理与 GUI
// ────────────────────────────────────────────────────────────────────────────────
let currentGui = null;
const baseColor = 0x44aa88;

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

function applyMaterial(type) {
    let mat;
    if (type === 'special') {
        // 特殊材质演示：球体用法线，立方体用深度，圆环结用法线
        meshes[0].material = materials.special_normal;
        meshes[1].material = materials.special_depth;
        meshes[2].material = materials.special_normal;
        mat = materials.special_normal; // GUI 用
    } else {
        mat = materials[type];
        meshes.forEach(mesh => mesh.material = mat);
    }
    
    updateInfoPanel(type);
    setupGUI(type, mat);
}

function setupGUI(type, material) {
    if (currentGui) {
        currentGui.destroy();
    }
    
    currentGui = new GUI({ title: '材质参数调节' });
    
    // 通用属性
    const commonFolder = currentGui.addFolder('通用属性 (Material)');
    commonFolder.add(material, 'transparent').name('transparent').onChange(v => material.needsUpdate = true);
    commonFolder.add(material, 'opacity', 0, 1).name('opacity');
    commonFolder.add(material, 'visible').name('visible');
    if (material.wireframe !== undefined) {
        commonFolder.add(material, 'wireframe').name('wireframe');
    }
    if (material.flatShading !== undefined) {
        commonFolder.add(material, 'flatShading').name('flatShading').onChange(() => material.needsUpdate = true);
    }
    
    // 颜色属性
    if (material.color) {
        const colorFolder = currentGui.addFolder('颜色 (Color)');
        const colorData = { color: material.color.getHex() };
        colorFolder.addColor(colorData, 'color').name('color').onChange(v => material.color.setHex(v));
        
        if (material.emissive) {
            const emissiveData = { emissive: material.emissive.getHex() };
            colorFolder.addColor(emissiveData, 'emissive').name('emissive').onChange(v => material.emissive.setHex(v));
            colorFolder.add(material, 'emissiveIntensity', 0, 5).name('emissiveIntensity');
        }
    }
    
    // 特定材质属性
    if (type === 'phong') {
        const specFolder = currentGui.addFolder('高光 (Phong)');
        specFolder.add(material, 'shininess', 0, 150).name('shininess');
    } else if (type === 'standard' || type === 'physical') {
        const pbrFolder = currentGui.addFolder('PBR 属性');
        pbrFolder.add(material, 'roughness', 0, 1).name('roughness');
        pbrFolder.add(material, 'metalness', 0, 1).name('metalness');
        
        if (type === 'physical') {
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
tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        tabButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const type = e.target.dataset.mat;
        applyMaterial(type);
    });
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ────────────────────────────────────────────────────────────────────────────────
// 动画循环
// ────────────────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const time = clock.getElapsedTime();
    
    // 让物体缓慢旋转
    meshes.forEach((mesh, index) => {
        mesh.rotation.x = time * 0.2 + index;
        mesh.rotation.y = time * 0.3 + index;
    });
    
    controls.update();
    renderer.render(scene, camera);
}

// 初始化
applyMaterial('basic');
animate();
