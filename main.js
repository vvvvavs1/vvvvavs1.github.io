import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/+esm';

// --- 全局变量 ---
let scene, camera, renderer, particles;
let handDetector;
let isRunning = false;
let videoElement = document.getElementById('cam');
let particleGeometry, particleMaterial;
const PARTICLE_COUNT = 10000; // 粒子数量，手机端建议10000-15000
const originalPositions = []; // 存储目标形状的顶点位置
const currentPositions = [];  // 存储当前粒子位置
let targetShape = 'heart';
let handInteractionFactor = 0; // 0 = 无手势, 1 = 最大张开
let baseColor = new THREE.Color(0xff0055);

// --- 1. 初始化入口 (iOS 兼容核心) ---
const startBtn = document.getElementById('startBtn');
const overlay = document.getElementById('overlay');
const uiContainer = document.getElementById('ui-container');
const statusPill = document.getElementById('status-pill');

startBtn.addEventListener('click', async () => {
    startBtn.innerText = "正在初始化...";
    startBtn.disabled = true;

    try {
        // 1. 启动摄像头 (iOS 必须在点击事件中调用)
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 640 }, // 降低分辨率以提高性能
                height: { ideal: 480 }
            },
            audio: false
        });
        
        videoElement.srcObject = stream;
        await videoElement.play();

        // 2. 初始化 AI 和 3D
        await initHands();
        initThree();
        
        // 3. 界面切换
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 500);
        uiContainer.style.display = 'flex';
        document.getElementById('fs-btn').style.display = 'flex';
        statusPill.style.opacity = '1';
        
        // 4. 生成初始形状
        generateShape('heart');
        isRunning = true;
        animate();

    } catch (err) {
        console.error(err);
        startBtn.innerText = "启动失败: " + err.message;
        alert("无法访问摄像头，请检查权限或使用 HTTPS/Localhost");
    }
});

// --- 2. MediaPipe 手势识别 ---
async function initHands() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
    );
    handDetector = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/hand_landmarker.binarypb",
            delegate: "GPU"
        },
        numHands: 2,
        runningMode: "VIDEO"
    });
}

let lastVideoTime = -1;
function detectHands() {
    if (!handDetector || videoElement.paused) return;

    let startTimeMs = performance.now();
    if (videoElement.currentTime !== lastVideoTime) {
        lastVideoTime = videoElement.currentTime;
        const results = handDetector.detectForVideo(videoElement, startTimeMs);
        
        if (results.landmarks && results.landmarks.length > 0) {
            statusPill.innerText = "🖐️ 手势已捕捉";
            statusPill.style.color = "#00ff88";
            processHandGestures(results.landmarks);
        } else {
            statusPill.innerText = "等待手势...";
            statusPill.style.color = "#ffff00";
            // 缓慢回弹
            handInteractionFactor = THREE.MathUtils.lerp(handInteractionFactor, 0, 0.05);
        }
    }
}

function processHandGestures(landmarks) {
    // 逻辑：计算双手食指指尖 (index 8) 的距离，或者单手大拇指(4)与食指(8)的距离
    let distance = 0;

    if (landmarks.length === 2) {
        // 双手模式：计算两手食指距离
        const hand1 = landmarks,[object Object],[object Object],;
        const hand2 = landmarks,[object Object],[object Object],;
        distance = Math.hypot(hand1.x - hand2.x, hand1.y - hand2.y);
        // 归一化：通常距离在 0.05 到 0.8 之间
        handInteractionFactor = THREE.MathUtils.mapLinear(distance, 0.1, 0.6, 0, 1.5);
    } else if (landmarks.length === 1) {
        // 单手模式：计算拇指和食指张开程度
        const thumb = landmarks,[object Object],[object Object],;
        const index = landmarks,[object Object],[object Object],;
        distance = Math.hypot(thumb.x - index.x, thumb.y - index.y);
        handInteractionFactor = THREE.MathUtils.mapLinear(distance, 0.05, 0.3, 0, 1.2);
    }
    
    // 限制范围
    handInteractionFactor = THREE.MathUtils.clamp(handInteractionFactor, 0, 2.0);
}

// --- 3. Three.js 场景与粒子系统 ---
function initThree() {
    scene = new THREE.Scene();
    // 增加一点迷雾，让粒子有深邃感
    scene.fog = new THREE.FogExp2(0x000000, 0.05);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 性能优化
    document.body.appendChild(renderer.domElement);

    // 创建粒子系统
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    
    // 初始化所有点在中心
    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 0.1;
        currentPositions[i] = positions[i];
        originalPositions[i] = positions[i];
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // 使用圆形贴图让粒子更好看（这里用程序生成一个简单的圆形纹理）
    const sprite = getSprite();

    particleMaterial = new THREE.PointsMaterial({
        size: 0.08,
        color: baseColor,
        map: sprite,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particles = new THREE.Points(geometry, particleMaterial);
    scene.add(particles);

    // 窗口调整
    window.addEventListener('resize', onWindowResize, false);
}

// 生成圆形纹理
function getSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// --- 4. 形状生成算法 ---
function generateShape(type) {
    const posAttribute = particles.geometry.attributes.position;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        let x, y, z;
        const idx = i * 3;

        if (type === 'heart') {
            // 爱心方程
            const t = Math.random() * Math.PI * 2;
            const r = Math.random(); // 填充内部
            // 修正后的爱心公式
            x = 16 * Math.pow(Math.sin(t), 3);
            y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
            z = (Math.random() - 0.5) * 4; // 厚度
            
            // 缩放
            x *= 0.15 * Math.sqrt(r);
            y *= 0.15 * Math.sqrt(r);
            z *= 0.15;
            
        } else if (type === 'saturn') {
            // 土星：球体 + 环
            const isRing = Math.random() > 0.6; // 40%是环
            if (isRing) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 2.5 + Math.random() * 1.5;
                x = Math.cos(angle) * radius;
                z = Math.sin(angle) * radius;
                y = (Math.random() - 0.5) * 0.1;
                // 倾斜
                const tilt = 0.4;
                const ty = y * Math.cos(tilt) - z * Math.sin(tilt);
                const tz = y * Math.sin(tilt) + z * Math.cos(tilt);
                y = ty; z = tz;
            } else {
                // 本体星球
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const r = 1.2 * Math.cbrt(Math.random());
                x = r * Math.sin(phi) * Math.cos(theta);
                y = r * Math.sin(phi) * Math.sin(theta);
                z = r * Math.cos(phi);
            }

        } else if (type === 'flower') {
            // 几何花朵
            const u = Math.random() * Math.PI * 2;
            const v = Math.random() * Math.PI;
            const r = 2 + Math.sin(5 * u) * Math.sin(5 * v); // 5瓣
            x = r * Math.sin(v) * Math.cos(u) * 0.8;
            y = r * Math.sin(v) * Math.sin(u) * 0.8;
            z = r * Math.cos(v) * 0.8;

        } else if (type === 'galaxy') {
            // 螺旋
            const angle = i * 0.1;
            const radius = 0.1 * angle;
            x = Math.cos(angle) * radius;
            y = (Math.random() - 0.5) * 0.5; // 扁平
            z = Math.sin(angle) * radius;
        } else if (type === 'fireworks') {
            // 爆炸球
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 0.2 + Math.random() * 3; // 随机半径
            x = r * Math.sin(phi) * Math.cos(theta);
            y = r * Math.sin(phi) * Math.sin(theta);
            z = r * Math.cos(phi);
        }

        originalPositions[idx] = x;
        originalPositions[idx+1] = y;
        originalPositions[idx+2] = z;
    }
}

// --- 5. 动画循环 ---
function animate() {
    requestAnimationFrame(animate);

    // 1. 检测手势
    detectHands();

    // 2. 粒子更新
    const positions = particles.geometry.attributes.position.array;
    const time = Date.now() * 0.001;

    // 手势影响因子 (平滑过渡)
    // 如果手张开，粒子会扩散(scale变大)并且稍微抖动
    const expansion = 1 + handInteractionFactor * 2.0; 
    
    // 旋转整个粒子群
    particles.rotation.y += 0.002 + (handInteractionFactor * 0.01);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
        
        // 目标位置
        let tx = originalPositions[idx] * expansion;
        let ty = originalPositions[idx+1] * expansion;
        let tz = originalPositions[idx+2] * expansion;

        // 加上一点噪点动画 (呼吸感)
        if (targetShape === 'fireworks') {
             // 烟花特殊逻辑：持续向外
        } else {
            tx += Math.sin(time + tx) * 0.05;
            ty += Math.cos(time + ty) * 0.05;
        }

        // 线性插值 (Lerp) 平滑移动当前位置到目标位置
        // 速度 0.1 越小越慢
        positions[idx] += (tx - positions[idx]) * 0.08;
        positions[idx+1] += (ty - positions[idx+1]) * 0.08;
        positions[idx+2] += (tz - positions[idx+2]) * 0.08;
    }

    particles.geometry.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- 6. UI 事件绑定 ---
document.getElementById('model-select').addEventListener('change', (e) => {
    targetShape = e.target.value;
    generateShape(targetShape);
});

document.getElementById('color-picker').addEventListener('input', (e) => {
    particles.material.color.set(e.target.value);
});

document.getElementById('fs-btn').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log("iOS Safari 不支持传统全屏API，已隐藏地址栏");
        });
    } else {
        document.exitFullscreen();
    }
});
