// Basic Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let particles;
let particleColor = "#ff6699";

function createParticles() {
    if (particles) scene.remove(particles);
    const geo = new THREE.BufferGeometry();
    const count = 2000;
    const positions = new Float32Array(count * 3);
    for (let i=0;i<count;i++){
        positions[i*3] = (Math.random()-0.5)*3;
        positions[i*3+1] = (Math.random()-0.5)*3;
        positions[i*3+2] = (Math.random()-0.5)*3;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ size:0.03, color: particleColor });
    particles = new THREE.Points(geo, mat);
    scene.add(particles);
}
createParticles();

document.getElementById("colorPicker").addEventListener("input", e=>{
    particleColor = e.target.value;
    createParticles();
});

document.getElementById("fullscreenBtn").onclick = ()=>{
    if (!document.fullscreenElement) document.body.requestFullscreen();
    else document.exitFullscreen();
};

function animate(){
    requestAnimationFrame(animate);
    if (particles) particles.rotation.y += 0.002;
    renderer.render(scene, camera);
}
animate();

// Camera access placeholder (gesture detection may be added)
navigator.mediaDevices.getUserMedia({video:true}).then(stream=>{
    document.getElementById("cam").srcObject = stream;
});
