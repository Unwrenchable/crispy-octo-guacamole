import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

function Home() {
  const navigate = useNavigate();
  const [hostName, setHostName] = useState('');

  const handleHostGame = () => {
    if (hostName.trim()) {
      navigate('/host/lobby', { state: { hostName } });
    }
  };

  const handleJoinGame = () => {
    navigate('/join');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">🎮 Bar Trivia</h1>
            <p className="text-gray-600">Multiplayer Quiz Night</p>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Host a Game</h2>
              <input
                type="text"
                placeholder="Enter your name"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleHostGame()}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none mb-3"
              />
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

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Perfect for bars, pubs, and game nights!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
