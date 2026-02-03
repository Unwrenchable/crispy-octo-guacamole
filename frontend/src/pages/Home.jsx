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
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">🎮 Bar Games Night</h1>
            <p className="text-gray-600">Multiple game modes, multiple genres!</p>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Host a Game</h2>
              
              <input
                type="text"
                placeholder="Enter your name"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleHostGame()}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none mb-4"
              />

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Game Mode</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {gameModes.map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setGameMode(mode.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        gameMode === mode.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{mode.icon}</div>
                      <div className="font-semibold text-sm">{mode.name}</div>
                      <div className="text-xs text-gray-500">{mode.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Genre/Theme</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {genres.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setGenre(g.id)}
                      className={`p-2 rounded-lg border-2 transition-all ${
                        genre === g.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="text-xl">{g.icon}</div>
                      <div className="text-xs font-medium">{g.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleHostGame}
                disabled={!hostName.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-200 transform hover:scale-105"
              >
                Create Game 🎯
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Join a Game</h2>
              <button
                onClick={handleJoinGame}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 transform hover:scale-105"
              >
                Enter Game PIN 🔢
              </button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/stats')}
              className="text-purple-600 hover:text-purple-700 font-semibold underline"
            >
              📊 View Your Stats & History
            </button>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            <p>Perfect for bars, pubs, and game nights!</p>
            <p className="mt-1">Your phone is your gamepad - no Bluetooth needed! 📱</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
