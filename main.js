// main.js - Three.js + MediaPipe Hands integration (iPhone-friendly)
// Imports via CDN
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/OrbitControls.js';
import { Hands } from 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
import { Camera } from 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0); // transparent

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030b16, 0.0035);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0,0,60);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;

const ptLight = new THREE.PointLight(0xffffff, 0.9);
ptLight.position.set(50,50,50); scene.add(ptLight);

let particleMesh, particlePositions, particleBase;
let particleCount = Number(document.getElementById('countRange').value) || 4096;
let particleSize = Number(document.getElementById('sizeRange').value) || 4;
let particleColor = new THREE.Color(document.getElementById('colorPicker').value || '#ff66b2');

const material = new THREE.PointsMaterial({ size: particleSize, sizeAttenuation:true, color:particleColor, transparent:true, opacity:0.95 });

function createParticles(count){
  if(particleMesh){ scene.remove(particleMesh); particleMesh.geometry.dispose(); }
  particleCount = count;
  const geometry = new THREE.BufferGeometry();
  particlePositions = new Float32Array(count*3);
  particleBase = new Float32Array(count*3);

  for(let i=0;i<count;i++){
    const i3 = i*3;
    particlePositions[i3] = (Math.random()-0.5)*30;
    particlePositions[i3+1] = (Math.random()-0.5)*30;
    particlePositions[i3+2] = (Math.random()-0.5)*30;
    particleBase[i3] = particlePositions[i3];
    particleBase[i3+1] = particlePositions[i3+1];
    particleBase[i3+2] = particlePositions[i3+2];
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleMesh = new THREE.Points(geometry, material);
  scene.add(particleMesh);
  applyShape(document.getElementById('shapeSelect').value);
}

function applyShape(name){
  if(!particlePositions) return;
  const n = particleCount;
  if(name==='heart') sampleHeart(n);
  else if(name==='flower') sampleFlower(n);
  else if(name==='saturn') sampleSaturn(n);
  else if(name==='buddha') sampleBuddha(n);
  else if(name==='firework') sampleFirework(n);
  particleMesh.geometry.attributes.position.needsUpdate = true;
  particleBase.set(particlePositions);
}

function sampleHeart(n){
  for(let i=0;i<n;i++){
    const t = Math.random()*Math.PI*2;
    const r = 12*(1-Math.sin(t))*0.6;
    const x = r*Math.cos(t); const y = r*Math.sin(t); const z = (Math.random()-0.5)*3;
    const i3=i*3;
    particlePositions[i3]=x + (Math.random()-0.5)*1.2;
    particlePositions[i3+1]=y + (Math.random()-0.5)*1.2;
    particlePositions[i3+2]=z;
  }
}

function sampleFlower(n){
  for(let i=0;i<n;i++){
    const k = 5 + Math.floor(Math.random()*4);
    const a = Math.random()*Math.PI*2;
    const r = 10 * Math.sin(k*a) * (0.5 + Math.random()*0.5);
    const x = r*Math.cos(a); const y = r*Math.sin(a); const z = (Math.random()-0.5)*2.5 + Math.cos(a*3)*0.8;
    const idx=i*3; particlePositions[idx]=x; particlePositions[idx+1]=y; particlePositions[idx+2]=z;
  }
}

function sampleSaturn(n){
  const half = Math.floor(n*0.6);
  for(let i=0;i<n;i++){
    const i3=i*3;
    if(i<half){
      const u=Math.random(), v=Math.random();
      const theta = u * Math.PI*2;
      const phi = Math.acos(2*v -1);
      const r = 10 * (0.8 + Math.random()*0.4);
      particlePositions[i3] = r * Math.sin(phi) * Math.cos(theta) * 0.95;
      particlePositions[i3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.95;
      particlePositions[i3+2] = r * Math.cos(phi) * 0.85;
    } else {
      const t = Math.random()*Math.PI*2;
      const rad = 14 + Math.random()*4;
      const height = (Math.random()-0.5)*0.6;
      particlePositions[i3] = Math.cos(t) * rad + (Math.random()-0.5)*0.5;
      particlePositions[i3+1] = height;
      particlePositions[i3+2] = Math.sin(t) * rad + (Math.random()-0.5)*0.5;
    }
  }
}

function sampleBuddha(n){
  for(let i=0;i<n;i++){
    const idx=i*3;
    const layer = Math.random();
    const y = (layer - 0.5) * 22;
    const rx = 8 * (1 - Math.abs(layer - 0.5));
    const rz = rx * (0.6 + Math.random()*0.6);
    const ang = Math.random()*Math.PI*2;
    particlePositions[idx] = Math.cos(ang) * (rx * Math.random());
    particlePositions[idx+1] = y + (Math.random()-0.5)*1.4;
    particlePositions[idx+2] = Math.sin(ang) * (rz * Math.random());
  }
}

function sampleFirework(n){
  const bursts = 8 + Math.floor(Math.random()*6);
  for(let i=0;i<n;i++){
    const b = Math.floor(Math.random()*bursts);
    const t = Math.random()*Math.PI*2;
    const rad = Math.random() * (8 + Math.random()*18);
    const spread = 0.8 + Math.random()*2.2;
    const idx=i*3;
    particlePositions[idx] = Math.cos(t + b) * rad * spread;
    particlePositions[idx+1] = (Math.random()-0.2) * (rad*0.2 + Math.random()*8);
    particlePositions[idx+2] = Math.sin(t + b) * rad * spread;
  }
}

// ---------------- Hand detection ----------------
const videoElement = document.getElementById('cam');
let cameraFeed = null;
let lastHands = [];

const hands = new Hands({locateFile: (file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 });
hands.onResults((results)=>{ const multi = results.multiHandLandmarks || []; lastHands = multi.map(h=>h); if(multi.length>0) document.getElementById('cam').parentElement.style.display='block'; else document.getElementById('cam').parentElement.style.display='none'; });

// compute gestures: pinch (thumb-index) and hands distance
function handCenter(hand){
  let x=0,y=0,z=0;
  for(let i=0;i<hand.length;i++){ x+=hand[i].x; y+=hand[i].y; z+=hand[i].z; }
  const n = hand.length; return {x:x/n,y:y/n,z:z/n};
}

function computeGestureSignals(){
  let pinch = 0; let handsDist = 0;
  if(lastHands.length>0){
    const h0 = lastHands[0]; const t0=h0[4]; const i0=h0[8];
    const dx=t0.x-i0.x, dy=t0.y-i0.y, dz=t0.z-i0.z; const d=Math.sqrt(dx*dx+dy*dy+dz*dz);
    pinch = Math.max(0, Math.min(1, (0.18 - d)/0.18));
    if(lastHands.length>1){
      const c0=handCenter(lastHands[0]); const c1=handCenter(lastHands[1]);
      const dd = Math.sqrt((c0.x-c1.x)**2 + (c0.y-c1.y)**2 + (c0.z-c1.z)**2);
      handsDist = dd;
    } else handsDist = 0;
  }
  return {pinchStrength: pinch, handsDistance: handsDist};
}

// ---------------- Animation ----------------
let clock = new THREE.Clock();
let time = 0;

function animate(){
  requestAnimationFrame(animate);
  const dt = clock.getDelta(); time += dt;
  controls.update();

  if(particleMesh){
    const pos = particleMesh.geometry.attributes.position.array;
    const base = particleBase;
    const signals = computeGestureSignals();
    const pinch = signals.pinchStrength;
    const handsDist = signals.handsDistance;
    const sens = Number(document.getElementById('sensitivity').value) || 1.0;

    if(handsDist>0){
      const zoom = THREE.MathUtils.mapLinear(handsDist, 0.05, 0.7, 1.2, 0.25);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, 40 * zoom, 0.08);
    }

    const spreadBase = THREE.MathUtils.mapLinear(pinch, 0, 1, 1.6, 0.08) * sens;

    for(let i=0;i<particleCount;i++){
      const i3=i*3;
      const nx = Math.sin(time * 0.5 + i) * 0.15;
      const ny = Math.cos(time * 0.4 + i*0.7) * 0.12;
      const nz = Math.sin(time * 0.7 + i*0.3) * 0.1;

      pos[i3] = THREE.MathUtils.lerp(pos[i3], base[i3] * spreadBase + nx * 6, 0.08);
      pos[i3+1] = THREE.MathUtils.lerp(pos[i3+1], base[i3+1] * spreadBase + ny * 6, 0.08);
      pos[i3+2] = THREE.MathUtils.lerp(pos[i3+2], base[i3+2] * spreadBase + nz * 6, 0.08);
    }
    particleMesh.geometry.attributes.position.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

// ---------------- UI wiring ----------------
document.getElementById('shapeSelect').addEventListener('change',(e)=>applyShape(e.target.value));
document.getElementById('colorPicker').addEventListener('input',(e)=>{ particleColor.set(e.target.value); material.color.copy(particleColor); });
document.getElementById('countRange').addEventListener('change',(e)=>{ createParticles(Number(e.target.value)); });
document.getElementById('sizeRange').addEventListener('input',(e)=>{ material.size = Number(e.target.value); });
document.getElementById('resetBtn').addEventListener('click',()=>{ camera.position.set(0,0,60); controls.target.set(0,0,0); });

// fullscreen
document.getElementById('fs').addEventListener('click', async ()=>{
  if(!document.fullscreenElement) await document.documentElement.requestFullscreen().catch(()=>{});
  else await document.exitFullscreen().catch(()=>{});
});

// Start / camera handling (must be triggered by user gesture on iOS)
const startBtn = document.getElementById('startBtn');
let started = false;
startBtn.addEventListener('click', async ()=>{ if(started) return; started=true; startBtn.style.display='none'; await startCameraAndHands(); });

// start camera + mediapipe camera
async function startCameraAndHands(){
  try{
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}, audio:false});
    videoElement.srcObject = stream;
    await videoElement.play(); // user gesture has already occurred
    // use MediaPipe Camera helper to call hands.send on each frame
    cameraFeed = new Camera(videoElement, { onFrame: async ()=>{ await hands.send({image: videoElement}); }, width: 640, height: 480 });
    cameraFeed.start();
  } catch(err){
    console.warn('无法打开摄像头：', err);
    alert('无法访问摄像头。请在 HTTPS 上打开此页面，并允许相机访问。');
  }
}

// initialize
createParticles(particleCount);
animate();

// resize handling
window.addEventListener('resize', ()=>{ camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

// pause camera when hidden
document.addEventListener('visibilitychange', ()=>{ if(document.hidden){ if(cameraFeed && cameraFeed.stop) cameraFeed.stop(); } else { if(cameraFeed && cameraFeed.start) cameraFeed.start(); }});
