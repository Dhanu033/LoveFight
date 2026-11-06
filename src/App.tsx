import React, { useState, useEffect } from 'react';
import { GameMode, Character, FightingLeaderboardEntry, RacingLeaderboardEntry } from './types/game';
import {
  INITIAL_CHARACTERS,
  INITIAL_FIGHTING_LEADERBOARD,
  INITIAL_RACING_LEADERBOARD,
} from './data/roster';
import { FightingGame } from './components/fighting/FightingGame';
import { RacingGame } from './components/racing/RacingGame';
import { CharacterForge } from './components/forge/CharacterForge';
import { Leaderboards } from './components/leaderboard/Leaderboards';
import { GameGuide } from './components/guide/GameGuide';
import { sound } from './utils/audio';
import { Volume2, VolumeX, Music, Download, Smartphone, Maximize2 } from 'lucide-react';

const STORAGE_KEYS = {
  ROSTER: 'chibi_game_roster_v2',
  FIGHTING_LB: 'chibi_game_fighting_lb_v2',
  RACING_LB: 'chibi_game_racing_lb_v2',
};

export default function App() {
  const [currentMode, setCurrentMode] = useState<GameMode>('fighting');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isBgmActive, setIsBgmActive] = useState<boolean>(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [showRotateBanner, setShowRotateBanner] = useState<boolean>(true);

  // Detect Portrait Orientation
  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window !== 'undefined') {
        const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 900;
        setIsPortrait(portrait);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Request Fullscreen & Landscape Screen Lock
  const handleToggleLandscape = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      // Attempt screen orientation lock if supported
      const screenAny = screen as unknown as { orientation?: { lock: (mode: string) => Promise<void> } };
      if (screenAny.orientation?.lock) {
        await screenAny.orientation.lock('landscape').catch(() => {});
      }
    } catch {
      // Fallback
    }
  };

  // Roster State
  const [roster, setRoster] = useState<Character[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ROSTER);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_CHARACTERS;
  });

  // Leaderboards State
  const [fightingScores, setFightingScores] = useState<FightingLeaderboardEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FIGHTING_LB);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_FIGHTING_LEADERBOARD;
  });

  const [racingScores, setRacingScores] = useState<RacingLeaderboardEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RACING_LB);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_RACING_LEADERBOARD;
  });

  // Save Roster to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ROSTER, JSON.stringify(roster));
    } catch {
      // ignore
    }
  }, [roster]);

  // Save Leaderboards to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FIGHTING_LB, JSON.stringify(fightingScores));
      localStorage.setItem(STORAGE_KEYS.RACING_LB, JSON.stringify(racingScores));
    } catch {
      // ignore
    }
  }, [fightingScores, racingScores]);

  // Handle Character Save from Forge
  const handleSaveCharacter = (newChar: Character) => {
    setRoster((prev) => {
      const existingIdx = prev.findIndex((c) => c.id === newChar.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = newChar;
        return copy;
      }
      return [newChar, ...prev];
    });
  };

  // Handle Delete Character
  const handleDeleteCharacter = (charId: string) => {
    setRoster((prev) => prev.filter((c) => c.id !== charId));
  };

  // Record a Fighting Victory
  const handleRecordFightVictory = (winner: Character, loser: Character, _mode: string) => {
    // Update character win/loss stats
    setRoster((prev) =>
      prev.map((c) => {
        if (c.id === winner.id) return { ...c, wins: c.wins + 1 };
        if (c.id === loser.id) return { ...c, losses: c.losses + 1 };
        return c;
      })
    );

    // Add entry to Fighting Leaderboard
    const newEntry: FightingLeaderboardEntry = {
      id: `fight-${Date.now()}`,
      rank: 1,
      playerName: 'Player 1',
      characterName: winner.name,
      rating: 2100 + Math.floor(Math.random() * 80),
      wins: winner.wins + 1,
      losses: winner.losses,
      winRate: Math.round(((winner.wins + 1) / (winner.wins + 1 + winner.losses)) * 1000) / 10,
      streak: 1,
      tier: 'Diamond',
      date: 'Just now',
    };

    setFightingScores((prev) => [newEntry, ...prev.slice(0, 19)]);
  };

  // Record a Racing Result
  const handleRecordRaceResult = (entryData: Omit<RacingLeaderboardEntry, 'id' | 'rank' | 'date'>) => {
    const newEntry: RacingLeaderboardEntry = {
      id: `race-${Date.now()}`,
      rank: 1,
      ...entryData,
      date: 'Just now',
    };

    setRacingScores((prev) => {
      const combined = [newEntry, ...prev];
      combined.sort((a, b) => a.bestLapTime - b.bestLapTime);
      return combined.slice(0, 20).map((item, idx) => ({ ...item, rank: idx + 1 }));
    });
  };

  // Toggle Mute Audio
  const toggleMute = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    sound.setMuted(nextMuted);
    if (nextMuted) setIsBgmActive(false);
  };

  // Toggle Melodic BGM
  const toggleBgm = () => {
    const active = sound.toggleBgm();
    setIsBgmActive(active);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Top Bar Contract (§2): Exactly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Wordmark */}
        <button
          onClick={() => setCurrentMode('fighting')}
          className="text-lg md:text-xl font-black tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2 group text-left cursor-pointer"
        >
          <span className="text-rose-500 text-2xl group-hover:scale-110 transition-transform">🌸</span>
          <span className="bg-gradient-to-r from-white via-rose-100 to-rose-300 bg-clip-text text-transparent">
            CHIBI CLASH &amp; DRIFT
          </span>
        </button>

        {/* Zone 2: 4-5 concise single-line nav links */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-400">
          <button
            onClick={() => setCurrentMode('fighting')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${currentMode === 'fighting' ? 'text-rose-400 font-bold' : 'hover:text-slate-200'}`}
          >
            Fighting Arena
          </button>
          <button
            onClick={() => setCurrentMode('racing')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${currentMode === 'racing' ? 'text-amber-400 font-bold' : 'hover:text-slate-200'}`}
          >
            Speed Racing
          </button>
          <button
            onClick={() => setCurrentMode('forge')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${currentMode === 'forge' ? 'text-pink-400 font-bold' : 'hover:text-slate-200'}`}
          >
            Character Forge
          </button>
          <button
            onClick={() => setCurrentMode('leaderboards')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${currentMode === 'leaderboards' ? 'text-purple-400 font-bold' : 'hover:text-slate-200'}`}
          >
            Multiplayer Leaderboards
          </button>
          <button
            onClick={() => setCurrentMode('guide')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${currentMode === 'guide' ? 'text-cyan-400 font-bold' : 'hover:text-slate-200'}`}
          >
            Move Guide
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action + Utility Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/chibi-game-website.zip"
            download="chibi-game-website.zip"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-md shadow-rose-500/20 transition-all shrink-0 active:scale-95 cursor-pointer"
            title="Download complete website files as ZIP"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download ZIP</span>
          </a>

          <button
            onClick={handleToggleLandscape}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Rotate to Horizontal / Landscape Fullscreen"
          >
            <Smartphone className="w-3.5 h-3.5 rotate-90 text-amber-400" />
            <span className="hidden md:inline">Rotate Screen</span>
          </button>

          <button
            onClick={toggleBgm}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${isBgmActive ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm shadow-rose-500/20' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
            title="Toggle 16-Bit Arcade Music"
          >
            <Music className={`w-3.5 h-3.5 ${isBgmActive ? 'animate-bounce' : ''}`} />
          </button>

          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title="Toggle Audio Effects"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Screen Orientation / Horizontal Mode Banner (Triggered when phone is vertical) */}
      {isPortrait && showRotateBanner && (
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-purple-600 text-white px-4 py-2.5 text-xs flex items-center justify-between gap-3 shadow-lg z-40">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 rotate-90 animate-bounce shrink-0" />
            <span>
              <strong>Tip:</strong> Rotate your phone horizontally (Landscape) for full widescreen fighting &amp; drift racing!
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleLandscape}
              className="px-2.5 py-1 bg-white text-slate-900 font-bold rounded-md hover:bg-slate-100 flex items-center gap-1 text-[11px]"
            >
              <Maximize2 className="w-3 h-3" /> Rotate &amp; Fullscreen
            </button>
            <button
              onClick={() => setShowRotateBanner(false)}
              className="text-white/80 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Mobile Navigation Bar */}
      <div className="lg:hidden flex items-center justify-around bg-slate-900/95 border-b border-slate-800 p-2 text-[11px] font-semibold text-slate-400 overflow-x-auto">
        <button
          onClick={() => setCurrentMode('fighting')}
          className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${currentMode === 'fighting' ? 'bg-rose-500/20 text-rose-400 font-bold' : ''}`}
        >
          Fighting
        </button>
        <button
          onClick={() => setCurrentMode('racing')}
          className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${currentMode === 'racing' ? 'bg-amber-500/20 text-amber-400 font-bold' : ''}`}
        >
          Racing
        </button>
        <button
          onClick={() => setCurrentMode('forge')}
          className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${currentMode === 'forge' ? 'bg-pink-500/20 text-pink-400 font-bold' : ''}`}
        >
          AI Forge
        </button>
        <button
          onClick={() => setCurrentMode('leaderboards')}
          className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${currentMode === 'leaderboards' ? 'bg-purple-500/20 text-purple-400 font-bold' : ''}`}
        >
          Leaderboard
        </button>
        <button
          onClick={() => setCurrentMode('guide')}
          className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap ${currentMode === 'guide' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : ''}`}
        >
          Guide
        </button>
      </div>

      {/* Main Content Arena */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col justify-start">
        {currentMode === 'fighting' && (
          <FightingGame
            roster={roster}
            onRecordVictory={handleRecordFightVictory}
            onOpenForge={() => setCurrentMode('forge')}
          />
        )}

        {currentMode === 'racing' && (
          <RacingGame
            roster={roster}
            onRecordRaceResult={handleRecordRaceResult}
            onOpenForge={() => setCurrentMode('forge')}
          />
        )}

        {currentMode === 'forge' && (
          <CharacterForge
            roster={roster}
            onSaveCharacter={handleSaveCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onDeployToFight={(_char) => setCurrentMode('fighting')}
            onDeployToRace={(_char) => setCurrentMode('racing')}
          />
        )}

        {currentMode === 'leaderboards' && (
          <Leaderboards
            fightingScores={fightingScores}
            racingScores={racingScores}
            roster={roster}
            onAddPlayerScore={(_name) => {}}
          />
        )}

        {currentMode === 'guide' && <GameGuide />}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div className="flex items-center gap-2">
          <span>Chibi Clash &amp; Drift Arcade</span>
          <span>·</span>
          <span>Sakura Blossom Series</span>
          <span>·</span>
          <span>60 FPS Canvas Engine</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <button onClick={() => setCurrentMode('fighting')} className="hover:text-slate-300">
            Fighting Arena
          </button>
          <button onClick={() => setCurrentMode('racing')} className="hover:text-slate-300">
            Grand Prix
          </button>
          <button onClick={() => setCurrentMode('forge')} className="hover:text-slate-300">
            AI Studio
          </button>
          <button onClick={() => setCurrentMode('leaderboards')} className="hover:text-slate-300">
            Leaderboard
          </button>
        </div>
      </footer>
    </div>
  );
}
