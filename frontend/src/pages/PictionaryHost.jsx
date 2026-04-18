import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socketService from '../services/socket';

function PictionaryHost() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pin } = location.state || {};

  const [currentDrawer, setCurrentDrawer] = useState(null);
  const [round, setRound] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameEnded, setGameEnded] = useState(false);
  const [correctGuessers, setCorrectGuessers] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!pin) {
      navigate('/');
      return;
    }

    socketService.connect();

    socketService.onPictionaryRoundStart((data) => {
      setCurrentDrawer(data);
      setRound(data.round);
      setCorrectGuessers([]);
      // Clear host canvas
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    });

    socketService.onPictionaryDraw(({ stroke }) => {
      const canvas = canvasRef.current;
      if (!canvas || !stroke) return;
      const ctx = canvas.getContext('2d');
      if (stroke.type === 'begin') {
        ctx.beginPath();
        ctx.moveTo(stroke.x, stroke.y);
      } else if (stroke.type === 'draw') {
        ctx.lineTo(stroke.x, stroke.y);
        ctx.strokeStyle = stroke.color || '#ffffff';
        ctx.lineWidth = stroke.size || 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    });

    socketService.onPictionaryClear(() => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    });

    socketService.onPictionaryCorrectGuess((data) => {
      setCorrectGuessers(prev => [...prev, { name: data.guesserName, points: data.points }]);
      setLeaderboard(data.leaderboard);
    });

    socketService.onGameEnded((data) => {
      setGameEnded(true);
      setLeaderboard(data.finalLeaderboard);
    });

    return () => {
      socketService.removeListener('pictionary:round-start');
      socketService.removeListener('pictionary:draw');
      socketService.removeListener('pictionary:clear');
      socketService.removeListener('pictionary:correct-guess');
      socketService.removeListener('game:ended');
    };
  }, [pin, navigate]);

  const handleNextTurn = () => {
    socketService.nextPictionaryTurn(pin, (response) => {
      if (!response.success) alert('Error: ' + response.error);
    });
  };

  const handleEndGame = () => {
    socketService.endPictionary(pin, (response) => {
      if (response.success) {
        setGameEnded(true);
        setLeaderboard(response.finalLeaderboard || []);
      }
    });
  };

  if (gameEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-700 to-purple-800 p-8">
        <div className="max-w-4xl mx-auto bg-gray-900 rounded-2xl shadow-2xl p-8 border border-pink-500">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎨🏆</div>
            <h1 className="text-5xl font-bold text-white mb-2">Pictionary Over!</h1>
            <p className="text-pink-300 text-xl">Final Standings</p>
          </div>
          <div className="space-y-3 mb-8">
            {leaderboard.map((team, index) => (
              <div key={index} className={`flex items-center justify-between p-5 rounded-xl ${
                index === 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg scale-105'
                : index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                : index === 2 ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                : 'bg-gray-800 text-white'}`}>
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index+1}`}</span>
                  <span className="text-xl font-bold">{team.name}</span>
                </div>
                <span className="text-3xl font-bold">{team.score} pts</span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/')} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-4 rounded-xl text-xl">
            Return to Home 🎰
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Bar */}
      <div className="bg-gray-900 border-b border-gray-700 p-4 flex justify-between items-center">
        <div className="text-lg font-bold text-yellow-400">🎨 Pictionary | PIN: {pin}</div>
        <div className="text-lg text-white">
          {currentDrawer ? `Round ${round} — Drawing: ${currentDrawer.drawerName}` : 'Waiting...'}
        </div>
        <div className="flex gap-2">
          <button onClick={handleNextTurn} className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-lg text-sm">
            Next Turn ➡️
          </button>
          <button onClick={handleEndGame} className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg text-sm">
            End Game 🏁
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 p-6 h-[calc(100vh-80px)]">
        {/* Canvas - Viewer (host sees what drawer is drawing) */}
        <div className="col-span-2 bg-gray-800 rounded-2xl border-2 border-pink-500 overflow-hidden flex flex-col">
          <div className="bg-gray-900 px-4 py-2 flex items-center justify-between border-b border-gray-700">
            <span className="text-pink-300 font-bold">
              {currentDrawer ? `✏️ ${currentDrawer.drawerName} is drawing...` : '⏳ Waiting for next turn'}
            </span>
            <span className="text-gray-400 text-sm">Host view (read-only)</span>
          </div>
          <div className="flex-1 flex items-center justify-center p-2">
            <canvas
              ref={canvasRef}
              width={700}
              height={480}
              className="bg-white rounded-xl w-full h-full object-contain"
              style={{ imageRendering: 'pixelated' }}
              aria-label="Live view of player drawing"
            />
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Correct Guessers */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex-1">
            <h3 className="text-lg font-bold text-white mb-3">✅ Correct Guesses</h3>
            {correctGuessers.length === 0 ? (
              <p className="text-gray-500 text-sm">No correct guesses yet...</p>
            ) : (
              <div className="space-y-2">
                {correctGuessers.map((g, i) => (
                  <div key={i} className="bg-green-800/40 border border-green-600 rounded-lg p-2 flex justify-between">
                    <span className="text-green-300 font-semibold">{g.name}</span>
                    <span className="text-yellow-400 font-bold">+{g.points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex-1">
            <h3 className="text-lg font-bold text-white mb-3">🏆 Leaderboard</h3>
            {leaderboard.length === 0 ? (
              <p className="text-gray-500 text-sm">Start playing to see scores!</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.slice(0, 8).map((team, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-white font-semibold">#{i+1} {team.name}</span>
                    <span className="text-yellow-400 font-bold">{team.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PictionaryHost;
