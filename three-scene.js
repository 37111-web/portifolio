/**
 * 3D Tech Office Environment & Cinematic Camera Controller
 * Portfolio - Giulia de Assis Silva
 * 
 * Features:
 * - Complete 3D Tech Room: Desk, Multi-monitors, Laptop, PC Tower, Server Rack, Tech Window, Lights & Accessories
 * - Cinematic Camera Transitions linked to sections: Sobre Mim, Projetos, Contato
 * - Interactive Mouse/Touch Parallax and Free Orbit
 * - Dynamic Theme Switching: Dark Mode (Deep Purple/Neon Pink) <-> Light Mode (Tech Lilac/Soft Rose)
 * - Automatic 2D Canvas Fallback for devices without WebGL
 */

(function () {
  'use strict';

  const container = document.getElementById('webgl-canvas-container');
  if (!container) return;

  // WebGL Availability Check
  function isWebGLAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (e) {
      return false;
    }
  }

  // --- 2D CANVAS FALLBACK IF THREE.JS OR WEBGL FAILS ---
  function init2DFallback() {
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.className = 'fallback-canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let width, height;
    function resize() {
      width = canvas.width = container.clientWidth;
      height = canvas.height = container.clientHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    let frame = 0;
    function renderFallback() {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // Dark cyber purple grid
      ctx.fillStyle = '#080312';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 42, 133, 0.08)';
      ctx.lineWidth = 1;
      const size = 35;
      for (let x = 0; x < width; x += size) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += size) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Tech Office Window Glow in Center
      const grad = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, 280);
      grad.addColorStop(0, 'rgba(255, 42, 133, 0.18)');
      grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.1)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      requestAnimationFrame(renderFallback);
    }
    renderFallback();
  }

  if (typeof THREE === 'undefined' || !isWebGLAvailable()) {
    init2DFallback();
    return;
  }

  // --- THREE.JS ROOM & CAMERA SETUP ---
  let scene, camera, renderer;
  let roomGroup, deskGroup, windowGroup, particlesMesh;
  let ambientLight, dirLight, pinkSpotLight, windowFillLight;
  let codeCanvas, codeContext, codeTexture;
  let fan1, fan2;

  let width = container.clientWidth;
  let height = container.clientHeight;

  // Camera Target States for Each Section
  const cameraViews = {
    'sobre': {
      pos: new THREE.Vector3(13.5, 11, 16.5),
      look: new THREE.Vector3(0, 1.8, 0),
      label: 'Visão Geral • Sobre Mim'
    },
    'projetos': {
      pos: new THREE.Vector3(0.5, 3.8, 8.2),
      look: new THREE.Vector3(0, 2.6, -1.2),
      label: 'Foco nos Monitores • Projetos'
    },
    'contato': {
      pos: new THREE.Vector3(-10.5, 6.5, 12),
      look: new THREE.Vector3(-1.5, 2.2, 0),
      label: 'Estação de Rede • Contato'
    }
  };

  let currentSection = 'sobre';
  let targetCamPos = cameraViews.sobre.pos.clone();
  let targetCamLook = cameraViews.sobre.look.clone();
  let currentCamLook = cameraViews.sobre.look.clone();

  let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let isDarkMode = true;

  // Scene & Fog
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x080312, 0.035);

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.copy(targetCamPos);
  camera.lookAt(currentCamLook);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // --- LIGHTING SETUP ---
  ambientLight = new THREE.AmbientLight(0x2d124d, 2.0);
  scene.add(ambientLight);

  dirLight = new THREE.DirectionalLight(0xfdf4ff, 1.4);
  dirLight.position.set(12, 22, 14);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  // Desk Lamp Pink Spotlight
  pinkSpotLight = new THREE.PointLight(0xff2a85, 3.0, 22);
  pinkSpotLight.position.set(-2.6, 4.8, 1.8);
  pinkSpotLight.castShadow = true;
  scene.add(pinkSpotLight);

  // Window Fill Light (Cyber moonlight / daylight)
  windowFillLight = new THREE.PointLight(0xa855f7, 2.2, 35);
  windowFillLight.position.set(0, 10, -10);
  scene.add(windowFillLight);

  // Cyan counter-glow for tech ambiance
  const cyanFill = new THREE.PointLight(0x38bdf8, 1.4, 20);
  cyanFill.position.set(6, 4, 3);
  scene.add(cyanFill);

  // --- DYNAMIC CODE SCREEN CANVAS TEXTURE ---
  codeCanvas = document.createElement('canvas');
  codeCanvas.width = 512;
  codeCanvas.height = 300;
  codeContext = codeCanvas.getContext('2d');
  codeTexture = new THREE.CanvasTexture(codeCanvas);

  const codeLines = [
    '// Giulia de Assis - TI Portfolio',
    'const student = new Student("Giulia", 17);',
    'student.setExperience("2 anos de curso de TI");',
    'student.loadProjects(["Fuga das Sombras"]);',
    'while (passionForTech) {',
    '    learnNewSkills();',
    '    buildRealProjects();',
    '    evolveEveryday();',
    '}',
    'status: 200 OK -> Ready to connect;'
  ];

  function updateCodeTexture(time) {
    // Terminal background
    codeContext.fillStyle = '#0a0314';
    codeContext.fillRect(0, 0, 512, 300);

    // Glowing scanlines
    codeContext.fillStyle = 'rgba(255, 42, 133, 0.08)';
    for (let i = 0; i < 300; i += 4) {
      codeContext.fillRect(0, i, 512, 1);
    }

    // Terminal top bar
    codeContext.fillStyle = isDarkMode ? '#1c0a2e' : '#2b1945';
    codeContext.fillRect(0, 0, 512, 26);
    
    // Status dots
    codeContext.fillStyle = '#ff2a85';
    codeContext.beginPath();
    codeContext.arc(16, 13, 5, 0, Math.PI * 2);
    codeContext.fill();

    codeContext.fillStyle = '#f472b6';
    codeContext.beginPath();
    codeContext.arc(32, 13, 5, 0, Math.PI * 2);
    codeContext.fill();

    codeContext.fillStyle = '#38bdf8';
    codeContext.beginPath();
    codeContext.arc(48, 13, 5, 0, Math.PI * 2);
    codeContext.fill();

    codeContext.fillStyle = '#fbcfe8';
    codeContext.font = '10px "JetBrains Mono", monospace';
    codeContext.fillText('bash - giulia@workspace:~/portfolio', 65, 17);

    // Render lines of code
    codeContext.font = 'bold 14px "JetBrains Mono", Consolas, monospace';
    codeLines.forEach((line, idx) => {
      const y = 52 + idx * 24;
      const highlight = idx === 1 || idx === 3 || idx === 9;
      codeContext.fillStyle = highlight ? '#ff4095' : '#cbd5e1';
      codeContext.fillText(line, 20, y);
    });

    // Blinking cursor
    if (Math.sin(time * 0.006) > 0) {
      codeContext.fillStyle = '#ff2a85';
      codeContext.fillRect(20 + codeContext.measureText('status: 200 OK -> Ready to connect;').width + 6, 256, 8, 15);
    }

    codeTexture.needsUpdate = true;
  }

  // --- BUILD THE COMPLETE 3D TECH ROOM ---
  roomGroup = new THREE.Group();
  scene.add(roomGroup);

  // Materials
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0c0517,
    roughness: 0.25,
    metalness: 0.6
  });

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x110720,
    roughness: 0.7,
    metalness: 0.2
  });

  const neonPinkMat = new THREE.MeshBasicMaterial({ color: 0xff2a85 });
  const neonPurpleMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x24123d, roughness: 0.3, metalness: 0.8 });
  const screenBezelMat = new THREE.MeshStandardMaterial({ color: 0x07020e, roughness: 0.6, metalness: 0.9 });

  // 1. Floor with Hex/Grid Border
  const floorGeo = new THREE.BoxGeometry(26, 0.5, 26);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(0, -3.2, 0);
  floor.receiveShadow = true;
  roomGroup.add(floor);

  // Neon Floor Perimeter Trim
  const trimGeo = new THREE.BoxGeometry(26.2, 0.08, 0.08);
  const trimFront = new THREE.Mesh(trimGeo, neonPinkMat);
  trimFront.position.set(0, -2.9, 13.05);
  roomGroup.add(trimFront);

  const trimBack = new THREE.Mesh(trimGeo, neonPurpleMat);
  trimBack.position.set(0, -2.9, -13.05);
  roomGroup.add(trimBack);

  // 2. Back Wall & Futuristic Window
  const backWallGeo = new THREE.BoxGeometry(26, 18, 0.6);
  const backWall = new THREE.Mesh(backWallGeo, wallMat);
  backWall.position.set(0, 5.8, -13);
  backWall.receiveShadow = true;
  roomGroup.add(backWall);

  // Left Wall
  const leftWallGeo = new THREE.BoxGeometry(0.6, 18, 26);
  const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
  leftWall.position.set(-13, 5.8, 0);
  leftWall.receiveShadow = true;
  roomGroup.add(leftWall);

  // Tech Window Frame
  windowGroup = new THREE.Group();
  const winFrameGeo = new THREE.BoxGeometry(14, 8, 0.4);
  const winFrame = new THREE.Mesh(winFrameGeo, metalMat);
  winFrame.position.set(0, 7.5, -12.7);
  windowGroup.add(winFrame);

  // Window Glass
  const winGlassMat = new THREE.MeshStandardMaterial({
    color: 0x16082a,
    emissive: 0x280e46,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.85
  });
  const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(13.4, 7.4), winGlassMat);
  winGlass.position.set(0, 7.5, -12.45);
  windowGroup.add(winGlass);

  // Futuristic City Lights / Star Dots outside the window
  for (let s = 0; s < 35; s++) {
    const starMat = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.4 ? 0xff2a85 : 0xa855f7
    });
    const star = new THREE.Mesh(new THREE.BoxGeometry(0.18, Math.random() * 0.8 + 0.2, 0.05), starMat);
    star.position.set((Math.random() - 0.5) * 12.5, 5 + Math.random() * 5.5, -12.4);
    windowGroup.add(star);
  }
  roomGroup.add(windowGroup);

  // 3. Central Developer Desk
  deskGroup = new THREE.Group();
  roomGroup.add(deskGroup);

  // Desk Surface
  const deskTop = new THREE.Mesh(
    new THREE.BoxGeometry(11, 0.4, 5.6),
    new THREE.MeshStandardMaterial({ color: 0x140728, roughness: 0.3, metalness: 0.6 })
  );
  deskTop.position.set(0, 0, 0);
  deskTop.receiveShadow = true;
  deskTop.castShadow = true;
  deskGroup.add(deskTop);

  // Desk Neon Edge Glow
  const deskGlow = new THREE.Mesh(new THREE.BoxGeometry(11.08, 0.06, 0.06), neonPinkMat);
  deskGlow.position.set(0, 0.18, 2.81);
  deskGroup.add(deskGlow);

  // Desk Metallic Legs
  const legGeo = new THREE.BoxGeometry(0.3, 5.8, 4.8);
  const leftLeg = new THREE.Mesh(legGeo, metalMat);
  leftLeg.position.set(-5, -2.9, 0);
  leftLeg.castShadow = true;
  deskGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, metalMat);
  rightLeg.position.set(5, -2.9, 0);
  rightLeg.castShadow = true;
  deskGroup.add(rightLeg);

  // 4. Multi-Monitor Setup
  // Stand
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.8, 16), metalMat);
  stand.position.set(-0.4, 0.9, -1.2);
  deskGroup.add(stand);

  // Main Curved Ultra-wide Screen
  const mainScreenFrame = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.9, 0.18), screenBezelMat);
  mainScreenFrame.position.set(-0.4, 2.45, -1.2);
  mainScreenFrame.castShadow = true;
  deskGroup.add(mainScreenFrame);

  const mainScreenFace = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 2.7),
    new THREE.MeshBasicMaterial({ map: codeTexture })
  );
  mainScreenFace.position.set(-0.4, 2.45, -1.1);
  deskGroup.add(mainScreenFace);

  // Secondary Vertical Monitor (Right)
  const vertStand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.6, 16), metalMat);
  vertStand.position.set(3.4, 0.8, -0.6);
  deskGroup.add(vertStand);

  const vertFrame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.6, 0.18), screenBezelMat);
  vertFrame.position.set(3.4, 2.6, -0.6);
  vertFrame.rotation.y = -0.38;
  vertFrame.castShadow = true;
  deskGroup.add(vertFrame);

  const vertFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.85, 3.4),
    new THREE.MeshBasicMaterial({ color: 0x160824 })
  );
  vertFace.position.set(3.38, 2.6, -0.5);
  vertFace.rotation.y = -0.38;
  deskGroup.add(vertFace);

  // Vertical Screen Live Data Bars
  const barsGroup = new THREE.Group();
  for (let b = 0; b < 9; b++) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.3 * (0.3 + Math.random() * 0.7), 0.08, 0.02),
      new THREE.MeshBasicMaterial({ color: b % 2 === 0 ? 0xff2a85 : 0xa855f7 })
    );
    bar.position.set(0, 1.3 - b * 0.32, 0.02);
    barsGroup.add(bar);
  }
  barsGroup.position.copy(vertFace.position);
  barsGroup.rotation.copy(vertFace.rotation);
  deskGroup.add(barsGroup);

  // Laptop on the Left
  const lapBase = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 1.6), metalMat);
  lapBase.position.set(-3.7, 0.24, 0.4);
  lapBase.rotation.y = 0.3;
  deskGroup.add(lapBase);

  const lapScreen = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.5, 0.06), screenBezelMat);
  lapScreen.position.set(-3.9, 1.0, -0.35);
  lapScreen.rotation.y = 0.3;
  lapScreen.rotation.x = 0.15;
  deskGroup.add(lapScreen);

  const lapFace = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 1.3),
    new THREE.MeshBasicMaterial({ color: 0xff3385 })
  );
  lapFace.position.set(-3.89, 1.0, -0.31);
  lapFace.rotation.copy(lapScreen.rotation);
  deskGroup.add(lapFace);

  // 5. Mechanical Keyboard & Mouse
  const kb = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 1.1), screenBezelMat);
  kb.position.set(-0.4, 0.26, 0.9);
  deskGroup.add(kb);

  const kbUnderglow = new THREE.Mesh(new THREE.BoxGeometry(3.04, 0.04, 1.14), neonPinkMat);
  kbUnderglow.position.set(-0.4, 0.22, 0.9);
  deskGroup.add(kbUnderglow);

  const mouseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.6), metalMat);
  mouseMesh.position.set(1.6, 0.27, 0.9);
  deskGroup.add(mouseMesh);

  // 6. PC Workstation Tower with RGB Fans
  const tower = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.4, 3.2), screenBezelMat);
  tower.position.set(4.6, 1.8, 1.0);
  tower.castShadow = true;
  deskGroup.add(tower);

  const ringGeo = new THREE.TorusGeometry(0.36, 0.06, 12, 24);
  fan1 = new THREE.Mesh(ringGeo, neonPinkMat);
  fan1.position.set(4.6, 2.6, 2.62);
  deskGroup.add(fan1);

  fan2 = new THREE.Mesh(ringGeo, neonPurpleMat);
  fan2.position.set(4.6, 1.6, 2.62);
  deskGroup.add(fan2);

  // 7. Desk Lamp with Glowing Head
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.1, 16), metalMat);
  lampBase.position.set(-4.5, 0.25, -1.5);
  deskGroup.add(lampBase);

  const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), metalMat);
  lampArm.position.set(-4.0, 1.4, -1.2);
  lampArm.rotation.z = -0.3;
  deskGroup.add(lampArm);

  const lampHead = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 16), screenBezelMat);
  lampHead.position.set(-3.5, 2.4, -0.9);
  lampHead.rotation.z = 1.1;
  lampHead.rotation.y = 0.4;
  deskGroup.add(lampHead);

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), neonPinkMat);
  bulb.position.copy(lampHead.position);
  deskGroup.add(bulb);

  // 8. Server Rack / Tech Shelf on Left Wall
  const rack = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 9.0, 3.5),
    new THREE.MeshStandardMaterial({ color: 0x18092c, roughness: 0.4, metalness: 0.8 })
  );
  rack.position.set(-11.2, 1.3, -4.0);
  rack.castShadow = true;
  roomGroup.add(rack);

  // Blinking Server Status LEDs
  for (let s = 0; s < 12; s++) {
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.08),
      new THREE.MeshBasicMaterial({ color: s % 3 === 0 ? 0x10b981 : 0xff2a85 })
    );
    led.position.set(-9.95, -1.8 + s * 0.55, -4.8 + (s % 4) * 0.5);
    roomGroup.add(led);
  }

  // 9. Floating Holographic Particles
  const particleCount = 180;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);

  const cPink = new THREE.Color(0xff2a85);
  const cPurple = new THREE.Color(0xa855f7);
  const cCyan = new THREE.Color(0x38bdf8);

  for (let p = 0; p < particleCount; p++) {
    particlePositions[p * 3] = (Math.random() - 0.5) * 28;
    particlePositions[p * 3 + 1] = Math.random() * 16 - 2;
    particlePositions[p * 3 + 2] = (Math.random() - 0.5) * 26;

    const chosen = Math.random() > 0.5 ? cPink : Math.random() > 0.5 ? cPurple : cCyan;
    particleColors[p * 3] = chosen.r;
    particleColors[p * 3 + 1] = chosen.g;
    particleColors[p * 3 + 2] = chosen.b;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.24,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });

  particlesMesh = new THREE.Points(particleGeo, particleMat);
  scene.add(particlesMesh);

  // Lower desk slightly for ideal framing
  deskGroup.position.set(0, -0.6, 0);

  // --- CAMERA NAVIGATION BETWEEN SECTIONS ---
  window.navigateTo3DSection = function (sectionId) {
    if (cameraViews[sectionId]) {
      currentSection = sectionId;
      targetCamPos.copy(cameraViews[sectionId].pos);
      targetCamLook.copy(cameraViews[sectionId].look);

      const statusEl = document.getElementById('camera-view-status');
      if (statusEl) {
        statusEl.textContent = cameraViews[sectionId].label;
      }
    }
  };

  // --- MOUSE PARALLAX & INTERACTION ---
  function onPointerMove(e) {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;

    mouse.targetX = x * 1.5;
    mouse.targetY = y * 1.0;
  }
  window.addEventListener('mousemove', onPointerMove, { passive: true });

  window.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        mouse.targetX = ((touch.clientX / window.innerWidth) * 2 - 1) * 1.2;
        mouse.targetY = -(((touch.clientY / window.innerHeight) * 2 - 1) * 0.8);
      }
    },
    { passive: true }
  );

  // Resize Handler
  function onResize() {
    width = container.clientWidth;
    height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener('resize', onResize);

  // --- ANIMATION RENDER LOOP ---
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Smooth Lerp Camera Transition toward target view
    camera.position.lerp(
      new THREE.Vector3(
        targetCamPos.x + mouse.x * 1.5,
        targetCamPos.y + mouse.y * 1.0,
        targetCamPos.z
      ),
      0.05
    );

    currentCamLook.lerp(targetCamLook, 0.05);
    camera.lookAt(currentCamLook);

    // Smooth mouse damping
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    // Subtle gentle desk breathing motion
    deskGroup.position.y = -0.6 + Math.sin(elapsedTime * 0.8) * 0.04;

    // Rotate PC fans
    fan1.rotation.z += 0.05;
    fan2.rotation.z -= 0.05;

    // Pulse lamp intensity
    pinkSpotLight.intensity = 3.0 + Math.sin(elapsedTime * 3.5) * 0.3;

    // Rotate holographic particles
    particlesMesh.rotation.y = elapsedTime * 0.03;
    particlesMesh.rotation.x = Math.sin(elapsedTime * 0.02) * 0.04;

    // Update dynamic terminal code screen
    updateCodeTexture(elapsedTime * 1000);

    renderer.render(scene, camera);
  }

  animate();
})();
