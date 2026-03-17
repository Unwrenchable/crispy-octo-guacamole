import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import storageService, { getTier } from '../services/storage';

function Home() {
  const navigate = useNavigate();
  const [hostName, setHostName] = useState('');
  const [gameMode, setGameMode] = useState('classic');
  const [genre, setGenre] = useState('mixed');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const p = storageService.getActiveProfile();
    setProfile(p);
    if (p) setHostName(p.displayName);
  }, []);

  const gameModes = [
    { id: 'classic', name: 'Classic Trivia', icon: '🎯', description: 'Traditional quiz with timed questions' },
    { id: 'buzzer', name: 'Buzzer Mode', icon: '🔔', description: 'First to buzz in gets to answer' },
    { id: 'speed-round', name: 'Speed Round', icon: '⏱️', description: 'Fast-paced quick questions' },
    { id: 'lightning', name: 'Lightning Round', icon: '⚡', description: 'Ultra-fast 10-second questions!' },
    { id: 'pictionary', name: 'Pictionary', icon: '🎨', description: 'Draw it, guess it, win it!' },
    { id: 'apples-to-apples', name: 'Apples to Apples', icon: '🍎', description: 'Play the funniest matching card!' },
  ];

  const genres = [
    { id: 'mixed', name: 'Mixed', icon: '🎲' },
    { id: 'las-vegas', name: 'Las Vegas', icon: '🎰' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
    { id: 'movies', name: 'Movies', icon: '🎬' },
    { id: 'music', name: 'Music', icon: '🎵' },
    { id: 'science', name: 'Science', icon: '🔬' },
    { id: 'history', name: 'History', icon: '📜' },
    { id: 'geography', name: 'Geography', icon: '🌍' },
    { id: 'pop-culture', name: 'Pop Culture', icon: '📱' },
    { id: 'food-drink', name: 'Food & Drink', icon: '🍔' },
    { id: 'technology', name: 'Technology', icon: '💻' },
    { id: 'games', name: 'Games', icon: '🎮' }
  ];

  const handleHostGame = () => {
    if (hostName.trim()) {
      navigate('/host/lobby', { state: { hostName, gameMode, genre } });
    }
  };

  const handleJoinGame = () => {
    navigate('/join');
  };

  const allTimeLeaderboard = storageService.getPersistentLeaderboard?.() ?? [];

  const isPictionaryOrApples = gameMode === 'pictionary' || gameMode === 'apples-to-apples';

  const tier = profile ? getTier(profile.points) : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Putters bar atmosphere orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full filter blur-3xl opacity-20" style={{background:'#1a5c3a', animation:'pulse 4s ease-in-out infinite'}}></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full filter blur-3xl opacity-15" style={{background:'#7c4a00', animation:'pulse 4s ease-in-out infinite', animationDelay:'1.5s'}}></div>
      </div>

      <div className="max-w-2xl w-full relative z-10">
        <div className="pv-card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="text-5xl pv-flicker">🎱</span>
              <span className="text-5xl">🎨</span>
              <span className="text-5xl">🍎</span>
            </div>
            <h1 className="text-5xl font-bold mb-2 pv-title">
              Bar Night Games
            </h1>
            <p className="text-lg font-medium mb-3" style={{color:'rgba(245,230,200,0.75)'}}>Trivia · Pictionary · Apples to Apples · Vegas Edition!</p>
            <span className="pv-badge">🎱 Putters — Bets, Brews &amp; Billiards</span>
          </div>

          {/* Rewards profile strip */}
          {profile ? (
            <button
              onClick={() => navigate('/rewards')}
              className="pv-profile-strip w-full mb-6"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{tier.icon}</span>
                <div className="text-left">
                  <div className="font-bold" style={{color:'#f5e6c8'}}>{profile.displayName}</div>
                  <div className="text-sm" style={{color:'rgba(212,160,23,0.8)'}}>{tier.name} Member</div>
                </div>
              </div>
              <div className="text-right">
                <div className="pv-score text-3xl">{profile.points}</div>
                <div className="text-xs" style={{color:'rgba(245,230,200,0.45)'}}>Putters Points →</div>
              </div>
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="pv-profile-strip w-full mb-6"
              style={{borderColor:'rgba(212,160,23,0.25)'}}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎁</span>
                <div className="text-left">
                  <div className="font-bold" style={{color:'#f5e6c8'}}>Join Putters Rewards</div>
                  <div className="text-sm" style={{color:'rgba(212,160,23,0.65)'}}>Earn points every game · Redeem for perks!</div>
                </div>
              </div>
              <div className="font-bold text-sm whitespace-nowrap ml-2" style={{color:'rgba(212,160,23,0.8)'}}>Sign In →</div>
            </button>
          )}

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-4" style={{color:'#f5e6c8'}}>Host a Game</h2>
              
              <input
                type="text"
                placeholder="Enter your name"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleHostGame()}
                className="pv-input mb-4"
                style={{fontSize:'1rem'}}
              />

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-3" style={{color:'rgba(212,160,23,0.85)'}}>Game Mode</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {gameModes.map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setGameMode(mode.id)}
                      className={`pv-mode-card ${gameMode === mode.id ? 'pv-mode-card-selected' : ''}`}
                    >
                      <div className="text-2xl mb-1">{mode.icon}</div>
                      <div className="font-semibold text-sm" style={{color:'#f5e6c8'}}>{mode.name}</div>
                      <div className="text-xs mt-1" style={{color:'rgba(245,230,200,0.55)'}}>{mode.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {!isPictionaryOrApples && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-3" style={{color:'rgba(212,160,23,0.85)'}}>Genre/Theme</label>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {genres.map(g => (
                      <button
                        key={g.id}
                        onClick={() => setGenre(g.id)}
                        className={`pv-mode-card ${genre === g.id ? 'pv-mode-card-selected' : ''}`}
                        style={{padding:'12px 8px', textAlign:'center'}}
                      >
                        <div className="text-xl mb-1">{g.icon}</div>
                        <div className="text-xs font-semibold" style={{color:'#f5e6c8'}}>{g.name}</div>
                        {g.id === 'las-vegas' && <div className="text-xs" style={{color:'rgba(212,160,23,0.9)'}}>🌟 Hot!</div>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isPictionaryOrApples && (
                <div className="mb-6 pv-felt-section p-4">
                  <p className="text-sm font-semibold text-center" style={{color:'rgba(212,160,23,0.9)'}}>
                    {gameMode === 'pictionary'
                      ? '🎨 Pictionary — Players take turns drawing while others guess! Fun for all!'
                      : '🍎 Apples to Apples — Judge picks the funniest matching card each round!'}
                  </p>
                </div>
              )}

              <button
                onClick={handleHostGame}
                disabled={!hostName.trim()}
                className="pv-btn pv-btn-gold w-full text-xl"
              >
                Create Game Room 🎱
              </button>
            </div>

            <div className="pv-divider"></div>

            <div>
              <h2 className="text-xl font-bold mb-4" style={{color:'#f5e6c8'}}>Join a Game</h2>
              <button
                onClick={handleJoinGame}
                className="pv-btn pv-btn-green w-full text-xl"
              >
                Enter Game PIN 🔢
              </button>
            </div>
          </div>

          {/* All-Time Leaderboard */}
          <div className="mt-8">
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="w-full font-semibold text-center py-2 transition"
              style={{color:'rgba(212,160,23,0.75)', background:'none', border:'none', cursor:'pointer'}}
            >
              🏆 {showLeaderboard ? 'Hide' : 'Show'} All-Time Leaderboard
            </button>
            {showLeaderboard && allTimeLeaderboard.length > 0 && (
              <div className="mt-3 pv-felt-section p-4">
                <h3 className="font-bold text-center mb-3" style={{color:'#f5e6c8'}}>🏆 Hall of Fame</h3>
                {allTimeLeaderboard.slice(0, 10).map((entry, idx) => (
                  <div key={idx} className={`flex justify-between items-center py-2 px-3 rounded-lg mb-1 ${idx === 0 ? 'pv-row-gold' : idx === 1 ? 'pv-row-silver' : idx === 2 ? 'pv-row-bronze' : 'pv-row-default'}`}>
                    <span className="font-semibold">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx+1}`} {entry.teamName}</span>
                    <span className="font-bold">{entry.highScore} pts</span>
                  </div>
                ))}
              </div>
            )}
            {showLeaderboard && allTimeLeaderboard.length === 0 && (
              <p className="text-center mt-2 text-sm" style={{color:'rgba(245,230,200,0.4)'}}>No games played yet. Be the first champion! 🏆</p>
            )}
          </div>

          <div className="mt-6 text-center text-sm space-y-1">
            <p className="font-medium" style={{color:'rgba(212,160,23,0.75)'}}>Perfect for bars, pubs &amp; late night fun!</p>
            <p style={{color:'rgba(245,230,200,0.45)'}}>Your phone is your gamepad — no Bluetooth needed! 📱</p>
            <button
              onClick={() => navigate('/stats')}
              className="underline underline-offset-4 transition"
              style={{color:'rgba(212,160,23,0.7)', background:'none', border:'none', cursor:'pointer'}}
            >
              📊 View Your Stats &amp; History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;

