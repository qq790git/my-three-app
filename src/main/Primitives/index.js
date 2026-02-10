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
camera.position.z = 40;

// 渲染器设置
const renderer = new THREE.WebGLRenderer({ antialias: true });
const viewContainer = document.getElementById('view');
renderer.setSize(viewContainer.clientWidth, viewContainer.clientHeight);
viewContainer.appendChild(renderer.domElement);

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

// 清除场景中的对象
function clearScene() {
    objects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
    });
    objects.length = 0;
}

// 添加对象到场景的辅助函数
function addObject(obj) {
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
function addSolidGeometry(geometry) {
    const mesh = new THREE.Mesh(geometry, createMaterial());
    addObject(mesh);
}

// 添加线框几何体
function addLineGeometry(geometry) {
    const material = new THREE.LineBasicMaterial({ color: 0xFFFFFF });
    const mesh = new THREE.LineSegments(geometry, material);
    addObject(mesh);
}

// 辅助类和函数定义
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

// 定义所有基础元件
const primitives = {
    'BoxGeometry': () => {
        const width = 8;
        const height = 8;
        const depth = 8;
        addSolidGeometry(new THREE.BoxGeometry(width, height, depth));
    },
    'CircleGeometry': () => {
        const radius = 7;
        const segments = 24;
        addSolidGeometry(new THREE.CircleGeometry(radius, segments));
    },
    'ConeGeometry': () => {
        const radius = 7;
        const height = 8;
        const segments = 24;
        addSolidGeometry(new THREE.ConeGeometry(radius, height, segments));
    },
    'CylinderGeometry': () => {
        const radiusTop = 4; // Adjusted to look more like a cylinder, original was 0 (cone)
        const radiusBottom = 7;
        const height = 8;
        const radialSegments = 24;
        addSolidGeometry(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments));
    },
    'DodecahedronGeometry': () => {
        const radius = 7;
        addSolidGeometry(new THREE.DodecahedronGeometry(radius));
    },
    'ExtrudeGeometry': () => {
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
        addSolidGeometry(new THREE.ExtrudeGeometry(shape, extrudeSettings));
    },
    'IcosahedronGeometry': () => {
        const radius = 7;
        addSolidGeometry(new THREE.IcosahedronGeometry(radius));
    },
    'LatheGeometry': () => {
        const points = [];
        for (let i = 0; i < 10; ++i) {
            points.push(new THREE.Vector2(Math.sin(i * 0.2) * 3 + 3, (i - 5) * .8));
        }
        addSolidGeometry(new THREE.LatheGeometry(points));
    },
    'OctahedronGeometry': () => {
        const radius = 7;
        addSolidGeometry(new THREE.OctahedronGeometry(radius));
    },
    'ParametricGeometry': () => {
        const slices = 25;
        const stacks = 25;
        addSolidGeometry(new ParametricGeometry(klein, slices, stacks));
    },
    'PlaneGeometry': () => {
        const width = 8;
        const height = 8;
        addSolidGeometry(new THREE.PlaneGeometry(width, height, 2, 2));
    },
    'RingGeometry': () => {
        const innerRadius = 2;
        const outerRadius = 7;
        const thetaSegments = 18;
        addSolidGeometry(new THREE.RingGeometry(innerRadius, outerRadius, thetaSegments));
    },
    'SphereGeometry': () => {
        const radius = 7;
        const widthSegments = 12;
        const heightSegments = 8;
        addSolidGeometry(new THREE.SphereGeometry(radius, widthSegments, heightSegments));
    },
    'TetrahedronGeometry': () => {
        const radius = 7;
        addSolidGeometry(new THREE.TetrahedronGeometry(radius));
    },
    'TextGeometry': () => {
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
        textGeometry.computeBoundingBox();
        textGeometry.center();
        addSolidGeometry(textGeometry);
    },
    'TorusGeometry': () => {
        const radius = 5;
        const tubeRadius = 2;
        const radialSegments = 8;
        const tubularSegments = 24;
        addSolidGeometry(new THREE.TorusGeometry(radius, tubeRadius, radialSegments, tubularSegments));
    },
    'TorusKnotGeometry': () => {
        const radius = 3.5;
        const tubeRadius = 1.5;
        const tubularSegments = 64;
        const radialSegments = 8;
        const p = 2;
        const q = 3;
        addSolidGeometry(new THREE.TorusKnotGeometry(radius, tubeRadius, tubularSegments, radialSegments, p, q));
    },
    'TubeGeometry': () => {
        const path = new CustomSinCurve(4);
        const tubularSegments = 20;
        const radius = 1;
        const radialSegments = 8;
        const closed = false;
        addSolidGeometry(new THREE.TubeGeometry(path, tubularSegments, radius, radialSegments, closed));
    },
    'EdgesGeometry': () => {
        const width = 8;
        const height = 8;
        const depth = 8;
        const boxGeometry = new THREE.BoxGeometry(width, height, depth);
        const edges = new THREE.EdgesGeometry(boxGeometry);
        addLineGeometry(edges);
    },
    'WireframeGeometry': () => {
        const radius = 7;
        const widthSegments = 12;
        const heightSegments = 8;
        const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
        const wireframe = new THREE.WireframeGeometry(geometry);
        addLineGeometry(wireframe);
    }
};

// 生成菜单并绑定事件
const sidebar = document.getElementById('sidebar');
const info = document.getElementById('info');

Object.keys(primitives).forEach((name, index) => {
    const button = document.createElement('button');
    button.textContent = name;
    button.addEventListener('click', () => {
        // 更新激活状态
        document.querySelectorAll('#sidebar button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // 更新描述
        info.textContent = name;
        
        // 切换几何体
        clearScene();
        primitives[name]();
    });
    sidebar.appendChild(button);
    
    // 默认选中第一个
    if (index === 0) {
        button.click();
    }
});

// 窗口调整大小处理
function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    // 使用容器的大小
    const width = viewContainer.clientWidth;
    const height = viewContainer.clientHeight;
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
        const speed = 0.5;
        const rot = time * speed;
        obj.rotation.x = rot;
        obj.rotation.y = rot;
    });
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
