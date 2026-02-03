import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import socketService from '../services/socket';

function PlayerJoin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pin, setPin] = useState(searchParams.get('pin') || '');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    socketService.connect();
  }, []);

  const handleJoin = async () => {
    if (!pin.trim() || !teamName.trim()) {
      setError('Please enter both PIN and team name');
      return;
    }

    setLoading(true);
    setError('');

    socketService.joinGame(pin, teamName, (response) => {
      setLoading(false);
      
      if (response.success) {
        navigate('/play', {
          state: {
            pin: pin,
            teamId: response.teamId,
            teamName: response.teamName
          }
        });
      } else {
        setError(response.error || 'Failed to join game');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-slow"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-slow" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-slow" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-md w-full relative z-10 animate-scale-in">
        <div className="glass rounded-3xl shadow-large p-8 border border-white/30">
          {/* Header */}
          <div className="text-center mb-8 animate-slide-down">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 rounded-2xl shadow-glow-md">
                <span className="text-5xl">🎮</span>
              </div>
            </div>
            <h1 className="text-4xl font-display font-bold mb-2">
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">Join Game</span>
            </h1>
            <p className="text-gray-600 text-lg">Enter the game PIN from your host</p>
          </div>

          <div className="space-y-5 animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Game PIN
              </label>
              <input
                type="text"
                placeholder="0000"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                className="w-full px-4 py-4 text-3xl text-center rounded-xl border-2 border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none tracking-widest font-bold transition-all duration-200 bg-white shadow-inner-soft"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Team Name
              </label>
              <input
                type="text"
                placeholder="Enter your team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-200"
              />
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-slide-down">
                <span className="text-xl">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={loading || !pin.trim() || !teamName.trim()}
              className="w-full font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 hover:shadow-lg hover:-translate-y-0.5 focus:ring-blue-500 shadow-lg text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Joining...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Join Game <span className="text-2xl">🚀</span>
                </span>
              )}
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full border-2 border-gray-300 bg-white text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:border-primary-500 hover:text-primary-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              ← Back to Home
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500 animate-fade-in" style={{animationDelay: '0.3s'}}>
            <p className="flex items-center justify-center gap-1">
              <span className="text-lg">💡</span>
              <span>Get the PIN from your game host</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerJoin;
