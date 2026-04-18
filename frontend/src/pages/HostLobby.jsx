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
    category: 'General',
    imageUrl: ''
  });
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [gameMode] = useState(location.state?.gameMode || 'classic');
  const [genre] = useState(location.state?.genre || 'mixed');
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [loadCount, setLoadCount] = useState(20);
  const [poolSize, setPoolSize] = useState(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showScoringConfig, setShowScoringConfig] = useState(false);
  const [scoringConfig, setScoringConfig] = useState({
    basePoints: 100,
    timeBonusEnabled: true,
    timeBonusMax: 50
  });

  const hostName = location.state?.hostName || 'Host';
  const joinUrl = `${window.location.origin}/join?pin=${pin}`;

  const isPictionary = gameMode === 'pictionary';
  const isApples = gameMode === 'apples-to-apples';
  const isPartyGame = isPictionary || isApples;

  useEffect(() => {
    const socket = socketService.connect();

    socketService.createGame(hostName, gameMode, genre, (response) => {
      if (response.success) {
        setPin(response.pin);
        setGameId(response.gameId);
      }
    }, scoringConfig);

    socketService.onTeamJoined((data) => {
      setTeams(prev => [...prev, { id: data.teamId, name: data.teamName }]);
    });

    socketService.onTeamLeft((data) => {
      setTeams(prev => prev.filter(team => team.id !== data.teamId));
    });

    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostName, gameMode, genre]);

  const handleLoadQuestions = () => {
    if (!pin) return;
    setLoadingQuestions(true);
    socketService.loadQuestions(pin, loadCount, (response) => {
      setLoadingQuestions(false);
      if (response.success) {
        setQuestionsLoaded(true);
        setQuestions(Array(response.questionsCount).fill({}));
        if (response.poolSize) setPoolSize(response.poolSize);
      }
    });
  };

  const handleLoadMore = () => {
    if (!pin) return;
    setLoadingQuestions(true);
    socketService.loadQuestions(pin, loadCount, (response) => {
      setLoadingQuestions(false);
      if (response.success) {
        setQuestions(Array(response.questionsCount).fill({}));
        if (response.poolSize) setPoolSize(response.poolSize);
      }
    });
  };

  const handleLoadAPIQuestions = () => {
    if (!pin) return;
    setLoadingQuestions(true);
    socketService.loadAPIQuestions(pin, loadCount, (response) => {
      setLoadingQuestions(false);
      if (response.success) {
        setQuestionsLoaded(true);
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

    const questionToAdd = {
      ...newQuestion,
      correctAnswer: newQuestion.options[newQuestion.correctAnswer],
      imageUrl: newQuestion.imageUrl || undefined
    };

    socketService.addQuestion(pin, questionToAdd, (response) => {
      if (response.success) {
        setQuestions([...questions, questionToAdd]);
        setNewQuestion({
          text: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          timeLimit: 30,
          category: 'General',
          imageUrl: ''
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
        navigate('/host/game', { state: { pin, gameId, teams, questions } });
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
              <span className="px-3 py-1 bg-purple-800 text-purple-300 rounded-full text-sm font-medium">Mode: {gameMode}</span>
              {!isPartyGame && (
                <span className="px-3 py-1 bg-blue-800 text-blue-300 rounded-full text-sm font-medium">Genre: {genre}</span>
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

          {/* Scoring Rules (trivia only) */}
          {!isPartyGame && (
            <div className="mb-6 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <button
                onClick={() => setShowScoringConfig(!showScoringConfig)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-750 transition"
              >
                <span className="text-white font-semibold text-lg">⚙️ Scoring Rules</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">
                    {scoringConfig.basePoints}pts base{scoringConfig.timeBonusEnabled ? ` + up to ${scoringConfig.timeBonusMax}pts bonus` : ', no time bonus'}
                  </span>
                  <span className="text-amber-400">{showScoringConfig ? '▲' : '▼'}</span>
                </div>
              </button>
              {showScoringConfig && (
                <div className="px-5 pb-5 border-t border-gray-700 pt-4 space-y-4">
                  {/* Base Points */}
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">
                      Base Points per correct answer: <span className="text-amber-400 font-bold">{scoringConfig.basePoints}</span>
                    </label>
                    <input
                      type="range"
                      min={50} max={500} step={50}
                      value={scoringConfig.basePoints}
                      onChange={(e) => setScoringConfig(prev => ({ ...prev, basePoints: Number(e.target.value) }))}
                      className="w-full accent-amber-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>50</span><span>500</span>
                    </div>
                  </div>
                  {/* Time Bonus Toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setScoringConfig(prev => ({ ...prev, timeBonusEnabled: !prev.timeBonusEnabled }))}
                      className={`relative w-12 h-6 rounded-full transition-colors ${scoringConfig.timeBonusEnabled ? 'bg-amber-500' : 'bg-gray-600'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${scoringConfig.timeBonusEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                    <label className="text-gray-300 font-medium">Time Bonus</label>
                  </div>
                  {/* Max Time Bonus slider */}
                  {scoringConfig.timeBonusEnabled && (
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        Max Time Bonus: <span className="text-amber-400 font-bold">{scoringConfig.timeBonusMax}</span> pts
                      </label>
                      <input
                        type="range"
                        min={0} max={100} step={10}
                        value={scoringConfig.timeBonusMax}
                        onChange={(e) => setScoringConfig(prev => ({ ...prev, timeBonusMax: Number(e.target.value) }))}
                        className="w-full accent-amber-500"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0</span><span>100</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick Load Questions (trivia only) */}
          {!isPartyGame && (
            <div className="mb-6 bg-gray-800 rounded-xl p-5 border border-gray-700">
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <div className="flex-1">
                  <p className="text-white font-semibold mb-1">🎲 Questions per game</p>
                  <div className="flex gap-2">
                    {[10, 15, 20, 30].map(n => (
                      <button
                        key={n}
                        onClick={() => setLoadCount(n)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                          loadCount === n ? 'bg-amber-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                {poolSize !== null && (
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Question pool</p>
                    <p className="text-2xl font-bold text-amber-400">{poolSize}+</p>
                    <p className="text-xs text-gray-400">available</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={questionsLoaded ? handleLoadMore : handleLoadQuestions}
                  disabled={!pin || loadingQuestions}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105"
                >
                  {loadingQuestions ? '⏳ Loading...' : questionsLoaded ? `🔄 Reload ${loadCount} Questions (Random)` : `🎲 Load ${loadCount} Pre-Made Questions`}
                </button>
                <button
                  onClick={handleLoadAPIQuestions}
                  disabled={!pin || loadingQuestions}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105"
                >
                  {loadingQuestions ? '⏳ Loading...' : `🌐 Load ${loadCount} Live Trivia Questions`}
                </button>
              </div>
              {questionsLoaded && (
                <p className="text-amber-400 text-sm text-center mt-2 font-semibold">
                  ✅ {questions.length} questions loaded — every game shuffles a different random set!
                </p>
              )}
              {!questionsLoaded && (
                <p className="text-gray-500 text-sm text-center mt-2">Choose a count above, then load — or add your own questions below</p>
              )}
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
              <h2 className="text-2xl font-bold text-white mb-4">Players ({teams.length})</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {teams.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Waiting for players to join...</p>
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
                <h2 className="text-2xl font-bold text-white">Questions ({questions.length})</h2>
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

                  {/* Image URL field */}
                  <div className="mt-3">
                    <input
                      type="url"
                      placeholder="Image URL (optional) — e.g. https://example.com/img.jpg"
                      value={newQuestion.imageUrl}
                      onChange={(e) => setNewQuestion({ ...newQuestion, imageUrl: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-gray-800 border-2 border-gray-600 text-white focus:border-green-500 focus:outline-none"
                    />
                    {newQuestion.imageUrl && (
                      <img src={newQuestion.imageUrl} alt="Preview" className="mt-2 max-h-24 object-contain rounded" onError={(e) => { e.target.style.display = 'none'; }} />
                    )}
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
                      {index + 1}. {q.text || '(loaded question)'}
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
