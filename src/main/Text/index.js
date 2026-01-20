import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import local_font from '../../assets/font/helvetiker_bold.typeface.json';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222); // 深灰色背景

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const loader = new FontLoader();
console.log('开始加载字体...');

let font = loader.parse(local_font);
const textGeometry = new TextGeometry('Hello Three.js!', {
    font: font,
    size: 1,
    depth: 0.5, // 使用 depth 而不是 height（Three.js r152+ 改名了）
    curveSegments: 12,
    bevelEnabled: false,
});

textGeometry.center();

const textMaterial = new THREE.MeshNormalMaterial();
let textMesh = new THREE.Mesh(textGeometry, textMaterial);
textMesh.position.set(0, 0, 0); // 确保在原点
scene.add(textMesh);
console.log('文字网格已添加到场景');

function animate() {
    requestAnimationFrame(animate);

    if (textMesh) {
        textMesh.rotation.y += 0.01;
    }

    renderer.render(scene, camera);
}
animate();
console.log('动画循环已启动');
