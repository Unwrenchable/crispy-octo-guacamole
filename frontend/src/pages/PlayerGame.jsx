import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socketService from '../services/socket';
import storageService from '../services/storage';

function PlayerGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pin, teamId, teamName, gameMode = 'classic', genre = 'mixed' } = location.state || {};
  
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameEnded, setGameEnded] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  useEffect(() => {
    if (!pin || !teamId) {
      navigate('/join');
      return;
    }

    const socket = socketService.connect();

    // Listen for game started
    socketService.onGameStarted((data) => {
      setCurrentQuestion(data.question);
      setHasAnswered(false);
      setShowResults(false);
      setSelectedAnswer(null);
    });

    // Listen for new questions
    socketService.onNewQuestion((data) => {
      setCurrentQuestion(data.question);
      setHasAnswered(false);
      setShowResults(false);
      setSelectedAnswer(null);
    });

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
        
        // Save game to history
        const myRank = data.finalLeaderboard.findIndex(team => team.name === teamName) + 1;
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
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [pin, teamId, teamName, gameMode, genre, questionsAnswered, navigate]);

  const handleSubmitAnswer = (answerIndex) => {
    if (hasAnswered) return;

    setSelectedAnswer(answerIndex);
    setHasAnswered(true);
    setQuestionsAnswered(prev => prev + 1);

    socketService.submitAnswer(pin, teamId, answerIndex, (response) => {
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
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="text-6xl mb-4">
              {myRank === 1 ? '🏆' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🎮'}
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Game Over!</h1>
            <p className="text-2xl text-gray-600 mb-6">{teamName}</p>
            
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl p-6 mb-6">
              <div className="text-lg opacity-90 mb-2">Your Rank</div>
              <div className="text-6xl font-bold mb-2">#{myRank}</div>
              <div className="text-3xl font-semibold">{myScore} points</div>
            </div>

            <div className="bg-gray-100 rounded-xl p-4 mb-6">
              <h3 className="font-bold text-gray-800 mb-3">Final Standings</h3>
              <div className="space-y-2">
                {leaderboard.map((team, index) => (
                  <div
                    key={index}
                    className={`flex justify-between items-center p-3 rounded-lg ${
                      team.name === teamName
                        ? 'bg-blue-500 text-white font-bold'
                        : 'bg-white'
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
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Waiting for game to start...</h2>
          <p className="text-xl text-gray-600">{teamName}</p>
          <p className="text-gray-500 mt-2">PIN: {pin}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-500 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-lg p-4 flex justify-between items-center">
          <div>
            <div className="font-bold text-gray-800">{teamName}</div>
            <div className="text-sm text-gray-600">Score: {myScore}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Question</div>
            <div className="font-bold text-gray-800">
              {currentQuestion.questionNumber}/{currentQuestion.totalQuestions}
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="text-sm text-purple-600 mb-2">{currentQuestion.category}</div>
            <h2 className="text-3xl font-bold text-gray-800">{currentQuestion.text}</h2>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSubmitAnswer(index)}
                disabled={hasAnswered}
                className={`w-full p-4 rounded-lg text-left font-semibold transition-all ${
                  hasAnswered
                    ? selectedAnswer === index
                      ? showResults && index === correctAnswer
                        ? 'bg-green-500 text-white'
                        : showResults && index !== correctAnswer
                        ? 'bg-red-500 text-white'
                        : 'bg-blue-500 text-white'
                      : showResults && index === correctAnswer
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                    : 'bg-gray-100 hover:bg-blue-100 text-gray-800 hover:scale-102 active:scale-98'
                } ${hasAnswered ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className="font-bold mr-3">{String.fromCharCode(65 + index)}.</span>
                {option}
              </button>
            ))}
          </div>

          {/* Status Message */}
          <div className="mt-6 text-center">
            {hasAnswered && !showResults && (
              <div className="bg-blue-100 text-blue-800 py-3 px-4 rounded-lg font-semibold">
                ✅ Answer submitted! Waiting for results...
              </div>
            )}
            {showResults && (
              <div className={`py-3 px-4 rounded-lg font-semibold ${
                selectedAnswer === correctAnswer
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {selectedAnswer === correctAnswer
                  ? '🎉 Correct! Great job!'
                  : `❌ Incorrect. The correct answer was ${String.fromCharCode(65 + correctAnswer)}`}
              </div>
            )}
          </div>

          {/* Current Rankings (when results shown) */}
          {showResults && leaderboard.length > 0 && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-800 mb-3 text-center">Current Rankings</h3>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((team, index) => (
                  <div
                    key={index}
                    className={`flex justify-between items-center p-2 rounded ${
                      team.name === teamName
                        ? 'bg-blue-500 text-white font-bold'
                        : 'bg-white'
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

        <div className="bg-white rounded-b-2xl shadow-lg p-4 text-center text-sm text-gray-500">
          Game PIN: {pin}
        </div>
      </div>
    </div>
  );
}

export default PlayerGame;
