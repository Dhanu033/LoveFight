import React, { useState, useEffect, useRef } from 'react';
import { Character, Archetype } from '../../types/game';
import { generateProceduralCharacter, drawCharacterAvatarToCanvas } from '../../utils/characterGenerator';
import { sound } from '../../utils/audio';
import { Sparkles, Swords, Car, Plus, Trash2, Check, Shuffle, Award } from 'lucide-react';

interface CharacterForgeProps {
  roster: Character[];
  onSaveCharacter: (char: Character) => void;
  onDeleteCharacter: (id: string) => void;
  onDeployToFight: (char: Character) => void;
  onDeployToRace: (char: Character) => void;
}

const PRESET_PROMPTS = [
  'Cyberpunk Neon Katana Striker',
  'Romantic Sakura Ribbon Duelist',
  'Solar Flare Kung-Fu Master',
  'Gothic Shadow Skater Brawler',
  'Steampunk Brass Mech Boxer',
  'Arctic Crystal Ice Empress',
];

export const CharacterForge: React.FC<CharacterForgeProps> = ({
  roster,
  onSaveCharacter,
  onDeleteCharacter,
  onDeployToFight,
  onDeployToRace,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active character being forged
  const [activeChar, setActiveChar] = useState<Character>(() =>
    generateProceduralCharacter({ gender: 'girl', themePrompt: 'Romantic Sakura Ribbon Duelist' })
  );

  const [promptInput, setPromptInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState<boolean>(false);

  // Redraw avatar whenever activeChar changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCharacterAvatarToCanvas(ctx, activeChar, 240, 240);
  }, [activeChar]);

  // Handle Generate with AI / Procedural Inspiration
  const handleAIGenerate = (promptText?: string) => {
    setIsGenerating(true);
    sound.playSuper();

    const query = promptText || promptInput.trim();
    setTimeout(() => {
      const isBoy = query.toLowerCase().includes('boy') || query.toLowerCase().includes('monk') || query.toLowerCase().includes('boxer') || query.toLowerCase().includes('kung-fu');
      const isGirl = query.toLowerCase().includes('girl') || query.toLowerCase().includes('maiden') || query.toLowerCase().includes('empress') || query.toLowerCase().includes('duelist');
      const gender = isBoy ? 'boy' : isGirl ? 'girl' : (Math.random() > 0.5 ? 'boy' : 'girl');

      let archetype: Archetype = 'Blossom Striker';
      if (query.toLowerCase().includes('ninja') || query.toLowerCase().includes('skater') || query.toLowerCase().includes('speed')) {
        archetype = 'Speedster';
      } else if (query.toLowerCase().includes('mech') || query.toLowerCase().includes('master') || query.toLowerCase().includes('titan')) {
        archetype = 'Grappler';
      } else if (query.toLowerCase().includes('boxer') || query.toLowerCase().includes('flare') || query.toLowerCase().includes('striker')) {
        archetype = 'Brawler';
      } else if (query.toLowerCase().includes('empress') || query.toLowerCase().includes('tactician')) {
        archetype = 'Tactician';
      }

      const newChar = generateProceduralCharacter({
        gender,
        archetype,
        themePrompt: query || undefined,
      });

      setActiveChar(newChar);
      setIsGenerating(false);
    }, 600);
  };

  // Handle Save
  const handleSave = () => {
    onSaveCharacter(activeChar);
    sound.playPunch();
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> AI Character Forge &amp; Visual Studio
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
            Generate &amp; Customize Your Fighters
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Create completely custom chibi fighters with tailored martial stats, signature ultimate moves, and speed karts. Put them into battle or watch them fight autonomously!
          </p>
        </div>

        <button
          onClick={() => handleAIGenerate()}
          disabled={isGenerating}
          className="px-5 py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer"
        >
          <Shuffle className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Synthesizing...' : 'Randomize New Fighter'}
        </button>
      </div>

      {/* AI Prompt Generator Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
        <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
          <span>AI Character Prompt Generator</span>
          <span className="text-slate-500 font-normal">Type any fighter theme or click a prompt preset</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAIGenerate()}
            placeholder="e.g. Cyberpunk ninja girl with twin neon katanas, or Blazing Phoenix brawler..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
          <button
            onClick={() => handleAIGenerate()}
            disabled={isGenerating}
            className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4" /> Generate
          </button>
        </div>

        {/* Prompt presets */}
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-[11px] text-slate-500">Inspiration:</span>
          {PRESET_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setPromptInput(p);
                handleAIGenerate(p);
              }}
              className="text-xs px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Editor: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Canvas Avatar Preview & Quick Actions */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden">
            {/* Background Aura glow */}
            <div
              className="absolute -top-20 -left-20 w-48 h-48 rounded-full blur-3xl opacity-25"
              style={{ backgroundColor: activeChar.colors.primary }}
            />

            {/* Canvas Avatar */}
            <div className="relative mb-4">
              <canvas
                ref={canvasRef}
                width={240}
                height={240}
                className="w-48 h-48 rounded-full border-4 border-white/80 shadow-2xl bg-slate-950"
              />
              <span className="absolute bottom-1 right-2 px-2 py-0.5 bg-slate-900/90 border border-slate-700 text-[10px] font-bold text-rose-300 rounded-full">
                {activeChar.archetype}
              </span>
            </div>

            <h3 className="text-2xl font-black text-white">{activeChar.name}</h3>
            <p className="text-xs font-semibold text-rose-400 mt-0.5">{activeChar.title}</p>
            <p className="text-xs text-slate-400 mt-2 italic px-4">&quot;{activeChar.lore}&quot;</p>

            {/* Signature Super Move Box */}
            <div className="w-full mt-4 bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  {activeChar.specialMove.name}
                </span>
                <span className="text-rose-400 font-mono font-bold">{activeChar.specialMove.damage} DMG</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{activeChar.specialMove.description}</p>
              <p className="text-[11px] text-slate-500 italic mt-1">&quot;{activeChar.specialMove.quote}&quot;</p>
            </div>

            {/* Kart specs summary */}
            <div className="w-full mt-3 bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-cyan-400" />
                  {activeChar.kart.modelName}
                </span>
                <span className="text-cyan-400 font-mono text-[11px]">{activeChar.kart.topSpeed.toFixed(1)} Top Spd</span>
              </div>
            </div>

            {/* Save & Instant Deploy Buttons */}
            <div className="w-full flex flex-col gap-2 mt-5">
              <button
                onClick={handleSave}
                className="w-full py-3 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {showSaveSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Plus className="w-4 h-4" />}
                {showSaveSuccess ? 'Saved to Roster!' : 'Save Fighter to Roster'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onDeployToFight(activeChar)}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5 text-xs"
                >
                  <Swords className="w-3.5 h-3.5 text-rose-400" />
                  Fight with {activeChar.name}
                </button>
                <button
                  onClick={() => onDeployToRace(activeChar)}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5 text-xs"
                >
                  <Car className="w-3.5 h-3.5 text-cyan-400" />
                  Race in GP
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Fine-Tuning Studio */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5">
            <h4 className="text-base font-bold text-white pb-3 border-b border-slate-800 flex items-center justify-between">
              <span>Martial Attributes &amp; Customization</span>
              <span className="text-xs text-rose-400 font-normal">Adjust stats &amp; palette</span>
            </h4>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Fighter Name</label>
                <input
                  type="text"
                  value={activeChar.name}
                  onChange={(e) => setActiveChar({ ...activeChar, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Title / Moniker</label>
                <input
                  type="text"
                  value={activeChar.title}
                  onChange={(e) => setActiveChar({ ...activeChar, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Archetype & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Fighting Archetype</label>
                <select
                  value={activeChar.archetype}
                  onChange={(e) => setActiveChar({ ...activeChar, archetype: e.target.value as Archetype })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Brawler">Brawler (High Attack &amp; Combos)</option>
                  <option value="Speedster">Speedster (High Agility &amp; Dash)</option>
                  <option value="Grappler">Grappler (High Health &amp; Defense)</option>
                  <option value="Tactician">Tactician (High Super Meter)</option>
                  <option value="Blossom Striker">Blossom Striker (Balanced Martial Arts)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Style &amp; Appearance</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveChar({ ...activeChar, gender: 'boy' })}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-colors ${activeChar.gender === 'boy' ? 'bg-blue-600/30 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    Boy (Karate Gi)
                  </button>
                  <button
                    onClick={() => setActiveChar({ ...activeChar, gender: 'girl' })}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-colors ${activeChar.gender === 'girl' ? 'bg-pink-600/30 border-pink-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    Girl (Blossom Dress)
                  </button>
                </div>
              </div>
            </div>

            {/* Color Palette Customizers */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Color Palette &amp; Aura</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <input
                    type="color"
                    value={activeChar.colors.primary}
                    onChange={(e) =>
                      setActiveChar({
                        ...activeChar,
                        colors: { ...activeChar.colors, primary: e.target.value, aura: e.target.value },
                        kart: { ...activeChar.kart, color: e.target.value },
                      })
                    }
                    className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                  />
                  <span className="text-xs text-slate-300">Accent / Aura</span>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <input
                    type="color"
                    value={activeChar.colors.hair}
                    onChange={(e) =>
                      setActiveChar({
                        ...activeChar,
                        colors: { ...activeChar.colors, hair: e.target.value },
                      })
                    }
                    className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                  />
                  <span className="text-xs text-slate-300">Hair Color</span>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <input
                    type="color"
                    value={activeChar.colors.outfit}
                    onChange={(e) =>
                      setActiveChar({
                        ...activeChar,
                        colors: { ...activeChar.colors, outfit: e.target.value },
                      })
                    }
                    className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                  />
                  <span className="text-xs text-slate-300">Outfit Color</span>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <input
                    type="color"
                    value={activeChar.colors.skin}
                    onChange={(e) =>
                      setActiveChar({
                        ...activeChar,
                        colors: { ...activeChar.colors, skin: e.target.value },
                      })
                    }
                    className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
                  />
                  <span className="text-xs text-slate-300">Skin Tone</span>
                </div>
              </div>
            </div>

            {/* Combat Stats Sliders */}
            <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300 block">Fighter Stats Tuning</label>

              {/* Health */}
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-slate-400 w-24">Health ({activeChar.stats.health})</span>
                <input
                  type="range"
                  min="90"
                  max="135"
                  value={activeChar.stats.health}
                  onChange={(e) =>
                    setActiveChar({
                      ...activeChar,
                      stats: { ...activeChar.stats, health: Number(e.target.value) },
                    })
                  }
                  className="flex-1 accent-rose-500"
                />
              </div>

              {/* Attack */}
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-slate-400 w-24">Attack ({activeChar.stats.attack})</span>
                <input
                  type="range"
                  min="9"
                  max="18"
                  value={activeChar.stats.attack}
                  onChange={(e) =>
                    setActiveChar({
                      ...activeChar,
                      stats: { ...activeChar.stats, attack: Number(e.target.value) },
                    })
                  }
                  className="flex-1 accent-rose-500"
                />
              </div>

              {/* Speed */}
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-slate-400 w-24">Speed ({activeChar.stats.speed})</span>
                <input
                  type="range"
                  min="7"
                  max="16"
                  value={activeChar.stats.speed}
                  onChange={(e) =>
                    setActiveChar({
                      ...activeChar,
                      stats: { ...activeChar.stats, speed: Number(e.target.value) },
                      kart: { ...activeChar.kart, topSpeed: 7.0 + (Number(e.target.value) / 16) * 2.5 },
                    })
                  }
                  className="flex-1 accent-rose-500"
                />
              </div>

              {/* Defense */}
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-slate-400 w-24">Defense ({activeChar.stats.defense})</span>
                <input
                  type="range"
                  min="6"
                  max="15"
                  value={activeChar.stats.defense}
                  onChange={(e) =>
                    setActiveChar({
                      ...activeChar,
                      stats: { ...activeChar.stats, defense: Number(e.target.value) },
                    })
                  }
                  className="flex-1 accent-rose-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Roster Character Manager */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-base font-bold text-white">Full Fighter &amp; Racer Roster</h4>
            <p className="text-xs text-slate-400">All available fighters for Fighting Arena and Grand Prix</p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            {roster.length} Fighters Enrolled
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {roster.map((c) => (
            <div
              key={c.id}
              className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
            >
              <div
                onClick={() => setActiveChar(c)}
                className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                title="Click to load into Studio"
              >
                <div
                  className="w-10 h-10 rounded-full border border-white/60 flex items-center justify-center font-bold text-white text-sm shrink-0"
                  style={{ backgroundColor: c.colors.primary }}
                >
                  {c.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-xs truncate">{c.name}</span>
                    {c.isCustom && (
                      <span className="text-[9px] bg-rose-950/80 text-rose-400 border border-rose-800/60 px-1 rounded">
                        Custom
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 truncate block">{c.archetype}</span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="flex items-center gap-0.5">
                      <Award className="w-2.5 h-2.5 text-amber-400" /> {c.wins}W / {c.losses}L
                    </span>
                  </div>
                </div>
              </div>

              {c.isCustom && (
                <button
                  onClick={() => onDeleteCharacter(c.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Delete Custom Fighter"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
