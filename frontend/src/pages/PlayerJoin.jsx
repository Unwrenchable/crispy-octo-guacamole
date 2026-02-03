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
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">🎮 Join Game</h1>
            <p className="text-gray-600">Enter the game PIN from your host</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Game PIN
              </label>
              <input
                type="text"
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                className="w-full px-4 py-3 text-2xl text-center rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none tracking-widest font-bold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Name
              </label>
              <input
                type="text"
                placeholder="Enter your team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={loading || !pin.trim() || !teamName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-200 transform hover:scale-105"
            >
              {loading ? 'Joining...' : 'Join Game 🚀'}
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg transition duration-200"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerJoin;
