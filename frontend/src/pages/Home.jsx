import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

function Home() {
  const navigate = useNavigate();
  const [hostName, setHostName] = useState('');
  const [gameMode, setGameMode] = useState('classic');
  const [genre, setGenre] = useState('mixed');

  const gameModes = [
    { id: 'classic', name: 'Classic Trivia', icon: '🎯', description: 'Traditional quiz with timed questions' },
    { id: 'buzzer', name: 'Buzzer Mode', icon: '🔔', description: 'First to buzz in gets to answer' },
    { id: 'speed-round', name: 'Speed Round', icon: '⏱️', description: 'Fast-paced quick questions' },
    { id: 'lightning', name: 'Lightning Round', icon: '⚡', description: 'Ultra-fast 10-second questions!' }
  ];

  const genres = [
    { id: 'mixed', name: 'Mixed', icon: '🎲' },
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-2xl w-full relative z-10 animate-fade-in">
        <div className="glass rounded-3xl shadow-large p-8 border border-white/30">
          {/* Header */}
          <div className="text-center mb-8 animate-slide-down">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-4 rounded-2xl shadow-glow-md">
                <span className="text-5xl">🎮</span>
              </div>
            </div>
            <h1 className="text-5xl font-display font-bold mb-3">
              <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">Bar Games Night</span>
            </h1>
            <p className="text-gray-600 text-lg font-medium">Multiple game modes, multiple genres!</p>
          </div>

          <div className="space-y-6">
            <div className="animate-slide-up" style={{animationDelay: '0.1s'}}>
              <h2 className="text-xl font-display font-semibold text-gray-700 mb-4">Host a Game</h2>
              
              <input
                type="text"
                placeholder="Enter your name"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleHostGame()}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-200 mb-4"
              />

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Game Mode</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {gameModes.map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setGameMode(mode.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${
                        gameMode === mode.id
                          ? 'border-primary-500 bg-primary-50 shadow-md ring-2 ring-primary-400'
                          : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="text-3xl mb-2 transform group-hover:scale-110 transition-transform duration-200">{mode.icon}</div>
                      <div className="font-semibold text-sm text-gray-800">{mode.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{mode.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Genre/Theme</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {genres.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setGenre(g.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer py-3 group ${
                        genre === g.id
                          ? 'border-primary-500 bg-primary-50 shadow-md ring-2 ring-primary-400'
                          : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="text-2xl mb-1 transform group-hover:scale-110 transition-transform duration-200">{g.icon}</div>
                      <div className="text-xs font-semibold text-gray-800">{g.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleHostGame}
                disabled={!hostName.trim()}
                className="w-full font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 hover:shadow-lg hover:-translate-y-0.5 focus:ring-primary-500 shadow-lg text-lg"
              >
                <span className="flex items-center justify-center gap-2">
                  Create Game <span className="text-2xl">🎯</span>
                </span>
              </button>
            </div>

            <div className="relative animate-slide-up" style={{animationDelay: '0.2s'}}>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">or</span>
              </div>
            </div>

            <div className="animate-slide-up" style={{animationDelay: '0.3s'}}>
              <h2 className="text-xl font-display font-semibold text-gray-700 mb-4">Join a Game</h2>
              <button
                onClick={handleJoinGame}
                className="w-full font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gradient-to-r from-secondary-500 to-secondary-600 text-white hover:from-secondary-600 hover:to-secondary-700 hover:shadow-lg hover:-translate-y-0.5 focus:ring-secondary-500 shadow-lg text-lg"
              >
                <span className="flex items-center justify-center gap-2">
                  Enter Game PIN <span className="text-2xl">🔢</span>
                </span>
              </button>
            </div>
          </div>

          <div className="mt-8 text-center animate-slide-up" style={{animationDelay: '0.4s'}}>
            <button
              onClick={() => navigate('/stats')}
              className="text-primary-600 hover:text-primary-700 font-semibold underline decoration-2 underline-offset-4 hover:decoration-primary-400 transition-all duration-200"
            >
              📊 View Your Stats & History
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500 space-y-1 animate-fade-in" style={{animationDelay: '0.5s'}}>
            <p className="font-medium">Perfect for bars, pubs, and game nights!</p>
            <p className="flex items-center justify-center gap-1">
              Your phone is your gamepad - no Bluetooth needed! <span>📱</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
