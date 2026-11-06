import React, { useState } from 'react';
import { Character, FightingLeaderboardEntry, RacingLeaderboardEntry } from '../../types/game';
import { Trophy, Swords, Car, Award, Flame, Search } from 'lucide-react';

interface LeaderboardsProps {
  fightingScores: FightingLeaderboardEntry[];
  racingScores: RacingLeaderboardEntry[];
  roster: Character[];
  onAddPlayerScore: (playerName: string) => void;
}

export const Leaderboards: React.FC<LeaderboardsProps> = ({
  fightingScores,
  racingScores,
  roster,
}) => {
  const [activeTab, setActiveTab] = useState<'fighting' | 'racing' | 'fame'>('fighting');
  const [timeframe, setTimeframe] = useState<'all' | 'week' | 'today'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sorted and filtered fighting scores
  const filteredFighting = fightingScores
    .filter(
      (entry) =>
        entry.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.characterName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => b.rating - a.rating);

  // Sorted and filtered racing scores
  const filteredRacing = racingScores
    .filter(
      (entry) =>
        entry.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.characterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.kartName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.bestLapTime - b.bestLapTime);

  // Character Hall of Fame
  const sortedRoster = [...roster].sort((a, b) => {
    const rateA = a.wins + a.losses > 0 ? (a.wins / (a.wins + a.losses)) : 0;
    const rateB = b.wins + b.losses > 0 ? (b.wins / (b.wins + b.losses)) : 0;
    return rateB - rateA;
  });

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/30 to-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Trophy className="w-4 h-4" /> Global Multiplayer Leaderboards
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
            Competitive Hall of Champions
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Live rankings, match results, and lap times from fighters and racers worldwide. Every round you play updates the standings!
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-stretch md:self-auto">
          <button
            onClick={() => setActiveTab('fighting')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activeTab === 'fighting' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            <Swords className="w-3.5 h-3.5" />
            Fighting Arena
          </button>
          <button
            onClick={() => setActiveTab('racing')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activeTab === 'racing' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            <Car className="w-3.5 h-3.5" />
            Speed Grand Prix
          </button>
          <button
            onClick={() => setActiveTab('fame')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activeTab === 'fame' ? 'bg-purple-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            <Award className="w-3.5 h-3.5" />
            Character Fame
          </button>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search player, character, or kart..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-500 mr-1 font-medium">Timeframe:</span>
          {(['all', 'week', 'today'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${timeframe === t ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {t === 'all' ? 'All Time' : t === 'week' ? 'This Week' : 'Today'}
            </button>
          ))}
        </div>
      </div>

      {/* Content Tables */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* 1. FIGHTING ARENA LEADERBOARD */}
        {activeTab === 'fighting' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-16">Rank</th>
                  <th className="py-3 px-4">Fighter / Player</th>
                  <th className="py-3 px-4">Character Main</th>
                  <th className="py-3 px-4 text-right">Rating ELO</th>
                  <th className="py-3 px-4 text-right">W / L Record</th>
                  <th className="py-3 px-4 text-right">Win Rate</th>
                  <th className="py-3 px-4 text-right">Streak</th>
                  <th className="py-3 px-4 text-right">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                {filteredFighting.map((entry, index) => {
                  const rank = index + 1;
                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-slate-800/40 transition-colors ${rank === 1 ? 'bg-amber-950/10' : rank === 2 ? 'bg-slate-800/20' : rank === 3 ? 'bg-orange-950/10' : ''}`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-200">
                        {rank === 1 ? (
                          <span className="flex items-center gap-1 text-amber-400 font-extrabold">
                            <Trophy className="w-3.5 h-3.5" /> 1
                          </span>
                        ) : rank === 2 ? (
                          <span className="text-slate-300 font-extrabold">2</span>
                        ) : rank === 3 ? (
                          <span className="text-amber-600 font-extrabold">3</span>
                        ) : (
                          <span className="text-slate-500">{rank}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-sans font-bold text-white">
                        {entry.playerName}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-rose-300">
                        {entry.characterName}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-amber-400">
                        {entry.rating}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-300">
                        <span className="text-emerald-400">{entry.wins}W</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-rose-400">{entry.losses}L</span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-400 font-semibold">
                        {entry.winRate.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="flex items-center justify-end gap-1 text-orange-400 font-bold">
                          <Flame className="w-3 h-3" /> {entry.streak}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${entry.tier === 'Grandmaster' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : entry.tier === 'Diamond' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}
                        >
                          {entry.tier}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. SPEED GRAND PRIX LEADERBOARD */}
        {activeTab === 'racing' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-16">Rank</th>
                  <th className="py-3 px-4">Racer</th>
                  <th className="py-3 px-4">Character</th>
                  <th className="py-3 px-4">Kart Machine</th>
                  <th className="py-3 px-4">Track</th>
                  <th className="py-3 px-4 text-right">Best Lap Record</th>
                  <th className="py-3 px-4 text-right">Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                {filteredRacing.map((entry, index) => {
                  const rank = index + 1;
                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-slate-800/40 transition-colors ${rank === 1 ? 'bg-amber-950/10' : rank === 2 ? 'bg-slate-800/20' : rank === 3 ? 'bg-orange-950/10' : ''}`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-200">
                        {rank === 1 ? (
                          <span className="flex items-center gap-1 text-amber-400 font-extrabold">
                            <Trophy className="w-3.5 h-3.5" /> 1
                          </span>
                        ) : (
                          <span className={rank <= 3 ? 'font-extrabold text-white' : 'text-slate-500'}>
                            {rank}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-sans font-bold text-white">
                        {entry.playerName}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-rose-300 font-medium">
                        {entry.characterName}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-amber-300">
                        {entry.kartName}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-400">
                        {entry.trackName}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400 text-sm">
                        {entry.bestLapTime.toFixed(2)}s
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500 font-sans text-[11px]">
                        {entry.date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. CHARACTER HALL OF FAME */}
        {activeTab === 'fame' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-16">Rank</th>
                  <th className="py-3 px-4">Character</th>
                  <th className="py-3 px-4">Archetype</th>
                  <th className="py-3 px-4">Signature Move</th>
                  <th className="py-3 px-4 text-right">Arena Record</th>
                  <th className="py-3 px-4 text-right">Win Percentage</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                {sortedRoster.map((char, index) => {
                  const rank = index + 1;
                  const totalMatches = char.wins + char.losses;
                  const winRate = totalMatches > 0 ? (char.wins / totalMatches) * 100 : 0;
                  return (
                    <tr key={char.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-200">
                        {rank === 1 ? (
                          <span className="flex items-center gap-1 text-amber-400 font-extrabold">
                            <Trophy className="w-3.5 h-3.5" /> 1
                          </span>
                        ) : (
                          <span className="text-slate-500">{rank}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full border border-white/60 flex items-center justify-center font-bold text-white text-xs"
                            style={{ backgroundColor: char.colors.primary }}
                          >
                            {char.name[0]}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{char.name}</span>
                            <span className="text-[10px] text-slate-400 block">{char.title}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-sans text-rose-300">
                        {char.archetype}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-300">
                        {char.specialMove.name}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-300">
                        <span className="text-emerald-400">{char.wins}W</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-rose-400">{char.losses}L</span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-400 font-bold">
                        {winRate.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        {char.isCustom ? (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded">
                            Custom AI
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                            Original
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
