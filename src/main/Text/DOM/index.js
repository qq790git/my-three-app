import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// 场景、相机
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.z = 5;

// WebGL 渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

// CSS2D 渲染器 - 用于渲染 DOM 元素到 3D 空间
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
Object.assign(labelRenderer.domElement.style, {
  position: 'absolute',
  top: '0',
  pointerEvents: 'none' // 关键：让鼠标事件穿透
});
document.body.appendChild(labelRenderer.domElement);

// 轨道控制器
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 创建地球
const earth = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x2233ff, roughness: 0.5 })
);
scene.add(earth);

// 生成地球纹理
const canvas = Object.assign(document.createElement('canvas'), { width: 512, height: 512 });
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#1e90ff';
ctx.fillRect(0, 0, 512, 512);
ctx.fillStyle = '#228b22';
for (let i = 0; i < 20; i++) {
  ctx.beginPath();
  ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 50 + 20, 0, Math.PI * 2);
  ctx.fill();
}
earth.material.map = new THREE.CanvasTexture(canvas);

// 创建 CSS2D 标签
const createLabel = (text, position) => {
  const div = document.createElement('div');
  div.className = 'label';
  div.textContent = text;
  const label = new CSS2DObject(div);
  label.position.copy(position);
  return label;
};

earth.add(createLabel('Earth', new THREE.Vector3(0, 1.5, 0)));

// 光源
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 3, 5);
scene.add(dirLight);

// 动画循环
(function animate() {
  requestAnimationFrame(animate);
  earth.rotation.y += 0.005;
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
})();

// 响应窗口变化
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});
