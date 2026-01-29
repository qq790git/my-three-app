import * as THREE from 'three'

// 1. 创建场景
const scene = new THREE.Scene();

// 2. 创建摄像机 (视角75度, 宽高比, 近距0.1, 远距1000)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// 把摄像机往后拉一点，不然就在物体肚子里了
camera.position.z = 5;

// 3. 创建渲染器
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
// 把渲染出来的 canvas 塞到页面里
document.body.appendChild(renderer.domElement);

// 1. 骨架：一个 1x1x1 的立方体
const geometry = new THREE.BoxGeometry(1, 1, 1);

// 2. 皮肤：绿色的，对光照有反应的材质
const material = new THREE.MeshPhongMaterial({ color: 0x44aa88 });

// 3. 合体：创建网格
const cube = new THREE.Mesh(geometry, material);

// 4. 放到场景里！
scene.add(cube);

// 创建一个平行光（类似太阳光）
const light = new THREE.DirectionalLight(0xFFFFFF, 1);
light.position.set(-1, 2, 4);
scene.add(light);

function animate() {
    requestAnimationFrame(animate); // 浏览器下次重绘前调用我

    // 让立方体动起来
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    // 咔嚓！渲染一帧
    renderer.render(scene, camera);
}

animate(); // 开始循环