import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import storageService from '../services/storage';

function Home() {
  const navigate = useNavigate();
  const [hostName, setHostName] = useState('');
  const [gameMode, setGameMode] = useState('classic');
  const [genre, setGenre] = useState('mixed');
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const gameModes = [
    { id: 'classic', name: 'Classic Trivia', icon: '🎯', description: 'Traditional quiz with timed questions' },
    { id: 'buzzer', name: 'Buzzer Mode', icon: '🔔', description: 'First to buzz in gets to answer' },
    { id: 'speed-round', name: 'Speed Round', icon: '⏱️', description: 'Fast-paced quick questions' },
    { id: 'lightning', name: 'Lightning Round', icon: '⚡', description: 'Ultra-fast 10-second questions!' },
    { id: 'pictionary', name: 'Pictionary', icon: '🎨', description: 'Draw it, guess it, win it!' },
    { id: 'apples-to-apples', name: 'Apples to Apples', icon: '🍎', description: 'Play the funniest matching card!' },
  ];

  const genres = [
    { id: 'mixed', name: 'Mixed', icon: '🎲' },
    { id: 'las-vegas', name: 'Las Vegas', icon: '🎰' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
    { id: 'movies', name: 'Movies', icon: '🎬' },
    { id: 'music', name: 'Music', icon: '🎵' },
    { id: 'science', name: 'Science', icon: '🔬' },
    { id: 'history', name: 'History', icon: '📜' },
    { id: 'geography', name: 'Geography', icon: '🌍' },
    { id: 'pop-culture', name: 'Pop Culture', icon: '📱' },
    { id: 'food-drink', name: 'Food & Drink', icon: '🍔' },
    { id: 'technology', name: 'Technology', icon: '💻' },
    { id: 'games', name: 'Games', icon: '🎮' }
  ];

  const handleHostGame = () => {
    if (hostName.trim()) {
      navigate('/host/lobby', { state: { hostName, gameMode, genre } });
    }
  };

  const handleJoinGame = () => {
    navigate('/join');
  };

  const allTimeLeaderboard = storageService.getPersistentLeaderboard?.() ?? [];

  const isPictionaryOrApples = gameMode === 'pictionary' || gameMode === 'apples-to-apples';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Neon Vegas animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse-slow" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-slow" style={{animationDelay: '2s'}}></div>
        {/* Stars */}
        {[...Array(12)].map((_, i) => (
          <div key={i} className="absolute text-yellow-300 text-2xl animate-pulse-slow opacity-30" style={{
            left: `${(i * 83 + 7) % 95}%`,
            top: `${(i * 61 + 13) % 90}%`,
            animationDelay: `${i * 0.3}s`
          }}>✦</div>
        ))}
      </div>

      <div className="max-w-2xl w-full relative z-10 animate-fade-in">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/30">
          {/* Header */}
          <div className="text-center mb-8 animate-slide-down">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="text-5xl">🎰</span>
              <span className="text-5xl">🎨</span>
              <span className="text-5xl">🍎</span>
            </div>
            <h1 className="text-5xl font-display font-bold mb-2 text-white drop-shadow-lg">
              Bar Night Games
            </h1>
            <p className="text-yellow-300 text-lg font-medium">Trivia · Pictionary · Apples to Apples · Vegas Edition!</p>
            <div className="mt-2">
              <span className="inline-block bg-yellow-400 text-purple-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">🎰 Powered by Putters Vegas Vibes</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="animate-slide-up" style={{animationDelay: '0.1s'}}>
              <h2 className="text-xl font-display font-semibold text-white mb-4">Host a Game</h2>
              
              <input
                type="text"
                placeholder="Enter your name"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleHostGame()}
                className="w-full px-4 py-3 rounded-xl border-2 border-yellow-400 bg-white/20 text-white placeholder-white/60 focus:border-yellow-300 focus:ring-2 focus:ring-yellow-200/40 focus:outline-none transition-all duration-200 mb-4"
              />

              <div className="mb-4">
                <label className="block text-sm font-semibold text-yellow-300 mb-3">Game Mode</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {gameModes.map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setGameMode(mode.id)}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer group text-left ${
                        gameMode === mode.id
                          ? 'border-yellow-400 bg-yellow-400/20 shadow-md ring-2 ring-yellow-400'
                          : 'border-white/30 bg-white/10 hover:border-yellow-300/60 hover:shadow-sm'
                      }`}
                    >
                      <div className="text-2xl mb-1 transform group-hover:scale-110 transition-transform duration-200">{mode.icon}</div>
                      <div className="font-semibold text-sm text-white">{mode.name}</div>
                      <div className="text-xs text-white/70 mt-1">{mode.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {!isPictionaryOrApples && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-yellow-300 mb-3">Genre/Theme</label>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {genres.map(g => (
                      <button
                        key={g.id}
                        onClick={() => setGenre(g.id)}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer py-3 group ${
                          genre === g.id
                            ? 'border-yellow-400 bg-yellow-400/20 shadow-md ring-2 ring-yellow-400'
                            : 'border-white/30 bg-white/10 hover:border-yellow-300/60 hover:shadow-sm'
                        } ${g.id === 'las-vegas' ? 'col-span-1' : ''}`}
                      >
                        <div className="text-xl mb-1 transform group-hover:scale-110 transition-transform duration-200">{g.icon}</div>
                        <div className="text-xs font-semibold text-white">{g.name}</div>
                        {g.id === 'las-vegas' && <div className="text-xs text-yellow-300">🌟 Hot!</div>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isPictionaryOrApples && (
                <div className="mb-6 p-4 rounded-xl bg-yellow-400/20 border-2 border-yellow-400">
                  <p className="text-yellow-300 text-sm font-semibold text-center">
                    {gameMode === 'pictionary'
                      ? '🎨 Pictionary — Players take turns drawing while others guess! Fun for all!'
                      : '🍎 Apples to Apples — Judge picks the funniest matching card each round!'}
                  </p>
                </div>
              )}

              <button
                onClick={handleHostGame}
                disabled={!hostName.trim()}
                className="w-full font-bold py-4 px-6 rounded-xl transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 hover:from-yellow-300 hover:to-orange-400 hover:shadow-xl hover:-translate-y-0.5 shadow-lg text-xl uppercase tracking-wide"
              >
                <span className="flex items-center justify-center gap-2">
                  Create Game Room <span className="text-2xl">🎰</span>
                </span>
              </button>
            </div>

            <div className="relative animate-slide-up" style={{animationDelay: '0.2s'}}>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-white/30"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-yellow-300 font-medium">or</span>
              </div>
            </div>

            <div className="animate-slide-up" style={{animationDelay: '0.3s'}}>
              <h2 className="text-xl font-display font-semibold text-white mb-4">Join a Game</h2>
              <button
                onClick={handleJoinGame}
                className="w-full font-bold py-4 px-6 rounded-xl transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-400 hover:to-purple-500 hover:shadow-xl hover:-translate-y-0.5 shadow-lg text-xl uppercase tracking-wide"
              >
                <span className="flex items-center justify-center gap-2">
                  Enter Game PIN <span className="text-2xl">🔢</span>
                </span>
              </button>
            </div>
          </div>

          {/* All-Time Leaderboard */}
          <div className="mt-8 animate-slide-up" style={{animationDelay: '0.4s'}}>
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="w-full text-yellow-300 hover:text-yellow-200 font-semibold text-center py-2"
            >
              🏆 {showLeaderboard ? 'Hide' : 'Show'} All-Time Leaderboard
            </button>
            {showLeaderboard && allTimeLeaderboard.length > 0 && (
              <div className="mt-3 bg-white/10 rounded-xl p-4 border border-white/20">
                <h3 className="text-white font-bold text-center mb-3">🏆 Hall of Fame</h3>
                {allTimeLeaderboard.slice(0, 10).map((entry, idx) => (
                  <div key={idx} className={`flex justify-between items-center py-2 px-3 rounded-lg mb-1 ${idx === 0 ? 'bg-yellow-400/30 text-yellow-300' : idx === 1 ? 'bg-gray-300/20 text-white' : idx === 2 ? 'bg-orange-400/20 text-orange-300' : 'text-white/80'}`}>
                    <span className="font-semibold">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx+1}`} {entry.teamName}</span>
                    <span className="font-bold">{entry.highScore} pts</span>
                  </div>
                ))}
              </div>
            )}
            {showLeaderboard && allTimeLeaderboard.length === 0 && (
              <p className="text-white/60 text-center mt-2 text-sm">No games played yet. Be the first champion! 🏆</p>
            )}
          </div>

          <div className="mt-6 text-center text-sm text-white/60 space-y-1 animate-fade-in" style={{animationDelay: '0.5s'}}>
            <p className="font-medium text-yellow-300">Perfect for bars, pubs & late night fun!</p>
            <p className="flex items-center justify-center gap-1">
              Your phone is your gamepad - no Bluetooth needed! <span>📱</span>
            </p>
            <button
              onClick={() => navigate('/stats')}
              className="text-yellow-300 hover:text-yellow-200 underline underline-offset-4"
            >
              📊 View Your Stats & History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
