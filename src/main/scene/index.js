import * as THREE from 'three'


const scene = new THREE.Scene();
// 💡 INTP 视角：把它想象成一个坐标系原点为 (0,0,0) 的无限空腔。

//const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#three-canvas') });

const camera = new THREE.PerspectiveCamera(
    75, // 视角 (Field of View)
    window.innerWidth / window.innerHeight, // 宽高比
    0.1, // 近剪裁面
    1000 // 远剪裁面
);
camera.position.z = 5; // 将相机后退 5 个单位，否则会在物体中心

const geometry = new THREE.BoxGeometry(1, 1, 1); // 形状：立方体
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // 材质：基础绿色
const cube = new THREE.Mesh(geometry, material); // 组合成网格
scene.add(cube); // 必须添加到场景中

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

function animate() {
    requestAnimationFrame(animate); // 核心：请求下一帧
    
    // 让物体动起来，增加一点生命力
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render(scene, camera); // 真正绘制的一行
}
animate();