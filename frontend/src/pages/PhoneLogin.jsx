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
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <BgStars />
        <div className="max-w-md w-full relative z-10">
          <div className="pv-card p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-3 pv-flicker">🎱</div>
              <h1 className="text-4xl font-bold mb-1 pv-title">Putters Rewards</h1>
              <p className="text-lg mt-3" style={{color:'rgba(212,160,23,0.85)'}}>Enter your phone to earn Putters Points!</p>
              <p className="text-sm mt-2" style={{color:'rgba(245,230,200,0.4)'}}>Your number stays private — just for your rewards</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{color:'rgba(212,160,23,0.85)'}}>Phone Number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="(702) 000-0000"
                  value={formatPhoneInput(rawDigits)}
                  onChange={handlePhoneInput}
                  onKeyDown={(e) => handleKeyDown(e, handlePhoneNext)}
                  className="pv-input pv-input-pin"
                  autoFocus
                />
              </div>

              {error && <ErrorMsg msg={error} />}

              <button
                onClick={handlePhoneNext}
                disabled={rawDigits.length < 10}
                className="pv-btn pv-btn-gold w-full text-xl"
              >
                Continue →
              </button>

              <button
                onClick={() => navigate(returnTo)}
                className="pv-btn pv-btn-green w-full"
                style={{fontSize:'0.95rem', padding:'12px'}}
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
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <BgStars />
        <div className="max-w-md w-full relative z-10">
          <div className="pv-card p-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">{existingProfile ? '👋' : '✨'}</div>
              <h2 className="text-3xl font-bold mb-1" style={{color:'#f5e6c8'}}>
                {existingProfile ? `Welcome back!` : 'Create your profile'}
              </h2>
              {existingProfile ? (
                <p style={{color:'rgba(212,160,23,0.85)'}}>
                  {existingProfile.displayName} · <span className="font-bold">{existingProfile.points} PP</span>
                </p>
              ) : (
                <p className="text-sm" style={{color:'rgba(212,160,23,0.85)'}}>
                  You'll earn <strong>+20 Putters Points</strong> just for signing up! 🎉
                </p>
              )}
              <p className="text-xs mt-2" style={{color:'rgba(245,230,200,0.35)'}}>{storageService.maskedPhone(rawDigits)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{color:'rgba(212,160,23,0.85)'}}>
                  {existingProfile ? 'Your Name' : 'What should we call you?'}
                </label>
                <input
                  type="text"
                  placeholder="Name or nickname"
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); setError(''); }}
                  onKeyDown={(e) => handleKeyDown(e, handleLogin)}
                  maxLength={24}
                  className="pv-input text-xl text-center"
                  autoFocus
                />
              </div>

              {error && <ErrorMsg msg={error} />}

              <button
                onClick={handleLogin}
                disabled={loading || !displayName.trim()}
                className="pv-btn pv-btn-gold w-full text-xl"
              >
                {loading ? 'Loading...' : existingProfile ? "Let's Play! 🎱" : 'Join Rewards 🎉'}
              </button>

              <button
                onClick={() => { setStep('phone'); setError(''); }}
                className="pv-btn pv-btn-green w-full"
                style={{fontSize:'0.9rem', padding:'10px'}}
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="pv-card p-8 text-center">
          <div className="text-6xl mb-4 pv-pop-in">{existingProfile ? '🎱' : '🎉'}</div>
          <h2 className="text-3xl font-bold mb-2" style={{color:'#f5e6c8'}}>
            {existingProfile ? `Welcome back, ${displayName}!` : `You're in, ${displayName}!`}
          </h2>
          {awarded && (
            <div className="pv-points-box p-4 mt-4">
              <p className="font-bold text-lg pv-score">+{awarded.points} Putters Points! 🎁</p>
              <p className="text-sm mt-1" style={{color:'rgba(245,230,200,0.6)'}}>{awarded.label}</p>
            </div>
          )}
          <p className="text-sm mt-4" style={{color:'rgba(245,230,200,0.45)'}}>Redirecting you back...</p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function BgStars() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{zIndex:0}}>
      {[...Array(10)].map((_, i) => (
        <div key={i} className="absolute" style={{
          color: 'rgba(212,160,23,0.12)',
          fontSize: '1.5rem',
          left: `${(i * 91 + 5) % 95}%`,
          top: `${(i * 67 + 11) % 90}%`,
          animation: 'pulse 3s ease-in-out infinite',
          animationDelay: `${i * 0.4}s`
        }}>✦</div>
      ))}
    </div>
  );
}

function ErrorMsg({ msg }) {
  return (
    <div style={{background:'rgba(127,0,0,0.35)', border:'2px solid rgba(239,68,68,0.7)', borderRadius:'12px', padding:'12px 16px', display:'flex', alignItems:'center', gap:'8px'}}>
      <span>⚠️</span><span style={{fontSize:'0.875rem', color:'#fca5a5'}}>{msg}</span>
    </div>
  );
}

function RewardsTeaserList() {
  return (
    <div style={{marginTop:'24px', paddingTop:'24px', borderTop:'1px solid rgba(212,160,23,0.2)'}}>
      <p className="text-sm text-center font-semibold mb-3" style={{color:'rgba(212,160,23,0.85)'}}>🎁 Earn Putters Points &amp; unlock perks:</p>
      <div className="space-y-2">
        {[
          { icon: '🎱', label: 'Free pool game at Putters', pts: '75 PP' },
          { icon: '🍹', label: 'Free cocktail',              pts: '250 PP' },
          { icon: '🎉', label: 'VIP Night Package',          pts: '600 PP' },
        ].map(r => (
          <div key={r.label} style={{display:'flex', justifyContent:'space-between', fontSize:'0.875rem', color:'rgba(245,230,200,0.55)'}}>
            <span>{r.icon} {r.label}</span>
            <span style={{color:'rgba(212,160,23,0.85)', fontWeight:700}}>{r.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PhoneLogin;
