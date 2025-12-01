let video = document.getElementById("cam");
let startBtn = document.getElementById("startBtn");

// --------------- iPhone Safari 关键修复点 ---------------
// 必须在用户点击事件中直接调用 getUserMedia & play()
startBtn.addEventListener("click", async () => {

    startBtn.innerText = "启动中…";

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user"
            },
            audio: false
        });

        video.srcObject = stream;

        // iPhone 必须手动 play()
        await video.play();

        startBtn.style.display = "none";
        video.style.display = "block";

        // 初始化 HandDetector
        await initHands();

    } catch (err) {
        console.error("Camera error:", err);
        startBtn.innerText = "无法启动相机（点我重试）";
    }
});

// ---------------- Mediapipe 手势识别初始化 ----------------

let handDetector;
let running = false;

async function initHands() {
    if (running) return;

    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    handDetector = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath:
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/hand_landmarker.binarypb"
        },
        numHands: 2,
        runningMode: "VIDEO"
    });

    running = true;
    requestAnimationFrame(processHands);
}

function processHands() {
    if (!running) return;

    const results = handDetector.detectForVideo(video, performance.now());

    if (results && results.landmarks && results.landmarks.length) {
        updateParticlesFromHands(results.landmarks);
    }

    requestAnimationFrame(processHands);
}

// ---------------- Three.js 粒子控制 ----------------

let scene, camera, renderer, particles;

function initThree() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        75, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(renderer.domElement);

    particles = new THREE.Points(
        new THREE.BufferGeometry(),
        new THREE.PointsMaterial({
            size: 0.04,
            color: 0xff6699
        })
    );

    scene.add(particles);

    animate();
}

function updateParticlesFromHands(hands) {
    // 示例：用两手之间距离控制粒子缩放
    if (hands.length >= 2) {
        const p1 = hands[0][9];  // 手掌中心
        const p2 = hands[1][9];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        const scale = THREE.MathUtils.lerp(0.5, 3.5, d * 3.0);

        particles.scale.set(scale, scale, scale);
    }
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// 启动 three.js
initThree();
