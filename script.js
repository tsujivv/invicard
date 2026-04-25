import * as THREE from 'three';

const canvas = document.querySelector('#scene');
const flipButton = document.querySelector('#flipButton');
const shareButton = document.querySelector('#shareButton');

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const cardWidth = 3.18;
const cardHeight = 4.62;
const cornerRadius = 0.22;
const cardDepth = 0.075;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.12, getCameraDistance());

const cardGroup = new THREE.Group();
scene.add(cardGroup);

const textureLoader = new THREE.TextureLoader();
const softGlow = textureLoader.load(makeGlowTexture());
softGlow.colorSpace = THREE.SRGBColorSpace;

const frontTexture = new THREE.CanvasTexture(drawFrontTexture());
frontTexture.colorSpace = THREE.SRGBColorSpace;
frontTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

const backTexture = new THREE.CanvasTexture(drawBackTexture());
backTexture.colorSpace = THREE.SRGBColorSpace;
backTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

const cardShape = makeRoundedRectShape(cardWidth, cardHeight, cornerRadius);
const cardGeometry = new THREE.ExtrudeGeometry(cardShape, {
  depth: cardDepth,
  bevelEnabled: true,
  bevelSegments: 10,
  bevelSize: 0.028,
  bevelThickness: 0.026,
  curveSegments: 22,
});
cardGeometry.center();

const cardBody = new THREE.Mesh(
  cardGeometry,
  new THREE.MeshPhysicalMaterial({
    color: 0xf3edf0,
    roughness: 0.42,
    metalness: 0.02,
    clearcoat: 0.65,
    clearcoatRoughness: 0.28,
    sheen: 0.34,
    sheenColor: new THREE.Color(0xffdce8),
  }),
);
cardBody.castShadow = true;
cardBody.receiveShadow = true;
cardGroup.add(cardBody);

const front = makeFace(frontTexture, cardDepth / 2 + 0.043, 0);
const back = makeFace(backTexture, -(cardDepth / 2 + 0.043), Math.PI);
cardGroup.add(front, back);

const rim = new THREE.Mesh(
  cardGeometry.clone(),
  new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.12,
    roughness: 0.2,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  }),
);
rim.scale.set(1.006, 1.006, 1.03);
cardGroup.add(rim);

const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(7.2, 7.2),
  new THREE.ShadowMaterial({ opacity: 0.18 }),
);
shadowPlane.position.set(0.06, -0.07, -0.48);
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

const glowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(6.5, 6.5),
  new THREE.MeshBasicMaterial({
    map: softGlow,
    transparent: true,
    opacity: 0.64,
    depthWrite: false,
  }),
);
glowPlane.position.set(0, 0, -1.35);
scene.add(glowPlane);

scene.add(new THREE.AmbientLight(0xffffff, 1.35));

const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
keyLight.position.set(-3.2, 4.8, 5.2);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const roseLight = new THREE.PointLight(0xff8bab, 12, 10, 2);
roseLight.position.set(2.7, -2.3, 3.6);
scene.add(roseLight);

const blueLight = new THREE.PointLight(0xb5c8ff, 5.5, 10, 2);
blueLight.position.set(-3, -1.7, 2.4);
scene.add(blueLight);

const sparkles = makeSparkles();
scene.add(sparkles);

let flipped = false;
let targetFlip = 0;
let currentFlip = 0;
let pointerX = 0;
let pointerY = 0;
let targetPointerX = 0;
let targetPointerY = 0;
let lastTap = 0;

function flipCard() {
  const now = performance.now();
  if (now - lastTap < 360) return;
  lastTap = now;
  flipped = !flipped;
  targetFlip += Math.PI;
  if (flipButton) {
    flipButton.textContent = flipped ? 'FLIP TO FRONT' : 'TAP CARD TO FLIP';
  }
}

canvas.addEventListener('pointerdown', flipCard);
flipButton?.addEventListener('click', flipCard);

window.addEventListener('pointermove', (event) => {
  targetPointerX = (event.clientX / window.innerWidth - 0.5) * 2;
  targetPointerY = (event.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

shareButton?.addEventListener('click', async () => {
  const title = 'FENNEL Invitation Card Demo';
  const text = '3D invitation card demo built for mobile event invitations.';
  const url = window.location.href;

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }

  await navigator.clipboard?.writeText(url);
  shareButton.textContent = 'COPIED';
  setTimeout(() => { shareButton.textContent = 'SHARE DEMO'; }, 1300);
});

function animate(time) {
  const t = time * 0.001;
  currentFlip += (targetFlip - currentFlip) * 0.08;
  pointerX += (targetPointerX - pointerX) * 0.06;
  pointerY += (targetPointerY - pointerY) * 0.06;

  cardGroup.rotation.y = currentFlip + pointerX * 0.08;
  cardGroup.rotation.x = -0.1 + pointerY * 0.06 + Math.sin(t * 1.2) * 0.018;
  cardGroup.rotation.z = -0.035 + Math.sin(t * 0.8) * 0.012;
  cardGroup.position.y = Math.sin(t * 1.1) * 0.055;

  sparkles.rotation.z = t * 0.025;
  sparkles.material.opacity = 0.46 + Math.sin(t * 1.4) * 0.08;

  glowPlane.material.opacity = 0.55 + Math.sin(t * 0.9) * 0.08;
  roseLight.intensity = 10 + Math.sin(t * 1.5) * 2.5;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  resizeScene();
});

resizeScene();

function resizeScene() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.position.z = getCameraDistance();
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function getCameraDistance() {
  const aspect = window.innerWidth / window.innerHeight;
  const fov = THREE.MathUtils.degToRad(36);
  const margin = window.innerWidth < 560 ? 1.22 : 1.12;
  const distanceForWidth = cardWidth / (2 * aspect * Math.tan(fov / 2));
  const distanceForHeight = cardHeight / (2 * Math.tan(fov / 2));
  return Math.max(distanceForWidth, distanceForHeight) * margin;
}

function makeFace(texture, z, rotationY) {
  const geometry = new THREE.PlaneGeometry(cardWidth - 0.08, cardHeight - 0.08, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = z;
  mesh.rotation.y = rotationY;
  return mesh;
}

function makeRoundedRectShape(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function drawFrontTexture() {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 1740;
  const ctx = c.getContext('2d');

  const bg = ctx.createLinearGradient(90, 0, 1110, 1740);
  bg.addColorStop(0, '#101013');
  bg.addColorStop(0.42, '#050506');
  bg.addColorStop(0.72, '#19171b');
  bg.addColorStop(1, '#070708');
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, c.width, c.height, 92);
  ctx.fill();

  const roseGlow = ctx.createRadialGradient(250, 260, 20, 340, 360, 940);
  roseGlow.addColorStop(0, 'rgba(255, 112, 159, 0.2)');
  roseGlow.addColorStop(0.45, 'rgba(255, 112, 159, 0.06)');
  roseGlow.addColorStop(1, 'rgba(255, 112, 159, 0)');
  ctx.fillStyle = roseGlow;
  ctx.fillRect(0, 0, c.width, c.height);

  const coolGlow = ctx.createRadialGradient(1040, 1450, 20, 870, 1220, 820);
  coolGlow.addColorStop(0, 'rgba(155, 170, 210, 0.18)');
  coolGlow.addColorStop(0.48, 'rgba(155, 170, 210, 0.05)');
  coolGlow.addColorStop(1, 'rgba(155, 170, 210, 0)');
  ctx.fillStyle = coolGlow;
  ctx.fillRect(0, 0, c.width, c.height);

  addNoise(ctx, c.width, c.height, 0.055);

  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    const x = 110 + i * 58;
    ctx.beginPath();
    ctx.moveTo(x, 130);
    ctx.lineTo(x + 280, 1610);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.58;
  ctx.strokeStyle = 'rgba(255,255,255,0.24)';
  ctx.lineWidth = 5;
  roundRect(ctx, 13, 13, c.width - 26, c.height - 26, 80);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '800 52px Arial, sans-serif';
  ctx.fillText('FENNEL', c.width / 2, c.height / 2);

  ctx.fillStyle = 'rgba(255,255,255,0.34)';
  ctx.font = '600 20px Arial, sans-serif';
  ctx.fillText('INVITATION CARD', c.width / 2, c.height / 2 + 54);

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(c.width / 2 - 150, c.height / 2 + 92);
  ctx.lineTo(c.width / 2 + 150, c.height / 2 + 92);
  ctx.stroke();
  ctx.restore();

  return c;
}

function drawBackTexture() {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 1740;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#d8d7d6';
  roundRect(ctx, 0, 0, c.width, c.height, 92);
  ctx.fill();

  const glow = ctx.createRadialGradient(300, 160, 10, 420, 400, 920);
  glow.addColorStop(0, 'rgba(255,255,255,0.58)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, c.width, c.height);

  addNoise(ctx, c.width, c.height, 0.055);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#2d2b2d';
  ctx.font = '900 90px "Yu Gothic", Arial, sans-serif';
  ctx.fillText('招待状', c.width / 2, 252);

  ctx.fillStyle = 'rgba(45,43,45,0.55)';
  ctx.font = '600 33px Arial, sans-serif';
  ctx.fillText('FENNEL VIP NIGHT', c.width / 2, 320);
  ctx.font = '500 28px Arial, sans-serif';
  ctx.fillText('Invitation-only event', c.width / 2, 368);

  ctx.strokeStyle = 'rgba(255,255,255,0.86)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(160, 450);
  ctx.lineTo(1040, 450);
  ctx.stroke();

  const rows = [
    ['DATE', '2026.07.15 Wed'],
    ['TIME', '19:00 - 22:00'],
    ['PLACE', 'FENNEL HQ Lounge'],
  ];
  rows.forEach(([key, value], index) => {
    const y = 560 + index * 125;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(45,43,45,0.42)';
    ctx.font = '700 32px Arial, sans-serif';
    ctx.fillText(key, 168, y);
    ctx.fillStyle = '#2d2b2d';
    ctx.font = '700 44px Arial, sans-serif';
    ctx.fillText(value, 380, y + 3);
  });

  drawMap(ctx, 170, 912, 860, 360);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(45,43,45,0.42)';
  ctx.font = '500 28px Arial, sans-serif';
  ctx.fillText('35.6585 N 139.7454 E', c.width / 2, 1368);
  ctx.font = '700 25px Arial, sans-serif';
  ctx.fillText('BY', c.width / 2, 1482);
  ctx.fillStyle = '#242225';
  ctx.font = '900 72px Arial Black, Arial, sans-serif';
  ctx.fillText('FENNEL', c.width / 2, 1575);

  ctx.save();
  ctx.globalAlpha = 0.62;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 4;
  roundRect(ctx, 13, 13, c.width - 26, c.height - 26, 80);
  ctx.stroke();
  ctx.restore();

  return c;
}

function makeSparkles() {
  const count = window.innerWidth < 560 ? 150 : 260;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    positions[i * 3] = THREE.MathUtils.randFloatSpread(5.2);
    positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(6.5);
    positions[i * 3 + 2] = THREE.MathUtils.randFloat(-0.2, 1.4);
    color.setHSL(THREE.MathUtils.randFloat(0.88, 0.98), 0.72, THREE.MathUtils.randFloat(0.72, 0.96));
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.026,
      vertexColors: true,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
}

function drawMap(ctx, x, y, width, height) {
  ctx.save();
  roundRect(ctx, x, y, width, height, 30);
  ctx.clip();

  const bg = ctx.createLinearGradient(x, y, x + width, y + height);
  bg.addColorStop(0, '#37334b');
  bg.addColorStop(1, '#211f32');
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, width, height);

  ctx.strokeStyle = 'rgba(153,151,184,0.28)';
  ctx.lineWidth = 13;
  const roads = [
    [[x - 20, y + 72], [x + 250, y + 210], [x + 520, y + 74], [x + width + 20, y + 96]],
    [[x + 80, y - 30], [x + 280, y + 210], [x + 360, y + height + 40]],
    [[x + 700, y - 20], [x + 620, y + 190], [x + 680, y + height + 30]],
    [[x + 40, y + 296], [x + 440, y + 270], [x + width + 40, y + 318]],
    [[x + 130, y + 28], [x + 108, y + 340]],
  ];
  roads.forEach((points) => {
    ctx.beginPath();
    points.forEach(([px, py], index) => {
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  });

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 16; i++) {
    const bx = x + 40 + (i % 4) * 210 + Math.random() * 24;
    const by = y + 30 + Math.floor(i / 4) * 84 + Math.random() * 14;
    ctx.strokeRect(bx, by, 112, 46);
  }

  const pinX = x + width / 2;
  const pinY = y + height / 2 - 8;
  const pinGlow = ctx.createRadialGradient(pinX, pinY, 0, pinX, pinY, 84);
  pinGlow.addColorStop(0, 'rgba(154, 137, 255, 0.72)');
  pinGlow.addColorStop(1, 'rgba(154, 137, 255, 0)');
  ctx.fillStyle = pinGlow;
  ctx.fillRect(pinX - 84, pinY - 84, 168, 168);

  ctx.fillStyle = '#9d8cff';
  ctx.beginPath();
  ctx.arc(pinX, pinY, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7f4ff';
  ctx.beginPath();
  ctx.arc(pinX, pinY, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.font = '700 18px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FENNEL HQ', pinX, pinY + 54);

  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function addNoise(ctx, width, height, alpha) {
  const noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = width;
  noiseCanvas.height = height;
  const noiseCtx = noiseCanvas.getContext('2d');
  const image = noiseCtx.createImageData(width, height);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = 210 + Math.random() * 45;
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = Math.random() * 255 * alpha;
  }
  noiseCtx.putImageData(image, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(noiseCanvas, 0, 0);
  ctx.restore();
}

function addVignette(ctx, width, height) {
  const gradient = ctx.createRadialGradient(width / 2, height / 2, 120, width / 2, height / 2, 900);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(1, 'rgba(84,38,60,0.18)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, 'rgba(255,255,255,0.86)');
  g.addColorStop(0.34, 'rgba(255,204,221,0.38)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  return c.toDataURL('image/png');
}
