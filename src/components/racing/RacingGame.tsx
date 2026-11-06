import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Character, RacingLeaderboardEntry } from '../../types/game';
import { sound } from '../../utils/audio';
import {
  Trophy, RefreshCw, Zap, Volume2, VolumeX, Shield, Play
} from 'lucide-react';

interface RacingGameProps {
  roster: Character[];
  onRecordRaceResult: (entry: Omit<RacingLeaderboardEntry, 'id' | 'rank' | 'date'>) => void;
  onOpenForge: () => void;
}

interface Racer {
  id: string;
  char: Character;
  x: number;
  y: number;
  angle: number; // in radians
  speed: number;
  vx: number;
  vy: number;
  isDrifting: boolean;
  driftCharge: number;
  boostTimer: number;
  shieldTimer: number;
  hasItem: 'boost' | 'shield' | 'banana' | 'rocket' | null;
  currentLap: number;
  checkpointsPassed: number;
  lapStartTime: number;
  bestLap: number;
  totalTime: number;
  finished: boolean;
  isPlayer: boolean;
  rank: number;
  color: string;
}

interface Obstacle {
  x: number;
  y: number;
  type: 'banana' | 'rocket';
  vx?: number;
  vy?: number;
  life: number;
}

interface BoostPad {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ItemBox {
  x: number;
  y: number;
  active: boolean;
  respawnTimer: number;
}

export const RacingGame: React.FC<RacingGameProps> = ({
  roster,
  onRecordRaceResult,
  onOpenForge,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Selected player character
  const [playerChar, setPlayerChar] = useState<Character>(roster[0] || roster[0]);
  const [isCharPickerOpen, setIsCharPickerOpen] = useState(false);

  // Race State
  const [gameState, setGameState] = useState<'READY' | 'RACING' | 'FINISHED'>('READY');
  const [countdown, setCountdown] = useState<string>('READY');
  const [lap, setLap] = useState<number>(1);
  const [currentPosition, setCurrentPosition] = useState<number>(1);
  const [lapTime, setLapTime] = useState<number>(0);
  const [bestLapTime, setBestLapTime] = useState<number>(999);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(0);
  const [playerItem, setPlayerItem] = useState<'boost' | 'shield' | 'banana' | 'rocket' | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getIsMuted());
  const [finalRankings, setFinalRankings] = useState<Racer[]>([]);

  // Input states
  const keys = useRef<{ [k: string]: boolean }>({});
  const touchInputs = useRef<{
    gas: boolean;
    brake: boolean;
    left: boolean;
    right: boolean;
    drift: boolean;
    useItem: boolean;
  }>({
    gas: false,
    brake: false,
    left: false,
    right: false,
    drift: false,
    useItem: false,
  });

  // Track geometry & checkpoints
  // Closed loop track path
  const checkpoints = useRef<Array<{ x: number; y: number; r: number }>>([
    { x: 480, y: 110, r: 80 },  // Top straight
    { x: 740, y: 150, r: 80 },  // Top right turn
    { x: 830, y: 300, r: 80 },  // Far right hairpin
    { x: 700, y: 440, r: 80 },  // Bottom right chicane
    { x: 480, y: 460, r: 80 },  // Bottom straight (Heart dip)
    { x: 260, y: 440, r: 80 },  // Bottom left turn
    { x: 130, y: 300, r: 80 },  // Far left hairpin
    { x: 220, y: 150, r: 80 },  // Top left turn
  ]);

  const boostPads = useRef<BoostPad[]>([
    { x: 480, y: 95, w: 40, h: 30 },
    { x: 480, y: 445, w: 40, h: 30 },
  ]);

  const itemBoxes = useRef<ItemBox[]>([
    { x: 350, y: 110, active: true, respawnTimer: 0 },
    { x: 800, y: 220, active: true, respawnTimer: 0 },
    { x: 600, y: 450, active: true, respawnTimer: 0 },
    { x: 150, y: 380, active: true, respawnTimer: 0 },
  ]);

  const racersRef = useRef<Racer[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      keys.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
      keys.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Initialize or restart race
  const startRace = useCallback(() => {
    // Select 3 AI opponents different from player
    const opponents = roster.filter((c) => c.id !== playerChar.id).slice(0, 3);
    while (opponents.length < 3) {
      opponents.push(roster[0]);
    }

    const startX = 400;
    const startY = 110;

    const list: Racer[] = [
      {
        id: 'player',
        char: playerChar,
        x: startX,
        y: startY + 12,
        angle: 0,
        speed: 0,
        vx: 0,
        vy: 0,
        isDrifting: false,
        driftCharge: 0,
        boostTimer: 0,
        shieldTimer: 0,
        hasItem: null,
        currentLap: 1,
        checkpointsPassed: 0,
        lapStartTime: performance.now(),
        bestLap: 999,
        totalTime: 0,
        finished: false,
        isPlayer: true,
        rank: 1,
        color: playerChar.colors.primary,
      },
      ...opponents.map((opp, idx) => ({
        id: `cpu-${opp.id}-${idx}`,
        char: opp,
        x: startX - 35 * (idx + 1),
        y: startY - 12 + (idx % 2) * 24,
        angle: 0,
        speed: 0,
        vx: 0,
        vy: 0,
        isDrifting: false,
        driftCharge: 0,
        boostTimer: 0,
        shieldTimer: 0,
        hasItem: null,
        currentLap: 1,
        checkpointsPassed: 0,
        lapStartTime: performance.now(),
        bestLap: 999,
        totalTime: 0,
        finished: false,
        isPlayer: false,
        rank: idx + 2,
        color: opp.colors.primary,
      })),
    ];

    racersRef.current = list;
    obstaclesRef.current = [];
    setLap(1);
    setCurrentPosition(1);
    setLapTime(0);
    setBestLapTime(999);
    setPlayerItem(null);
    setFinalRankings([]);

    setGameState('READY');
    setCountdown('3');
    sound.playCountdown(false);

    setTimeout(() => {
      setCountdown('2');
      sound.playCountdown(false);
    }, 1000);

    setTimeout(() => {
      setCountdown('1');
      sound.playCountdown(false);
    }, 2000);

    setTimeout(() => {
      setCountdown('GO!');
      sound.playCountdown(true);
      setGameState('RACING');
      const now = performance.now();
      racersRef.current.forEach((r) => {
        r.lapStartTime = now;
      });
    }, 3000);

    setTimeout(() => {
      setCountdown('');
    }, 4000);
  }, [playerChar, roster]);

  // Init on mount
  useEffect(() => {
    startRace();
  }, [playerChar, startRace]);

  // Main 60 FPS Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      // Update Item Box Respawns
      itemBoxes.current.forEach((box) => {
        if (!box.active) {
          box.respawnTimer -= dt;
          if (box.respawnTimer <= 0) box.active = true;
        }
      });

      // Update Obstacles (Rockets, Bananas)
      obstaclesRef.current.forEach((obs) => {
        if (obs.type === 'rocket' && obs.vx !== undefined && obs.vy !== undefined) {
          obs.x += obs.vx * dt;
          obs.y += obs.vy * dt;
        }
        obs.life -= dt;
      });
      obstaclesRef.current = obstaclesRef.current.filter((o) => o.life > 0);

      // Update Racers
      const racers = racersRef.current;
      const k = keys.current;
      const touch = touchInputs.current;

      racers.forEach((racer) => {
        if (gameState !== 'RACING' && !racer.finished) {
          return;
        }

        // Boost & Shield Timers
        if (racer.boostTimer > 0) racer.boostTimer -= dt;
        if (racer.shieldTimer > 0) racer.shieldTimer -= dt;

        if (racer.isPlayer && !racer.finished) {
          // Player Inputs
          const gas = k['w'] || k['arrowup'] || touch.gas;
          const brake = k['s'] || k['arrowdown'] || touch.brake;
          const turnLeft = k['a'] || k['arrowleft'] || touch.left;
          const turnRight = k['d'] || k['arrowright'] || touch.right;
          const drift = k[' '] || k['space'] || touch.drift;
          const useItem = k['e'] || k['shift'] || touch.useItem;

          // Steering
          const turnRate = racer.char.kart.handling * (racer.isDrifting ? 1.4 : 1.0);
          if (turnLeft) racer.angle -= turnRate;
          if (turnRight) racer.angle += turnRate;

          // Acceleration & Top Speed
          const maxSpd = racer.char.kart.topSpeed * (racer.boostTimer > 0 ? 1.45 : 1.0);
          const accel = racer.char.kart.acceleration * (racer.boostTimer > 0 ? 2.0 : 1.0);

          if (gas) {
            racer.speed = Math.min(maxSpd, racer.speed + accel);
            sound.playEngineHum(racer.speed / maxSpd);
          } else if (brake) {
            racer.speed = Math.max(-2, racer.speed - accel * 1.5);
          } else {
            // Natural friction
            racer.speed = Math.max(0, racer.speed - 0.08);
          }

          // Drifting
          if (drift && racer.speed > 3) {
            if (!racer.isDrifting) {
              sound.playDrift();
            }
            racer.isDrifting = true;
            racer.driftCharge = Math.min(100, racer.driftCharge + 60 * dt);
          } else if (racer.isDrifting) {
            // Release drift boost!
            if (racer.driftCharge > 50) {
              racer.boostTimer = 1.2;
              sound.playBoost();
            }
            racer.isDrifting = false;
            racer.driftCharge = 0;
          }

          // Item Usage
          if (useItem && racer.hasItem) {
            triggerItem(racer);
          }

          setCurrentSpeedKmh(Math.round(racer.speed * 20));
          setPlayerItem(racer.hasItem);
        } else if (!racer.isPlayer && !racer.finished) {
          // AI Driving: Follow checkpoints
          runAIRacer(racer, dt);
        }

        // Apply velocity from angle and speed
        racer.vx = Math.cos(racer.angle) * racer.speed;
        racer.vy = Math.sin(racer.angle) * racer.speed;

        racer.x += racer.vx;
        racer.y += racer.vy;

        // Checkpoint & Lap Tracking
        checkLapProgress(racer, currentTime);

        // Boost Pad Collision
        boostPads.current.forEach((pad) => {
          if (
            racer.x >= pad.x - pad.w / 2 &&
            racer.x <= pad.x + pad.w / 2 &&
            racer.y >= pad.y - pad.h / 2 &&
            racer.y <= pad.y + pad.h / 2
          ) {
            racer.boostTimer = 1.6;
            if (racer.isPlayer) sound.playBoost();
          }
        });

        // Item Box Collision
        itemBoxes.current.forEach((box) => {
          if (box.active) {
            const dist = Math.hypot(racer.x - box.x, racer.y - box.y);
            if (dist < 26) {
              box.active = false;
              box.respawnTimer = 4.0;
              if (!racer.hasItem) {
                const items: ('boost' | 'shield' | 'banana' | 'rocket')[] = ['boost', 'shield', 'banana', 'rocket'];
                racer.hasItem = items[Math.floor(Math.random() * items.length)];
                if (racer.isPlayer) {
                  sound.playJump();
                  setPlayerItem(racer.hasItem);
                }
              }
            }
          }
        });

        // Obstacle Collision
        obstaclesRef.current.forEach((obs) => {
          const dist = Math.hypot(racer.x - obs.x, racer.y - obs.y);
          if (dist < 20) {
            if (racer.shieldTimer <= 0) {
              // Spin out!
              racer.speed = 1.0;
              racer.angle += Math.PI * 0.7;
              sound.playHit();
            }
            obs.life = 0; // consumed
          }
        });
      });

      // Calculate Standings / Ranks
      updateRanks();

      // Render Stage & Racers
      drawTrack(ctx, canvas.width, canvas.height, currentTime);

      // Draw Boost Pads
      boostPads.current.forEach((pad) => {
        ctx.save();
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(pad.x - pad.w / 2, pad.y - pad.h / 2, pad.w, pad.h);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(pad.x - 12, pad.y + 8);
        ctx.lineTo(pad.x, pad.y - 8);
        ctx.lineTo(pad.x + 12, pad.y + 8);
        ctx.fill();
        ctx.restore();
      });

      // Draw Item Boxes
      itemBoxes.current.forEach((box) => {
        if (box.active) {
          ctx.save();
          const bob = Math.sin(currentTime * 0.006) * 4;
          ctx.translate(box.x, box.y + bob);
          ctx.rotate(currentTime * 0.003);
          ctx.fillStyle = '#ec4899';
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 10;
          ctx.fillRect(-12, -12, 24, 24);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(-12, -12, 24, 24);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px "Outfit", sans-serif';
          ctx.fillText('?', -4, 5);
          ctx.restore();
        }
      });

      // Draw Obstacles
      obstaclesRef.current.forEach((obs) => {
        ctx.save();
        if (obs.type === 'banana') {
          ctx.font = '20px serif';
          ctx.fillText('🍌', obs.x - 10, obs.y + 8);
        } else {
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(obs.x, obs.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Racers
      racers.forEach((racer) => {
        drawRacerKart(ctx, racer);
      });

      // Draw Minimap in top-right corner
      drawMinimap(ctx, 800, 30, 140, 100);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, bestLapTime]);

  // AI Steer & Gas
  const runAIRacer = (ai: Racer, dt: number) => {
    const cpIndex = ai.checkpointsPassed % checkpoints.current.length;
    const target = checkpoints.current[cpIndex];

    const dx = target.x - ai.x;
    const dy = target.y - ai.y;
    const targetAngle = Math.atan2(dy, dx);

    // Angle diff
    let diff = targetAngle - ai.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    const turnRate = ai.char.kart.handling * 0.9;
    if (diff > 0.05) ai.angle += turnRate;
    else if (diff < -0.05) ai.angle -= turnRate;

    // AI speed based on stats & slight rubber-banding
    const maxSpd = ai.char.kart.topSpeed * 0.92 * (ai.boostTimer > 0 ? 1.4 : 1.0);
    ai.speed = Math.min(maxSpd, ai.speed + ai.char.kart.acceleration);

    // AI Item Usage
    if (ai.hasItem && Math.random() < 0.015) {
      triggerItem(ai);
    }
  };

  // Trigger Items
  const triggerItem = (racer: Racer) => {
    const item = racer.hasItem;
    racer.hasItem = null;
    if (racer.isPlayer) setPlayerItem(null);

    if (item === 'boost') {
      racer.boostTimer = 2.2;
      if (racer.isPlayer) sound.playBoost();
    } else if (item === 'shield') {
      racer.shieldTimer = 5.0;
      if (racer.isPlayer) sound.playBlock();
    } else if (item === 'banana') {
      // Drop obstacle behind
      obstaclesRef.current.push({
        x: racer.x - Math.cos(racer.angle) * 35,
        y: racer.y - Math.sin(racer.angle) * 35,
        type: 'banana',
        life: 18.0,
      });
      sound.playKick();
    } else if (item === 'rocket') {
      // Launch rocket forward
      obstaclesRef.current.push({
        x: racer.x + Math.cos(racer.angle) * 35,
        y: racer.y + Math.sin(racer.angle) * 35,
        type: 'rocket',
        vx: Math.cos(racer.angle) * 350,
        vy: Math.sin(racer.angle) * 350,
        life: 4.0,
      });
      sound.playPunch();
    }
  };

  // Checkpoint & Lap Logic
  const checkLapProgress = (racer: Racer, currentTime: number) => {
    const cpIndex = racer.checkpointsPassed % checkpoints.current.length;
    const cp = checkpoints.current[cpIndex];

    const dist = Math.hypot(racer.x - cp.x, racer.y - cp.y);
    if (dist < cp.r) {
      racer.checkpointsPassed += 1;

      // Completed a full lap
      if (racer.checkpointsPassed % checkpoints.current.length === 0) {
        const lapDuration = (currentTime - racer.lapStartTime) / 1000;
        if (lapDuration < racer.bestLap) {
          racer.bestLap = lapDuration;
        }

        if (racer.isPlayer) {
          setLapTime(lapDuration);
          if (lapDuration < bestLapTime) setBestLapTime(lapDuration);
          setLap((prev) => prev + 1);
        }

        racer.currentLap += 1;
        racer.lapStartTime = currentTime;

        // Finish after 3 laps
        if (racer.currentLap > 3) {
          racer.finished = true;
          racer.totalTime = (currentTime - racersRef.current[0].lapStartTime) / 1000;

          if (racer.isPlayer) {
            handleRaceFinish();
          }
        }
      }
    }
  };

  // Rank sorting
  const updateRanks = () => {
    const racers = [...racersRef.current];
    racers.sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.currentLap !== b.currentLap) return b.currentLap - a.currentLap;
      return b.checkpointsPassed - a.checkpointsPassed;
    });

    racers.forEach((r, idx) => {
      r.rank = idx + 1;
      if (r.isPlayer) {
        setCurrentPosition(r.rank);
      }
    });
  };

  // When player finishes 3 laps
  const handleRaceFinish = () => {
    setGameState('FINISHED');
    sound.playKO();

    const sorted = [...racersRef.current].sort((a, b) => a.rank - b.rank);
    setFinalRankings(sorted);

    // Save race result
    const bestLap = bestLapTime < 999 ? Number(bestLapTime.toFixed(2)) : 24.5;
    onRecordRaceResult({
      playerName: 'Player 1',
      characterName: playerChar.name,
      kartName: playerChar.kart.modelName,
      trackName: 'Sakura Blossom Circuit',
      bestLapTime: bestLap,
    });
  };

  // Draw Sakura Race Track
  const drawTrack = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
    // Grass & Park background
    ctx.fillStyle = '#064e3b'; // deep emerald grass
    ctx.fillRect(0, 0, w, h);

    // Scattered pink floral grass patches
    ctx.fillStyle = 'rgba(244, 114, 182, 0.2)';
    for (let i = 0; i < 20; i++) {
      const px = (i * 123) % w;
      const py = (i * 97) % h;
      ctx.beginPath();
      ctx.arc(px, py, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer Track Outline (Wide Asphalt)
    ctx.save();
    ctx.strokeStyle = '#f43f5e'; // red-white curbs
    ctx.lineWidth = 110;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawTrackPath(ctx);
    ctx.stroke();

    // Track Surface (Dark Asphalt)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 98;
    drawTrackPath(ctx);
    ctx.stroke();

    // Center Dashed White Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 16]);
    drawTrackPath(ctx);
    ctx.stroke();
    ctx.restore();

    // Start/Finish Line
    ctx.save();
    ctx.translate(400, 110);
    ctx.rotate(Math.PI / 2);
    for (let c = -45; c < 45; c += 15) {
      ctx.fillStyle = (Math.floor(c / 15) % 2 === 0) ? '#ffffff' : '#0f172a';
      ctx.fillRect(c, -8, 15, 16);
    }
    ctx.restore();

    // Sakura Trees in Track Infield
    [
      { x: 480, y: 260 },
      { x: 340, y: 300 },
      { x: 620, y: 300 },
    ].forEach((t) => {
      // Tree canopy
      ctx.save();
      ctx.fillStyle = '#f472b6';
      ctx.shadowColor = '#fb7185';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 45, 0, Math.PI * 2);
      ctx.fill();

      // Trunk
      ctx.fillStyle = '#78350f';
      ctx.fillRect(t.x - 6, t.y + 10, 12, 35);
      ctx.restore();
    });
  };

  const drawTrackPath = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(400, 110);
    ctx.lineTo(700, 110);
    ctx.quadraticCurveTo(840, 110, 840, 260);
    ctx.quadraticCurveTo(840, 440, 680, 440);
    ctx.quadraticCurveTo(480, 490, 300, 440);
    ctx.quadraticCurveTo(120, 440, 120, 260);
    ctx.quadraticCurveTo(120, 110, 400, 110);
    ctx.closePath();
  };

  // Draw Racer Kart on Track
  const drawRacerKart = (ctx: CanvasRenderingContext2D, racer: Racer) => {
    ctx.save();
    ctx.translate(racer.x, racer.y);
    ctx.rotate(racer.angle);

    // Shield Aura
    if (racer.shieldTimer > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fill();
    }

    // Boost Flames
    if (racer.boostTimer > 0) {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-20, -6);
      ctx.lineTo(-38 - Math.random() * 10, 0);
      ctx.lineTo(-20, 6);
      ctx.fill();
    }

    // Drift Sparks
    if (racer.isDrifting) {
      ctx.fillStyle = racer.driftCharge > 50 ? '#c084fc' : '#38bdf8';
      for (let s = 0; s < 3; s++) {
        ctx.beginPath();
        ctx.arc(-16 - Math.random() * 8, (s % 2 === 0 ? -12 : 12), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4 Wheels
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-18, -16, 10, 6); // Front Left
    ctx.fillRect(10, -16, 10, 6);  // Front Right
    ctx.fillRect(-18, 10, 10, 6);  // Back Left
    ctx.fillRect(10, 10, 10, 6);   // Back Right

    // Kart Chassis / Body
    ctx.fillStyle = racer.color;
    ctx.beginPath();
    ctx.roundRect(-16, -11, 34, 22, 6);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Spoiler / Rear Wing
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-19, -13, 4, 26);

    // Chibi Driver Head & Helmet/Hair
    ctx.fillStyle = racer.char.colors.skin;
    ctx.beginPath();
    ctx.arc(2, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Driver Hair / Cap
    ctx.fillStyle = racer.char.colors.hair;
    ctx.beginPath();
    ctx.arc(-1, 0, 8.5, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.fill();

    // Player indicator triangle above
    if (racer.isPlayer) {
      ctx.rotate(-racer.angle); // billboard
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(-6, -30);
      ctx.lineTo(6, -30);
      ctx.fill();
    }

    ctx.restore();
  };

  // Draw Minimap
  const drawMinimap = (ctx: CanvasRenderingContext2D, mx: number, my: number, mw: number, mh: number) => {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.roundRect(mx, my, mw, mh, 10);
    ctx.fill();
    ctx.stroke();

    // Map Track scale
    const sx = mw / 960;
    const sy = mh / 540;

    ctx.save();
    ctx.translate(mx, my);
    ctx.scale(sx, sy);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 14;
    drawTrackPath(ctx);
    ctx.stroke();

    // Draw Racers on map
    racersRef.current.forEach((r) => {
      ctx.fillStyle = r.isPlayer ? '#fbbf24' : r.color;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.isPlayer ? 14 : 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    ctx.restore();
    ctx.restore();
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4">
      {/* Top Racing Controls & Character Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCharPickerOpen(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-rose-500 rounded-xl transition-all"
            title="Change Your Racer"
          >
            <div
              className="w-8 h-8 rounded-full border border-white/60 flex items-center justify-center font-bold text-white text-xs"
              style={{ backgroundColor: playerChar.colors.primary }}
            >
              {playerChar.name[0]}
            </div>
            <div className="text-left text-xs">
              <span className="font-bold text-white block">{playerChar.name}</span>
              <span className="text-slate-400 text-[10px]">{playerChar.kart.modelName}</span>
            </div>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-rose-400">Track:</span>
            <span className="text-slate-200">Sakura Blossom Circuit (3 Laps)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => {
              const muted = !isMuted;
              sound.setMuted(muted);
              setIsMuted(muted);
            }}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={startRace}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors shadow-lg shadow-rose-500/20"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Restart Race
          </button>
        </div>
      </div>

      {/* Main Racing Viewport with Arcade HUD */}
      <div className="relative w-full rounded-2xl overflow-hidden border-2 border-rose-500/40 shadow-2xl bg-slate-950 aspect-[16/9] select-none">
        {/* Top Racing HUD */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-start justify-between pointer-events-none">
          {/* Position Badge & Lap Counter */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-900/90 border-2 border-amber-400 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5">
              <span className="text-2xl font-black text-amber-400">
                {currentPosition === 1 ? '1ST' : currentPosition === 2 ? '2ND' : currentPosition === 3 ? '3RD' : '4TH'}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-xl shadow-lg flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Lap</span>
              <span className="text-base font-black text-white">
                {Math.min(3, lap)} / 3
              </span>
            </div>
          </div>

          {/* Speedometer & Lap Times */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-xl shadow-lg text-right flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Speed</span>
              <span className="text-base font-black font-mono text-emerald-400">
                {currentSpeedKmh} <span className="text-xs text-slate-400">KM/H</span>
              </span>
            </div>

            {bestLapTime < 999 && (
              <div className="bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-xl shadow-lg text-right flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Best Lap</span>
                <span className="text-sm font-black font-mono text-amber-300">
                  {bestLapTime.toFixed(2)}s
                </span>
              </div>
            )}

            {/* Active Item Slot */}
            <div className="w-12 h-12 rounded-xl bg-slate-900/90 border-2 border-rose-500/80 flex items-center justify-center shadow-lg">
              {playerItem === 'boost' && <Zap className="w-6 h-6 text-amber-400 animate-bounce" />}
              {playerItem === 'shield' && <Shield className="w-6 h-6 text-cyan-400 animate-pulse" />}
              {playerItem === 'banana' && <span className="text-2xl">🍌</span>}
              {playerItem === 'rocket' && <span className="text-2xl">🚀</span>}
              {!playerItem && <span className="text-xs text-slate-500 font-mono">EMPTY</span>}
            </div>
          </div>
        </div>

        {/* Countdown Overlay */}
        {countdown && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none">
            <h1 className="text-6xl md:text-9xl font-black text-white italic tracking-wider drop-shadow-[0_8px_20px_rgba(244,63,94,0.9)] animate-pulse">
              {countdown}
            </h1>
          </div>
        )}

        {/* Finish Screen Modal */}
        {gameState === 'FINISHED' && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 text-center">
            <Trophy className="w-16 h-16 text-amber-400 mb-2 animate-bounce" />
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-widest">
              Grand Prix Finished!
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white mt-1">
              You Finished {currentPosition === 1 ? '1st!' : currentPosition === 2 ? '2nd' : currentPosition === 3 ? '3rd' : '4th'}
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              Best Lap: <span className="font-mono font-bold text-amber-400">{bestLapTime < 999 ? bestLapTime.toFixed(2) : '24.50'}s</span>
            </p>

            {/* Final Standings Table */}
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-3 my-4">
              <div className="text-xs font-bold text-slate-400 mb-2 text-left uppercase">Final Race Results</div>
              {finalRankings.map((r, i) => (
                <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-slate-800/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400 w-4">{i + 1}</span>
                    <span className="text-white font-medium">{r.char.name}</span>
                    <span className="text-slate-500">({r.char.kart.modelName})</span>
                  </div>
                  <span className="font-mono text-slate-300">
                    {r.bestLap < 999 ? `${r.bestLap.toFixed(2)}s` : '--'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={startRace}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-rose-500/30 flex items-center gap-2 text-xs"
              >
                <RefreshCw className="w-4 h-4" /> Race Again
              </button>
              <button
                onClick={() => setIsCharPickerOpen(true)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition-colors text-xs"
              >
                Change Racer
              </button>
            </div>
          </div>
        )}

        {/* Canvas Element */}
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          className="w-full h-full object-contain"
        />

        {/* On-Screen Mobile & Tactile Racing Controls */}
        <div className="absolute bottom-3 left-3 right-3 z-20 flex items-end justify-between pointer-events-none">
          {/* Steering Controls (Left & Right) */}
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              onMouseDown={() => { touchInputs.current.left = true; }}
              onMouseUp={() => { touchInputs.current.left = false; }}
              onTouchStart={() => { touchInputs.current.left = true; }}
              onTouchEnd={() => { touchInputs.current.left = false; }}
              className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/40 active:bg-white/70 border-2 border-white/80 text-white text-2xl font-bold flex items-center justify-center shadow-lg backdrop-blur-sm"
            >
              ◀
            </button>
            <button
              onMouseDown={() => { touchInputs.current.right = true; }}
              onMouseUp={() => { touchInputs.current.right = false; }}
              onTouchStart={() => { touchInputs.current.right = true; }}
              onTouchEnd={() => { touchInputs.current.right = false; }}
              className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/40 active:bg-white/70 border-2 border-white/80 text-white text-2xl font-bold flex items-center justify-center shadow-lg backdrop-blur-sm"
            >
              ▶
            </button>
          </div>

          {/* Action Pedals (Gas, Brake, Drift, Item) */}
          <div className="pointer-events-auto flex items-center gap-2 md:gap-3">
            {/* Use Item Button */}
            {playerItem && (
              <button
                onMouseDown={() => { touchInputs.current.useItem = true; }}
                onMouseUp={() => { touchInputs.current.useItem = false; }}
                onTouchStart={() => { touchInputs.current.useItem = true; }}
                onTouchEnd={() => { touchInputs.current.useItem = false; }}
                className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-rose-500 border-2 border-white text-white flex items-center justify-center shadow-lg animate-pulse"
                title="Use Power-Up Item"
              >
                <Zap className="w-6 h-6 text-yellow-300" />
              </button>
            )}

            {/* Drift Button */}
            <button
              onMouseDown={() => { touchInputs.current.drift = true; }}
              onMouseUp={() => { touchInputs.current.drift = false; }}
              onTouchStart={() => { touchInputs.current.drift = true; }}
              onTouchEnd={() => { touchInputs.current.drift = false; }}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-purple-500/80 active:bg-purple-600 border-2 border-white text-white font-bold text-xs flex items-center justify-center shadow-lg backdrop-blur-sm"
              title="Hold to Drift and charge turbo boost!"
            >
              DRIFT
            </button>

            {/* Brake / Reverse */}
            <button
              onMouseDown={() => { touchInputs.current.brake = true; }}
              onMouseUp={() => { touchInputs.current.brake = false; }}
              onTouchStart={() => { touchInputs.current.brake = true; }}
              onTouchEnd={() => { touchInputs.current.brake = false; }}
              className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-rose-600/80 active:bg-rose-700 border-2 border-white text-white font-black text-xs flex items-center justify-center shadow-lg backdrop-blur-sm"
            >
              BRAKE
            </button>

            {/* Gas Pedal */}
            <button
              onMouseDown={() => { touchInputs.current.gas = true; }}
              onMouseUp={() => { touchInputs.current.gas = false; }}
              onTouchStart={() => { touchInputs.current.gas = true; }}
              onTouchEnd={() => { touchInputs.current.gas = false; }}
              className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-emerald-500/90 active:bg-emerald-600 border-2 border-white text-white font-black text-sm flex items-center justify-center shadow-lg backdrop-blur-sm"
            >
              GAS
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Controls Guide */}
      <div className="flex flex-wrap items-center justify-between text-xs bg-slate-900 border border-slate-800 p-3 rounded-xl text-slate-400">
        <div>
          <span className="font-semibold text-slate-200">Racing Controls:</span>{' '}
          <span className="text-rose-300 font-mono">W / Up</span> (Accelerate) ·{' '}
          <span className="text-rose-300 font-mono">S / Down</span> (Brake / Reverse) ·{' '}
          <span className="text-rose-300 font-mono">A/D or Left/Right</span> (Steer) ·{' '}
          <span className="text-rose-300 font-mono">Space</span> (Hold to Drift, Release for Turbo) ·{' '}
          <span className="text-rose-300 font-mono">E / Shift</span> (Use Power-Up)
        </div>
        <div className="text-slate-500">
          Tip: Hit orange speed boost pads on track for instant nitro!
        </div>
      </div>

      {/* Racer Selector Modal */}
      {isCharPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Select Your Grand Prix Racer</h3>
              <button
                onClick={() => setIsCharPickerOpen(false)}
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
                    setPlayerChar(c);
                    setIsCharPickerOpen(false);
                    startRace();
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${playerChar.id === c.id ? 'border-rose-500 bg-rose-950/30' : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'}`}
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
                      <span className="text-[11px] font-mono text-amber-400">{c.kart.modelName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span>Top Speed: {c.kart.topSpeed.toFixed(1)}</span>
                      <span>·</span>
                      <span>Accel: {c.kart.acceleration.toFixed(2)}</span>
                      <span>·</span>
                      <span>Handling: {c.kart.handling.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={() => {
                  setIsCharPickerOpen(false);
                  onOpenForge();
                }}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
              >
                + Forge New Character & Kart
              </button>
              <button
                onClick={() => setIsCharPickerOpen(false)}
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
