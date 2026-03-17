import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socketService from '../services/socket';

function HostGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pin, gameId, teams: initialTeams, questions } = location.state || {};
  
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showAnswer, setShowAnswer] = useState(false);
  // correctAnswer stores the correct option TEXT (string from server)
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [answeredTeams, setAnsweredTeams] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);

  // Countdown timer — starts whenever a new question is set
  useEffect(() => {
    if (!currentQuestion || showAnswer) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(currentQuestion.timeLimit);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentQuestion]);

  // Stop timer when answer is revealed
  useEffect(() => {
    if (showAnswer && timerRef.current) {
      clearInterval(timerRef.current);
      setTimeLeft(null);
    }
  }, [showAnswer]);

  useEffect(() => {
    if (!pin) {
      navigate('/');
      return;
    }

    const socket = socketService.connect();

    const startQuestion = (question) => {
      setCurrentQuestion(question);
      setShowAnswer(false);
      setCorrectAnswer(null);
      setAnsweredTeams(new Set());
    };

    // Listen for answer submissions
    socketService.onAnswerSubmitted((data) => {
      setAnsweredTeams(prev => new Set([...prev, data.teamId]));
    });

    // Listen for game started
    socketService.onGameStarted((data) => startQuestion(data.question));

    // Listen for new questions
    socketService.onNewQuestion((data) => startQuestion(data.question));

    // Listen for answer revealed
    socketService.onAnswerRevealed((data) => {
      setShowAnswer(true);
      setCorrectAnswer(data.correctAnswer);
      setLeaderboard(data.leaderboard);
    });

    // Listen for game ended
    socketService.onGameEnded((data) => {
      setGameEnded(true);
      setLeaderboard(data.finalLeaderboard);
    });

    return () => {
      socket.disconnect();
    };
  }, [pin, navigate]);

  const handleRevealAnswer = () => {
    socketService.revealAnswer(pin, (response) => {
      if (response.success) {
        setShowAnswer(true);
        setCorrectAnswer(response.correctAnswer);
        setLeaderboard(response.leaderboard);
      }
    });
  };

  const handleNextQuestion = () => {
    socketService.nextQuestion(pin, (response) => {
      if (response.success) {
        if (response.ended) {
          setGameEnded(true);
        } else {
          setCurrentQuestion(response.question);
          setShowAnswer(false);
          setCorrectAnswer(null);
          setAnsweredTeams(new Set());
        }
      }
    });
  };

  const handleEndGame = () => {
    navigate('/');
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
                className={`flex items-center justify-between p-6 rounded-xl ${
                  index === 0
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg transform scale-105'
                    : index === 1
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                    : index === 2
                    ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white'
                    : 'bg-white/5 text-white'
                }`}
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

          <button
            onClick={handleEndGame}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 px-6 rounded-xl text-xl transition duration-200"
          >
            Return to Home 🎱
          </button>
        </div>
      </div>
    );
  }

  // Timer colour for host display
  const timerColour = timeLeft !== null
    ? timeLeft <= 5 ? 'text-red-400' : timeLeft <= 10 ? 'text-amber-400' : 'text-green-400'
    : 'text-white';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top Bar */}
      <div className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
        <div className="text-xl font-semibold text-amber-400">PIN: <span className="font-bold text-white tracking-widest">{pin}</span></div>
        <div className="text-center">
          {timeLeft !== null && !showAnswer && (
            <div className={`text-5xl font-bold tabular-nums leading-none ${timerColour}`}>{timeLeft}</div>
          )}
          {currentQuestion && (
            <div className="text-sm text-gray-400 mt-1">Question {currentQuestion.questionNumber} / {currentQuestion.totalQuestions}</div>
          )}
        </div>
        <div className="text-xl">
          Answered: <span className="font-bold text-amber-400">{answeredTeams.size}</span> / {initialTeams?.length || 0}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-8">
        {currentQuestion ? (
          <div className="space-y-8">
            {/* Question */}
            <div className="bg-gradient-to-r from-purple-700 to-blue-700 rounded-2xl p-10 text-center shadow-2xl">
              <div className="text-base mb-3 opacity-80 uppercase tracking-widest">{currentQuestion.category}</div>
              <h2 className="text-4xl font-bold leading-snug">{currentQuestion.text}</h2>
            </div>

            {/* Options — highlight correct answer by TEXT comparison */}
            <div className="grid grid-cols-2 gap-6">
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={`p-8 rounded-xl text-2xl font-semibold transition-all border-2 ${
                    showAnswer && option === correctAnswer
                      ? 'bg-green-600 border-green-400 ring-4 ring-green-300 shadow-lg'
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

            {/* Leaderboard (when answer is shown) */}
            {showAnswer && leaderboard.length > 0 && (
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-3xl font-bold mb-4 text-center text-amber-400">Current Standings</h3>
                <div className="grid grid-cols-3 gap-4">
                  {leaderboard.slice(0, 6).map((team, index) => (
                    <div key={index} className={`p-4 rounded-lg ${index === 0 ? 'bg-amber-500 text-black' : 'bg-gray-700'}`}>
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
