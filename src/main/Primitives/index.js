import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js';
import local_font from '../../assets/font/helvetiker_bold.typeface.json';

// 场景设置
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

// 相机设置
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 120;

// 渲染器设置
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 添加光源
{
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    scene.add(light);
}
{
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(1, -2, -4);
    scene.add(light);
}

// 用于存储所有对象以便动画旋转
const objects = [];

// 网格布局参数
const spread = 15;

// 添加对象到场景的辅助函数
function addObject(x, y, obj) {
    obj.position.x = x * spread;
    obj.position.y = y * spread;
    scene.add(obj);
    objects.push(obj);
}

// 创建随机彩色材质
function createMaterial() {
    const material = new THREE.MeshPhongMaterial({
        side: THREE.DoubleSide,
    });
    
    const hue = Math.random();
    const saturation = 1;
    const luminance = .5;
    material.color.setHSL(hue, saturation, luminance);
    
    return material;
}

// 添加实心几何体
function addSolidGeometry(x, y, geometry) {
    const mesh = new THREE.Mesh(geometry, createMaterial());
    addObject(x, y, mesh);
}

// 添加线框几何体
function addLineGeometry(x, y, geometry) {
    const material = new THREE.LineBasicMaterial({ color: 0x000000 });
    const mesh = new THREE.LineSegments(geometry, material);
    addObject(x, y, mesh);
}

// 创建所有几何体
{
    // 第一行：基础几何体
    const width = 8;
    const height = 8;
    const depth = 8;
    addSolidGeometry(-2, 2, new THREE.BoxGeometry(width, height, depth));
    
    const radius = 7;
    const segments = 24;
    addSolidGeometry(-1, 2, new THREE.CircleGeometry(radius, segments));
    
    const radiusTop = 0;
    const radiusBottom = 7;
    const radialSegments = 24;
    addSolidGeometry(0, 2, new THREE.ConeGeometry(radiusBottom, height, radialSegments));
    
    addSolidGeometry(1, 2, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments));
    
    addSolidGeometry(2, 2, new THREE.DodecahedronGeometry(radius));
    
    // 第二行
    const shape = new THREE.Shape();
    const x = -2.5;
    const y = -5;
    shape.moveTo(x + 2.5, y + 2.5);
    shape.bezierCurveTo(x + 2.5, y + 2.5, x + 2, y, x, y);
    shape.bezierCurveTo(x - 3, y, x - 3, y + 3.5, x - 3, y + 3.5);
    shape.bezierCurveTo(x - 3, y + 5.5, x - 1.5, y + 7.7, x + 2.5, y + 9.5);
    shape.bezierCurveTo(x + 6, y + 7.7, x + 8, y + 4.5, x + 8, y + 3.5);
    shape.bezierCurveTo(x + 8, y + 3.5, x + 8, y, x + 5, y);
    shape.bezierCurveTo(x + 3.5, y, x + 2.5, y + 2.5, x + 2.5, y + 2.5);
    
    const extrudeSettings = {
        steps: 2,
        depth: 2,
        bevelEnabled: true,
        bevelThickness: 1,
        bevelSize: 1,
        bevelSegments: 2,
    };
    addSolidGeometry(-2, 1, new THREE.ExtrudeGeometry(shape, extrudeSettings));
    
    addSolidGeometry(-1, 1, new THREE.IcosahedronGeometry(radius));
    
    const points = [];
    for (let i = 0; i < 10; ++i) {
        points.push(new THREE.Vector2(Math.sin(i * 0.2) * 3 + 3, (i - 5) * .8));
    }
    addSolidGeometry(0, 1, new THREE.LatheGeometry(points));
    
    addSolidGeometry(1, 1, new THREE.OctahedronGeometry(radius));
    
    // 使用 ParametricGeometry
    function klein(v, u, target) {
        u *= Math.PI;
        v *= 2 * Math.PI;
        u = u * 2;
        
        let x, z;
        if (u < Math.PI) {
            x = 3 * Math.cos(u) * (1 + Math.sin(u)) + (2 * (1 - Math.cos(u) / 2)) * Math.cos(u) * Math.cos(v);
            z = -8 * Math.sin(u) - 2 * (1 - Math.cos(u) / 2) * Math.sin(u) * Math.cos(v);
        } else {
            x = 3 * Math.cos(u) * (1 + Math.sin(u)) + (2 * (1 - Math.cos(u) / 2)) * Math.cos(v + Math.PI);
            z = -8 * Math.sin(u);
        }
        
        const y = -2 * (1 - Math.cos(u) / 2) * Math.sin(v);
        
        target.set(x, y, z).multiplyScalar(0.75);
    }
    
    const slices = 25;
    const stacks = 25;
    addSolidGeometry(2, 1, new ParametricGeometry(klein, slices, stacks));
    
    // 第三行
    addSolidGeometry(-2, 0, new THREE.PlaneGeometry(width, height, 2, 2));
    
    const vertexCount = 32;
    const innerRadius = 2;
    const outerRadius = 7;
    addSolidGeometry(-1, 0, new THREE.RingGeometry(innerRadius, outerRadius, vertexCount));
    
    const tubeRadius = 2;
    addSolidGeometry(0, 0, new THREE.SphereGeometry(radius, 12, 8));
    
    addSolidGeometry(1, 0, new THREE.TetrahedronGeometry(radius));
    
    const loader = new FontLoader();
    const font = loader.parse(local_font);
    const textGeometry = new TextGeometry('three.js', {
        font: font,
        size: 3,
        depth: .2,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.15,
        bevelSize: .3,
        bevelSegments: 5,
    });
    const textMesh = new THREE.Mesh(textGeometry, createMaterial());
    textGeometry.computeBoundingBox();
    textGeometry.boundingBox.getCenter(textMesh.position).multiplyScalar(-1);
    
    const textParent = new THREE.Object3D();
    textParent.add(textMesh);
    
    addObject(2, 0, textParent);
    
    // 第四行
    addSolidGeometry(-2, -1, new THREE.TorusGeometry(radius, tubeRadius, 8, 24));
    
    const p = 2;
    const q = 3;
    addSolidGeometry(-1, -1, new THREE.TorusKnotGeometry(radius, tubeRadius, 64, 8, p, q));
    
    class CustomSinCurve extends THREE.Curve {
        constructor(scale) {
            super();
            this.scale = scale;
        }
        getPoint(t) {
            const tx = t * 3 - 1.5;
            const ty = Math.sin(2 * Math.PI * t);
            const tz = 0;
            return new THREE.Vector3(tx, ty, tz).multiplyScalar(this.scale);
        }
    }
    
    const path = new CustomSinCurve(4);
    const tubularSegments = 20;
    const radiusSegments = 8;
    const closed = false;
    addSolidGeometry(0, -1, new THREE.TubeGeometry(path, tubularSegments, tubeRadius, radiusSegments, closed));
    
    // 边缘几何体 (Edges)
    const edgesGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth));
    addLineGeometry(1, -1, edgesGeometry);
    
    // 线框几何体 (Wireframe)
    const wireframeGeometry = new THREE.WireframeGeometry(new THREE.SphereGeometry(radius, 12, 8));
    addLineGeometry(2, -1, wireframeGeometry);
}

// 窗口调整大小处理
function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

// 动画循环
function animate(time) {
    time *= 0.001;
    
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }
    
    objects.forEach((obj, ndx) => {
        const speed = 0.1 + ndx * 0.05;
        const rot = time * speed;
        obj.rotation.x = rot;
        obj.rotation.y = rot;
    });
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
