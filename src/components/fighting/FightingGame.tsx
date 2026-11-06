import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Character, FightMode, AIDifficulty } from '../../types/game';
import { sound } from '../../utils/audio';
import { FighterState, drawFighter } from './fighterRenderer';
import {
  Volume2, VolumeX, RefreshCw, Trophy,
  Bot, Users, Swords, Play, Sparkles
} from 'lucide-react';

interface FightingGameProps {
  roster: Character[];
  onRecordVictory: (winner: Character, loser: Character, mode: string) => void;
  onOpenForge: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation?: number;
  rotSpeed?: number;
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
}

export const FightingGame: React.FC<FightingGameProps> = ({
  roster,
  onRecordVictory,
  onOpenForge,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game setup states
  const [fightMode, setFightMode] = useState<FightMode>('pve');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [char1, setChar1] = useState<Character>(roster[0] || roster[0]);
  const [char2, setChar2] = useState<Character>(roster[1] || roster[0]);
  const [isPickerOpen, setIsPickerOpen] = useState<'p1' | 'p2' | null>(null);

  // Live match states
  const [round, setRound] = useState<number>(1);
  const [p1RoundsWon, setP1RoundsWon] = useState<number>(0);
  const [p2RoundsWon, setP2RoundsWon] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(99);
  const [matchState, setMatchState] = useState<'COUNTDOWN' | 'FIGHTING' | 'KO' | 'MATCH_OVER'>('FIGHTING');
  const [countdownText, setCountdownText] = useState<string>('ROUND 1');
  const [winner, setWinner] = useState<Character | null>(null);
  const [commentary, setCommentary] = useState<string>('Welcome to the Sakura Blossom Arena! Bow to your opponent!');
  const [isMuted, setIsMuted] = useState<boolean>(sound.getIsMuted());

  // Ref tracking keys pressed
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Fighter states ref for 60fps loop
  const p1Ref = useRef<FighterState | null>(null);
  const p2Ref = useRef<FighterState | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const screenShakeRef = useRef<number>(0);

  // Touch button states
  const touchState = useRef<{
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    punch: boolean;
    kick: boolean;
    guard: boolean;
    super: boolean;
  }>({
    left: false,
    right: false,
    up: false,
    down: false,
    punch: false,
    kick: false,
    guard: false,
    super: false,
  });

  // Petals background
  const petalsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; rot: number; size: number }>>([]);

  // Initialize petals
  useEffect(() => {
    const list = [];
    for (let i = 0; i < 40; i++) {
      list.push({
        x: Math.random() * 1000,
        y: Math.random() * 560,
        vx: 0.5 + Math.random() * 1.2,
        vy: 1.0 + Math.random() * 1.5,
        rot: Math.random() * Math.PI * 2,
        size: 5 + Math.random() * 6,
      });
    }
    petalsRef.current = list;
  }, []);

  // Initialize or reset fighters
  const resetRound = useCallback((currentP1Char: Character, currentP2Char: Character, currentRoundNum: number) => {
    p1Ref.current = {
      x: 280,
      y: 430,
      vx: 0,
      vy: 0,
      width: 60,
      height: 120,
      facing: 1,
      isGrounded: true,
      action: 'idle',
      actionTimer: 0,
      actionDuration: 0,
      health: currentP1Char.stats.health,
      maxHealth: currentP1Char.stats.health,
      superMeter: 30,
      isBlocking: false,
      comboCount: 0,
      comboResetTimer: 0,
      hitStun: 0,
      character: currentP1Char,
      isAI: fightMode === 'spectator',
    };

    p2Ref.current = {
      x: 680,
      y: 430,
      vx: 0,
      vy: 0,
      width: 60,
      height: 120,
      facing: -1,
      isGrounded: true,
      action: 'idle',
      actionTimer: 0,
      actionDuration: 0,
      health: currentP2Char.stats.health,
      maxHealth: currentP2Char.stats.health,
      superMeter: 30,
      isBlocking: false,
      comboCount: 0,
      comboResetTimer: 0,
      hitStun: 0,
      character: currentP2Char,
      isAI: fightMode !== 'pvp',
    };

    setTimeLeft(99);
    setMatchState('COUNTDOWN');
    setCountdownText(`ROUND ${currentRoundNum}`);
    sound.playCountdown(false);

    setTimeout(() => {
      setCountdownText('READY...');
    }, 900);

    setTimeout(() => {
      setCountdownText('FIGHT!');
      sound.playCountdown(true);
      setMatchState('FIGHTING');
      setCommentary(`Round ${currentRoundNum} underway! Both fighters clash in the cherry blossom court!`);
    }, 1800);
  }, [fightMode]);

  // Restart entire match
  const startNewMatch = useCallback(() => {
    setRound(1);
    setP1RoundsWon(0);
    setP2RoundsWon(0);
    setWinner(null);
    resetRound(char1, char2, 1);
  }, [char1, char2, resetRound]);

  // Init on mount or char change
  useEffect(() => {
    startNewMatch();
  }, [char1, char2, fightMode, difficulty, startNewMatch]);

  // Timer countdown
  useEffect(() => {
    if (matchState !== 'FIGHTING') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time out!
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [matchState]);

  const handleTimeOut = () => {
    if (!p1Ref.current || !p2Ref.current) return;
    const p1HpRatio = p1Ref.current.health / p1Ref.current.maxHealth;
    const p2HpRatio = p2Ref.current.health / p2Ref.current.maxHealth;
    if (p1HpRatio >= p2HpRatio) {
      handleRoundVictory(char1, p1Ref.current, char2, p2Ref.current);
    } else {
      handleRoundVictory(char2, p2Ref.current, char1, p1Ref.current);
    }
  };

  const handleRoundVictory = (
    roundWinner: Character,
    _winnerFighter: FighterState,
    roundLoser: Character,
    _loserFighter: FighterState
  ) => {
    setMatchState('KO');
    sound.playKO();
    setCountdownText('K.O.!');

    const isP1Win = roundWinner.id === char1.id;
    const nextP1Won = isP1Win ? p1RoundsWon + 1 : p1RoundsWon;
    const nextP2Won = !isP1Win ? p2RoundsWon + 1 : p2RoundsWon;

    if (isP1Win) setP1RoundsWon(nextP1Won);
    else setP2RoundsWon(nextP2Won);

    setCommentary(`K.O.! ${roundWinner.name} claims the round with decisive martial technique!`);

    setTimeout(() => {
      if (nextP1Won >= 2) {
        setWinner(char1);
        setMatchState('MATCH_OVER');
        onRecordVictory(char1, char2, fightMode);
      } else if (nextP2Won >= 2) {
        setWinner(char2);
        setMatchState('MATCH_OVER');
        onRecordVictory(char2, char1, fightMode);
      } else {
        const nextRound = round + 1;
        setRound(nextRound);
        resetRound(char1, char2, nextRound);
      }
    }, 2400);
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      keysPressed.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Spawn visual hit sparks
  const spawnHitParticles = (x: number, y: number, color: string, count: number = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color,
        alpha: 1,
        decay: 0.04 + Math.random() * 0.03,
      });
    }
  };

  const spawnFloatingText = (text: string, x: number, y: number, color: string) => {
    floatingTextsRef.current.push({
      id: Math.random(),
      text,
      x,
      y,
      color,
      alpha: 1,
      scale: 1.2,
    });
  };

  // Main 60 FPS Canvas Game Loop
  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      const groundY = 440;

      // 1. Update Game Physics & Fighters
      if (p1Ref.current && p2Ref.current) {
        const p1 = p1Ref.current;
        const p2 = p2Ref.current;

        // Auto facing
        if (p1.action !== 'ko' && p2.action !== 'ko') {
          p1.facing = p1.x < p2.x ? 1 : -1;
          p2.facing = p2.x < p1.x ? 1 : -1;
        }

        // Process Inputs for P1 (Keyboard or Touch)
        if (matchState === 'FIGHTING' && !p1.isAI && p1.action !== 'ko' && p1.hitStun <= 0) {
          const keys = keysPressed.current;
          const touch = touchState.current;

          const moveLeft = keys['a'] || keys['keya'] || touch.left;
          const moveRight = keys['d'] || keys['keyd'] || touch.right;
          const jump = keys['w'] || keys['keyw'] || touch.up;
          const crouch = keys['s'] || keys['keys'] || touch.down;
          const punch = keys['j'] || keys['keyj'] || touch.punch;
          const kick = keys['k'] || keys['keyk'] || touch.kick;
          const guard = keys['l'] || keys['keyl'] || touch.guard;
          const superMove = keys['u'] || keys['space'] || touch.super;

          processFighterInput(p1, p2, moveLeft, moveRight, jump, crouch, punch, kick, guard, superMove, groundY);
        }

        // Process Inputs for P2 (Local PvP)
        if (matchState === 'FIGHTING' && !p2.isAI && p2.action !== 'ko' && p2.hitStun <= 0) {
          const keys = keysPressed.current;
          const moveLeft = keys['arrowleft'];
          const moveRight = keys['arrowright'];
          const jump = keys['arrowup'];
          const crouch = keys['arrowdown'];
          const punch = keys['1'] || keys['numpad1'] || keys['i'];
          const kick = keys['2'] || keys['numpad2'] || keys['o'];
          const guard = keys['3'] || keys['numpad3'] || keys['p'];
          const superMove = keys['0'] || keys['numpad0'] || keys['enter'];

          processFighterInput(p2, p1, moveLeft, moveRight, jump, crouch, punch, kick, guard, superMove, groundY);
        }

        // Process AI for P1 (in Spectator Mode)
        if (matchState === 'FIGHTING' && p1.isAI && p1.action !== 'ko' && p1.hitStun <= 0) {
          runAI(p1, p2, difficulty, groundY);
        }

        // Process AI for P2 (in PvE or Spectator Mode)
        if (matchState === 'FIGHTING' && p2.isAI && p2.action !== 'ko' && p2.hitStun <= 0) {
          runAI(p2, p1, difficulty, groundY);
        }

        // Update physics and collisions for both
        updateFighterPhysics(p1, p2, groundY, dt);
        updateFighterPhysics(p2, p1, groundY, dt);

        // Check Attack Hitboxes
        checkAttackHit(p1, p2);
        checkAttackHit(p2, p1);

        // Check K.O.
        if (matchState === 'FIGHTING') {
          if (p1.health <= 0) {
            p1.health = 0;
            p1.action = 'ko';
            handleRoundVictory(char2, p2, char1, p1);
          } else if (p2.health <= 0) {
            p2.health = 0;
            p2.action = 'ko';
            handleRoundVictory(char1, p1, char2, p2);
          }
        }
      }

      // 2. Render Arena & Background
      ctx.save();
      if (screenShakeRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeRef.current;
        const shakeY = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(shakeX, shakeY);
        screenShakeRef.current = Math.max(0, screenShakeRef.current - 0.8);
      }

      drawArenaBackground(ctx, canvas.width, canvas.height, currentTime, groundY);

      // Draw Fighters
      if (p1Ref.current) drawFighter(ctx, p1Ref.current, groundY, currentTime);
      if (p2Ref.current) drawFighter(ctx, p2Ref.current, groundY, currentTime);

      // Draw Particles
      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0);

      // Draw Floating Damage Texts
      floatingTextsRef.current.forEach((ft) => {
        ctx.save();
        ctx.font = 'bold 20px "Outfit", sans-serif';
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.globalAlpha = ft.alpha;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();

        ft.y -= 1.2;
        ft.alpha -= 0.025;
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.alpha > 0);

      ctx.restore();

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [matchState, difficulty]);

  // Handle Fighter Input
  const processFighterInput = (
    fighter: FighterState,
    _opponent: FighterState,
    moveLeft: boolean,
    moveRight: boolean,
    jump: boolean,
    crouch: boolean,
    punch: boolean,
    kick: boolean,
    guard: boolean,
    superMove: boolean,
    _groundY: number
  ) => {
    if (fighter.action === 'punch' || fighter.action === 'kick' || fighter.action === 'super' || fighter.action === 'hurt') {
      return; // Lock in active attack frames
    }

    fighter.isBlocking = guard;

    if (superMove && fighter.superMeter >= 100) {
      fighter.action = 'super';
      fighter.actionTimer = 0;
      fighter.actionDuration = 0.55;
      fighter.superMeter = 0;
      fighter.vx = fighter.facing * 9;
      sound.playSuper();
      screenShakeRef.current = 14;
      spawnHitParticles(fighter.x, fighter.y - 60, fighter.character.colors.aura, 24);
      setCommentary(`${fighter.character.name} unleashes SUPER MOVE: ${fighter.character.specialMove.name}!`);
      return;
    }

    if (punch) {
      fighter.action = 'punch';
      fighter.actionTimer = 0;
      fighter.actionDuration = 0.22;
      fighter.vx = fighter.facing * 2;
      sound.playPunch();
      return;
    }

    if (kick) {
      fighter.action = 'kick';
      fighter.actionTimer = 0;
      fighter.actionDuration = 0.28;
      fighter.vx = fighter.facing * 3;
      sound.playKick();
      return;
    }

    if (crouch && fighter.isGrounded) {
      fighter.action = 'crouch';
      fighter.vx = 0;
      return;
    }

    if (jump && fighter.isGrounded) {
      fighter.vy = -14.5;
      fighter.isGrounded = false;
      fighter.action = 'jump';
      sound.playJump();
      return;
    }

    // Walking
    const speed = fighter.character.stats.speed * 0.45;
    if (moveLeft) {
      fighter.vx = -speed;
      fighter.action = fighter.isGrounded ? 'walk' : fighter.action;
    } else if (moveRight) {
      fighter.vx = speed;
      fighter.action = fighter.isGrounded ? 'walk' : fighter.action;
    } else {
      fighter.vx = 0;
      if (fighter.isGrounded) {
        fighter.action = fighter.isBlocking ? 'guard' : 'idle';
      }
    }
  };

  // AI Logic
  const runAI = (ai: FighterState, target: FighterState, diff: AIDifficulty, _groundY: number) => {
    if (ai.action === 'punch' || ai.action === 'kick' || ai.action === 'super' || ai.action === 'hurt') return;

    const dist = Math.abs(ai.x - target.x);
    const inRange = dist < 110;

    // AI aggression rates
    let attackChance = 0.04;
    let guardChance = 0.03;
    let superChance = 0.08;

    if (diff === 'easy') {
      attackChance = 0.025;
      guardChance = 0.01;
    } else if (diff === 'hard') {
      attackChance = 0.07;
      guardChance = 0.06;
      superChance = 0.15;
    } else if (diff === 'champion') {
      attackChance = 0.1;
      guardChance = 0.09;
      superChance = 0.25;
    }

    // Super check
    if (ai.superMeter >= 100 && inRange && Math.random() < superChance) {
      ai.action = 'super';
      ai.actionTimer = 0;
      ai.actionDuration = 0.55;
      ai.superMeter = 0;
      ai.vx = ai.facing * 8;
      sound.playSuper();
      screenShakeRef.current = 14;
      spawnHitParticles(ai.x, ai.y - 60, ai.character.colors.aura, 24);
      setCommentary(`${ai.character.name} counters with devastating ${ai.character.specialMove.name}!`);
      return;
    }

    // Reaction guard if target is attacking
    if (inRange && (target.action === 'punch' || target.action === 'kick') && Math.random() < guardChance) {
      ai.isBlocking = true;
      ai.action = 'guard';
      ai.vx = 0;
      return;
    } else {
      ai.isBlocking = false;
    }

    // Attack if in range
    if (inRange && Math.random() < attackChance) {
      if (Math.random() > 0.45) {
        ai.action = 'punch';
        ai.actionTimer = 0;
        ai.actionDuration = 0.22;
        ai.vx = ai.facing * 2;
        sound.playPunch();
      } else {
        ai.action = 'kick';
        ai.actionTimer = 0;
        ai.actionDuration = 0.28;
        ai.vx = ai.facing * 3;
        sound.playKick();
      }
      return;
    }

    // Approach or reposition
    const speed = ai.character.stats.speed * 0.35;
    if (dist > 95) {
      ai.vx = (target.x > ai.x ? 1 : -1) * speed;
      ai.action = ai.isGrounded ? 'walk' : ai.action;
    } else if (dist < 60) {
      ai.vx = (target.x > ai.x ? -1 : 1) * (speed * 0.7);
      ai.action = 'walk';
    } else {
      ai.vx = 0;
      ai.action = 'idle';
    }

    // Random jump dodge
    if (Math.random() < 0.008 && ai.isGrounded) {
      ai.vy = -14;
      ai.isGrounded = false;
      ai.action = 'jump';
      sound.playJump();
    }
  };

  // Update physics per frame
  const updateFighterPhysics = (fighter: FighterState, _other: FighterState, groundY: number, dt: number) => {
    // Action timer
    if (fighter.actionDuration > 0) {
      fighter.actionTimer += dt;
      if (fighter.actionTimer >= fighter.actionDuration) {
        fighter.action = fighter.isGrounded ? 'idle' : 'jump';
        fighter.actionDuration = 0;
        fighter.actionTimer = 0;
      }
    }

    // Gravity
    if (!fighter.isGrounded) {
      fighter.vy += 32 * dt;
    }

    // Apply Velocity
    fighter.x += fighter.vx;
    fighter.y += fighter.vy;

    // Hitstun recovery
    if (fighter.hitStun > 0) {
      fighter.hitStun -= dt;
      if (fighter.hitStun <= 0 && fighter.action === 'hurt') {
        fighter.action = 'idle';
      }
    }

    // Ground check
    if (fighter.y >= groundY) {
      fighter.y = groundY;
      fighter.vy = 0;
      fighter.isGrounded = true;
      if (fighter.action === 'jump') {
        fighter.action = 'idle';
      }
    }

    // Arena walls (Clamp 100 to 860)
    if (fighter.x < 110) fighter.x = 110;
    if (fighter.x > 850) fighter.x = 850;
  };

  // Check attack contact
  const checkAttackHit = (attacker: FighterState, defender: FighterState) => {
    if (attacker.action !== 'punch' && attacker.action !== 'kick' && attacker.action !== 'super') return;

    // Check hit frame timing (middle of attack)
    const progress = attacker.actionTimer / attacker.actionDuration;
    if (progress < 0.3 || progress > 0.7) return;

    // Check distance and facing
    const reach = attacker.action === 'super' ? 120 : attacker.action === 'kick' ? 95 : 75;
    const diffX = (defender.x - attacker.x) * attacker.facing;
    const diffY = Math.abs(defender.y - attacker.y);

    if (diffX > 10 && diffX < reach && diffY < 60) {
      // Hit connected!
      if (defender.hitStun > 0.05) return; // Prevent multi-hit on same punch frame

      const baseDmg = attacker.action === 'super'
        ? attacker.character.specialMove.damage
        : attacker.action === 'kick'
        ? attacker.character.stats.attack * 1.3
        : attacker.character.stats.attack;

      let finalDmg = Math.round(baseDmg);
      const isBlocked = defender.isBlocking && defender.facing !== attacker.facing;

      if (isBlocked) {
        finalDmg = Math.max(2, Math.round(finalDmg * 0.2));
        sound.playBlock();
        spawnHitParticles(defender.x, defender.y - 50, '#38bdf8', 10);
        spawnFloatingText('BLOCK!', defender.x, defender.y - 80, '#38bdf8');
      } else {
        sound.playPunch();
        screenShakeRef.current = attacker.action === 'super' ? 12 : 6;
        spawnHitParticles(defender.x, defender.y - 50, '#ef4444', 16);
        spawnFloatingText(`-${finalDmg}`, defender.x, defender.y - 80, '#f43f5e');

        defender.action = 'hurt';
        defender.hitStun = 0.22;
        defender.vx = attacker.facing * (attacker.action === 'super' ? 8 : 4);

        // Super meter gain
        attacker.superMeter = Math.min(100, attacker.superMeter + 18);
        defender.superMeter = Math.min(100, defender.superMeter + 12);
      }

      defender.health = Math.max(0, defender.health - finalDmg);
    }
  };

  // Draw Sakura Arena Backdrop
  const drawArenaBackground = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    groundY: number
  ) => {
    // Romantic twilight gradient sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#fbcfe8'); // soft pink
    skyGrad.addColorStop(0.4, '#f472b6'); // rose
    skyGrad.addColorStop(0.7, '#f9a8d4');
    skyGrad.addColorStop(1, '#fed7aa'); // warm glow
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Distant soft cherry blossom silhouette trees
    ctx.fillStyle = 'rgba(244, 114, 182, 0.35)';
    ctx.beginPath();
    ctx.arc(120, groundY - 140, 140, 0, Math.PI * 2);
    ctx.arc(840, groundY - 140, 150, 0, Math.PI * 2);
    ctx.arc(480, groundY - 120, 110, 0, Math.PI * 2);
    ctx.fill();

    // Cherry Blossom Heart Arch in center
    ctx.save();
    ctx.strokeStyle = '#fda4af';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(480, groundY - 190);
    ctx.bezierCurveTo(480, groundY - 240, 420, groundY - 260, 420, groundY - 210);
    ctx.bezierCurveTo(420, groundY - 160, 480, groundY - 120, 480, groundY - 90);
    ctx.bezierCurveTo(480, groundY - 120, 540, groundY - 160, 540, groundY - 210);
    ctx.bezierCurveTo(540, groundY - 260, 480, groundY - 240, 480, groundY - 190);
    ctx.stroke();

    // Floral blossoms on arch
    for (let a = 0; a < 24; a++) {
      const angle = (a / 24) * Math.PI * 2;
      const flowerX = 480 + Math.cos(angle) * 75;
      const flowerY = groundY - 190 + Math.sin(angle) * 60;
      ctx.fillStyle = a % 2 === 0 ? '#fb7185' : '#ffffff';
      ctx.beginPath();
      ctx.arc(flowerX, flowerY, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wooden park bench in center
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(430, groundY - 60, 100, 8); // seat
    ctx.fillRect(435, groundY - 78, 90, 6); // backrest
    ctx.fillRect(440, groundY - 52, 6, 26); // legs
    ctx.fillRect(514, groundY - 52, 6, 26);
    ctx.restore();

    // Lanterns with gentle romantic glow
    const lanternPulse = Math.sin(time * 0.004) * 4;
    [360, 600].forEach((lx) => {
      // Glow
      const glowGrad = ctx.createRadialGradient(lx, groundY - 160, 4, lx, groundY - 160, 36 + lanternPulse);
      glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.8)');
      glowGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(lx, groundY - 160, 36 + lanternPulse, 0, Math.PI * 2);
      ctx.fill();

      // Lantern body
      ctx.fillStyle = '#451a03';
      ctx.fillRect(lx - 12, groundY - 176, 24, 6);
      ctx.fillRect(lx - 12, groundY - 146, 24, 6);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(lx - 10, groundY - 170, 20, 24);
    });

    // Paved Stone Floor / Cobblestone Arena
    const floorGrad = ctx.createLinearGradient(0, groundY, 0, h);
    floorGrad.addColorStop(0, '#c4b5fd'); // soft lavender stone
    floorGrad.addColorStop(0.3, '#a78bfa');
    floorGrad.addColorStop(1, '#7c3aed');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, groundY, w, h - groundY);

    // Stone tile grooves
    ctx.strokeStyle = 'rgba(109, 40, 217, 0.35)';
    ctx.lineWidth = 2;
    for (let row = 0; row < 5; row++) {
      const yLine = groundY + row * 24;
      ctx.beginPath();
      ctx.moveTo(0, yLine);
      ctx.lineTo(w, yLine);
      ctx.stroke();

      const offset = (row % 2) * 40;
      for (let col = -40; col < w + 40; col += 70) {
        ctx.beginPath();
        ctx.moveTo(col + offset, yLine);
        ctx.lineTo(col + offset, yLine + 24);
        ctx.stroke();
      }
    }

    // Drifting Sakura Petals
    petalsRef.current.forEach((petal) => {
      ctx.save();
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rot);
      ctx.fillStyle = 'rgba(255, 182, 193, 0.85)';
      ctx.beginPath();
      ctx.ellipse(0, 0, petal.size, petal.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      petal.x += petal.vx;
      petal.y += petal.vy;
      petal.rot += 0.02;

      if (petal.y > h) {
        petal.y = -10;
        petal.x = Math.random() * w;
      }
      if (petal.x > w) petal.x = 0;
    });
  };

  const p1HpPercent = p1Ref.current
    ? Math.max(0, Math.round((p1Ref.current.health / p1Ref.current.maxHealth) * 100))
    : 100;
  const p2HpPercent = p2Ref.current
    ? Math.max(0, Math.round((p2Ref.current.health / p2Ref.current.maxHealth) * 100))
    : 100;

  const p1Super = p1Ref.current ? p1Ref.current.superMeter : 0;
  const p2Super = p2Ref.current ? p2Ref.current.superMeter : 0;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4">
      {/* Top Arena Controls & Mode Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-wide text-rose-400 uppercase">Match Mode:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => { setFightMode('pve'); startNewMatch(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${fightMode === 'pve' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Bot className="w-3.5 h-3.5" />
              Player vs CPU
            </button>
            <button
              onClick={() => { setFightMode('pvp'); startNewMatch(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${fightMode === 'pvp' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Users className="w-3.5 h-3.5" />
              2-Player Local
            </button>
            <button
              onClick={() => { setFightMode('spectator'); startNewMatch(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${fightMode === 'spectator' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Watch two generated characters fight each other automatically!"
            >
              <Play className="w-3.5 h-3.5" />
              Spectator (AI vs AI)
            </button>
          </div>
        </div>

        {fightMode !== 'pvp' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">CPU Tier:</span>
            {(['easy', 'medium', 'hard', 'champion'] as AIDifficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-2.5 py-1 rounded-lg capitalize font-semibold transition-colors ${difficulty === d ? 'bg-slate-700 text-white border border-slate-600' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => {
              const muted = !isMuted;
              sound.setMuted(muted);
              setIsMuted(muted);
            }}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            title="Toggle Sound Effects"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={startNewMatch}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Rematch
          </button>
        </div>
      </div>

      {/* Main Game Screen with Authentic Screenshot HUD */}
      <div className="relative w-full rounded-2xl overflow-hidden border-2 border-rose-500/40 shadow-2xl shadow-rose-950/40 bg-slate-950 aspect-[16/9] select-none">
        {/* Authentic Top Fighting HUD */}
        <div className="absolute top-0 left-0 right-0 z-20 p-3 md:p-5 flex items-center justify-between gap-2 md:gap-6 pointer-events-none">
          {/* Player 1 HUD (Left) */}
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <button
              onClick={() => setIsPickerOpen('p1')}
              className="pointer-events-auto relative w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-white/80 overflow-hidden bg-slate-900 shadow-lg hover:scale-105 transition-transform shrink-0"
              title="Click to change Fighter 1"
            >
              <div
                className="w-full h-full flex items-center justify-center font-bold text-white text-base md:text-xl"
                style={{ backgroundColor: char1.colors.primary }}
              >
                {char1.name[0]}
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-center text-white py-0.5">
                P1
              </div>
            </button>

            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm md:text-lg text-white drop-shadow flex items-center gap-1">
                  <span className="text-rose-400">♥</span> {char1.name}
                  {p1RoundsWon > 0 && (
                    <span className="ml-2 text-xs text-amber-400 font-extrabold">{'★'.repeat(p1RoundsWon)}</span>
                  )}
                </span>
                <span className="font-mono text-xs md:text-sm font-bold text-emerald-300 drop-shadow">
                  {p1HpPercent}%
                </span>
              </div>

              {/* Green Gradient Health Bar with Pink/White border */}
              <div className="w-full h-3.5 md:h-5 bg-slate-900/80 rounded-full border-2 border-white/90 p-0.5 overflow-hidden shadow-inner flex">
                <div
                  className="h-full rounded-full transition-all duration-150 bg-gradient-to-r from-emerald-400 to-green-500 shadow-md"
                  style={{ width: `${p1HpPercent}%` }}
                />
              </div>

              {/* Super Meter / Heart Burst Gauge */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-bold text-rose-300 uppercase">BURST</span>
                <div className="flex-1 h-1.5 bg-slate-900/80 rounded-full overflow-hidden border border-rose-400/40">
                  <div
                    className={`h-full transition-all duration-150 ${p1Super >= 100 ? 'bg-rose-400 animate-pulse shadow-sm shadow-rose-300' : 'bg-rose-500'}`}
                    style={{ width: `${p1Super}%` }}
                  />
                </div>
                {p1Super >= 100 && (
                  <span className="text-[9px] font-extrabold text-white bg-rose-500 px-1 rounded animate-bounce">
                    READY!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center VS Heart Emblem & Timer */}
          <div className="flex flex-col items-center shrink-0 px-1 md:px-3">
            <div className="relative flex items-center justify-center">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center border-2 border-white shadow-xl animate-heart-pulse">
                <span className="font-black text-white text-xs md:text-lg italic tracking-wider drop-shadow">
                  VS
                </span>
              </div>
            </div>
            <div className="mt-1 font-mono text-base md:text-xl font-black text-amber-300 drop-shadow">
              {timeLeft}
            </div>
          </div>

          {/* Player 2 HUD (Right) */}
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 flex-row-reverse">
            <button
              onClick={() => setIsPickerOpen('p2')}
              className="pointer-events-auto relative w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-white/80 overflow-hidden bg-slate-900 shadow-lg hover:scale-105 transition-transform shrink-0"
              title="Click to change Fighter 2"
            >
              <div
                className="w-full h-full flex items-center justify-center font-bold text-white text-base md:text-xl"
                style={{ backgroundColor: char2.colors.primary }}
              >
                {char2.name[0]}
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-center text-white py-0.5">
                {fightMode === 'pvp' ? 'P2' : 'CPU'}
              </div>
            </button>

            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs md:text-sm font-bold text-emerald-300 drop-shadow">
                  {p2HpPercent}%
                </span>
                <span className="font-bold text-sm md:text-lg text-white drop-shadow flex items-center gap-1">
                  {char2.name} <span className="text-rose-400">♥</span>
                  {p2RoundsWon > 0 && (
                    <span className="ml-2 text-xs text-amber-400 font-extrabold">{'★'.repeat(p2RoundsWon)}</span>
                  )}
                </span>
              </div>

              {/* Green Gradient Health Bar with Pink/White border */}
              <div className="w-full h-3.5 md:h-5 bg-slate-900/80 rounded-full border-2 border-white/90 p-0.5 overflow-hidden shadow-inner flex flex-row-reverse">
                <div
                  className="h-full rounded-full transition-all duration-150 bg-gradient-to-l from-emerald-400 to-green-500 shadow-md"
                  style={{ width: `${p2HpPercent}%` }}
                />
              </div>

              {/* Super Meter / Heart Burst Gauge */}
              <div className="flex items-center gap-1.5 mt-1 flex-row-reverse">
                <span className="text-[10px] font-bold text-rose-300 uppercase">BURST</span>
                <div className="flex-1 h-1.5 bg-slate-900/80 rounded-full overflow-hidden border border-rose-400/40">
                  <div
                    className={`h-full transition-all duration-150 ${p2Super >= 100 ? 'bg-rose-400 animate-pulse shadow-sm shadow-rose-300' : 'bg-rose-500'}`}
                    style={{ width: `${p2Super}%` }}
                  />
                </div>
                {p2Super >= 100 && (
                  <span className="text-[9px] font-extrabold text-white bg-rose-500 px-1 rounded animate-bounce">
                    READY!
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center Countdown / KO Overlay Announcement */}
        {countdownText && matchState !== 'FIGHTING' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-[1px] pointer-events-none">
            <h1 className="text-4xl md:text-7xl font-black text-white italic tracking-wider drop-shadow-[0_8px_16px_rgba(244,63,94,0.8)] scale-110 transition-transform">
              {countdownText}
            </h1>
          </div>
        )}

        {/* Victory Screen Modal */}
        {matchState === 'MATCH_OVER' && winner && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md p-6 text-center">
            <Trophy className="w-16 h-16 text-amber-400 mb-2 animate-bounce" />
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-widest">
              Match Decided!
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white mt-1">
              {winner.name} Wins!
            </h2>
            <p className="text-slate-300 text-sm max-w-md mt-2 italic">
              &quot;{winner.specialMove.quote}&quot;
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={startNewMatch}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-rose-500/30 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Play Again
              </button>
              <button
                onClick={() => setIsPickerOpen('p1')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition-colors"
              >
                Change Fighters
              </button>
            </div>
          </div>
        )}

        {/* Canvas Render Element */}
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          className="w-full h-full object-contain"
        />

        {/* On-Screen Mobile & Tactile Virtual Arcade Controls (Identical to Screenshot!) */}
        <div className="absolute bottom-3 left-3 right-3 z-20 flex items-end justify-between pointer-events-none">
          {/* Virtual D-Pad (Left Cluster) */}
          <div className="pointer-events-auto relative w-32 h-32 md:w-36 md:h-36">
            {/* Up */}
            <button
              onMouseDown={() => { touchState.current.up = true; }}
              onMouseUp={() => { touchState.current.up = false; }}
              onTouchStart={() => { touchState.current.up = true; }}
              onTouchEnd={() => { touchState.current.up = false; }}
              className="absolute top-0 left-11 md:left-12 w-10 h-10 md:w-12 md:h-12 bg-white/40 hover:bg-white/60 active:bg-white/80 border-2 border-white/80 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-lg backdrop-blur-sm transition-transform active:scale-95"
            >
              ▲
            </button>
            {/* Left */}
            <button
              onMouseDown={() => { touchState.current.left = true; }}
              onMouseUp={() => { touchState.current.left = false; }}
              onTouchStart={() => { touchState.current.left = true; }}
              onTouchEnd={() => { touchState.current.left = false; }}
              className="absolute top-11 md:top-12 left-0 w-10 h-10 md:w-12 md:h-12 bg-white/40 hover:bg-white/60 active:bg-white/80 border-2 border-white/80 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-lg backdrop-blur-sm transition-transform active:scale-95"
            >
              ◀
            </button>
            {/* Center Hub */}
            <div className="absolute top-11 md:top-12 left-11 md:left-12 w-10 h-10 md:w-12 md:h-12 bg-slate-900/30 rounded-full" />
            {/* Right */}
            <button
              onMouseDown={() => { touchState.current.right = true; }}
              onMouseUp={() => { touchState.current.right = false; }}
              onTouchStart={() => { touchState.current.right = true; }}
              onTouchEnd={() => { touchState.current.right = false; }}
              className="absolute top-11 md:top-12 right-0 w-10 h-10 md:w-12 md:h-12 bg-white/40 hover:bg-white/60 active:bg-white/80 border-2 border-white/80 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-lg backdrop-blur-sm transition-transform active:scale-95"
            >
              ▶
            </button>
            {/* Down */}
            <button
              onMouseDown={() => { touchState.current.down = true; }}
              onMouseUp={() => { touchState.current.down = false; }}
              onTouchStart={() => { touchState.current.down = true; }}
              onTouchEnd={() => { touchState.current.down = false; }}
              className="absolute bottom-0 left-11 md:left-12 w-10 h-10 md:w-12 md:h-12 bg-white/40 hover:bg-white/60 active:bg-white/80 border-2 border-white/80 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-lg backdrop-blur-sm transition-transform active:scale-95"
            >
              ▼
            </button>
          </div>

          {/* Action Buttons (Right Cluster: Punch, Kick, Guard, Jump, Super) */}
          <div className="pointer-events-auto flex items-end gap-2 md:gap-3">
            {/* Super Button (Heart) */}
            {p1Super >= 100 && (
              <button
                onMouseDown={() => { touchState.current.super = true; }}
                onMouseUp={() => { touchState.current.super = false; }}
                onTouchStart={() => { touchState.current.super = true; }}
                onTouchEnd={() => { touchState.current.super = false; }}
                className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 border-2 border-white flex items-center justify-center text-white shadow-lg animate-pulse active:scale-90 transition-transform"
                title="Super Heart Burst Attack!"
              >
                <Sparkles className="w-6 h-6 text-yellow-300" />
              </button>
            )}

            {/* Guard Shield */}
            <button
              onMouseDown={() => { touchState.current.guard = true; }}
              onMouseUp={() => { touchState.current.guard = false; }}
              onTouchStart={() => { touchState.current.guard = true; }}
              onTouchEnd={() => { touchState.current.guard = false; }}
              className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-amber-500/80 hover:bg-amber-500 active:bg-amber-600 border-2 border-white flex items-center justify-center text-white shadow-lg backdrop-blur-sm transition-transform active:scale-95"
              title="Guard / Shield (Key: L)"
            >
              <span className="text-xl">🛡️</span>
            </button>

            {/* Kick Button */}
            <button
              onMouseDown={() => { touchState.current.kick = true; }}
              onMouseUp={() => { touchState.current.kick = false; }}
              onTouchStart={() => { touchState.current.kick = true; }}
              onTouchEnd={() => { touchState.current.kick = false; }}
              className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-cyan-500/80 hover:bg-cyan-500 active:bg-cyan-600 border-2 border-white flex items-center justify-center text-white shadow-lg backdrop-blur-sm transition-transform active:scale-95"
              title="Kick Attack (Key: K)"
            >
              <span className="text-xl">🥋</span>
            </button>

            {/* Punch Button */}
            <button
              onMouseDown={() => { touchState.current.punch = true; }}
              onMouseUp={() => { touchState.current.punch = false; }}
              onTouchStart={() => { touchState.current.punch = true; }}
              onTouchEnd={() => { touchState.current.punch = false; }}
              className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-rose-500/90 hover:bg-rose-500 active:bg-rose-600 border-2 border-white flex items-center justify-center text-white shadow-lg backdrop-blur-sm transition-transform active:scale-95"
              title="Punch Attack (Key: J)"
            >
              <span className="text-2xl">👊</span>
            </button>

            {/* Jump Button */}
            <button
              onMouseDown={() => { touchState.current.up = true; }}
              onMouseUp={() => { touchState.current.up = false; }}
              onTouchStart={() => { touchState.current.up = true; }}
              onTouchEnd={() => { touchState.current.up = false; }}
              className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-purple-500/80 hover:bg-purple-500 active:bg-purple-600 border-2 border-white flex items-center justify-center text-white shadow-lg backdrop-blur-sm transition-transform active:scale-95"
              title="Jump (Key: W or Up Arrow)"
            >
              <span className="text-xl">⬆️</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Match Commentary Ticker */}
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-xs text-slate-300">
        <span className="text-rose-400 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Swords className="w-3.5 h-3.5" /> Arena Broadcast:
        </span>
        <span className="truncate italic text-slate-200">{commentary}</span>
      </div>

      {/* Quick Controls Cheat Sheet */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-slate-400">
        <div>
          <span className="font-semibold text-slate-200">Player 1 Keyboard:</span>{' '}
          <span className="text-rose-300 font-mono">A/D</span> (Move) ·{' '}
          <span className="text-rose-300 font-mono">W</span> (Jump) ·{' '}
          <span className="text-rose-300 font-mono">S</span> (Crouch) ·{' '}
          <span className="text-rose-300 font-mono">J</span> (Punch) ·{' '}
          <span className="text-rose-300 font-mono">K</span> (Kick) ·{' '}
          <span className="text-rose-300 font-mono">L</span> (Guard) ·{' '}
          <span className="text-rose-300 font-mono">Space/U</span> (Super Burst)
        </div>
        {fightMode === 'pvp' && (
          <div>
            <span className="font-semibold text-slate-200">Player 2 Keyboard:</span>{' '}
            <span className="text-cyan-300 font-mono">Arrows</span> (Move/Jump/Crouch) ·{' '}
            <span className="text-cyan-300 font-mono">1</span> (Punch) ·{' '}
            <span className="text-cyan-300 font-mono">2</span> (Kick) ·{' '}
            <span className="text-cyan-300 font-mono">3</span> (Guard) ·{' '}
            <span className="text-cyan-300 font-mono">0</span> (Super)
          </div>
        )}
      </div>

      {/* Character Selector Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                Select {isPickerOpen === 'p1' ? 'Player 1 Fighter' : 'Player 2 Fighter'}
              </h3>
              <button
                onClick={() => setIsPickerOpen(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 overflow-y-auto">
              {roster.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    if (isPickerOpen === 'p1') setChar1(c);
                    else setChar2(c);
                    setIsPickerOpen(null);
                    startNewMatch();
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 hover:border-rose-500 bg-slate-950/60 hover:bg-rose-950/20 cursor-pointer transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-full border border-white/60 flex items-center justify-center font-bold text-white text-lg shrink-0"
                    style={{ backgroundColor: c.colors.primary }}
                  >
                    {c.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm truncate">{c.name}</span>
                      <span className="text-[11px] font-mono text-rose-400">{c.archetype}</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{c.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                      <span>HP: {c.stats.health}</span>
                      <span>·</span>
                      <span>ATK: {c.stats.attack}</span>
                      <span>·</span>
                      <span>SPD: {c.stats.speed}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={() => {
                  setIsPickerOpen(null);
                  onOpenForge();
                }}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
              >
                + Forge New Custom Character
              </button>
              <button
                onClick={() => setIsPickerOpen(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
