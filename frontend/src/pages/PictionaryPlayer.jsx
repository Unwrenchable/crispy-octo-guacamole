import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import socketService from '../services/socket';

const COLORS = ['#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#000000'];
const SIZES = [2, 4, 8, 16];

function PictionaryPlayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pin, teamId, teamName } = location.state || {};

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef(null);
  const isMyTurnRef = useRef(false); // ref to avoid stale closure in socket handlers

  const [isMyTurn, setIsMyTurn] = useState(false);
  const [myWord, setMyWord] = useState('');
  const [currentDrawerName, setCurrentDrawerName] = useState('');
  const [guess, setGuess] = useState('');
  const [guessResult, setGuessResult] = useState(null);
  const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false);
  const [correctGuessers, setCorrectGuessers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myScore, setMyScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [round, setRound] = useState(0);
  const [color, setColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(4);

  useEffect(() => {
    if (!pin || !teamId) {
      navigate('/join');
      return;
    }
    socketService.connect();

    socketService.onPictionaryYourTurn(({ word }) => {
      isMyTurnRef.current = true;
      setIsMyTurn(true);
      setMyWord(word);
      setHasGuessedCorrectly(false);
      setGuessResult(null);
      // Clear canvas
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    });

    socketService.onPictionaryRoundStart((data) => {
      setCurrentDrawerName(data.drawerName);
      setRound(data.round);
      setCorrectGuessers([]);
      setGuessResult(null);
      if (data.drawerId !== teamId) {
        isMyTurnRef.current = false;
        setIsMyTurn(false);
        setMyWord('');
        setHasGuessedCorrectly(false);
        // Clear canvas for new round
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    });

    socketService.onPictionaryDraw(({ stroke }) => {
      if (isMyTurnRef.current) return; // I'm drawing, don't redraw my own strokes
      const canvas = canvasRef.current;
      if (!canvas || !stroke) return;
      const ctx = canvas.getContext('2d');
      if (stroke.type === 'begin') {
        ctx.beginPath();
        ctx.moveTo(stroke.x, stroke.y);
      } else if (stroke.type === 'draw') {
        ctx.lineTo(stroke.x, stroke.y);
        ctx.strokeStyle = stroke.color || '#ef4444';
        ctx.lineWidth = stroke.size || 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    });

    socketService.onPictionaryClear(() => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    });

    socketService.onPictionaryCorrectGuess((data) => {
      setCorrectGuessers(prev => [...prev, { name: data.guesserName, points: data.points }]);
      setLeaderboard(data.leaderboard);
      const me = data.leaderboard.find(t => t.name === teamName);
      if (me) setMyScore(me.score);
      if (data.guesserName === teamName) {
        setHasGuessedCorrectly(true);
        setGuessResult({ correct: true, points: data.points, word: data.word });
      }
    });

    socketService.onGameEnded((data) => {
      setGameEnded(true);
      setLeaderboard(data.finalLeaderboard);
    });

    return () => {
      socketService.removeListener('pictionary:your-turn');
      socketService.removeListener('pictionary:round-start');
      socketService.removeListener('pictionary:draw');
      socketService.removeListener('pictionary:clear');
      socketService.removeListener('pictionary:correct-guess');
      socketService.removeListener('game:ended');
    };
  }, [pin, teamId, teamName, isMyTurn, navigate]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = useCallback((e) => {
    if (!isMyTurn) return;
    e.preventDefault();
    isDrawingRef.current = true;
    const pos = getPos(e, canvasRef.current);
    lastPosRef.current = pos;
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    socketService.sendDrawStroke(pin, { type: 'begin', x: pos.x, y: pos.y, color, size: brushSize });
  }, [isMyTurn, pin, color, brushSize]);

  const draw = useCallback((e) => {
    if (!isDrawingRef.current || !isMyTurn) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    socketService.sendDrawStroke(pin, { type: 'draw', x: pos.x, y: pos.y, color, size: brushSize });
    lastPosRef.current = pos;
  }, [isMyTurn, pin, color, brushSize]);

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    socketService.clearCanvas(pin);
  };

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess.trim() || hasGuessedCorrectly || isMyTurn) return;
    socketService.submitGuess(pin, teamId, guess.trim(), (response) => {
      if (!response.isCorrect) {
        setGuessResult({ correct: false });
        setTimeout(() => setGuessResult(null), 1500);
      }
    });
    setGuess('');
  };

  if (gameEnded) {
    const myRank = leaderboard.findIndex(t => t.name === teamName) + 1;
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-700 to-purple-900 p-4 flex items-center justify-center">
        <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 text-center max-w-md w-full border border-pink-500">
          <div className="text-5xl mb-4">{myRank === 1 ? '🏆' : myRank <= 3 ? '🎨' : '🎮'}</div>
          <h1 className="text-4xl font-bold text-white mb-2">Pictionary Over!</h1>
          <p className="text-pink-300 text-xl mb-6">{teamName}</p>
          <div className="bg-pink-900/40 rounded-xl p-6 mb-6">
            <div className="text-white/70 mb-1">Your Rank</div>
            <div className="text-5xl font-bold text-white">#{myRank}</div>
            <div className="text-2xl text-yellow-400 font-bold mt-1">{myScore} points</div>
          </div>
          <div className="space-y-2 mb-6">
            {leaderboard.map((t, i) => (
              <div key={i} className={`flex justify-between p-2 rounded-lg ${t.name === teamName ? 'bg-pink-600 text-white font-bold' : 'bg-gray-800 text-gray-300'}`}>
                <span>#{i+1} {t.name}</span>
                <span>{t.score} pts</span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/')} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3 rounded-xl">
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
          <span className="font-bold text-pink-400">{teamName}</span>
          <span className="text-gray-400 ml-2 text-sm">Score: <span className="text-yellow-400 font-bold">{myScore}</span></span>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">Round {round}</div>
          <div className="text-sm font-semibold text-white">
            {isMyTurn ? '✏️ Your turn to draw!' : `👁 ${currentDrawerName || '...'} is drawing`}
          </div>
        </div>
        <div className="text-xs text-gray-500">PIN: {pin}</div>
      </div>

      <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
        {/* Word display for drawer */}
        {isMyTurn && myWord && (
          <div className="bg-pink-900/40 border-2 border-pink-500 rounded-xl p-3 text-center">
            <p className="text-pink-300 text-sm font-semibold mb-1">Your word to draw:</p>
            <p className="text-3xl font-bold text-white uppercase tracking-widest">{myWord}</p>
          </div>
        )}

        {/* Canvas */}
        <div className={`relative rounded-xl overflow-hidden border-2 ${isMyTurn ? 'border-pink-500' : 'border-gray-600'} flex-1`}>
          <canvas
            ref={canvasRef}
            width={500}
            height={350}
            className="bg-white w-full h-full touch-none"
            style={{ cursor: isMyTurn ? 'crosshair' : 'default' }}
            aria-label={isMyTurn ? 'Drawing canvas — draw your word here' : 'Drawing canvas — watch and guess'}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!isMyTurn && (
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              👁 Watching
            </div>
          )}
        </div>

        {/* Drawing tools (only for drawer) */}
        {isMyTurn && (
          <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c ? 'border-yellow-400 scale-125' : 'border-gray-600'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                {SIZES.map(s => (
                  <button
                    key={s}
                    onClick={() => setBrushSize(s)}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg border-2 ${brushSize === s ? 'border-yellow-400 bg-yellow-400/20' : 'border-gray-600 bg-gray-800'}`}
                  >
                    <div className="bg-white rounded-full" style={{ width: s + 2, height: s + 2 }} />
                  </button>
                ))}
              </div>
              <button
                onClick={clearCanvas}
                className="ml-auto bg-red-700 hover:bg-red-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg"
              >
                🗑 Clear
              </button>
            </div>
          </div>
        )}

        {/* Guess input (for non-drawers) */}
        {!isMyTurn && (
          <form onSubmit={handleGuess} className="flex gap-2">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              disabled={hasGuessedCorrectly}
              placeholder={hasGuessedCorrectly ? '✅ You guessed it!' : 'Type your guess...'}
              className={`flex-1 px-4 py-3 rounded-xl border-2 text-white text-lg font-semibold focus:outline-none transition-all ${
                hasGuessedCorrectly
                  ? 'bg-green-900/40 border-green-500 placeholder-green-400'
                  : guessResult?.correct === false
                  ? 'bg-red-900/40 border-red-500'
                  : 'bg-gray-800 border-gray-600 focus:border-pink-500'
              }`}
            />
            <button
              type="submit"
              disabled={hasGuessedCorrectly}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3 px-5 rounded-xl disabled:opacity-50"
            >
              Guess!
            </button>
          </form>
        )}

        {/* Correct guessers list */}
        {correctGuessers.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
            <p className="text-xs text-gray-400 mb-2">✅ Correct guessers:</p>
            <div className="flex flex-wrap gap-2">
              {correctGuessers.map((g, i) => (
                <span key={i} className="bg-green-800/60 text-green-300 text-xs font-semibold px-2 py-1 rounded-full">
                  {g.name} +{g.points}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Guess result feedback */}
        {guessResult && !guessResult.correct && (
          <div className="bg-red-900/40 border border-red-500 rounded-xl p-2 text-center text-red-300 text-sm font-semibold animate-pulse">
            ❌ Not quite! Keep guessing...
          </div>
        )}
        {guessResult?.correct && (
          <div className="bg-green-900/40 border border-green-500 rounded-xl p-3 text-center">
            <p className="text-green-300 font-bold text-lg">🎉 You got it! +{guessResult.points} pts</p>
            <p className="text-white/70 text-sm">The word was: <strong>{guessResult.word}</strong></p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PictionaryPlayer;
