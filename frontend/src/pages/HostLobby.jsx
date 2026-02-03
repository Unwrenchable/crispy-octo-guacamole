import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import socketService from '../services/socket';

function HostLobby() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pin, setPin] = useState('');
  const [gameId, setGameId] = useState('');
  const [teams, setTeams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    timeLimit: 30,
    category: 'General'
  });
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [gameMode, setGameMode] = useState('classic');
  const [genre, setGenre] = useState('mixed');
  const [questionsLoaded, setQuestionsLoaded] = useState(false);

  const hostName = location.state?.hostName || 'Host';
  const passedGameMode = location.state?.gameMode || 'classic';
  const passedGenre = location.state?.genre || 'mixed';
  const joinUrl = `${window.location.origin}/join?pin=${pin}`;

  useEffect(() => {
    setGameMode(passedGameMode);
    setGenre(passedGenre);
  }, [passedGameMode, passedGenre]);

  useEffect(() => {
    const socket = socketService.connect();

    // Create game with mode and genre
    socketService.createGame(hostName, gameMode, genre, (response) => {
      if (response.success) {
        setPin(response.pin);
        setGameId(response.gameId);
      }
    });

    // Listen for teams joining
    socketService.onTeamJoined((data) => {
      setTeams(prev => [...prev, { id: data.teamId, name: data.teamName }]);
    });

    socketService.onTeamLeft((data) => {
      setTeams(prev => prev.filter(team => team.id !== data.teamId));
    });

    return () => {
      socket.disconnect();
    };
  }, [hostName, gameMode, genre]);

  const handleLoadQuestions = () => {
    socketService.loadQuestions(pin, 10, (response) => {
      if (response.success) {
        setQuestionsLoaded(true);
        alert(`${response.questionsCount} questions loaded!`);
        // Update questions count
        setQuestions(Array(response.questionsCount).fill({}));
      }
    });
  };

  const handleAddQuestion = () => {
    if (!newQuestion.text || newQuestion.options.some(opt => !opt)) {
      alert('Please fill in all question fields');
      return;
    }

    socketService.addQuestion(pin, newQuestion, (response) => {
      if (response.success) {
        setQuestions([...questions, newQuestion]);
        setNewQuestion({
          text: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          timeLimit: 30,
          category: 'General'
        });
        setShowAddQuestion(false);
      }
    });
  };

  const handleStartGame = () => {
    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    if (teams.length === 0) {
      alert('Waiting for teams to join...');
      return;
    }

    socketService.startGame(pin, (response) => {
      if (response.success) {
        navigate('/host/game', {
          state: { pin, gameId, teams, questions }
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">🎯 Game Lobby</h1>
            <p className="text-gray-600">Host: {hostName}</p>
            <div className="flex justify-center gap-4 mt-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                Mode: {gameMode}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                Genre: {genre}
              </span>
            </div>
          </div>

          {/* Quick Load Questions Button */}
          {!questionsLoaded && (
            <div className="mb-6 text-center">
              <button
                onClick={handleLoadQuestions}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition duration-200 transform hover:scale-105"
              >
                🎲 Load 10 Pre-Made Questions
              </button>
              <p className="text-sm text-gray-500 mt-2">Or add your own questions below</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* QR Code and PIN */}
            <div className="bg-purple-50 rounded-xl p-6 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Join Game</h2>
              <div className="bg-white p-6 rounded-lg inline-block mb-4">
                <QRCodeSVG value={joinUrl} size={200} />
              </div>
              <div className="text-6xl font-bold text-purple-600 mb-2">{pin}</div>
              <p className="text-gray-600 mb-4">Scan QR or enter PIN</p>
              <p className="text-sm text-gray-500 break-all">{joinUrl}</p>
            </div>

            {/* Teams List */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Teams ({teams.length})
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {teams.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Waiting for teams to join...
                  </p>
                ) : (
                  teams.map((team, index) => (
                    <div key={team.id} className="bg-white p-4 rounded-lg flex items-center">
                      <span className="text-2xl mr-3">👥</span>
                      <span className="font-semibold text-gray-800">{team.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Questions Section */}
          <div className="bg-green-50 rounded-xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                Questions ({questions.length})
              </h2>
              <button
                onClick={() => setShowAddQuestion(!showAddQuestion)}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"
              >
                {showAddQuestion ? 'Cancel' : '+ Add Question'}
              </button>
            </div>

            {showAddQuestion && (
              <div className="bg-white rounded-lg p-6 mb-4">
                <input
                  type="text"
                  placeholder="Question text"
                  value={newQuestion.text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-green-500 focus:outline-none mb-3"
                />
                
                {newQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <input
                      type="radio"
                      checked={newQuestion.correctAnswer === index}
                      onChange={() => setNewQuestion({ ...newQuestion, correctAnswer: index })}
                      className="mr-2"
                    />
                    <input
                      type="text"
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...newQuestion.options];
                        newOptions[index] = e.target.value;
                        setNewQuestion({ ...newQuestion, options: newOptions });
                      }}
                      className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                ))}

                <div className="flex gap-4 mt-4">
                  <input
                    type="number"
                    placeholder="Time limit (seconds)"
                    value={newQuestion.timeLimit}
                    onChange={(e) => setNewQuestion({ ...newQuestion, timeLimit: parseInt(e.target.value) || 30 })}
                    className="w-32 px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-green-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    value={newQuestion.category}
                    onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                    className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-green-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleAddQuestion}
                  className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg"
                >
                  Add Question
                </button>
              </div>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {questions.map((q, index) => (
                <div key={index} className="bg-white p-4 rounded-lg">
                  <div className="font-semibold text-gray-800">
                    {index + 1}. {q.text}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    {q.options.map((opt, i) => (
                      <div key={i} className={i === q.correctAnswer ? 'text-green-600 font-semibold' : ''}>
                        {String.fromCharCode(65 + i)}. {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleStartGame}
              disabled={questions.length === 0 || teams.length === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg text-xl transition duration-200 transform hover:scale-105"
            >
              Start Game 🚀
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-4 px-6 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HostLobby;
