import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const TOTAL_FRAMES = 60;
const WIDTH = 1200;
const HEIGHT = 800; // Optimal 3:2 ratio for both desktop and mobile framing
const OUTPUT_DIR = path.resolve('public', 'frames');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function generateCarSVG(frameIndex, totalFrames) {
  // Start facing 3/4 front luxury hero angle on Frame 1 (so initial view is striking, illuminated, dynamic)
  const angleOffset = -0.40;
  const angle = (frameIndex / totalFrames) * Math.PI * 2 + angleOffset;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  
  // Center coordinates - elevated slightly for turntable stance
  const centerX = WIDTH / 2;
  const centerY = HEIGHT / 2 + 30;
  
  // Supercar Proportions
  const length = 560;
  const width = 270;
  const height = 145;
  
  // 3D perspective projection
  const project = (x, y, z) => {
    const rx = x * cos - z * sin;
    const rz = x * sin + z * cos;
    const ry = y;
    
    const fov = 900;
    const scale = fov / (fov + rz + 320);
    return {
      x: centerX + rx * scale,
      y: centerY + ry * scale,
      z: rz,
      scale: scale
    };
  };

  // 3D Key Points
  const pFrontNose = project(length * 0.52, 36, 0);
  const pFrontBumperL = project(length * 0.48, 42, width * 0.38);
  const pFrontBumperR = project(length * 0.48, 42, -width * 0.38);
  
  const pFrontHoodL = project(length * 0.36, -6, width * 0.40);
  const pFrontHoodR = project(length * 0.36, -6, -width * 0.40);
  const pFrontHoodCenter = project(length * 0.39, -8, 0);

  const pWindshieldBaseL = project(length * 0.14, -22, width * 0.36);
  const pWindshieldBaseR = project(length * 0.14, -22, -width * 0.36);
  
  const pWindshieldTopL = project(length * 0.00, -height * 0.88, width * 0.29);
  const pWindshieldTopR = project(length * 0.00, -height * 0.88, -width * 0.29);
  
  const pRoofRearL = project(-length * 0.28, -height * 0.90, width * 0.28);
  const pRoofRearR = project(-length * 0.28, -height * 0.90, -width * 0.28);

  const pRearDeckL = project(-length * 0.42, -22, width * 0.38);
  const pRearDeckR = project(-length * 0.42, -22, -width * 0.38);

  const pRearSpoilerL = project(-length * 0.50, -height * 0.52, width * 0.43);
  const pRearSpoilerR = project(-length * 0.50, -height * 0.52, -width * 0.43);
  
  const pRearBumperL = project(-length * 0.51, 44, width * 0.41);
  const pRearBumperR = project(-length * 0.51, 44, -width * 0.41);

  // Wheels 3D Positions
  const wheelFL = project(length * 0.29, 44, width * 0.45);
  const wheelFR = project(length * 0.29, 44, -width * 0.45);
  const wheelRL = project(-length * 0.29, 44, width * 0.45);
  const wheelRR = project(-length * 0.29, 44, -width * 0.45);

  const wheels = [
    { name: 'FL', p: wheelFL, front: true, left: true },
    { name: 'FR', p: wheelFR, front: true, left: false },
    { name: 'RL', p: wheelRL, front: false, left: true },
    { name: 'RR', p: wheelRR, front: false, left: false }
  ].sort((a, b) => a.p.z - b.p.z);

  // Front / Rear facing detection
  const isFrontFacing = cos > -0.25;
  const isRearFacing = cos < 0.25;
  const headlightGlowOpacity = Math.max(0.3, Math.min(1.0, cos * 0.85 + 0.4));
  const taillightGlowOpacity = Math.max(0.3, Math.min(1.0, -cos * 0.85 + 0.4));

  const svg = `
  <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Bright, High-Contrast Luxury Studio Background -->
      <radialGradient id="studioLighting" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#2d3748" />
        <stop offset="35%" stop-color="#1a202c" />
        <stop offset="70%" stop-color="#10141d" />
        <stop offset="100%" stop-color="#0a0d14" />
      </radialGradient>

      <!-- Radiant 360 Turntable Glass Glow -->
      <radialGradient id="turntableGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.65" />
        <stop offset="30%" stop-color="#0284c7" stop-opacity="0.45" />
        <stop offset="70%" stop-color="#1e293b" stop-opacity="0.3" />
        <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
      </radialGradient>

      <!-- Metallic Liquid Platinum / Titanium Car Paint -->
      <linearGradient id="bodyPaint" x1="10%" y1="0%" x2="90%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="15%" stop-color="#e2e8f0" />
        <stop offset="38%" stop-color="#94a3b8" />
        <stop offset="65%" stop-color="#475569" />
        <stop offset="85%" stop-color="#cbd5e1" />
        <stop offset="100%" stop-color="#334155" />
      </linearGradient>

      <!-- Bright Hood Glare Reflection -->
      <linearGradient id="hoodSheen" x1="0%" y1="0%" x2="100%" y2="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
        <stop offset="45%" stop-color="#93c5fd" stop-opacity="0.6" />
        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
      </linearGradient>

      <!-- Cockpit Tinted Glass -->
      <linearGradient id="glassCockpit" x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stop-color="#bae6fd" stop-opacity="0.9" />
        <stop offset="25%" stop-color="#38bdf8" stop-opacity="0.5" />
        <stop offset="65%" stop-color="#0f172a" stop-opacity="0.85" />
        <stop offset="100%" stop-color="#020617" stop-opacity="0.98" />
      </linearGradient>

      <!-- Intense Projector Headlight Beam -->
      <linearGradient id="headlightBeam" x1="0%" y1="50%" x2="100%" y2="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="1.0" />
        <stop offset="20%" stop-color="#38bdf8" stop-opacity="0.85" />
        <stop offset="65%" stop-color="#0284c7" stop-opacity="0.3" />
        <stop offset="100%" stop-color="#0284c7" stop-opacity="0" />
      </linearGradient>

      <!-- Crimson Laser Taillight Flare -->
      <linearGradient id="laserBeam" x1="0%" y1="50%" x2="100%" y2="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
        <stop offset="20%" stop-color="#f87171" stop-opacity="0.9" />
        <stop offset="60%" stop-color="#dc2626" stop-opacity="0.4" />
        <stop offset="100%" stop-color="#991b1b" stop-opacity="0" />
      </linearGradient>

      <!-- Glow Filters -->
      <filter id="intenseGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>

      <filter id="floorShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="18" result="blur" />
      </filter>
    </defs>

    <!-- Studio Backing -->
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#studioLighting)" />

    <!-- Overhead Studio Softbox Light Banks -->
    <g opacity="0.35">
      <ellipse cx="${centerX}" cy="${centerY - 290}" rx="420" ry="30" fill="#ffffff" filter="url(#intenseGlow)" />
      <rect x="${centerX - 350}" y="${centerY - 300}" width="700" height="12" fill="#ffffff" rx="6" />
      <circle cx="${centerX - 340}" cy="${centerY - 290}" r="15" fill="#38bdf8" filter="url(#intenseGlow)" />
      <circle cx="${centerX + 340}" cy="${centerY - 290}" r="15" fill="#38bdf8" filter="url(#intenseGlow)" />
    </g>

    <!-- Showroom 360 Illuminated Turntable Platform -->
    <ellipse cx="${centerX}" cy="${centerY + 76}" rx="520" ry="125" fill="url(#turntableGlow)" />
    <ellipse cx="${centerX}" cy="${centerY + 76}" rx="520" ry="125" fill="none" stroke="#38bdf8" stroke-width="2.5" opacity="0.8" filter="url(#intenseGlow)" />
    <ellipse cx="${centerX}" cy="${centerY + 76}" rx="440" ry="105" fill="none" stroke="#60a5fa" stroke-width="1.5" stroke-dasharray="12 8" opacity="0.7" />
    <ellipse cx="${centerX}" cy="${centerY + 76}" rx="350" ry="85" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.6" />

    <!-- Ground Contact Shadow -->
    <ellipse cx="${centerX}" cy="${centerY + 68}" rx="390" ry="70" fill="#000000" opacity="0.95" filter="url(#floorShadow)" />

    <!-- Floor Light Projections -->
    ${isFrontFacing ? `
      <polygon points="
        ${pFrontBumperL.x},${pFrontBumperL.y} 
        ${pFrontBumperR.x},${pFrontBumperR.y} 
        ${pFrontBumperR.x + cos * 380 + 190},${pFrontBumperR.y + 110} 
        ${pFrontBumperL.x + cos * 380 - 190},${pFrontBumperL.y + 110}
      " fill="url(#headlightBeam)" opacity="${headlightGlowOpacity * 0.75}" filter="url(#intenseGlow)" />
    ` : ''}

    ${isRearFacing ? `
      <polygon points="
        ${pRearBumperL.x},${pRearBumperL.y} 
        ${pRearBumperR.x},${pRearBumperR.y} 
        ${pRearBumperR.x - cos * 300 + 140},${pRearBumperR.y + 90} 
        ${pRearBumperL.x - cos * 300 - 140},${pRearBumperL.y + 90}
      " fill="url(#laserBeam)" opacity="${taillightGlowOpacity * 0.8}" filter="url(#intenseGlow)" />
    ` : ''}

    <!-- Background Wheels -->
    ${wheels.slice(0, 2).map(w => renderWheel(w)).join('')}

    <!-- ==================== MAIN CAR BODY ==================== -->
    <g id="car-body">
      <!-- Carbon Ground Diffuser -->
      <polygon points="
        ${pFrontBumperL.x},${pFrontBumperL.y + 16}
        ${pFrontHoodL.x},${pFrontHoodL.y + 22}
        ${pWindshieldBaseL.x},${pWindshieldBaseL.y + 40}
        ${pRoofRearL.x},${pRoofRearL.y + 46}
        ${pRearDeckL.x},${pRearDeckL.y + 36}
        ${pRearBumperL.x},${pRearBumperL.y + 18}
        ${pRearBumperR.x},${pRearBumperR.y + 18}
        ${pRearDeckR.x},${pRearDeckR.y + 36}
        ${pRoofRearR.x},${pRoofRearR.y + 46}
        ${pWindshieldBaseR.x},${pWindshieldBaseR.y + 40}
        ${pFrontHoodR.x},${pFrontHoodR.y + 22}
        ${pFrontBumperR.x},${pFrontBumperR.y + 16}
      " fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />

      <!-- Main Body Shell (Liquid Platinum) -->
      <polygon points="
        ${pFrontNose.x},${pFrontNose.y}
        ${pFrontHoodL.x},${pFrontHoodL.y}
        ${pWindshieldBaseL.x},${pWindshieldBaseL.y}
        ${pRoofRearL.x},${pRoofRearL.y + 16}
        ${pRearDeckL.x},${pRearDeckL.y}
        ${pRearSpoilerL.x},${pRearSpoilerL.y + 20}
        ${pRearBumperL.x},${pRearBumperL.y}
        ${pRearBumperR.x},${pRearBumperR.y}
        ${pRearSpoilerR.x},${pRearSpoilerR.y + 20}
        ${pRearDeckR.x},${pRearDeckR.y}
        ${pRoofRearR.x},${pRoofRearR.y + 16}
        ${pWindshieldBaseR.x},${pWindshieldBaseR.y}
        ${pFrontHoodR.x},${pFrontHoodR.y}
      " fill="url(#bodyPaint)" stroke="#f1f5f9" stroke-width="2.5" />

      <!-- Hood Specular Crest -->
      <polygon points="
        ${pFrontNose.x},${pFrontNose.y - 3}
        ${pFrontHoodCenter.x - 24},${pFrontHoodCenter.y}
        ${(pWindshieldBaseL.x + pWindshieldBaseR.x) / 2},${(pWindshieldBaseL.y + pWindshieldBaseR.y) / 2}
        ${pFrontHoodCenter.x + 24},${pFrontHoodCenter.y}
      " fill="url(#hoodSheen)" opacity="0.9" />

      <!-- Canopy Glass -->
      <polygon points="
        ${pWindshieldBaseL.x},${pWindshieldBaseL.y}
        ${pWindshieldTopL.x},${pWindshieldTopL.y}
        ${pRoofRearL.x},${pRoofRearL.y}
        ${pRearDeckL.x * 0.7 + pRoofRearL.x * 0.3},${pRearDeckL.y * 0.7 + pRoofRearL.y * 0.3}
        ${pRearDeckR.x * 0.7 + pRoofRearR.x * 0.3},${pRearDeckR.y * 0.7 + pRoofRearR.y * 0.3}
        ${pRoofRearR.x},${pRoofRearR.y}
        ${pWindshieldTopR.x},${pWindshieldTopR.y}
        ${pWindshieldBaseR.x},${pWindshieldBaseR.y}
      " fill="url(#glassCockpit)" stroke="#7dd3fc" stroke-width="2" />

      <!-- Windshield Top Sunstrip / Glare Highlight -->
      <line 
        x1="${pWindshieldTopL.x}" y1="${pWindshieldTopL.y}" 
        x2="${pWindshieldTopR.x}" y2="${pWindshieldTopR.y}" 
        stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="1.0" filter="url(#intenseGlow)" 
      />

      <!-- Rear Carbon Aero Wing -->
      <polygon points="
        ${pRearSpoilerL.x - 18},${pRearSpoilerL.y - 14}
        ${pRearSpoilerR.x + 18},${pRearSpoilerR.y - 14}
        ${pRearSpoilerR.x + 22},${pRearSpoilerR.y - 4}
        ${pRearSpoilerL.x - 22},${pRearSpoilerL.y - 4}
      " fill="#020617" stroke="#38bdf8" stroke-width="2" />
      <line x1="${pRearSpoilerL.x + 24}" y1="${pRearSpoilerL.y - 4}" x2="${pRearDeckL.x + 24}" y2="${pRearDeckL.y}" stroke="#334155" stroke-width="5" />
      <line x1="${pRearSpoilerR.x - 24}" y1="${pRearSpoilerR.y - 4}" x2="${pRearDeckR.x - 24}" y2="${pRearDeckR.y}" stroke="#334155" stroke-width="5" />

      <!-- Front Grille & Matrix Headlights -->
      ${isFrontFacing ? `
        <!-- Aggressive Front Air Dam -->
        <polygon points="
          ${pFrontBumperL.x + 14},${pFrontBumperL.y + 8}
          ${pFrontNose.x},${pFrontNose.y + 10}
          ${pFrontBumperR.x - 14},${pFrontBumperR.y + 8}
          ${pFrontBumperR.x - 24},${pFrontBumperR.y + 28}
          ${pFrontNose.x},${pFrontNose.y + 30}
          ${pFrontBumperL.x + 24},${pFrontBumperL.y + 28}
        " fill="#090d16" stroke="#475569" stroke-width="2" />

        <!-- Chrome CYR Front Luxury Emblem -->
        <circle cx="${pFrontNose.x}" cy="${pFrontNose.y + 18}" r="8" fill="#f8fafc" stroke="#38bdf8" stroke-width="1.5" filter="url(#intenseGlow)" />
        <text x="${pFrontNose.x}" y="${yOffset(pFrontNose.y + 21.5)}" fill="#020617" font-family="sans-serif" font-size="7" font-weight="900" text-anchor="middle">CYR</text>

        <!-- Left Headlight Array -->
        <polygon points="
          ${pFrontBumperL.x + 4},${pFrontBumperL.y - 4}
          ${pFrontHoodL.x * 0.7 + pFrontBumperL.x * 0.3},${pFrontHoodL.y * 0.7 + pFrontBumperL.y * 0.3}
          ${pFrontHoodL.x * 0.5 + pFrontBumperL.x * 0.5 + 18},${pFrontHoodL.y * 0.5 + pFrontBumperL.y * 0.5 + 10}
        " fill="#ffffff" filter="url(#intenseGlow)" opacity="${headlightGlowOpacity}" />
        <circle cx="${pFrontBumperL.x + 16}" cy="${pFrontBumperL.y + 2}" r="6" fill="#38bdf8" filter="url(#intenseGlow)" />
        <circle cx="${pFrontBumperL.x + 16}" cy="${pFrontBumperL.y + 2}" r="2.5" fill="#ffffff" />

        <!-- Right Headlight Array -->
        <polygon points="
          ${pFrontBumperR.x - 4},${pFrontBumperR.y - 4}
          ${pFrontHoodR.x * 0.7 + pFrontBumperR.x * 0.3},${pFrontHoodR.y * 0.7 + pFrontBumperR.y * 0.3}
          ${pFrontHoodR.x * 0.5 + pFrontBumperR.x * 0.5 - 18},${pFrontHoodR.y * 0.5 + pFrontBumperR.y * 0.5 + 10}
        " fill="#ffffff" filter="url(#intenseGlow)" opacity="${headlightGlowOpacity}" />
        <circle cx="${pFrontBumperR.x - 16}" cy="${pFrontBumperR.y + 2}" r="6" fill="#38bdf8" filter="url(#intenseGlow)" />
        <circle cx="${pFrontBumperR.x - 16}" cy="${pFrontBumperR.y + 2}" r="2.5" fill="#ffffff" />

        <!-- Full-Width LED DRL Brow -->
        <path d="M ${pFrontBumperL.x + 6},${pFrontBumperL.y - 6} Q ${pFrontNose.x},${pFrontNose.y - 4} ${pFrontBumperR.x - 6},${pFrontBumperR.y - 6}" stroke="#ffffff" stroke-width="3.5" fill="none" opacity="${headlightGlowOpacity}" filter="url(#intenseGlow)" />
      ` : ''}

      <!-- Rear Lightbar & Quad Exhaust -->
      ${isRearFacing ? `
        <!-- Quad Titanium Exhaust Pipes -->
        <circle cx="${(pRearBumperL.x + pRearBumperR.x)/2 - 38}" cy="${(pRearBumperL.y + pRearBumperR.y)/2 + 24}" r="10" fill="#020617" stroke="#cbd5e1" stroke-width="3" />
        <circle cx="${(pRearBumperL.x + pRearBumperR.x)/2 - 16}" cy="${(pRearBumperL.y + pRearBumperR.y)/2 + 24}" r="10" fill="#020617" stroke="#cbd5e1" stroke-width="3" />
        <circle cx="${(pRearBumperL.x + pRearBumperR.x)/2 + 16}" cy="${(pRearBumperL.y + pRearBumperR.y)/2 + 24}" r="10" fill="#020617" stroke="#cbd5e1" stroke-width="3" />
        <circle cx="${(pRearBumperL.x + pRearBumperR.x)/2 + 38}" cy="${(pRearBumperL.y + pRearBumperR.y)/2 + 24}" r="10" fill="#020617" stroke="#cbd5e1" stroke-width="3" />

        <!-- Glowing Crimson Tailbar -->
        <line x1="${pRearBumperL.x + 10}" y1="${pRearBumperL.y - 3}" x2="${pRearBumperR.x - 10}" y2="${pRearBumperR.y - 3}" stroke="#ef4444" stroke-width="6" opacity="${taillightGlowOpacity}" filter="url(#intenseGlow)" />
        <line x1="${pRearBumperL.x + 20}" y1="${pRearBumperL.y - 3}" x2="${pRearBumperR.x - 20}" y2="${pRearBumperR.y - 3}" stroke="#ffffff" stroke-width="2.5" opacity="${taillightGlowOpacity}" />
      ` : ''}
    </g>

    <!-- Foreground Wheels -->
    ${wheels.slice(2).map(w => renderWheel(w)).join('')}

    <!-- Showroom Telemetry Watermark -->
    <g opacity="0.85">
      <text x="45" y="55" fill="#f8fafc" font-family="sans-serif" font-size="14" font-weight="700" letter-spacing="3">CYR CARS // LUXURY SHOWROOM</text>
      <text x="45" y="75" fill="#38bdf8" font-family="sans-serif" font-size="11" font-weight="600" letter-spacing="1.5">360° PRECISION VIEW • ${Math.round((((frameIndex / totalFrames) * 360)) % 360)}° • FRAME ${String(frameIndex + 1).padStart(2, '0')}/${totalFrames}</text>
    </g>
  </svg>
  `;

  return svg;
}

function yOffset(val) {
  return Number(val).toFixed(2);
}

function renderWheel(w) {
  const r = 32 * w.p.scale;
  const rimColor = '#0f172a';
  const spokeColor = '#f8fafc';
  const caliperColor = '#f59e0b';
  
  return `
    <g id="wheel-${w.name}">
      <!-- Performance Sport Tire -->
      <ellipse cx="${w.p.x}" cy="${w.p.y}" rx="${r}" ry="${r * 0.96}" fill="#020617" stroke="#475569" stroke-width="3" />
      
      <!-- Billet Alloy Rim -->
      <ellipse cx="${w.p.x}" cy="${w.p.y}" rx="${r * 0.78}" ry="${r * 0.78 * 0.96}" fill="${rimColor}" stroke="#cbd5e1" stroke-width="2.5" />
      
      <!-- Brembo Amber Caliper -->
      <rect x="${w.p.x - r * 0.40}" y="${w.p.y - r * 0.48}" width="${r * 0.38}" height="${r * 0.52}" rx="3" fill="${caliperColor}" stroke="#ffffff" stroke-width="1" />
      
      <!-- Slotted Carbon Disc -->
      <circle cx="${w.p.x}" cy="${w.p.y}" r="${r * 0.56}" fill="#1e293b" stroke="#64748b" stroke-width="1" stroke-dasharray="3 3" />
      
      <!-- 5-Spoke Split Star Wheels -->
      <circle cx="${w.p.x}" cy="${w.p.y}" r="${r * 0.24}" fill="#0284c7" />
      <line x1="${w.p.x}" y1="${w.p.y - r * 0.72}" x2="${w.p.x}" y2="${w.p.y + r * 0.72}" stroke="${spokeColor}" stroke-width="2.8" />
      <line x1="${w.p.x - r * 0.68}" y1="${w.p.y - r * 0.24}" x2="${w.p.x + r * 0.68}" y2="${w.p.y + r * 0.24}" stroke="${spokeColor}" stroke-width="2.8" />
      <line x1="${w.p.x - r * 0.44}" y1="${w.p.y + r * 0.56}" x2="${w.p.x + r * 0.44}" y2="${w.p.y - r * 0.56}" stroke="${spokeColor}" stroke-width="2.8" />
      
      <!-- Chrome Center Lock Lug -->
      <circle cx="${w.p.x}" cy="${w.p.y}" r="${r * 0.14}" fill="#ffffff" stroke="#38bdf8" stroke-width="1.5" />
    </g>
  `;
}

async function run() {
  console.log(`Generating ${TOTAL_FRAMES} high-visibility luxury frames into ${OUTPUT_DIR}...`);
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const frameNumber = String(i + 1).padStart(4, '0');
    const svgString = generateCarSVG(i, TOTAL_FRAMES);
    const outputPath = path.join(OUTPUT_DIR, `frame_${frameNumber}.webp`);
    
    await sharp(Buffer.from(svgString))
      .webp({ quality: 95, effort: 4 })
      .toFile(outputPath);
      
    if ((i + 1) % 15 === 0 || i === TOTAL_FRAMES - 1) {
      console.log(`Rendered frame ${i + 1}/${TOTAL_FRAMES}`);
    }
  }
  console.log('All luxury 360-degree animation frames generated successfully!');
}

run().catch(console.error);
