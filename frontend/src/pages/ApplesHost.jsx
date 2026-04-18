import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socketService from '../services/socket';

function ApplesHost() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pin } = location.state || {};

  const [greenCard, setGreenCard] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [round, setRound] = useState(0);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [totalNeeded, setTotalNeeded] = useState(0);
  const [roundWinner, setRoundWinner] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameEnded, setGameEnded] = useState(false);
  const [phase, setPhase] = useState('playing'); // playing, reveal, winner

  useEffect(() => {
    if (!pin) { navigate('/'); return; }
    socketService.connect();

    socketService.onApplesRoundStart((data) => {
      setGreenCard(data.greenCard);
      setJudgeName(data.judgeName);
      setRound(data.round);
      setSubmittedCount(0);
      setRoundWinner(null);
      setPhase('playing');
    });

    socketService.onApplesCardSubmitted((data) => {
      setSubmittedCount(data.submittedCount);
      setTotalNeeded(data.totalNeeded);
    });

    socketService.onApplesAllCardsIn(() => {
      setPhase('reveal');
    });

    socketService.onApplesRoundWinner((data) => {
      setRoundWinner(data);
      setLeaderboard(data.leaderboard);
      setPhase('winner');
    });

    socketService.onGameEnded((data) => {
      setGameEnded(true);
      setLeaderboard(data.finalLeaderboard);
    });

    return () => {
      socketService.removeListener('apples:round-start');
      socketService.removeListener('apples:card-submitted');
      socketService.removeListener('apples:all-cards-in');
      socketService.removeListener('apples:round-winner');
      socketService.removeListener('game:ended');
    };
  }, [pin, navigate]);

  const handleNextRound = () => {
    socketService.nextApplesRound(pin, (response) => {
      if (!response.success) alert('Error: ' + response.error);
    });
  };

  const handleEndGame = () => {
    socketService.endApples(pin, (response) => {
      if (response.success) {
        setGameEnded(true);
        setLeaderboard(response.finalLeaderboard || []);
      }
    });
  };

  if (gameEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-800 to-teal-900 p-8">
        <div className="max-w-4xl mx-auto bg-gray-900 rounded-2xl shadow-2xl p-8 border border-green-500">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🍎🏆</div>
            <h1 className="text-5xl font-bold text-white mb-2">Apples to Apples — Game Over!</h1>
            <p className="text-green-300 text-xl">Final Standings</p>
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
          <button onClick={() => navigate('/')} className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-4 rounded-xl text-xl">
            Return to Home 🎰
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top Bar */}
      <div className="bg-gray-900 border-b border-gray-700 p-4 flex justify-between items-center">
        <div className="text-lg font-bold text-green-400">🍎 Apples to Apples | PIN: {pin}</div>
        <div className="text-lg text-white">Round {round}</div>
        <div className="flex gap-2">
          {phase === 'winner' && (
            <button onClick={handleNextRound} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
              Next Round ➡️
            </button>
          )}
          <button onClick={handleEndGame} className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg">
            End Game 🏁
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 p-6">
        {/* Main game area */}
        <div className="col-span-2 space-y-6">
          {/* Green Card */}
          <div className="bg-green-800 rounded-2xl p-8 text-center border-2 border-green-500">
            <p className="text-green-300 font-semibold mb-2 text-sm uppercase tracking-wider">🟩 Green Card — This round's topic:</p>
            <h2 className="text-5xl font-bold text-white">{greenCard || 'Waiting for round to start...'}</h2>
          </div>

          {/* Judge info */}
          {judgeName && (
            <div className="bg-yellow-800/40 border border-yellow-500 rounded-xl p-4 text-center">
              <p className="text-yellow-300">⚖️ <strong>{judgeName}</strong> is the judge this round!</p>
              <p className="text-yellow-400/70 text-sm">They'll pick the best matching red card.</p>
            </div>
          )}

          {/* Submission progress */}
          {phase === 'playing' && greenCard && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">📬 Cards Submitted</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-green-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: totalNeeded > 0 ? `${(submittedCount / totalNeeded) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-white font-bold">{submittedCount} / {totalNeeded}</span>
              </div>
              {submittedCount < totalNeeded && (
                <p className="text-gray-400 text-sm mt-2">Waiting for all players to play a card...</p>
              )}
            </div>
          )}

          {/* All cards in - waiting for judge */}
          {phase === 'reveal' && (
            <div className="bg-teal-800/40 border border-teal-500 rounded-xl p-6 text-center">
              <p className="text-3xl mb-2">⚖️</p>
              <p className="text-teal-300 font-bold text-xl">All cards are in!</p>
              <p className="text-teal-400/80">Waiting for <strong>{judgeName}</strong> to pick a winner on their device...</p>
            </div>
          )}

          {/* Round winner */}
          {phase === 'winner' && roundWinner && (
            <div className="bg-gradient-to-r from-yellow-700 to-orange-700 rounded-2xl p-8 text-center border-2 border-yellow-400">
              <div className="text-5xl mb-3">🏆</div>
              <p className="text-yellow-200 text-lg mb-2">Round Winner!</p>
              <h3 className="text-4xl font-bold text-white mb-2">{roundWinner.winningTeamName}</h3>
              <div className="bg-white/10 rounded-xl p-4 mt-3">
                <p className="text-yellow-300 text-sm mb-1">Their winning card:</p>
                <p className="text-2xl font-bold text-white">"{roundWinner.winningCard}"</p>
                <p className="text-yellow-300/70 text-sm mt-1">for "<span className="italic">{roundWinner.greenCard}</span>"</p>
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-3">🏆 Leaderboard</h3>
          {leaderboard.length === 0 ? (
            <p className="text-gray-500 text-sm">Scores will appear here...</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((team, i) => (
                <div key={i} className={`flex justify-between items-center p-3 rounded-lg ${i === 0 ? 'bg-yellow-600/30 border border-yellow-500' : 'bg-gray-700'}`}>
                  <span className="text-white font-semibold">
                    {i === 0 ? '👑' : `#${i+1}`} {team.name}
                  </span>
                  <span className="text-yellow-400 font-bold">{team.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApplesHost;
