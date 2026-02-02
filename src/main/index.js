import * as THREE from 'three';

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
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(-1, 2, 4);
scene.add(light);

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    // 获取 Canvas 在屏幕上显示的像素宽
    const width = canvas.clientWidth;
    // 获取 Canvas 在屏幕上显示的像素高
    const height = canvas.clientHeight;

    // 检查渲染器的内部尺寸是否和显示尺寸一样
    const needResize = canvas.width !== width || canvas.height !== height;

    if (needResize) {
        // 如果不一样，就调整渲染器大小
        // 第三个参数 false 很重要！表示不要让渲染器去修改 Canvas 的 CSS 样式
        renderer.setSize(width, height, false);
    }

    return needResize;
}

function render(time) {
    time *= 0.001;

    // 1. 检查并调整分辨率
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;

        // 2. 修正摄像机长宽比
        camera.aspect = canvas.clientWidth / canvas.clientHeight;

        // 3. 必须调用这个方法，摄像机参数才会生效！
        camera.updateProjectionMatrix();
    }

     // 让立方体动起来
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    // 正常渲染
    renderer.render(scene, camera);

    requestAnimationFrame(render);
}

requestAnimationFrame(render);
