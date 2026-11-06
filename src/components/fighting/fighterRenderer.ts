import { Character } from '../../types/game';

export interface FighterState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: 1 | -1; // 1 = right, -1 = left
  isGrounded: boolean;
  action: 'idle' | 'walk' | 'jump' | 'crouch' | 'punch' | 'kick' | 'guard' | 'super' | 'hurt' | 'ko';
  actionTimer: number;
  actionDuration: number;
  health: number;
  maxHealth: number;
  superMeter: number; // 0 - 100
  isBlocking: boolean;
  comboCount: number;
  comboResetTimer: number;
  hitStun: number;
  character: Character;
  isAI: boolean;
}

export function drawFighter(
  ctx: CanvasRenderingContext2D,
  fighter: FighterState,
  groundY: number,
  timeMs: number
) {
  const { x, y, facing, action, actionTimer, actionDuration, character, isBlocking } = fighter;
  const isHurt = action === 'hurt';
  const isKO = action === 'ko';

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);

  // Aura for super move
  if (action === 'super') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -60, 75 + Math.sin(timeMs * 0.02) * 10, 0, Math.PI * 2);
    ctx.fillStyle = `${character.colors.aura}44`;
    ctx.shadowColor = character.colors.aura;
    ctx.shadowBlur = 25;
    ctx.fill();
    ctx.restore();
  }

  // Guarding Barrier Shield
  if (isBlocking) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(35, -55, 60, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 16;
    ctx.stroke();

    // Hexagonal / heart shield glow
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.fill();
    ctx.restore();
  }

  // Shadow on ground
  ctx.save();
  ctx.beginPath();
  const shadowDist = Math.max(0, groundY - y);
  const shadowScale = Math.max(0.4, 1 - shadowDist / 200);
  ctx.ellipse(0, groundY - y, 40 * shadowScale, 12 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.fill();
  ctx.restore();

  // Hurt flash effect
  if (isHurt && Math.floor(timeMs / 50) % 2 === 0) {
    ctx.filter = 'brightness(2.5) contrast(1.5)';
  }

  // Character Kinematics / Body Parts
  const bobY = action === 'idle' ? Math.sin(timeMs * 0.006) * 3 : 0;
  const crouchOffset = action === 'crouch' ? 24 : 0;

  // 1. LEGS
  ctx.save();
  ctx.fillStyle = character.colors.outfit;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5;

  if (action === 'kick') {
    // Kicking leg extended forward!
    const progress = actionTimer / actionDuration;
    const kickAngle = Math.sin(progress * Math.PI);

    // Standing leg
    ctx.beginPath();
    ctx.ellipse(-12, -18 + crouchOffset, 10, 22, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Kicking leg
    ctx.save();
    ctx.translate(5, -25);
    ctx.rotate(-0.8 * kickAngle);
    ctx.beginPath();
    ctx.ellipse(32 * kickAngle, -8, 12, 38, Math.PI * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Foot shoe
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(58 * kickAngle, -5, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Kick whoosh arc
    ctx.strokeStyle = character.colors.primary;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 65, -0.6, 0.4);
    ctx.stroke();
    ctx.restore();
  } else if (action === 'walk') {
    // Walking leg cycle
    const legPhase = Math.sin(timeMs * 0.015);
    // Left leg
    ctx.beginPath();
    ctx.ellipse(-14 + legPhase * 10, -18, 9, 20, legPhase * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Right leg
    ctx.beginPath();
    ctx.ellipse(14 - legPhase * 10, -18, 9, 20, -legPhase * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Default / Stance legs (Karate stance)
    ctx.beginPath();
    ctx.ellipse(-16, -16 + crouchOffset, 11, 20, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(18, -16 + crouchOffset, 11, 20, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Feet / Shoes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-22, -2 + crouchOffset, 12, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(26, -2 + crouchOffset, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // 2. TORSO / OUTFIT
  ctx.save();
  ctx.fillStyle = character.colors.outfit;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5;

  const torsoY = -48 + bobY + crouchOffset;
  ctx.beginPath();
  if (character.gender === 'girl') {
    // Dress flare
    ctx.moveTo(-22, torsoY - 14);
    ctx.lineTo(22, torsoY - 14);
    ctx.lineTo(32, torsoY + 28);
    ctx.lineTo(-32, torsoY + 28);
    ctx.closePath();
  } else {
    // Karate Gi torso
    ctx.roundRect(-24, torsoY - 18, 48, 42, 6);
  }
  ctx.fill();
  ctx.stroke();

  // Belt / Obi (Black belt for Kenji, rope belt for Hana)
  ctx.fillStyle = character.gender === 'boy' ? '#0f172a' : character.colors.primary;
  ctx.fillRect(-24, torsoY + 12, 48, 8);
  // Belt knot hanging
  ctx.beginPath();
  ctx.moveTo(0, torsoY + 16);
  ctx.lineTo(-4, torsoY + 32);
  ctx.lineTo(2, torsoY + 34);
  ctx.lineTo(6, torsoY + 16);
  ctx.fill();
  ctx.stroke();

  // Lanyard / Chest emblem
  ctx.fillStyle = character.colors.primary;
  ctx.beginPath();
  ctx.arc(6, torsoY - 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. ARMS / PUNCH
  ctx.save();
  ctx.fillStyle = character.colors.outfit;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5;

  const shoulderY = -54 + bobY + crouchOffset;

  if (action === 'punch' || action === 'super') {
    const progress = actionTimer / actionDuration;
    const punchReach = Math.sin(progress * Math.PI) * 48;

    // Back arm tucked
    ctx.beginPath();
    ctx.ellipse(-18, shoulderY + 4, 10, 14, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Striking arm extending forward
    ctx.beginPath();
    ctx.ellipse(14 + punchReach / 2, shoulderY + 2, 10 + punchReach / 2, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Fist (Flesh / Glove)
    ctx.fillStyle = character.colors.skin;
    ctx.beginPath();
    ctx.arc(28 + punchReach, shoulderY + 2, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Punch impact wind lines
    ctx.strokeStyle = character.colors.primary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(15, shoulderY - 8);
    ctx.lineTo(38 + punchReach, shoulderY - 8);
    ctx.moveTo(18, shoulderY + 12);
    ctx.lineTo(40 + punchReach, shoulderY + 12);
    ctx.stroke();
  } else if (isBlocking) {
    // Both arms crossed defensively in front
    ctx.beginPath();
    ctx.ellipse(16, shoulderY - 2, 10, 20, -0.4, 0, Math.PI * 2);
    ctx.ellipse(24, shoulderY - 4, 10, 20, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = character.colors.skin;
    ctx.beginPath();
    ctx.arc(20, shoulderY - 18, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Guard stance fists
    // Back arm
    ctx.beginPath();
    ctx.ellipse(-16, shoulderY + 6, 8, 16, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Front arm raised
    ctx.beginPath();
    ctx.ellipse(18, shoulderY + 2, 9, 18, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Front fist
    ctx.fillStyle = character.colors.skin;
    ctx.beginPath();
    ctx.arc(26, shoulderY - 10, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // 4. HEAD & CHIBI FACE
  const headY = -86 + bobY + crouchOffset;
  const headRadius = 26;

  // Head base
  ctx.fillStyle = character.colors.skin;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair
  ctx.fillStyle = character.colors.hair;
  ctx.beginPath();
  ctx.arc(0, headY - 4, headRadius + 2, Math.PI * 0.8, Math.PI * 2.2);
  ctx.fill();

  // Bangs
  ctx.beginPath();
  ctx.moveTo(-headRadius, headY - 6);
  ctx.quadraticCurveTo(-10, headY + 8, 2, headY);
  ctx.quadraticCurveTo(16, headY + 10, headRadius, headY - 6);
  ctx.quadraticCurveTo(6, headY - headRadius - 6, 0, headY - headRadius - 8);
  ctx.quadraticCurveTo(-12, headY - headRadius - 4, -headRadius, headY - 6);
  ctx.fill();

  if (character.gender === 'girl') {
    // Ponytail flowing behind
    ctx.beginPath();
    ctx.ellipse(-headRadius * 0.9, headY - 10, 14, 26, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hair ribbon
    ctx.fillStyle = character.colors.primary;
    ctx.beginPath();
    ctx.arc(-headRadius * 0.7, headY - 18, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Spiky tufts on boy
    ctx.beginPath();
    ctx.moveTo(-20, headY - headRadius);
    ctx.lineTo(-10, headY - headRadius - 16);
    ctx.lineTo(-2, headY - headRadius - 4);
    ctx.lineTo(12, headY - headRadius - 18);
    ctx.lineTo(20, headY - headRadius - 2);
    ctx.fill();
  }

  // Eyes
  const eyeY = headY + 4;
  const eyeX = 8;
  const eyeRadius = 5.5;

  // Draw front eye
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
  ctx.fill();

  // Eye Iris Color
  ctx.fillStyle = character.colors.primary;
  ctx.beginPath();
  ctx.arc(eyeX, eyeY + 1.5, eyeRadius * 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Eye Highlight
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(eyeX + 1.5, eyeY - 1.5, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Back eye (partially visible in profile)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-eyeX + 3, eyeY, eyeRadius * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = character.colors.primary;
  ctx.beginPath();
  ctx.arc(-eyeX + 3, eyeY + 1.5, eyeRadius * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrows (Determined angle)
  ctx.strokeStyle = character.colors.hair;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (isHurt || isKO) {
    // Dizzy / hurt eyebrows
    ctx.moveTo(eyeX - 8, eyeY - 6);
    ctx.lineTo(eyeX + 6, eyeY - 10);
  } else {
    ctx.moveTo(eyeX - 8, eyeY - 10);
    ctx.lineTo(eyeX + 6, eyeY - 6);
  }
  ctx.stroke();

  // Blush cheeks
  ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
  ctx.beginPath();
  ctx.ellipse(eyeX + 2, eyeY + 9, 6, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(-eyeX + 2, eyeY + 9, 5, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (action === 'punch' || action === 'kick' || action === 'super') {
    // Yelling / battle cry
    ctx.fillStyle = '#e11d48';
    ctx.ellipse(6, eyeY + 14, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (isHurt) {
    // Open shocked mouth
    ctx.arc(6, eyeY + 13, 4, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Determined smirk
    ctx.moveTo(2, eyeY + 13);
    ctx.lineTo(10, eyeY + 13);
    ctx.stroke();
  }

  ctx.restore();
}
