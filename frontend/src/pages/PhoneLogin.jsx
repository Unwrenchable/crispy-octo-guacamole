import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import storageService from '../services/storage';

// Format phone digits into (XXX) XXX-XXXX as user types
function formatPhoneInput(digits) {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function PhoneLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || '/';

  const [step, setStep] = useState('phone'); // phone | name | done
  const [rawDigits, setRawDigits] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [existingProfile, setExistingProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [awarded, setAwarded] = useState(null);

  // Check if already logged in
  useEffect(() => {
    const profile = storageService.getActiveProfile();
    if (profile) {
      navigate(returnTo, { replace: true });
    }
  }, [navigate, returnTo]);

  const handlePhoneInput = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setRawDigits(digits);
    setError('');
  };

  const handlePhoneNext = () => {
    if (rawDigits.length < 10) {
      setError('Please enter your full 10-digit phone number');
      return;
    }
    setError('');
    const existing = storageService.getProfile(rawDigits);
    setExistingProfile(existing);
    if (existing) {
      setDisplayName(existing.displayName);
    }
    setStep('name');
  };

  const handleLogin = () => {
    if (!displayName.trim()) {
      setError('Please enter your name or nickname');
      return;
    }
    setLoading(true);

    // Small delay for UX feel
    setTimeout(() => {
      const profile = storageService.createProfile(rawDigits, displayName);
      const isNew = !existingProfile;

      if (isNew && profile.pointsHistory?.length > 0) {
        const welcome = profile.pointsHistory[0];
        setAwarded(welcome);
      }

      setLoading(false);
      setStep('done');

      setTimeout(() => {
        navigate(returnTo, { replace: true });
      }, isNew ? 2500 : 1200);
    }, 600);
  };

  const handleKeyDown = (e, action) => {
    if (e.key === 'Enter') action();
  };

  // ── Step: Phone ──────────────────────────────────────────────
  if (step === 'phone') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 flex items-center justify-center p-4 relative overflow-hidden">
        <BgStars />
        <div className="max-w-md w-full relative z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/30">
            <div className="text-center mb-8">
              <div className="text-6xl mb-3">🎰</div>
              <h1 className="text-4xl font-bold text-white mb-1">Putters Rewards</h1>
              <p className="text-yellow-300 text-lg">Enter your phone to earn Putters Points!</p>
              <p className="text-white/50 text-sm mt-2">Your number stays private — just for your rewards</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-yellow-300 mb-2">Phone Number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="(702) 000-0000"
                  value={formatPhoneInput(rawDigits)}
                  onChange={handlePhoneInput}
                  onKeyDown={(e) => handleKeyDown(e, handlePhoneNext)}
                  className="w-full px-4 py-4 text-2xl text-center rounded-xl border-2 border-yellow-400 bg-white/20 text-white placeholder-white/40 focus:border-yellow-300 focus:ring-2 focus:ring-yellow-200/40 focus:outline-none tracking-wider font-bold transition-all duration-200"
                  autoFocus
                />
              </div>

              {error && <ErrorMsg msg={error} />}

              <button
                onClick={handlePhoneNext}
                disabled={rawDigits.length < 10}
                className="w-full font-bold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 hover:from-yellow-300 hover:to-orange-400 hover:shadow-xl shadow-lg text-xl uppercase tracking-wide"
              >
                Continue →
              </button>

              <button
                onClick={() => navigate(returnTo)}
                className="w-full border-2 border-white/30 bg-white/10 text-white/70 font-semibold py-3 px-6 rounded-xl hover:border-yellow-400 hover:text-yellow-300 transition"
              >
                Skip for now
              </button>
            </div>

            <RewardsTeaserList />
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Name ───────────────────────────────────────────────
  if (step === 'name') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 flex items-center justify-center p-4 relative overflow-hidden">
        <BgStars />
        <div className="max-w-md w-full relative z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/30">
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">{existingProfile ? '👋' : '✨'}</div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {existingProfile ? `Welcome back!` : 'Create your profile'}
              </h2>
              {existingProfile ? (
                <p className="text-yellow-300">
                  {existingProfile.displayName} · <span className="font-bold">{existingProfile.points} PP</span>
                </p>
              ) : (
                <p className="text-yellow-300 text-sm">
                  You'll earn <strong>+20 Putters Points</strong> just for signing up! 🎉
                </p>
              )}
              <p className="text-white/40 text-xs mt-2">{storageService.maskedPhone(rawDigits)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-yellow-300 mb-2">
                  {existingProfile ? 'Your Name' : 'What should we call you?'}
                </label>
                <input
                  type="text"
                  placeholder="Name or nickname"
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); setError(''); }}
                  onKeyDown={(e) => handleKeyDown(e, handleLogin)}
                  maxLength={24}
                  className="w-full px-4 py-3 text-xl text-center rounded-xl border-2 border-yellow-400 bg-white/20 text-white placeholder-white/40 focus:border-yellow-300 focus:ring-2 focus:ring-yellow-200/40 focus:outline-none transition-all duration-200"
                  autoFocus
                />
              </div>

              {error && <ErrorMsg msg={error} />}

              <button
                onClick={handleLogin}
                disabled={loading || !displayName.trim()}
                className="w-full font-bold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-yellow-400 to-orange-500 text-purple-900 hover:from-yellow-300 hover:to-orange-400 hover:shadow-xl shadow-lg text-xl uppercase tracking-wide"
              >
                {loading ? 'Loading...' : existingProfile ? "Let's Play! 🎰" : 'Join Rewards 🎉'}
              </button>

              <button
                onClick={() => { setStep('phone'); setError(''); }}
                className="w-full border-2 border-white/30 bg-white/10 text-white/70 font-semibold py-2 px-6 rounded-xl hover:border-yellow-400 hover:text-yellow-300 transition text-sm"
              >
                ← Change number
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Done ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/30 text-center">
          <div className="text-6xl mb-4">{existingProfile ? '🎰' : '🎉'}</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {existingProfile ? `Welcome back, ${displayName}!` : `You're in, ${displayName}!`}
          </h2>
          {awarded && (
            <div className="bg-yellow-400/20 border-2 border-yellow-400 rounded-xl p-4 mt-4">
              <p className="text-yellow-300 font-bold text-lg">+{awarded.points} Putters Points! 🎁</p>
              <p className="text-white/70 text-sm">{awarded.label}</p>
            </div>
          )}
          <p className="text-white/60 text-sm mt-4">Redirecting you back...</p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function BgStars() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="absolute text-yellow-300 text-2xl opacity-20" style={{
          left: `${(i * 91 + 5) % 95}%`,
          top: `${(i * 67 + 11) % 90}%`,
          animationDelay: `${i * 0.4}s`
        }}>✦</div>
      ))}
    </div>
  );
}

function ErrorMsg({ msg }) {
  return (
    <div className="bg-red-900/40 border-2 border-red-500 text-red-300 px-4 py-3 rounded-xl flex items-center gap-2">
      <span>⚠️</span><span className="text-sm">{msg}</span>
    </div>
  );
}

function RewardsTeaserList() {
  return (
    <div className="mt-6 pt-6 border-t border-white/20">
      <p className="text-yellow-300 font-semibold text-sm text-center mb-3">🎁 Earn Putters Points & unlock perks:</p>
      <div className="space-y-2">
        {[
          { icon: '⛳', label: 'Free ball at Putters', pts: '75 PP' },
          { icon: '🍹', label: 'Free cocktail',         pts: '250 PP' },
          { icon: '🎉', label: 'VIP Night Package',     pts: '600 PP' },
        ].map(r => (
          <div key={r.label} className="flex justify-between text-sm text-white/70">
            <span>{r.icon} {r.label}</span>
            <span className="text-yellow-400 font-semibold">{r.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PhoneLogin;
