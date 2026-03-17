import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socketService from '../services/socket';

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
      playTone(523, 0.15, 'sine', 0.25, 0);
      playTone(659, 0.15, 'sine', 0.2, 0.1);
      playTone(784, 0.25, 'sine', 0.25, 0.2);
    },
    wrong() {
      playTone(300, 0.15, 'sawtooth', 0.18, 0);
      playTone(200, 0.25, 'sawtooth', 0.18, 0.12);
    },
    buzz() {
      playTone(880, 0.08, 'square', 0.18, 0);
    },
    reveal() {
      playTone(440, 0.1, 'sine', 0.2, 0);
      playTone(550, 0.2, 'sine', 0.2, 0.1);
    },
    gameOver() {
      [523, 0, 523, 0, 523, 659, 784].forEach((f, i) => {
        if (f > 0) playTone(f, 0.18, 'sine', 0.28, i * 0.12);
      });
      playTone(1047, 0.5, 'sine', 0.32, 0.85);
    }
  };
}

const SOUND_ENGINE = createSoundEngine();

// ── CSV / JSON export ─────────────────────────────────────────
function exportCSV(leaderboard, totalQuestions) {
  const rows = [['Rank', 'Team Name', 'Score', 'Correct Answers', 'Total Questions']];
  leaderboard.forEach((team, i) => {
    rows.push([i + 1, team.name, team.score, team.answersCount ?? '', totalQuestions ?? '']);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'game-results.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(leaderboard, totalQuestions) {
  const data = {
    exportedAt: new Date().toISOString(),
    totalQuestions,
    results: leaderboard.map((team, i) => ({
      rank: i + 1,
      teamName: team.name,
      score: team.score,
      correctAnswers: team.answersCount ?? null,
      totalQuestions: totalQuestions ?? null
    }))
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'game-results.json';
  a.click();
  URL.revokeObjectURL(url);
}

function HostGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pin, gameId, teams: initialTeams, questions } = location.state || {};

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [answeredTeams, setAnsweredTeams] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(null);
  const [muted, setMuted] = useState(() => localStorage.getItem('pv_muted') === 'true');
  const [toasts, setToasts] = useState([]); // emoji reaction toasts
  const [totalQuestions, setTotalQuestions] = useState(questions?.length ?? 0);
  const timerRef = useRef(null);

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

    if (!currentQuestion || showAnswer) { setTimeLeft(null); return; }

    setTimeLeft(currentQuestion.timeLimit);
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = id;
    return () => clearInterval(id);
  }, [currentQuestion, showAnswer]);

  useEffect(() => {
    if (!pin) { navigate('/'); return; }

    const socket = socketService.connect();

    const startQuestion = (question) => {
      setCurrentQuestion(question);
      setShowAnswer(false);
      setCorrectAnswer(null);
      setAnsweredTeams(new Set());
      if (question.totalQuestions) setTotalQuestions(question.totalQuestions);
    };

    socketService.onAnswerSubmitted((data) => {
      setAnsweredTeams(prev => new Set([...prev, data.teamId]));
      playSound('buzz');
    });

    socketService.onGameStarted((data) => startQuestion(data.question));
    socketService.onNewQuestion((data) => startQuestion(data.question));

    socketService.onAnswerRevealed((data) => {
      setShowAnswer(true);
      setCorrectAnswer(data.correctAnswer);
      setLeaderboard(data.leaderboard);
      playSound('reveal');
    });

    socketService.onGameEnded((data) => {
      setGameEnded(true);
      setLeaderboard(data.finalLeaderboard);
      playSound('gameOver');
    });

    // Emoji reaction toasts
    socketService.onReaction((data) => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { ...data, id, leaving: false }]);
      // Start fade-out after 1.6s, remove at 2s
      setTimeout(() => setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t)), 1600);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2100);
    });

    return () => { socket.disconnect(); };
  }, [pin, navigate, playSound]);

  const handleRevealAnswer = () => {
    socketService.revealAnswer(pin, (response) => {
      if (response.success) {
        setShowAnswer(true);
        setCorrectAnswer(response.correctAnswer);
        setLeaderboard(response.leaderboard);
        playSound('reveal');
      }
    });
  };

  const handleNextQuestion = () => {
    socketService.nextQuestion(pin, (response) => {
      if (response.success) {
        if (response.ended) {
          setGameEnded(true);
          playSound('gameOver');
        } else {
          setCurrentQuestion(response.question);
          setShowAnswer(false);
          setCorrectAnswer(null);
          setAnsweredTeams(new Set());
        }
      }
    });
  };

  if (gameEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-green-950 p-8">
        <div className="max-w-4xl mx-auto bg-black/60 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-amber-500/30">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-4">🏆 Game Over!</h1>
            <p className="text-2xl text-amber-400">Final Results</p>
          </div>

          <div className="space-y-4 mb-8">
            {leaderboard.map((team, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-6 rounded-xl animate-answer-reveal ${
                  index === 0
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg transform scale-105'
                    : index === 1
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                    : index === 2
                    ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white'
                    : 'bg-white/5 text-white'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-bold">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </span>
                  <div>
                    <div className="text-2xl font-bold">{team.name}</div>
                    <div className="text-sm opacity-70">{team.answersCount} answers</div>
                  </div>
                </div>
                <div className="text-4xl font-bold">{team.score}</div>
              </div>
            ))}
          </div>

          {/* Export Buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => exportCSV(leaderboard, totalQuestions)}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"
            >
              📊 Export CSV
            </button>
            <button
              onClick={() => exportJSON(leaderboard, totalQuestions)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"
            >
              📋 Export JSON
            </button>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 px-6 rounded-xl text-xl transition duration-200"
          >
            Return to Home 🎱
          </button>
        </div>
      </div>
    );
  }

  const timerWarning = timeLeft !== null && timeLeft <= 5 && !showAnswer;
  const timerColour = timeLeft !== null
    ? timeLeft <= 5 ? 'text-red-400' : timeLeft <= 10 ? 'text-amber-400' : 'text-green-400'
    : 'text-white';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Emoji Reaction Toasts (top-right) */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '200px' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2 bg-black/80 border border-white/20 rounded-2xl px-4 py-2 shadow-xl ${t.leaving ? 'animate-toast-out' : 'animate-toast-in'}`}
          >
            <span className="text-3xl">{t.emoji}</span>
            <span className="text-sm text-white/80 font-semibold truncate">{t.teamName}</span>
          </div>
        ))}
      </div>

      {/* Top Bar */}
      <div className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
        <div className="text-xl font-semibold text-amber-400">
          PIN: <span className="font-bold text-white tracking-widest">{pin}</span>
        </div>
        <div className="text-center">
          {timeLeft !== null && !showAnswer && (
            <div className={`text-5xl font-bold tabular-nums leading-none ${timerColour} ${timerWarning ? 'animate-timer-warn' : ''}`}>
              {timeLeft}
            </div>
          )}
          {currentQuestion && (
            <div className="text-sm text-gray-400 mt-1">Question {currentQuestion.questionNumber} / {currentQuestion.totalQuestions}</div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xl">
            Answered: <span className="font-bold text-amber-400">{answeredTeams.size}</span> / {initialTeams?.length || 0}
          </div>
          <button onClick={toggleMute} className="text-2xl opacity-70 hover:opacity-100 transition" title={muted ? 'Unmute' : 'Mute'}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-8">
        {currentQuestion ? (
          <div className="space-y-8">
            {/* Question */}
            <div className="bg-gradient-to-r from-purple-700 to-blue-700 rounded-2xl p-10 text-center shadow-2xl">
              {/* Question image */}
              {currentQuestion.imageUrl && (
                <div className="mb-4">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Question visual"
                    className="max-h-48 object-contain rounded-xl mx-auto border border-white/20"
                  />
                </div>
              )}
              <div className="text-base mb-3 opacity-80 uppercase tracking-widest">{currentQuestion.category}</div>
              <h2 className="text-4xl font-bold leading-snug">{currentQuestion.text}</h2>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-6">
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={`p-8 rounded-xl text-2xl font-semibold transition-all border-2 ${
                    showAnswer && option === correctAnswer
                      ? 'bg-green-600 border-green-400 ring-4 ring-green-300 shadow-lg animate-answer-reveal'
                      : showAnswer
                      ? 'bg-gray-800 border-gray-700 opacity-50'
                      : 'bg-gray-800 border-gray-700'
                  }`}
                >
                  <span className="text-amber-400 mr-4">{String.fromCharCode(65 + index)}</span>
                  {option}
                  {showAnswer && option === correctAnswer && <span className="ml-4">✅</span>}
                </div>
              ))}
            </div>

            {/* Leaderboard (when answer shown) */}
            {showAnswer && leaderboard.length > 0 && (
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-3xl font-bold mb-4 text-center text-amber-400">Current Standings</h3>
                <div className="grid grid-cols-3 gap-4">
                  {leaderboard.slice(0, 6).map((team, index) => (
                    <div key={index} className={`p-4 rounded-lg animate-answer-reveal ${index === 0 ? 'bg-amber-500 text-black' : 'bg-gray-700'}`} style={{ animationDelay: `${index * 0.07}s` }}>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index+1}`} {team.name}</span>
                        <span className={`font-bold ${index === 0 ? 'text-black' : 'text-amber-400'}`}>{team.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-4 justify-center">
              {!showAnswer ? (
                <button
                  onClick={handleRevealAnswer}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-12 rounded-lg text-2xl transition duration-200 transform hover:scale-105 shadow-lg"
                >
                  Reveal Answer 🎯
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-12 rounded-lg text-2xl transition duration-200 transform hover:scale-105"
                >
                  {currentQuestion.questionNumber < currentQuestion.totalQuestions
                    ? 'Next Question ➡️'
                    : 'End Game 🏁'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-4xl font-bold">Loading game...</h2>
          </div>
        )}
      </div>
    </div>
  );
}

export default HostGame;
