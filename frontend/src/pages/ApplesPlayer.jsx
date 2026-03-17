import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socketService from '../services/socket';
import storageService from '../services/storage';

function ApplesPlayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pin, teamId, teamName, playerPhone } = location.state || {};

  const [hand, setHand] = useState([]);
  const [greenCard, setGreenCard] = useState('');
  const [judgeId, setJudgeId] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [round, setRound] = useState(0);
  const [isJudge, setIsJudge] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [playedCard, setPlayedCard] = useState(null);
  const [judgeSubmissions, setJudgeSubmissions] = useState([]);
  const [roundWinner, setRoundWinner] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myScore, setMyScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [phase, setPhase] = useState('waiting'); // waiting, playing, judging, winner
  const [rewardsAwarded, setRewardsAwarded] = useState([]);

  useEffect(() => {
    if (!pin || !teamId) { navigate('/join'); return; }
    socketService.connect();

    socketService.onApplesDealHand(({ hand: newHand }) => {
      setHand(newHand);
    });

    socketService.onApplesRoundStart((data) => {
      setGreenCard(data.greenCard);
      setJudgeId(data.judgeId);
      setJudgeName(data.judgeName);
      setRound(data.round);
      setIsJudge(data.judgeId === teamId);
      setHasPlayed(false);
      setPlayedCard(null);
      setJudgeSubmissions([]);
      setRoundWinner(null);
      setPhase(data.judgeId === teamId ? 'judging-wait' : 'playing');
    });

    socketService.onApplesJudgeCards(({ greenCard: gc, submissions }) => {
      setGreenCard(gc);
      setJudgeSubmissions(submissions);
      setPhase('judging');
    });

    socketService.onApplesAllCardsIn(() => {
      if (!isJudge) setPhase('waiting-judge');
    });

    socketService.onApplesRoundWinner((data) => {
      setRoundWinner(data);
      setLeaderboard(data.leaderboard);
      setPhase('winner');
      const me = data.leaderboard.find(t => t.name === teamName);
      if (me) setMyScore(me.score);
    });

    socketService.onGameEnded((data) => {
      setGameEnded(true);
      setLeaderboard(data.finalLeaderboard);

      if (playerPhone) {
        const myRank = (data.finalLeaderboard || []).findIndex(t => t.name === teamName) + 1;
        const awarded = storageService.awardGamePoints(playerPhone, {
          rank: myRank,
          totalTeams: (data.finalLeaderboard || []).length,
          score: (data.finalLeaderboard || []).find(t => t.name === teamName)?.score || 0,
          gameMode: 'apples-to-apples',
          genre: 'mixed',
        });
        if (awarded && awarded.length > 0) setRewardsAwarded(awarded);
      }
    });

    return () => {
      socketService.removeListener('apples:deal-hand');
      socketService.removeListener('apples:round-start');
      socketService.removeListener('apples:judge-cards');
      socketService.removeListener('apples:all-cards-in');
      socketService.removeListener('apples:round-winner');
      socketService.removeListener('game:ended');
    };
  }, [pin, teamId, teamName, isJudge, navigate]);

  const handlePlayCard = (card) => {
    if (hasPlayed || isJudge) return;
    socketService.playApplesCard(pin, teamId, card, (response) => {
      if (response.success) {
        setHasPlayed(true);
        setPlayedCard(card);
        setPhase('waiting-judge');
      } else {
        alert(response.message || 'Failed to play card');
      }
    });
  };

  const handleJudgePick = (winningTeamId) => {
    socketService.judgeApplesPick(pin, winningTeamId, (response) => {
      if (!response.success) alert('Error picking winner');
    });
  };

  if (gameEnded) {
    const myRank = leaderboard.findIndex(t => t.name === teamName) + 1;
    const totalPtsAwarded = rewardsAwarded.reduce((s, r) => s + (r?.points || 0), 0);
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-800 to-teal-900 p-4 flex items-center justify-center">
        <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 text-center max-w-md w-full border border-green-500">
          <div className="text-5xl mb-4">{myRank === 1 ? '🏆' : '🍎'}</div>
          <h1 className="text-4xl font-bold text-white mb-2">Game Over!</h1>
          <p className="text-green-300 text-xl mb-4">{teamName}</p>
          <div className="bg-green-900/40 rounded-xl p-6 mb-4">
            <div className="text-white/70 mb-1">Your Rank</div>
            <div className="text-5xl font-bold text-white">#{myRank}</div>
            <div className="text-2xl text-yellow-400 font-bold mt-1">{myScore} points</div>
          </div>

          {rewardsAwarded.length > 0 && (
            <div className="bg-yellow-400/20 border-2 border-yellow-400 rounded-xl p-4 mb-4">
              <p className="text-yellow-300 font-bold mb-1">🎁 +{totalPtsAwarded} Putters Points!</p>
              {rewardsAwarded.map((r, i) => r && (
                <div key={i} className="flex justify-between text-sm text-white/80">
                  <span>{r.label}</span><span className="text-yellow-400 font-bold">+{r.points}</span>
                </div>
              ))}
              <button onClick={() => navigate('/rewards')} className="mt-2 w-full bg-yellow-400 text-purple-900 font-bold py-1.5 rounded-lg text-sm">View Rewards →</button>
            </div>
          )}

          <div className="space-y-2 mb-6">
            {leaderboard.map((t, i) => (
              <div key={i} className={`flex justify-between p-2 rounded-lg ${t.name === teamName ? 'bg-green-700 text-white font-bold' : 'bg-gray-800 text-gray-300'}`}>
                <span>#{i+1} {t.name}</span>
                <span>{t.score} pts</span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/')} className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-3 rounded-xl">
            Back to Home 🎰
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-3 flex justify-between items-center">
        <div>
          <span className="font-bold text-green-400">{teamName}</span>
          <span className="text-gray-400 ml-2 text-sm">Score: <span className="text-yellow-400 font-bold">{myScore}</span></span>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">Round {round}</div>
          {isJudge && <span className="bg-yellow-600 text-yellow-100 text-xs font-bold px-2 py-0.5 rounded-full">⚖️ YOU'RE THE JUDGE</span>}
        </div>
        <div className="text-xs text-gray-500">PIN: {pin}</div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4 overflow-auto">
        {/* Green Card */}
        {greenCard && (
          <div className="bg-green-800 rounded-2xl p-6 text-center border-2 border-green-500">
            <p className="text-green-300 text-sm font-semibold mb-1 uppercase tracking-wider">🟩 This round is...</p>
            <h2 className="text-4xl font-bold text-white">{greenCard}</h2>
          </div>
        )}

        {/* Judge waiting for cards */}
        {isJudge && phase === 'judging-wait' && (
          <div className="bg-yellow-800/30 border border-yellow-600 rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">⚖️</div>
            <p className="text-yellow-300 font-bold text-lg">You are the judge!</p>
            <p className="text-yellow-400/80">Waiting for everyone to play their cards...</p>
          </div>
        )}

        {/* Judge picks a card */}
        {isJudge && phase === 'judging' && judgeSubmissions.length > 0 && (
          <div>
            <p className="text-yellow-300 font-bold text-lg mb-3 text-center">⚖️ Pick the best card for "<span className="italic">{greenCard}</span>"!</p>
            <div className="space-y-3">
              {judgeSubmissions.map((sub, i) => (
                <button
                  key={i}
                  onClick={() => handleJudgePick(sub.teamId)}
                  className="w-full bg-red-900 hover:bg-red-800 border-2 border-red-600 hover:border-red-400 rounded-xl p-5 text-left transition-all duration-200 group"
                >
                  <span className="text-white font-bold text-xl group-hover:text-yellow-300 transition-colors">🃏 "{sub.card}"</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Player's hand (non-judges during playing phase) */}
        {!isJudge && phase === 'playing' && (
          <div>
            <p className="text-white font-semibold mb-3 text-center">
              🃏 Pick your best card for "<span className="text-green-400 italic">{greenCard}</span>"
            </p>
            <div className="space-y-3">
              {hand.map((card) => (
                <button
                  key={card}
                  onClick={() => handlePlayCard(card)}
                  className="w-full bg-red-900 hover:bg-red-800 border-2 border-red-600 hover:border-yellow-400 rounded-xl p-5 text-left transition-all duration-200 group"
                >
                  <span className="text-white font-semibold text-lg group-hover:text-yellow-300 transition-colors">🃏 {card}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Player submitted, waiting for judge */}
        {!isJudge && (phase === 'waiting-judge') && playedCard && (
          <div className="bg-teal-800/40 border border-teal-500 rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-teal-300 font-bold">Card submitted!</p>
            <div className="bg-red-900/40 border border-red-600 rounded-xl p-4 mt-3">
              <p className="text-white/70 text-sm">Your card:</p>
              <p className="text-2xl font-bold text-white">"{playedCard}"</p>
            </div>
            <p className="text-teal-400/70 text-sm mt-3">Waiting for {judgeName} to pick a winner...</p>
          </div>
        )}

        {/* Round winner display */}
        {phase === 'winner' && roundWinner && (
          <div className={`rounded-2xl p-6 text-center border-2 ${roundWinner.winningTeamName === teamName ? 'bg-gradient-to-r from-yellow-700 to-orange-700 border-yellow-400' : 'bg-gray-800 border-gray-600'}`}>
            <div className="text-4xl mb-2">{roundWinner.winningTeamName === teamName ? '🏆' : '👏'}</div>
            <p className="text-white/70 text-sm mb-1">Round Winner:</p>
            <p className="text-3xl font-bold text-white">{roundWinner.winningTeamName}</p>
            <div className="bg-white/10 rounded-xl p-3 mt-3">
              <p className="text-yellow-300/80 text-xs mb-1">Winning card:</p>
              <p className="text-xl font-bold text-white">"{roundWinner.winningCard}"</p>
            </div>
            {roundWinner.winningTeamName === teamName && (
              <p className="text-yellow-300 font-bold mt-3 text-lg">🎉 +100 points!</p>
            )}
            <p className="text-gray-400 text-sm mt-3">Waiting for host to start next round...</p>
          </div>
        )}

        {/* Leaderboard (always visible at bottom) */}
        {leaderboard.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 mt-auto">
            <h3 className="text-sm font-bold text-white mb-2">🏆 Standings</h3>
            {leaderboard.slice(0, 5).map((t, i) => (
              <div key={i} className={`flex justify-between text-sm py-1 ${t.name === teamName ? 'text-yellow-400 font-bold' : 'text-gray-400'}`}>
                <span>#{i+1} {t.name}</span>
                <span>{t.score} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ApplesPlayer;
