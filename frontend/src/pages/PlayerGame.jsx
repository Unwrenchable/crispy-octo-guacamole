import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socketService from '../services/socket';
import storageService from '../services/storage';

// ── Web Audio API sound engine ────────────────────────────────
function createSoundEngine() {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function playTone(frequency, duration, type = 'sine', gainVal = 0.3, startTime = 0) {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ac.currentTime + startTime);
    gain.gain.setValueAtTime(gainVal, ac.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + startTime + duration);
    osc.start(ac.currentTime + startTime);
    osc.stop(ac.currentTime + startTime + duration);
  }

  return {
    correct() {
      // Ascending pleasant chord
      playTone(523, 0.15, 'sine', 0.3, 0);
      playTone(659, 0.15, 'sine', 0.25, 0.1);
      playTone(784, 0.25, 'sine', 0.3, 0.2);
    },
    wrong() {
      // Descending buzzer
      playTone(300, 0.15, 'sawtooth', 0.2, 0);
      playTone(200, 0.25, 'sawtooth', 0.2, 0.12);
    },
    buzzer() {
      // Quick blip
      playTone(880, 0.08, 'square', 0.2, 0);
    },
    gameOver() {
      // Victory fanfare
      [523, 0, 523, 0, 523, 659, 784].forEach((f, i) => {
        if (f > 0) playTone(f, 0.18, 'sine', 0.3, i * 0.12);
      });
      playTone(1047, 0.5, 'sine', 0.35, 0.85);
    }
  };
}

const SOUND_ENGINE = createSoundEngine();
const EMOJI_REACTIONS = ['🎉', '🔥', '👏', '😂', '💀', '🤔'];

function PlayerGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pin, teamId, teamName, gameMode = 'classic', genre = 'mixed', playerPhone } = location.state || {};
  
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameEnded, setGameEnded] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [prevScore, setPrevScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [rewardsAwarded, setRewardsAwarded] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [muted, setMuted] = useState(() => localStorage.getItem('pv_muted') === 'true');
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [scoreAnimating, setScoreAnimating] = useState(false);
  const timerRef = useRef(null);
  const prevScoreRef = useRef(0);

  const playSound = useCallback((name) => {
    if (!muted) SOUND_ENGINE[name]?.();
  }, [muted]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem('pv_muted', String(next));
  };

  // Countdown timer
  useEffect(() => {
    const existingId = timerRef.current;
    if (existingId) clearInterval(existingId);
    timerRef.current = null;

    if (!currentQuestion || showResults) {
      setTimeLeft(null);
      return;
    }

    setTimeLeft(currentQuestion.timeLimit);
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = id;
    return () => clearInterval(id);
  }, [currentQuestion, showResults]);

  useEffect(() => {
    if (!pin || !teamId) { navigate('/join'); return; }

    const socket = socketService.connect();

    const startQuestion = (question) => {
      setCurrentQuestion(question);
      setHasAnswered(false);
      setShowResults(false);
      setSelectedAnswer(null);
      setCorrectAnswer(null);
    };

    socketService.onGameStarted((data) => startQuestion(data.question));
    socketService.onNewQuestion((data) => startQuestion(data.question));

    socketService.onAnswerRevealed((data) => {
      setShowResults(true);
      setCorrectAnswer(data.correctAnswer);
      setLeaderboard(data.leaderboard);

      const myTeam = data.leaderboard.find(t => t.name === teamName);
      if (myTeam) {
        const newScore = myTeam.score;
        setPrevScore(prevScoreRef.current);
        setMyScore(newScore);
        // Trigger score pulse if score changed
        if (newScore !== prevScoreRef.current) {
          setScoreAnimating(true);
          setTimeout(() => setScoreAnimating(false), 700);
        }
        prevScoreRef.current = newScore;
      }
    });

    socketService.onGameEnded((data) => {
      setGameEnded(true);
      setLeaderboard(data.finalLeaderboard);
      playSound('gameOver');

      const myTeam = data.finalLeaderboard.find(t => t.name === teamName);
      if (myTeam) {
        setMyScore(myTeam.score);
        const myRank = data.finalLeaderboard.findIndex(t => t.name === teamName) + 1;

        storageService.addGameToHistory({
          teamName, score: myTeam.score, rank: myRank,
          totalTeams: data.finalLeaderboard.length,
          questionsAnswered, gameMode: gameMode || 'classic', genre: genre || 'mixed'
        });
        storageService.updatePersistentLeaderboard(teamName, myTeam.score, gameMode || 'classic', genre || 'mixed');

        if (playerPhone) {
          const awarded = storageService.awardGamePoints(playerPhone, {
            rank: myRank, totalTeams: data.finalLeaderboard.length,
            score: myTeam.score, gameMode: gameMode || 'classic', genre: genre || 'mixed'
          });
          if (awarded?.length > 0) setRewardsAwarded(awarded);
        }
      }
    });

    // Emoji reactions
    socketService.onReaction((data) => {
      const id = Date.now() + Math.random();
      setFloatingReactions(prev => [...prev, { ...data, id }]);
      setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 2200);
    });

    return () => { socket.disconnect(); };
  }, [pin, teamId, teamName, gameMode, genre, questionsAnswered, navigate, playSound]);

  // Play sound on answer revealed
  useEffect(() => {
    if (showResults && correctAnswer !== null && selectedAnswer !== null) {
      if (selectedAnswer === correctAnswer) playSound('correct');
      else playSound('wrong');
    }
  }, [showResults, correctAnswer, selectedAnswer, playSound]);

  const handleSubmitAnswer = (answer) => {
    if (hasAnswered) return;
    playSound('buzzer');
    setSelectedAnswer(answer);
    setHasAnswered(true);
    setQuestionsAnswered(prev => prev + 1);

    socketService.submitAnswer(pin, teamId, answer, (response) => {
      if (!response.success) {
        console.error('Failed to submit answer:', response.error);
        setHasAnswered(false);
        setSelectedAnswer(null);
      }
    });
  };

  const handleSendReaction = (emoji) => {
    socketService.sendReaction(pin, teamId, emoji);
  };

  if (gameEnded) {
    const myRank = leaderboard.findIndex(t => t.name === teamName) + 1;
    const totalPtsAwarded = rewardsAwarded.reduce((s, r) => s + (r?.points || 0), 0);
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950 to-black p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-black/60 backdrop-blur-md rounded-2xl shadow-2xl p-8 text-center border border-amber-500/20">
            <div className="text-6xl mb-4">
              {myRank === 1 ? '🏆' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🎮'}
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Game Over!</h1>
            <p className="text-2xl text-amber-400 mb-6">{teamName}</p>
            
            <div className="bg-gradient-to-r from-amber-500/20 to-green-800/20 border border-amber-500/40 text-white rounded-xl p-6 mb-4">
              <div className="text-lg opacity-90 mb-2">Your Rank</div>
              <div className="text-6xl font-bold mb-2">#{myRank}</div>
              <div className="text-3xl font-semibold">{myScore} points</div>
            </div>

            {rewardsAwarded.length > 0 && (
              <div className="bg-amber-500/20 border-2 border-amber-500 rounded-xl p-4 mb-4">
                <p className="text-amber-400 font-bold text-lg mb-2">🎁 +{totalPtsAwarded} Putters Points earned!</p>
                <div className="space-y-1">
                  {rewardsAwarded.map((r, i) => r && (
                    <div key={i} className="flex justify-between text-sm text-white/80">
                      <span>{r.label}</span>
                      <span className="text-amber-400 font-bold">+{r.points}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/rewards')} className="mt-3 w-full bg-amber-500 text-black font-bold py-2 rounded-lg text-sm hover:bg-amber-400 transition">
                  View My Rewards →
                </button>
              </div>
            )}

            {!playerPhone && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4">
                <p className="text-white/70 text-sm">🎁 <button onClick={() => navigate('/login')} className="text-amber-400 underline font-semibold">Sign in with your phone</button> to earn Putters Points!</p>
              </div>
            )}

            <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
              <h3 className="font-bold text-white mb-3">Final Standings</h3>
              <div className="space-y-2">
                {leaderboard.map((team, index) => (
                  <div key={index} className={`flex justify-between items-center p-3 rounded-lg ${team.name === teamName ? 'bg-amber-500 text-black font-bold' : 'bg-white/5 text-white'}`}>
                    <span>#{index + 1} {team.name}</span>
                    <span>{team.score} pts</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => navigate('/')} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold py-3 px-6 rounded-xl text-lg uppercase">
              Back to Home 🎱
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-black/60 backdrop-blur-md rounded-2xl shadow-2xl p-8 text-center border border-amber-500/20">
          <div className="text-6xl mb-4 animate-bounce">⏳</div>
          <h2 className="text-3xl font-bold text-white mb-4">Waiting for game to start...</h2>
          <p className="text-xl text-amber-400 font-semibold">{teamName}</p>
          <p className="text-white/50 mt-2">Game PIN: <span className="font-bold text-amber-400">{pin}</span></p>
          <p className="text-white/40 text-sm mt-4">Your host will start the game soon 🎱</p>
        </div>
      </div>
    );
  }

  const correctAnswerIndex = correctAnswer ? currentQuestion.options.indexOf(correctAnswer) : -1;
  const timerWarning = timeLeft !== null && timeLeft <= 5 && !showResults;
  const timerColour = timeLeft !== null
    ? timeLeft <= 5 ? 'text-red-500' : timeLeft <= 10 ? 'text-amber-400' : 'text-green-400'
    : 'text-white';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950 to-black p-4">
      {/* Floating reactions overlay */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
        {floatingReactions.map(r => (
          <div
            key={r.id}
            className="absolute animate-float-up text-5xl"
            style={{ left: `${20 + Math.random() * 60}%`, bottom: '120px' }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-black/60 backdrop-blur-md rounded-t-2xl shadow-lg p-4 flex justify-between items-center border-b border-amber-500/20">
          <div>
            <div className="font-bold text-white">{teamName}</div>
            <div className={`text-sm text-amber-400 ${scoreAnimating ? 'animate-score-pulse' : ''}`}>
              Score: {myScore}
            </div>
          </div>
          {/* Countdown timer */}
          {timeLeft !== null && !showResults && (
            <div className="text-center">
              <div className={`text-4xl font-bold tabular-nums ${timerColour} ${timerWarning ? 'animate-timer-warn' : ''}`}>
                {timeLeft}
              </div>
              <div className="text-xs text-white/40">seconds</div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-white/50">Question</div>
              <div className="font-bold text-white">{currentQuestion.questionNumber}/{currentQuestion.totalQuestions}</div>
            </div>
            <button onClick={toggleMute} className="text-2xl opacity-70 hover:opacity-100 transition" title={muted ? 'Unmute' : 'Mute'}>
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>

        {/* Question */}
        <div className="bg-black/50 backdrop-blur-md shadow-lg p-6 border-b border-white/5">
          {/* Question image if present */}
          {currentQuestion.imageUrl && (
            <div className="mb-4 text-center">
              <img
                src={currentQuestion.imageUrl}
                alt="Question visual"
                className="max-h-48 object-contain rounded-xl mx-auto border border-white/10"
              />
            </div>
          )}

          <div className="text-center mb-5">
            <div className="text-xs uppercase tracking-widest text-amber-400/80 mb-2">{currentQuestion.category}</div>
            <h2 className="text-2xl font-bold text-white leading-snug">{currentQuestion.text}</h2>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === correctAnswer;
              let btnClass = 'bg-white/10 hover:bg-amber-500/20 text-white border border-white/10 hover:border-amber-500/40';
              if (hasAnswered) {
                if (isSelected && showResults) {
                  btnClass = isCorrect
                    ? 'bg-green-600 border-green-400 text-white animate-answer-reveal'
                    : 'bg-red-600 border-red-400 text-white animate-answer-reveal';
                } else if (isSelected) {
                  btnClass = 'bg-amber-600 border-amber-400 text-white';
                } else if (showResults && isCorrect) {
                  btnClass = 'bg-green-600 border-green-400 text-white animate-answer-reveal';
                } else {
                  btnClass = 'bg-white/5 border-white/5 text-white/40';
                }
              }
              return (
                <button
                  key={index}
                  onClick={() => handleSubmitAnswer(option)}
                  disabled={hasAnswered}
                  className={`w-full p-4 rounded-xl text-left font-semibold transition-all border ${btnClass} ${hasAnswered ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                >
                  <span className="font-bold mr-3 text-amber-400">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </button>
              );
            })}
          </div>

          {/* Status Message */}
          <div className="mt-5 text-center">
            {hasAnswered && !showResults && (
              <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 py-3 px-4 rounded-xl font-semibold">
                ✅ Answer submitted! Waiting for results...
              </div>
            )}
            {showResults && (
              <div className={`py-3 px-4 rounded-xl font-semibold border animate-answer-reveal ${
                selectedAnswer === correctAnswer
                  ? 'bg-green-600/30 border-green-500/50 text-green-300'
                  : 'bg-red-600/30 border-red-500/50 text-red-300'
              }`}>
                {selectedAnswer === correctAnswer
                  ? '🎉 Correct! Great job!'
                  : `❌ Incorrect. The correct answer was ${correctAnswerIndex >= 0 ? String.fromCharCode(65 + correctAnswerIndex) + '. ' : ''}${correctAnswer}`}
              </div>
            )}
          </div>

          {/* Emoji Reactions Row */}
          <div className="mt-4 flex justify-center gap-3">
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendReaction(emoji)}
                className="text-2xl p-2 rounded-xl bg-white/5 hover:bg-white/15 active:scale-90 transition-all border border-white/10"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Current Rankings (when results shown) */}
          {showResults && leaderboard.length > 0 && (
            <div className="mt-5 bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="font-bold text-white mb-3 text-center">Current Rankings</h3>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((team, index) => (
                  <div
                    key={index}
                    className={`flex justify-between items-center p-2 rounded-lg ${team.name === teamName ? 'bg-amber-500 text-black font-bold' : 'bg-white/5 text-white'}`}
                  >
                    <span>#{index + 1} {team.name}</span>
                    <span>{team.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-black/40 backdrop-blur-md rounded-b-2xl shadow-lg p-3 text-center text-xs text-white/30 border-t border-white/5">
          Game PIN: <span className="font-bold text-amber-400/60">{pin}</span>
        </div>
      </div>
    </div>
  );
}

export default PlayerGame;
