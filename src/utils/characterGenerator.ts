import { Character, Archetype } from '../types/game';

interface GeneratorOptions {
  name?: string;
  archetype?: Archetype;
  gender?: 'boy' | 'girl' | 'other';
  themePrompt?: string;
  primaryColor?: string;
}

const ARCHETYPES: Archetype[] = ['Brawler', 'Speedster', 'Grappler', 'Tactician', 'Blossom Striker'];

const BOY_NAMES = ['Ren', 'Daiki', 'Hiro', 'Sora', 'Kaito', 'Takeshi', 'Zen', 'Shin', 'Leo', 'Akira', 'Riku'];
const GIRL_NAMES = ['Yuki', 'Kasumi', 'Mei', 'Rei', 'Kira', 'Noa', 'Chiyo', 'Rin', 'Hoshiko', 'Saki', 'Miyuki'];
const TITLES = [
  'The Blazing Fist', 'Crimson Comet', 'Shadow Striker', 'Lotus Blade', 'Electro Maestro',
  'Solar Pugilist', 'Nebula Drifter', 'Silent Tempest', 'Iron Heart', 'Cherry Blossom Wind'
];

const SPECIAL_MOVES = [
  { name: 'Radiant Blossom Flash', quote: 'Watch the petals ignite the sky!', damage: 42, icon: 'star' },
  { name: 'Inferno Dragon Smash', quote: 'Feel the heat of a thousand dragons!', damage: 45, icon: 'fist' },
  { name: 'Vortex Crescent Kick', quote: 'A single step, an unstoppable whirlwind!', damage: 38, icon: 'kick' },
  { name: 'Cosmic Pulse Wave', quote: 'The stars align for my victory!', damage: 40, icon: 'star' },
  { name: 'Phantom Shadow Mirage', quote: 'You strike where I once stood.', damage: 39, icon: 'blade' },
  { name: 'Hyper Sonic Driver', quote: 'Breaking the sound barrier!', damage: 44, icon: 'fist' },
];

const PALETTES = [
  { primary: '#ec4899', secondary: '#f472b6', hair: '#3b2518', outfit: '#fdf2f8', aura: '#fb7185' }, // Pink / Sakura
  { primary: '#3b82f6', secondary: '#60a5fa', hair: '#1e293b', outfit: '#ffffff', aura: '#38bdf8' }, // Blue / Hero
  { primary: '#10b981', secondary: '#34d399', hair: '#064e3b', outfit: '#ecfdf5', aura: '#34d399' }, // Emerald / Jade
  { primary: '#f59e0b', secondary: '#fbbf24', hair: '#78350f', outfit: '#fef3c7', aura: '#fbbf24' }, // Amber / Thunder
  { primary: '#8b5cf6', secondary: '#a78bfa', hair: '#2e1065', outfit: '#f3e8ff', aura: '#c084fc' }, // Violet / Astral
  { primary: '#ef4444', secondary: '#f87171', hair: '#1c1917', outfit: '#fee2e2', aura: '#f87171' }, // Crimson / Fire
  { primary: '#06b6d4', secondary: '#22d3ee', hair: '#083344', outfit: '#cffafe', aura: '#67e8f9' }, // Cyan / Ice
];

export function generateProceduralCharacter(options: GeneratorOptions = {}): Character {
  const gender = options.gender || (Math.random() > 0.5 ? 'boy' : 'girl');
  const nameList = gender === 'boy' ? BOY_NAMES : GIRL_NAMES;
  const name = options.name?.trim() || nameList[Math.floor(Math.random() * nameList.length)];
  const archetype = options.archetype || ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
  const title = TITLES[Math.floor(Math.random() * TITLES.length)];

  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  if (options.primaryColor) {
    palette.primary = options.primaryColor;
  }

  // Archetype stat tuning
  let health = 105;
  let attack = 12;
  let speed = 10;
  let defense = 10;
  let superPower = 36;

  switch (archetype) {
    case 'Brawler':
      health = 115;
      attack = 15;
      speed = 9;
      defense = 11;
      superPower = 38;
      break;
    case 'Speedster':
      health = 95;
      attack = 11;
      speed = 15;
      defense = 8;
      superPower = 35;
      break;
    case 'Grappler':
      health = 125;
      attack = 16;
      speed = 7;
      defense = 14;
      superPower = 40;
      break;
    case 'Tactician':
      health = 100;
      attack = 12;
      speed = 11;
      defense = 12;
      superPower = 42;
      break;
    case 'Blossom Striker':
      health = 102;
      attack = 13;
      speed = 13;
      defense = 10;
      superPower = 44;
      break;
  }

  // Add subtle variation
  health += Math.floor(Math.random() * 7) - 3;
  attack += Math.floor(Math.random() * 3) - 1;
  speed += Math.floor(Math.random() * 3) - 1;

  const specTemplate = SPECIAL_MOVES[Math.floor(Math.random() * SPECIAL_MOVES.length)];

  const kartNames = [
    `${name}'s Turbo ${archetype}`,
    `${archetype} Speeder V2`,
    `Apex ${name} Roadster`,
    `Aero ${archetype} GT`,
    `Chibi Drift ${name}`
  ];

  return {
    id: `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name,
    title,
    gender,
    archetype,
    stats: {
      health,
      attack,
      speed,
      defense,
      superPower,
    },
    colors: {
      primary: palette.primary,
      secondary: palette.secondary,
      hair: palette.hair,
      skin: gender === 'boy' ? '#fbd3b6' : '#ffe4e6',
      outfit: palette.outfit,
      aura: palette.aura,
    },
    specialMove: {
      name: options.themePrompt ? `${options.themePrompt.slice(0, 15)} Burst` : specTemplate.name,
      description: `Unleashes powerful inner ${archetype.toLowerCase()} energy to dominate the arena.`,
      quote: specTemplate.quote,
      damage: specTemplate.damage + (attack > 14 ? 4 : 0),
      icon: specTemplate.icon,
    },
    kart: {
      modelName: kartNames[Math.floor(Math.random() * kartNames.length)],
      color: palette.primary,
      topSpeed: 7.5 + (speed / 15) * 2.0,
      acceleration: 0.18 + (attack / 20) * 0.1,
      handling: 0.05 + (speed / 15) * 0.035,
    },
    lore: options.themePrompt
      ? `Born from the inspiration: "${options.themePrompt}". An elite ${archetype} fighter ready to dominate both fighting rings and race tracks.`
      : `A custom-forged ${archetype} hero. Known for unwavering determination and peerless martial spirit.`,
    wins: 0,
    losses: 0,
    aiBehavior: ['aggressive', 'defensive', 'balanced', 'erratic'][Math.floor(Math.random() * 4)] as 'aggressive' | 'defensive' | 'balanced' | 'erratic',
    isCustom: true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Renders a crisp anime chibi character portrait onto a 2D canvas
 */
export function drawCharacterAvatarToCanvas(
  ctx: CanvasRenderingContext2D,
  char: Character,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);

  // Background radial glow
  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, width / 2);
  bgGrad.addColorStop(0, `${char.colors.primary}33`);
  bgGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Aura Ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, width * 0.44, 0, Math.PI * 2);
  ctx.strokeStyle = char.colors.primary;
  ctx.lineWidth = 4;
  ctx.shadowColor = char.colors.aura;
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();

  const centerX = width / 2;
  const headY = height * 0.42;
  const headRadius = width * 0.22;

  // Body / Clothes
  ctx.fillStyle = char.colors.outfit;
  ctx.beginPath();
  ctx.ellipse(centerX, height * 0.78, width * 0.24, height * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#1e293b';
  ctx.stroke();

  // Collar / Belt
  ctx.fillStyle = char.colors.primary;
  ctx.beginPath();
  ctx.rect(centerX - width * 0.16, height * 0.76, width * 0.32, height * 0.06);
  ctx.fill();

  // Head / Face
  ctx.fillStyle = char.colors.skin;
  ctx.beginPath();
  ctx.arc(centerX, headY, headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#334155';
  ctx.stroke();

  // Hair Base & Spikes / Ponytail
  ctx.fillStyle = char.colors.hair;
  ctx.beginPath();
  ctx.arc(centerX, headY - 4, headRadius + 2, Math.PI * 0.85, Math.PI * 2.15, false);
  ctx.fill();

  // Front bangs
  ctx.beginPath();
  ctx.moveTo(centerX - headRadius, headY - 8);
  ctx.quadraticCurveTo(centerX - 8, headY + 4, centerX, headY - 2);
  ctx.quadraticCurveTo(centerX + 12, headY + 6, centerX + headRadius, headY - 8);
  ctx.quadraticCurveTo(centerX + 6, headY - headRadius, centerX, headY - headRadius - 4);
  ctx.quadraticCurveTo(centerX - 6, headY - headRadius, centerX - headRadius, headY - 8);
  ctx.fill();

  if (char.gender === 'girl') {
    // Ponytail on side
    ctx.beginPath();
    ctx.ellipse(centerX + headRadius * 0.9, headY - headRadius * 0.3, width * 0.12, width * 0.22, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    // Ribbon
    ctx.fillStyle = char.colors.primary;
    ctx.beginPath();
    ctx.arc(centerX + headRadius * 0.65, headY - headRadius * 0.45, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Spiky boy hair tufts
    ctx.beginPath();
    ctx.moveTo(centerX - 16, headY - headRadius - 2);
    ctx.lineTo(centerX - 8, headY - headRadius - 14);
    ctx.lineTo(centerX, headY - headRadius - 3);
    ctx.lineTo(centerX + 10, headY - headRadius - 16);
    ctx.lineTo(centerX + 18, headY - headRadius - 2);
    ctx.fill();
  }

  // Eyes (Chibi Anime Style)
  const eyeY = headY + 4;
  const eyeOffsetX = width * 0.08;
  const eyeRadius = width * 0.045;

  // Sclera/Pupils
  [centerX - eyeOffsetX, centerX + eyeOffsetX].forEach((x) => {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x, eyeY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Eye color tint
    ctx.fillStyle = char.colors.primary;
    ctx.beginPath();
    ctx.arc(x, eyeY + 2, eyeRadius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Eye highlight gleam
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 2, eyeY - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Eyebrows
  ctx.strokeStyle = char.colors.hair;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(centerX - eyeOffsetX - 6, eyeY - 8);
  ctx.lineTo(centerX - eyeOffsetX + 6, eyeY - 6);
  ctx.moveTo(centerX + eyeOffsetX - 6, eyeY - 6);
  ctx.lineTo(centerX + eyeOffsetX + 6, eyeY - 8);
  ctx.stroke();

  // Cute blush cheeks
  ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
  ctx.beginPath();
  ctx.ellipse(centerX - eyeOffsetX - 4, eyeY + 8, 6, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(centerX + eyeOffsetX + 4, eyeY + 8, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Determined mouth
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 4, eyeY + 12);
  ctx.quadraticCurveTo(centerX, eyeY + 15, centerX + 4, eyeY + 12);
  ctx.stroke();
}
