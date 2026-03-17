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

  const isPictionary = gameMode === 'pictionary';
  const isApples = gameMode === 'apples-to-apples';
  const isPartyGame = isPictionary || isApples;

  useEffect(() => {
    setGameMode(passedGameMode);
    setGenre(passedGenre);
  }, [passedGameMode, passedGenre]);

  useEffect(() => {
    const socket = socketService.connect();

    socketService.createGame(hostName, gameMode, genre, (response) => {
      if (response.success) {
        setPin(response.pin);
        setGameId(response.gameId);
      }
    });

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
        setQuestions(Array(response.questionsCount).fill({}));
      }
    });
  };

  const handleLoadAPIQuestions = () => {
    socketService.loadAPIQuestions(pin, 10, (response) => {
      if (response.success) {
        setQuestionsLoaded(true);
        alert(`${response.questionsCount} API questions loaded!`);
        setQuestions(Array(response.questionsCount).fill({}));
      } else {
        alert('Failed to load API questions. Using pre-made questions instead.');
      }
    });
  };

  const handleAddQuestion = () => {
    if (!newQuestion.text || newQuestion.options.some(opt => !opt)) {
      alert('Please fill in all question fields');
      return;
    }

    // correctAnswer is stored as an index; convert to the actual option text before sending
    const questionToAdd = {
      ...newQuestion,
      correctAnswer: newQuestion.options[newQuestion.correctAnswer],
    };

    socketService.addQuestion(pin, questionToAdd, (response) => {
      if (response.success) {
        setQuestions([...questions, questionToAdd]);
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
    if (teams.length === 0) {
      alert('Waiting for players to join...');
      return;
    }

    if (isPictionary) {
      socketService.startPictionary(pin, 'medium', (response) => {
        if (response.success) {
          navigate('/host/pictionary', { state: { pin, gameId, teams } });
        } else {
          alert('Failed to start Pictionary: ' + response.error);
        }
      });
      return;
    }

    if (isApples) {
      socketService.startApples(pin, (response) => {
        if (response.success) {
          navigate('/host/apples', { state: { pin, gameId, teams } });
        } else {
          alert('Failed to start Apples to Apples: ' + response.error);
        }
      });
      return;
    }

    if (questions.length === 0) {
      alert('Please add at least one question');
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

  const modeColor = isPictionary ? 'from-pink-500 to-purple-600' : isApples ? 'from-green-500 to-teal-600' : 'from-purple-600 to-blue-600';
  const modeIcon = isPictionary ? '🎨' : isApples ? '🍎' : '🎯';
  const modeName = isPictionary ? 'Pictionary' : isApples ? 'Apples to Apples' : 'Trivia';

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">{modeIcon} {modeName} Lobby</h1>
            <p className="text-gray-400">Host: <span className="text-yellow-400 font-semibold">{hostName}</span></p>
            <div className="flex justify-center gap-4 mt-2">
              <span className="px-3 py-1 bg-purple-800 text-purple-300 rounded-full text-sm font-medium">
                Mode: {gameMode}
              </span>
              {!isPartyGame && (
                <span className="px-3 py-1 bg-blue-800 text-blue-300 rounded-full text-sm font-medium">
                  Genre: {genre}
                </span>
              )}
            </div>
          </div>

          {/* Party game info banners */}
          {isPictionary && (
            <div className="mb-6 p-4 rounded-xl bg-pink-900/40 border border-pink-500 text-center">
              <p className="text-pink-300 font-semibold">🎨 Pictionary Mode — Players will take turns drawing words while others guess!</p>
              <p className="text-pink-400/80 text-sm mt-1">No questions needed. Just start when players have joined!</p>
            </div>
          )}
          {isApples && (
            <div className="mb-6 p-4 rounded-xl bg-green-900/40 border border-green-500 text-center">
              <p className="text-green-300 font-semibold">🍎 Apples to Apples — Players get cards and try to match the judge's green card!</p>
              <p className="text-green-400/80 text-sm mt-1">Need at least 3 players for best experience. Just start when ready!</p>
            </div>
          )}

          {/* Quick Load Questions Button (trivia only) */}
          {!isPartyGame && !questionsLoaded && (
            <div className="mb-6 text-center">
              <div className="flex gap-4 justify-center flex-wrap">
                <button
                  onClick={handleLoadQuestions}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition duration-200 transform hover:scale-105"
                >
                  🎲 Load 10 Pre-Made Questions
                </button>
                <button
                  onClick={handleLoadAPIQuestions}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-200 transform hover:scale-105"
                >
                  🌐 Load 10 API Questions
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">Or add your own questions below</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* QR Code and PIN */}
            <div className="bg-gray-800 rounded-xl p-6 text-center border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Join Game</h2>
              <div className="bg-white p-4 rounded-lg inline-block mb-4">
                <QRCodeSVG value={joinUrl} size={180} />
              </div>
              <div className="text-6xl font-bold text-yellow-400 mb-2 tracking-widest">{pin}</div>
              <p className="text-gray-400 mb-2">Scan QR or enter PIN at:</p>
              <p className="text-sm text-gray-500 break-all">{joinUrl}</p>
            </div>

            {/* Teams List */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">
                Players ({teams.length})
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {teams.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Waiting for players to join...
                  </p>
                ) : (
                  teams.map((team, index) => (
                    <div key={team.id} className="bg-gray-700 p-4 rounded-lg flex items-center gap-3">
                      <span className="text-2xl">{index === 0 ? '👑' : '👤'}</span>
                      <span className="font-semibold text-white">{team.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Questions Section (trivia only) */}
          {!isPartyGame && (
            <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">
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
                <div className="bg-gray-900 rounded-lg p-6 mb-4 border border-gray-600">
                  <input
                    type="text"
                    placeholder="Question text"
                    value={newQuestion.text}
                    onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border-2 border-gray-600 text-white focus:border-green-500 focus:outline-none mb-3"
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
                        className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border-2 border-gray-600 text-white focus:border-green-500 focus:outline-none"
                      />
                    </div>
                  ))}

                  <div className="flex gap-4 mt-4">
                    <input
                      type="number"
                      placeholder="Time limit (seconds)"
                      value={newQuestion.timeLimit}
                      onChange={(e) => setNewQuestion({ ...newQuestion, timeLimit: parseInt(e.target.value) || 30 })}
                      className="w-32 px-4 py-2 rounded-lg bg-gray-800 border-2 border-gray-600 text-white focus:border-green-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Category"
                      value={newQuestion.category}
                      onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                      className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border-2 border-gray-600 text-white focus:border-green-500 focus:outline-none"
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

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {questions.map((q, index) => (
                  <div key={index} className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                    <div className="font-semibold text-white text-sm">
                      {index + 1}. {q.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleStartGame}
              disabled={(!isPartyGame && questions.length === 0) || teams.length === 0}
              className={`flex-1 bg-gradient-to-r ${modeColor} disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl text-xl transition duration-200 transform hover:scale-105 shadow-lg`}
            >
              Start {modeName} 🚀
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-4 px-6 rounded-xl"
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

