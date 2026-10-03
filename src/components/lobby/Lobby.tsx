import React, { useState } from 'react';
import { PlayerColor } from '../../types/ludo.js';
import { Award, Dices, Info, Shield, ShieldCheck, Sparkles, Trophy, Users } from 'lucide-react';

interface LobbyProps {
  onCreateGame: (name: string, maxPlayers: 2 | 3 | 4, color?: PlayerColor) => void;
  onJoinGame: (gameId: string, name: string, color?: PlayerColor) => void;
  onNavigateToAdmin: () => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

const COLORS: { value: PlayerColor; label: string; bg: string; border: string }[] = [
  { value: 'red', label: 'Red', bg: 'bg-rose-600', border: 'border-rose-400' },
  { value: 'green', label: 'Green', bg: 'bg-emerald-600', border: 'border-emerald-400' },
  { value: 'yellow', label: 'Yellow', bg: 'bg-amber-500', border: 'border-amber-400' },
  { value: 'blue', label: 'Blue', bg: 'bg-sky-600', border: 'border-sky-400' },
];

export const Lobby: React.FC<LobbyProps> = ({
  onCreateGame,
  onJoinGame,
  onNavigateToAdmin,
  isLoading,
  errorMessage,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');

  // Form states
  const [createName, setCreateName] = useState('Abhishek');
  const [createMaxPlayers, setCreateMaxPlayers] = useState<2 | 3 | 4>(4);
  const [createColor, setCreateColor] = useState<PlayerColor>('red');

  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('Rahul');
  const [joinColor, setJoinColor] = useState<PlayerColor>('green');

  const [showRules, setShowRules] = useState(false);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    onCreateGame(createName.trim(), createMaxPlayers, createColor);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !joinName.trim()) return;
    onJoinGame(joinCode.trim().toUpperCase(), joinName.trim(), joinColor);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6">
      {/* Top Bar */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 via-amber-500 to-emerald-500 p-0.5 shadow-lg shadow-amber-500/10">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Dices className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display flex items-center gap-2">
              Ludo Royale
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans font-bold">
                LIVE
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Real-time server-authoritative multiplayer Ludo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRules(!showRules)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 cursor-pointer transition-colors"
          >
            <Info className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Rules</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToAdmin}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-amber-400 border border-amber-500/30 cursor-pointer transition-colors shadow-sm"
          >
            <Shield className="w-4 h-4" />
            <span>Admin Panel</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-lg mx-auto w-full my-auto py-8">
        {/* Error message alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="bg-slate-900/70 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl shadow-slate-950/60">
          {/* Create vs Join Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => setTab('create')}
              className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                tab === 'create'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Game
            </button>
            <button
              type="button"
              onClick={() => setTab('join')}
              className={`py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                tab === 'join'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Join with Code
            </button>
          </div>

          {/* CREATE GAME TAB */}
          {tab === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Your Display Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Number of Players
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([2, 3, 4] as const).map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCreateMaxPlayers(num)}
                      className={`py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        createMaxPlayers === num
                          ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      {num} Players
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Preferred Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCreateColor(c.value)}
                      className={`py-2 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        createColor === c.value
                          ? `${c.border} bg-slate-800 ring-2 ring-amber-400/40`
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-900'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full ${c.bg} shadow-md`} />
                      <span className="text-[11px] font-semibold text-slate-300">
                        {c.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !createName.trim()}
                className="mt-3 w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-950/60 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isLoading ? 'Creating Room...' : 'Create & Host Game'}
              </button>
            </form>
          ) : (
            /* JOIN GAME TAB */
            <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Room Code (6 Characters)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-base font-mono font-bold tracking-widest text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors uppercase text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Your Display Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Preferred Color (if available)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setJoinColor(c.value)}
                      className={`py-2 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        joinColor === c.value
                          ? `${c.border} bg-slate-800 ring-2 ring-amber-400/40`
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-900'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full ${c.bg} shadow-md`} />
                      <span className="text-[11px] font-semibold text-slate-300">
                        {c.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !joinCode.trim() || !joinName.trim()}
                className="mt-3 w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/60 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                {isLoading ? 'Joining Game...' : 'Join Game Room'}
              </button>
            </form>
          )}
        </div>

        {/* Quick Rules Accordion / Modal */}
        {showRules && (
          <div className="mt-6 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex flex-col gap-2.5 animate-fade-in shadow-xl">
            <h4 className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              Standard Ludo Rules
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300/90">
              <li>
                <strong>Entering Board:</strong> A roll of <strong>6</strong> is required to move a token from the yard to its starting tile.
              </li>
              <li>
                <strong>Safe Cells:</strong> Colored starting tiles and Star (★) tiles are safe. Tokens on these cells cannot be captured.
              </li>
              <li>
                <strong>Capturing Opponents:</strong> Landing on an opponent's token in an unprotected cell captures it, sends it back to their yard, and grants you an <strong>extra roll</strong>!
              </li>
              <li>
                <strong>Rolling a 6:</strong> Grants an extra roll (three consecutive sixes forfeits the turn).
              </li>
              <li>
                <strong>Reaching Home:</strong> Requires an exact roll into the center crown. Moving a token home grants an extra roll.
              </li>
              <li>
                <strong>Winning:</strong> The first player whose 4 tokens reach the center wins!
              </li>
            </ul>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Server-Authoritative Game Engine & Multi-Device Real-time Sockets</span>
        </div>
        <div>
          <span>Default Admin Password: </span>
          <code className="text-amber-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            ludoAdmin2026!
          </code>
        </div>
      </footer>
    </div>
  );
};
