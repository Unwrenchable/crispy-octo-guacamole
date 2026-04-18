import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import socketService from '../services/socket';
import storageService from '../services/storage';

function PlayerJoin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pin, setPin] = useState(searchParams.get('pin') || '');
  const [teamName, setTeamName] = useState(() => storageService.getActiveProfile()?.displayName || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile] = useState(() => storageService.getActiveProfile());

  useEffect(() => {
    socketService.connect();
  }, []);

  const handleJoin = async () => {
    if (!pin.trim() || !teamName.trim()) {
      setError('Please enter both PIN and your name');
      return;
    }

    setLoading(true);
    setError('');

    socketService.joinGame(pin, teamName, (response) => {
      setLoading(false);
      
      if (response.success) {
        const gameMode = response.gameMode || 'classic';
        const state = {
          pin: pin,
          teamId: response.teamId,
          teamName: response.teamName,
          gameMode: gameMode,
          genre: response.genre || 'mixed',
          playerPhone: profile?.phone || null,
        };

        if (gameMode === 'pictionary') {
          navigate('/play/pictionary', { state });
        } else if (gameMode === 'apples-to-apples') {
          navigate('/play/apples', { state });
        } else {
          navigate('/play', { state });
        }
      } else {
        setError(response.error || 'Failed to join game');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-green-800 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-amber-900 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse-slow" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="max-w-md w-full relative z-10 animate-scale-in">
        <div className="bg-black/60 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-amber-500/20">
          {/* Header */}
          <div className="text-center mb-6 animate-slide-down">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="text-5xl">🎱</span>
              <span className="text-5xl">🎨</span>
              <span className="text-5xl">🍎</span>
            </div>
            <h1 className="text-4xl font-bold mb-2 text-white">
              Join Game
            </h1>
            <p className="text-amber-400 text-lg">Enter the PIN from your host screen</p>
          </div>

          {/* Profile badge if logged in */}
          {profile ? (
            <div
              onClick={() => navigate('/rewards')}
              className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 mb-5 cursor-pointer hover:border-amber-500 transition"
            >
              <span className="text-2xl">⭐</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm truncate">{profile.displayName}</div>
                <div className="text-amber-400 text-xs">{profile.points} Putters Points — tap to view rewards</div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login', { state: { returnTo: `/join${pin ? `?pin=${pin}` : ''}` } })}
              className="w-full flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 hover:border-amber-500 rounded-xl p-3 mb-5 transition text-left"
            >
              <span className="text-2xl">🎁</span>
              <div>
                <div className="text-white font-semibold text-sm">Join Putters Rewards</div>
                <div className="text-amber-400/80 text-xs">Earn points for every game you play!</div>
              </div>
            </button>
          )}

          <div className="space-y-5 animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div>
              <label className="block text-sm font-semibold text-amber-400 mb-2">
                Game PIN
              </label>
              <input
                type="text"
                placeholder="0000"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                className="w-full px-4 py-4 text-3xl text-center rounded-xl border-2 border-amber-500 bg-white/10 text-white placeholder-white/30 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:outline-none tracking-widest font-bold transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-amber-400 mb-2">
                Your Name / Team Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                className="w-full px-4 py-3 rounded-xl border-2 border-amber-500/50 bg-white/10 text-white placeholder-white/30 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:outline-none transition-all duration-200"
              />
            </div>

            {error && (
              <div className="bg-red-900/40 border-2 border-red-500 text-red-300 px-4 py-3 rounded-xl flex items-center gap-2 animate-slide-down">
                <span className="text-xl">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={loading || !pin.trim() || !teamName.trim()}
              className="w-full font-bold py-4 px-6 rounded-xl transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 hover:shadow-xl hover:-translate-y-0.5 shadow-lg text-xl uppercase tracking-wide"
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
                  Let's Play! <span className="text-2xl">🎱</span>
                </span>
              )}
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full border-2 border-white/20 bg-white/5 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:border-amber-500 hover:text-amber-400 focus:outline-none"
            >
              ← Back to Home
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-white/50 animate-fade-in" style={{animationDelay: '0.3s'}}>
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
