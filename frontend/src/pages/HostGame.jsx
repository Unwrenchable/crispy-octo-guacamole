import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socketService from '../services/socket';

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

  useEffect(() => {
    if (!pin) {
      navigate('/');
      return;
    }

    const socket = socketService.connect();

    // Listen for answer submissions
    socketService.onAnswerSubmitted((data) => {
      setAnsweredTeams(prev => new Set([...prev, data.teamId]));
    });

    // Listen for game started
    socketService.onGameStarted((data) => {
      setCurrentQuestion(data.question);
      setShowAnswer(false);
      setAnsweredTeams(new Set());
    });

    // Listen for new questions
    socketService.onNewQuestion((data) => {
      setCurrentQuestion(data.question);
      setShowAnswer(false);
      setAnsweredTeams(new Set());
    });

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
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">🏆 Game Over!</h1>
            <p className="text-2xl text-gray-600">Final Results</p>
          </div>

          <div className="space-y-4 mb-8">
            {leaderboard.map((team, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-6 rounded-xl ${
                  index === 0
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg transform scale-105'
                    : index === 1
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                    : index === 2
                    ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white'
                    : 'bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-bold">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </span>
                  <div>
                    <div className="text-2xl font-bold">{team.name}</div>
                    <div className="text-sm opacity-90">{team.answersCount} answers</div>
                  </div>
                </div>
                <div className="text-4xl font-bold">{team.score}</div>
              </div>
            ))}
          </div>

          <button
            onClick={handleEndGame}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition duration-200"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top Bar */}
      <div className="bg-gray-800 p-4 flex justify-between items-center">
        <div className="text-xl font-semibold">PIN: {pin}</div>
        <div className="text-xl">
          {currentQuestion && `Question ${currentQuestion.questionNumber} of ${currentQuestion.totalQuestions}`}
        </div>
        <div className="text-xl">
          Answered: {answeredTeams.size} / {initialTeams?.length || 0}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-8">
        {currentQuestion ? (
          <div className="space-y-8">
            {/* Question */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-12 text-center">
              <div className="text-lg mb-4 opacity-90">{currentQuestion.category}</div>
              <h2 className="text-5xl font-bold mb-6">{currentQuestion.text}</h2>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-6">
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={`p-8 rounded-xl text-2xl font-semibold transition-all ${
                    showAnswer && index === correctAnswer
                      ? 'bg-green-500 ring-4 ring-green-300'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <span className="text-yellow-400 mr-4">{String.fromCharCode(65 + index)}</span>
                  {option}
                </div>
              ))}
            </div>

            {/* Leaderboard (when answer is shown) */}
            {showAnswer && leaderboard.length > 0 && (
              <div className="bg-gray-800 rounded-2xl p-6">
                <h3 className="text-3xl font-bold mb-4 text-center">Current Standings</h3>
                <div className="grid grid-cols-3 gap-4">
                  {leaderboard.slice(0, 6).map((team, index) => (
                    <div key={index} className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">#{index + 1} {team.name}</span>
                        <span className="text-yellow-400 font-bold">{team.score}</span>
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
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 px-12 rounded-lg text-2xl transition duration-200 transform hover:scale-105"
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
