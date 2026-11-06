import React from 'react';
import { Swords, Car, Shield, Sparkles, Cpu, Award } from 'lucide-react';

export const GameGuide: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
          <Award className="w-4 h-4" /> Comprehensive Arcade Manual
        </span>
        <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
          How to Play, Combos &amp; Mechanics
        </h2>
        <p className="text-sm text-slate-300 mt-1">
          Master martial arts combos in the Sakura Fighting Arena and perfect your drift turbo boosts in the Grand Prix!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. FIGHTING ARENA MANUAL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Fighting Arena Mechanics</h3>
              <p className="text-xs text-slate-400">Authentic 2D anime martial arts combat</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-bold text-white block mb-1">👊 Punch &amp; Combos</span>
              <p className="text-slate-400">
                Light, lightning-fast strike. Can be chained rapidly into 2-hit and 3-hit combos that stun opponents and fill your Heart Burst meter.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-bold text-white block mb-1">🥋 Kick &amp; Knockback</span>
              <p className="text-slate-400">
                Heavy roundhouse or spiral kick. Deals 30% more base damage than punches and knocks opponents back across the cobblestone arena.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-bold text-white block mb-1">🛡️ Shield Guard</span>
              <p className="text-slate-400">
                Holding Guard deploys an energy barrier that absorbs 80% of incoming physical damage and negates hitstun, opening foes up to counter-attacks!
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-bold text-rose-400 block mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Heart Burst (Ultimate Super Move)
              </span>
              <p className="text-slate-400">
                When your Burst Gauge hits 100%, activate your fighter&apos;s cinematic signature move! Deals 35-45 devastating damage and can turn the tide of a round.
              </p>
            </div>
          </div>
        </div>

        {/* 2. RACING GRAND PRIX MANUAL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Grand Prix Drift Racing</h3>
              <p className="text-xs text-slate-400">High-speed kart racing &amp; item combat</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-bold text-white block mb-1">🏎️ Drift &amp; Turbo Boost</span>
              <p className="text-slate-400">
                Hold the Drift button (or Spacebar) while steering through tight corners. Your drift sparks turn from blue to purple; release to unleash a rocket turbo boost!
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-bold text-white block mb-1">⚡ Nitro Boost Pads</span>
              <p className="text-slate-400">
                Drive over the yellow-and-amber arrows along the Sakura Circuit straights for an instant top-speed multiplier.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-bold text-white block mb-1">🎁 Mystery Power-Ups</span>
              <p className="text-slate-400">
                Smash into floating pink item boxes to receive:
                <br />· <strong>⚡ Nitro Boost:</strong> Instant supersonic speed burst
                <br />· <strong>🛡️ Barrier Shield:</strong> Protection against spins &amp; hazards
                <br />· <strong>🍌 Cherry Peel Trap:</strong> Drops behind to wipe out chasers
                <br />· <strong>🚀 Blossom Rocket:</strong> Targets the lead kart
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-bold text-cyan-300 block mb-1 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" />
                AI vs AI Spectator Battles
              </span>
              <p className="text-slate-400">
                Select any two generated fighters in Spectator Mode to watch them duel autonomously with real-time AI decision making and live broadcast commentary!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
