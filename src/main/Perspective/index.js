import * as THREE from 'three';

class ResponsiveCamera {
    constructor() {
        this.fov = 40;
        this.near = 0.1;
        this.far = 1000;
        this.distance = 120;

        this.updateCamera();
    }

    updateCamera() {
        const aspect = window.innerWidth / window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(this.fov, aspect, this.near, this.far);

        this.camera.position.z = this.distance;
    }

    // 计算可视范围
    getVisibleRange() {
        const vFOV = (this.fov * Math.PI) / 180;
        const height = 2 * Math.tan(vFOV / 2) * this.distance;
        const width = height * (window.innerWidth / window.innerHeight);

        return { width, height };
    }

    // 检查物体是否在可视范围内
    isObjectVisible(obj) {
        const range = this.getVisibleRange();
        const pos = obj.position;
        console.log(range);

        return Math.abs(pos.x) <= range.width / 2 && Math.abs(pos.y) <= range.height / 2 && pos.z >= this.near && pos.z <= this.far;
    }

    // 窗口大小改变时更新
    onWindowResize() {
        this.updateCamera();
        this.camera.updateProjectionMatrix();
    }

    getCamera() {
        return this.camera;
    }
}

// 创建随机颜色的Phong材质（支持光照，效果更真实）
function createMaterial() {
    const material = new THREE.MeshPhongMaterial({
        side: THREE.DoubleSide, // 双面渲染（2D形状如平面、图形需要开启）
    });

    // 使用HSL颜色模式：色相（随机）、饱和度（1=最鲜艳）、亮度（0.5=适中）
    const hue = Math.random(); // 色相0-1（0=红色，0.33=绿色，0.66=蓝色）
    const saturation = 1;
    const luminance = 0.5;
    material.color.setHSL(hue, saturation, luminance);
    return material;
}

function fitCameraToObjects(camera, objects) {
    let maxDistance = 0;

    objects.forEach((obj) => {
        const distance = Math.sqrt(obj.position.x ** 2 + obj.position.y ** 2);
        maxDistance = Math.max(maxDistance, distance);
    });

    // 计算所需的相机距离
    const vFOV = (camera.fov * Math.PI) / 180;
    const requiredDistance = maxDistance / Math.tan(vFOV / 2);

    camera.position.z = requiredDistance * 1.5; // 留一些余量
    console.log('final camera position:', camera.position.z);
    camera.updateProjectionMatrix();
}

// 使用示例
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

// 4. 创建渲染器：将3D场景渲染到网页上
const renderer = new THREE.WebGLRenderer({ antialias: true }); // antialias开启抗锯齿
renderer.setSize(window.innerWidth, window.innerHeight); // 设置渲染尺寸
// 将渲染器的画布添加到网页中
document.body.appendChild(renderer.domElement);

const camera = new ResponsiveCamera();
window.addEventListener('resize', () => camera.onWindowResize());

// 添加光源
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 50, 50);
scene.add(directionalLight);

// 检查物体是否可见
const cube = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 8), createMaterial());
cube.position.set(20, 20, 0);
scene.add(cube);

fitCameraToObjects(camera.getCamera(), [cube]);


function animate(time) {
    renderer.render(scene, camera.getCamera());
    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

console.log(camera.isObjectVisible(cube)); // true or false
