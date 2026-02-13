import * as THREE from 'three';
import GUI from 'lil-gui';

/**
 * 自定义 CapsuleGeometry 实现，类似 THREE.CapsuleGeometry
 * 参考: https://threejs.org/docs/#api/en/geometries/CapsuleGeometry
 *
 * CapsuleGeometry 本质上是一个旋转体(Lathe)几何体：
 * 1. 先生成胶囊的 2D 截面轮廓（底部半球弧 + 顶部半球弧）
 * 2. 将轮廓绕 Y 轴旋转 360° 生成 3D 网格
 */
class CapsuleGeometry extends THREE.BufferGeometry {
    constructor(radius = 1, length = 1, capSegments = 4, radialSegments = 8) {
        super();

        this.type = 'CapsuleGeometry';
        this.parameters = { radius, length, capSegments, radialSegments };

        capSegments = Math.max(1, Math.floor(capSegments));
        radialSegments = Math.max(3, Math.floor(radialSegments));

        const halfLength = length / 2;

        // ===== 第一步：生成 2D 轮廓路径 (profile path) =====
        // 轮廓点存储为 [x0, y0, x1, y1, ...] 的扁平数组
        // x = 到 Y 轴的距离（旋转半径），y = 高度
        const profile = [];

        // 底部半球弧：从 3π/2（正下方）到 2π（正右方），圆心在 (0, -halfLength)
        for (let i = 0; i <= capSegments; i++) {
            const angle = Math.PI * 1.5 + (i / capSegments) * Math.PI * 0.5;
            profile.push(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius - halfLength
            );
        }

        // 顶部半球弧：从 0（正右方）到 π/2（正上方），圆心在 (0, +halfLength)
        for (let i = 0; i <= capSegments; i++) {
            const angle = (i / capSegments) * Math.PI * 0.5;
            profile.push(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius + halfLength
            );
        }

        const numPoints = profile.length / 2;

        // ===== 第二步：绕 Y 轴旋转生成顶点 (Lathe 操作) =====
        const indices = [];
        const vertices = [];
        const normals = [];
        const uvs = [];

        for (let j = 0; j <= radialSegments; j++) {
            const phi = (j / radialSegments) * Math.PI * 2;
            const cosPhi = Math.cos(phi);
            const sinPhi = Math.sin(phi);

            for (let i = 0; i < numPoints; i++) {
                const px = profile[i * 2];       // 轮廓点 x（离轴距离）
                const py = profile[i * 2 + 1];   // 轮廓点 y（高度）

                // 绕 Y 轴旋转后的 3D 坐标
                vertices.push(px * cosPhi, py, px * sinPhi);

                // UV 坐标
                uvs.push(j / radialSegments, 1 - i / (numPoints - 1));

                // ===== 法线计算 =====
                // 使用轮廓路径的切线来计算表面法线
                // 切线 = (dx, dy)，外法线 = (dy, -dx)（垂直于切线且朝外）
                let dx, dy;
                if (i === 0) {
                    // 首点：前向差分
                    dx = profile[(i + 1) * 2] - profile[i * 2];
                    dy = profile[(i + 1) * 2 + 1] - profile[i * 2 + 1];
                } else if (i === numPoints - 1) {
                    // 末点：后向差分
                    dx = profile[i * 2] - profile[(i - 1) * 2];
                    dy = profile[i * 2 + 1] - profile[(i - 1) * 2 + 1];
                } else {
                    // 中间点：中心差分
                    dx = profile[(i + 1) * 2] - profile[(i - 1) * 2];
                    dy = profile[(i + 1) * 2 + 1] - profile[(i - 1) * 2 + 1];
                }

                // 2D 外法线 (dy, -dx) 归一化
                const len = Math.sqrt(dy * dy + dx * dx);
                const nx = dy / len;
                const ny = -dx / len;

                // 绕 Y 轴旋转到 3D
                normals.push(nx * cosPhi, ny, nx * sinPhi);
            }
        }

        // ===== 第三步：生成三角面索引 =====
        for (let j = 0; j < radialSegments; j++) {
            for (let i = 0; i < numPoints - 1; i++) {
                const a = j * numPoints + i;
                const b = j * numPoints + (i + 1);
                const c = (j + 1) * numPoints + (i + 1);
                const d = (j + 1) * numPoints + i;

                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        // 设置几何体属性
        this.setIndex(indices);
        this.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        this.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    }

    copy(source) {
        super.copy(source);
        this.parameters = Object.assign({}, source.parameters);
        return this;
    }

    static fromJSON(data) {
        return new CapsuleGeometry(data.radius, data.length, data.capSegments, data.radialSegments);
    }
}

// ===== 交互式演示 (类似 Three.js 官方文档) =====

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 3, 5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(2, 4, 3);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

// 使用自定义 CapsuleGeometry
const mat = new THREE.MeshPhongMaterial({ color: 0x44aa88 });
const wireframeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });

let mesh, wireframe;

// GUI 参数
const params = {
    radius: 1,
    length: 1,
    capSegments: 4,
    radialSegments: 8,
};

function rebuildGeometry() {
    if (mesh) {
        mesh.geometry.dispose();
        scene.remove(mesh);
    }
    if (wireframe) {
        wireframe.geometry.dispose();
        scene.remove(wireframe);
    }

    const geo = new CapsuleGeometry(
        params.radius, params.length,
        params.capSegments, params.radialSegments
    );

    mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geo), wireframeMat);
    scene.add(wireframe);
}

rebuildGeometry();

// lil-gui 控制面板
const gui = new GUI();
gui.add(params, 'radius', 0.1, 5, 0.1).onChange(rebuildGeometry);
gui.add(params, 'length', 0, 10, 0.1).onChange(rebuildGeometry);
gui.add(params, 'capSegments', 1, 32, 1).onChange(rebuildGeometry);
gui.add(params, 'radialSegments', 3, 64, 1).onChange(rebuildGeometry);

function animate() {
    requestAnimationFrame(animate);
    if (mesh && wireframe) {
        mesh.rotation.x += 0.005;
        mesh.rotation.y += 0.01;
        wireframe.rotation.copy(mesh.rotation);
    }
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

export { CapsuleGeometry };
