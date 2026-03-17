import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socketService from '../services/socket';
import storageService from '../services/storage';

function PlayerGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pin, teamId, teamName, gameMode = 'classic', genre = 'mixed', playerPhone } = location.state || {};
  
  const [currentQuestion, setCurrentQuestion] = useState(null);
  // selectedAnswer stores the text of the chosen option (not an index)
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);
  // correctAnswer stores the text of the correct option (from server)
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameEnded, setGameEnded] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [rewardsAwarded, setRewardsAwarded] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);

  // Countdown timer: starts on new question, stops when results are shown
  useEffect(() => {
    // Clear any existing timer first using a local reference to avoid races
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
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = id;

    return () => clearInterval(id);
  }, [currentQuestion, showResults]);

  useEffect(() => {
    if (!pin || !teamId) {
      navigate('/join');
      return;
    }

    const socket = socketService.connect();

    const startQuestion = (question) => {
      setCurrentQuestion(question);
      setHasAnswered(false);
      setShowResults(false);
      setSelectedAnswer(null);
      setCorrectAnswer(null);
    };

    // Listen for game started
    socketService.onGameStarted((data) => startQuestion(data.question));

    // Listen for new questions
    socketService.onNewQuestion((data) => startQuestion(data.question));

    // Listen for answer revealed
    socketService.onAnswerRevealed((data) => {
      setShowResults(true);
      setCorrectAnswer(data.correctAnswer);
      setLeaderboard(data.leaderboard);
      
      // Find my score
      const myTeam = data.leaderboard.find(team => team.name === teamName);
      if (myTeam) {
        setMyScore(myTeam.score);
      }
    });

    // Listen for game ended
    socketService.onGameEnded((data) => {
      setGameEnded(true);
      setLeaderboard(data.finalLeaderboard);
      
      // Find my score and rank
      const myTeam = data.finalLeaderboard.find(team => team.name === teamName);
      if (myTeam) {
        setMyScore(myTeam.score);
        
        const myRank = data.finalLeaderboard.findIndex(team => team.name === teamName) + 1;

        // Save game to history
        storageService.addGameToHistory({
          teamName,
          score: myTeam.score,
          rank: myRank,
          totalTeams: data.finalLeaderboard.length,
          questionsAnswered: questionsAnswered,
          gameMode: gameMode || 'classic',
          genre: genre || 'mixed'
        });
        
        // Update persistent leaderboard
        storageService.updatePersistentLeaderboard(
          teamName,
          myTeam.score,
          gameMode || 'classic',
          genre || 'mixed'
        );

        // Award Putters Points if player is logged in
        if (playerPhone) {
          const awarded = storageService.awardGamePoints(playerPhone, {
            rank: myRank,
            totalTeams: data.finalLeaderboard.length,
            score: myTeam.score,
            gameMode: gameMode || 'classic',
            genre: genre || 'mixed',
          });
          if (awarded && awarded.length > 0) {
            setRewardsAwarded(awarded);
          }
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [pin, teamId, teamName, gameMode, genre, questionsAnswered, navigate]);

  // Submit the option TEXT (not an index) — server compares text to correctAnswer
  const handleSubmitAnswer = (answer) => {
    if (hasAnswered) return;

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

  const handleBackToHome = () => {
    navigate('/');
  };

  if (gameEnded) {
    const myRank = leaderboard.findIndex(team => team.name === teamName) + 1;
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

            {/* Putters Points earned */}
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
                <button
                  onClick={() => navigate('/rewards')}
                  className="mt-3 w-full bg-amber-500 text-black font-bold py-2 rounded-lg text-sm hover:bg-amber-400 transition"
                >
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
                  <div
                    key={index}
                    className={`flex justify-between items-center p-3 rounded-lg ${
                      team.name === teamName
                        ? 'bg-amber-500 text-black font-bold'
                        : 'bg-white/5 text-white'
                    }`}
                  >
                    <span>#{index + 1} {team.name}</span>
                    <span>{team.score} pts</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleBackToHome}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold py-3 px-6 rounded-xl text-lg uppercase"
            >
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

  // Derived: index of the correct answer in the options array (used for letter display)
  const correctAnswerIndex = correctAnswer ? currentQuestion.options.indexOf(correctAnswer) : -1;

  // Timer colour
  const timerColour = timeLeft !== null
    ? timeLeft <= 5 ? 'text-red-500' : timeLeft <= 10 ? 'text-amber-400' : 'text-green-400'
    : 'text-white';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950 to-black p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-black/60 backdrop-blur-md rounded-t-2xl shadow-lg p-4 flex justify-between items-center border-b border-amber-500/20">
          <div>
            <div className="font-bold text-white">{teamName}</div>
            <div className="text-sm text-amber-400">Score: {myScore}</div>
          </div>
          {/* Countdown timer */}
          {timeLeft !== null && !showResults && (
            <div className="text-center">
              <div className={`text-4xl font-bold tabular-nums ${timerColour}`}>{timeLeft}</div>
              <div className="text-xs text-white/40">seconds</div>
            </div>
          )}
          <div className="text-right">
            <div className="text-xs text-white/50">Question</div>
            <div className="font-bold text-white">
              {currentQuestion.questionNumber}/{currentQuestion.totalQuestions}
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-black/50 backdrop-blur-md shadow-lg p-6 border-b border-white/5">
          <div className="text-center mb-5">
            <div className="text-xs uppercase tracking-widest text-amber-400/80 mb-2">{currentQuestion.category}</div>
            <h2 className="text-2xl font-bold text-white leading-snug">{currentQuestion.text}</h2>
          </div>

          {/* Answer Options — submit option TEXT */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === correctAnswer;
              let btnClass = 'bg-white/10 hover:bg-amber-500/20 text-white border border-white/10 hover:border-amber-500/40';
              if (hasAnswered) {
                if (isSelected && showResults) {
                  btnClass = isCorrect
                    ? 'bg-green-600 border-green-400 text-white'
                    : 'bg-red-600 border-red-400 text-white';
                } else if (isSelected) {
                  btnClass = 'bg-amber-600 border-amber-400 text-white';
                } else if (showResults && isCorrect) {
                  btnClass = 'bg-green-600 border-green-400 text-white';
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
              <div className={`py-3 px-4 rounded-xl font-semibold border ${
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

          {/* Current Rankings (when results shown) */}
          {showResults && leaderboard.length > 0 && (
            <div className="mt-5 bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="font-bold text-white mb-3 text-center">Current Rankings</h3>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((team, index) => (
                  <div
                    key={index}
                    className={`flex justify-between items-center p-2 rounded-lg ${
                      team.name === teamName
                        ? 'bg-amber-500 text-black font-bold'
                        : 'bg-white/5 text-white'
                    }`}
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
