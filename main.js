import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/+esm";

// --- 全局变量 ---
let handLandmarker = undefined;
let runningMode = "VIDEO";
let lastVideoTime = -1;
let scene, camera, renderer, particleSystem;
let targetPositions = []; // 目标形状的坐标数组
let currentPositions = []; // 当前粒子的坐标数组
const particleCount = 8000; // 粒子数量，兼顾移动端性能
let currentShape = 'heart';
let handDistance = 0.5; // 默认手势距离 (0-1)
let isHandsDetected = false;

// DOM 元素
const video = document.getElementById("cam");
const startBtn = document.getElementById("startBtn");
const overlay = document.getElementById("overlay");
const loadingText = document.getElementById("loading-text");
const uiPanel = document.getElementById("ui-panel");
const statusText = document.getElementById("status-text");

// --- 1. 初始化入口 (iOS 兼容) ---
startBtn.addEventListener("click", async () => {
    startBtn.style.display = 'none';
    loadingText.style.display = 'block';
    
    try {
        // 初始化 AI
        await initHandLandmarker();
        
        // 获取摄像头流 (iOS 必须在点击事件中触发)
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: 640, height: 480 },
            audio: false
        });
        video.srcObject = stream;
        await video.play();

        // 隐藏遮罩，显示 UI
        overlay.style.opacity = 0;
        setTimeout(() => { overlay.style.display = 'none'; uiPanel.style.display = 'flex'; }, 500);
        
        // 启动 Three.js 和 循环
        initThree();
        renderLoop();
        
    } catch (err) {
        console.error(err);
        loadingText.innerText = "无法启动：请检查摄像头权限或使用HTTPS";
        loadingText.style.color = "red";
        startBtn.style.display = 'block';
    }
});

// --- 2. MediaPipe 初始化 ---
async function initHandLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
        },
        runningMode: runningMode,
        numHands: 2
    });
}

// --- 3. Three.js 初始化 ---
function initThree() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.05); // 雾效增加深度

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 4;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // 创建粒子几何体
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    // 初始化位置和目标位置
    targetPositions = new Float32Array(particleCount * 3);
    currentPositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 10;
        currentPositions[i] = positions[i];
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: document.getElementById('color-picker').value,
        size: 0.03,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    // 生成初始形状
    calculateShape(currentShape);
    
    // 窗口调整
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// --- 4. 形状计算逻辑 ---
function calculateShape(type) {
    const arr = targetPositions;
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        let x, y, z;

        if (type === 'heart') {
            // 爱心方程
            const t = Math.random() * Math.PI * 2;
            const r = Math.random(); // 填充内部
            // 基础形状
            let tx = 16 * Math.pow(Math.sin(t), 3);
            let ty = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
            // 归一化并随机化
            x = tx * 0.1 * Math.sqrt(r);
            y = ty * 0.1 * Math.sqrt(r);
            z = (Math.random() - 0.5) * 0.5; // 厚度
        } 
        else if (type === 'sphere' || type === 'fireworks') {
            const phi = Math.acos(-1 + (2 * i) / particleCount);
            const theta = Math.sqrt(particleCount * Math.PI) * phi;
            const r = type === 'fireworks' ? Math.random() * 2 : 1.5;
            x = r * Math.cos(theta) * Math.sin(phi);
            y = r * Math.sin(theta) * Math.sin(phi);
            z = r * Math.cos(phi);
        }
        else if (type === 'saturn') {
            // 70% 球体，30% 环
            if (Math.random() > 0.3) {
                const r = 1.0;
                const phi = Math.acos(-1 + (2 * Math.random()) / 1);
                const theta = Math.sqrt(particleCount * Math.PI) * phi;
                x = r * Math.cos(theta) * Math.sin(phi);
                y = r * Math.sin(theta) * Math.sin(phi);
                z = r * Math.cos(phi);
            } else {
                // 环
                const angle = Math.random() * Math.PI * 2;
                const r = 1.6 + Math.random() * 0.8;
                x = r * Math.cos(angle);
                z = r * Math.sin(angle);
                y = (Math.random() - 0.5) * 0.1;
                // 倾斜环
                const tilt = 0.4;
                const tempY = y * Math.cos(tilt) - z * Math.sin(tilt);
                const tempZ = y * Math.sin(tilt) + z * Math.cos(tilt);
                y = tempY; z = tempZ;
            }
        }
        else if (type === 'flower') {
            const u = Math.random() * Math.PI * 2;
            const v = Math.random() * Math.PI;
            const r = 1.5 + Math.sin(5 * u) * 0.5; // 5个花瓣
            x = r * Math.sin(v) * Math.cos(u);
            y = r * Math.sin(v) * Math.sin(u);
            z = r * Math.cos(v) * 0.5;
        }
        else if (type === 'spiral') {
            const t = i / particleCount * 20; // 圈数
            const r = t * 0.1;
            x = r * Math.cos(t);
            y = (Math.random() - 0.5) * 1; // 柱状高度
            z = r * Math.sin(t);
        }
        else {
            // Cube / Default
            x = (Math.random() - 0.5) * 3;
            y = (Math.random() - 0.5) * 3;
            z = (Math.random() - 0.5) * 3;
        }

        arr[i3] = x;
        arr[i3 + 1] = y;
        arr[i3 + 2] = z;
    }
}

// --- 5. 主循环 ---
function renderLoop() {
    // 1. 检测手势
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const results = handLandmarker.detectForVideo(video, performance.now());
        
        if (results.landmarks && results.landmarks.length > 0) {
            isHandsDetected = true;
            statusText.innerText = `检测到 ${results.landmarks.length} 只手`;
            
            // 逻辑：如果是两只手，计算两手中心距离
            if (results.landmarks.length === 2) {
                const h1 = results.landmarks,[object Object],[object Object],; // 第一只手中指根部
                const h2 = results.landmarks,[object Object],[object Object],; // 第二只手中指根部
                const dist = Math.sqrt(Math.pow(h1.x - h2.x, 2) + Math.pow(h1.y - h2.y, 2));
                // 映射距离：通常距离在 0.1 到 0.8 之间
                handDistance = THREE.MathUtils.lerp(handDistance, dist * 3.5, 0.1);
            } 
            // 逻辑：如果是单手，计算拇指和食指距离 (捏合)
            else {
                const thumb = results.landmarks,[object Object],[object Object],;
                const index = results.landmarks,[object Object],[object Object],;
                const dist = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));
                handDistance = THREE.MathUtils.lerp(handDistance, dist * 5 + 0.5, 0.1);
            }
        } else {
            isHandsDetected = false;
            statusText.innerText = "未检测到手势 - 粒子自动呼吸";
            // 自动呼吸效果
            const time = Date.now() * 0.001;
            handDistance = 1 + Math.sin(time) * 0.3;
        }
    }

    // 2. 更新粒子位置
    const positions = particleSystem.geometry.attributes.position.array;
    const speed = 0.08; // 粒子移动速度
    
    // 手势控制的缩放系数
    const scale = Math.max(0.1, handDistance); 

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // 目标位置 (带缩放)
        const tx = targetPositions[i3] * scale;
        const ty = targetPositions[i3 + 1] * scale;
        const tz = targetPositions[i3 + 2] * scale;

        // 差值移动 (Lerp)
        positions[i3] += (tx - positions[i3]) * speed;
        positions[i3 + 1] += (ty - positions[i3 + 1]) * speed;
        positions[i3 + 2] += (tz - positions[i3 + 2]) * speed;

        // 增加一点随机抖动，让粒子看起来活着
        if(isHandsDetected) {
            positions[i3] += (Math.random() - 0.5) * 0.02;
            positions[i3+1] += (Math.random() - 0.5) * 0.02;
            positions[i3+2] += (Math.random() - 0.5) * 0.02;
        }
    }
    
    // 旋转整个系统
    particleSystem.rotation.y += 0.002;
    particleSystem.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(renderLoop);
}

// --- 6. UI 事件绑定 ---
document.getElementById('shape-select').addEventListener('change', (e) => {
    currentShape = e.target.value;
    calculateShape(currentShape);
});

document.getElementById('color-picker').addEventListener('input', (e) => {
    particleSystem.material.color.set(e.target.value);
});

document.getElementById('fullscreen-btn').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log("iOS Safari 不支持全屏API，忽略");
        });
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
});
