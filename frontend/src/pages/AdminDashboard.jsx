import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'custom_questions';
const UNLOCK_KEY = 'admin_unlocked';
const ADMIN_PIN = '1234';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getQuestions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQuestions(questions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
}

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const CATEGORIES = ['General', 'Sports', 'Movies', 'Music', 'Science', 'History', 'Geography', 'Pop Culture', 'Food & Drink', 'Technology', 'Games', 'Las Vegas'];

const emptyForm = {
  text: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  category: 'General',
  difficulty: 'medium',
  imageUrl: ''
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(UNLOCK_KEY) === 'true');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [questions, setQuestions] = useState(getQuestions);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterCategory, setFilterCategory] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    saveQuestions(questions);
  }, [questions]);

  const handleUnlock = () => {
    if (pinInput === ADMIN_PIN) {
      localStorage.setItem(UNLOCK_KEY, 'true');
      setUnlocked(true);
    } else {
      setPinError('Incorrect PIN. Try again.');
      setPinInput('');
    }
  };

  const handleLock = () => {
    localStorage.removeItem(UNLOCK_KEY);
    setUnlocked(false);
    setPinInput('');
  };

  const handleAddOrSave = () => {
    if (!form.text.trim() || form.options.some(o => !o.trim())) {
      alert('Please fill in the question and all 4 options.');
      return;
    }
    if (editingId) {
      setQuestions(prev => prev.map(q => q.id === editingId ? { ...form, id: editingId } : q));
      setEditingId(null);
    } else {
      setQuestions(prev => [...prev, { ...form, id: generateId() }]);
    }
    setForm(emptyForm);
    setShowForm(false);
  };

  const handleEdit = (q) => {
    setForm({ ...q });
    setEditingId(q.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this question?')) return;
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom-questions.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCancelForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  // Category breakdown
  const categoryBreakdown = questions.reduce((acc, q) => {
    acc[q.category] = (acc[q.category] || 0) + 1;
    return acc;
  }, {});

  // Filtered questions
  const filtered = questions.filter(q => {
    const matchCat = filterCategory === 'all' || q.category === filterCategory;
    const matchSearch = !search || q.text.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // ── PIN gate ──────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="pv-card p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold pv-title mb-2">Admin Dashboard</h1>
          <p className="text-sm mb-6" style={{ color: 'rgba(245,230,200,0.6)' }}>Enter the admin PIN to continue</p>
          <input
            type="password"
            placeholder="Enter PIN"
            value={pinInput}
            onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            className="pv-input mb-3 text-center text-2xl tracking-widest"
            maxLength={6}
          />
          {pinError && <p className="text-red-400 text-sm mb-3">{pinError}</p>}
          <button onClick={handleUnlock} className="pv-btn pv-btn-gold w-full mb-4">
            Unlock 🔓
          </button>
          <button onClick={() => navigate('/')} className="text-sm underline" style={{ color: 'rgba(212,160,23,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-5xl mx-auto">
        <div className="pv-card p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold pv-title">⚙️ Admin Dashboard</h1>
              <p className="text-sm mt-1" style={{ color: 'rgba(245,230,200,0.55)' }}>Manage custom question banks</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <span className="pv-badge">{questions.length} Questions</span>
              <button onClick={handleExportJSON} className="pv-btn pv-btn-gold text-sm py-2 px-4">
                📋 Export JSON
              </button>
              <button onClick={handleLock} className="pv-btn text-sm py-2 px-4" style={{ background: 'rgba(255,50,50,0.15)', border: '1px solid rgba(255,100,100,0.3)', color: '#ff9999' }}>
                🔒 Lock
              </button>
              <button onClick={() => navigate('/')} className="pv-btn text-sm py-2 px-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(245,230,200,0.7)' }}>
                ← Home
              </button>
            </div>
          </div>

          {/* Category breakdown */}
          {Object.keys(categoryBreakdown).length > 0 && (
            <div className="pv-felt-section p-4 mb-6">
              <h2 className="font-semibold mb-3" style={{ color: '#f5e6c8' }}>Category Breakdown</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(categoryBreakdown).map(([cat, count]) => (
                  <span key={cat} className="pv-badge" style={{ cursor: 'pointer' }} onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}>
                    {cat}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Add/Edit Form */}
          <div className="mb-6">
            {!showForm ? (
              <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} className="pv-btn pv-btn-green w-full text-lg">
                + Add Question
              </button>
            ) : (
              <div className="pv-felt-section p-5">
                <h2 className="text-xl font-bold mb-4" style={{ color: '#f5e6c8' }}>
                  {editingId ? '✏️ Edit Question' : '➕ Add New Question'}
                </h2>

                {/* Question Text */}
                <textarea
                  placeholder="Question text *"
                  value={form.text}
                  onChange={(e) => setForm(f => ({ ...f, text: e.target.value }))}
                  className="pv-input mb-3 resize-none"
                  rows={3}
                />

                {/* Options */}
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-semibold" style={{ color: 'rgba(212,160,23,0.85)' }}>Options (select the correct answer with the radio button)</p>
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={form.correctAnswer === i}
                        onChange={() => setForm(f => ({ ...f, correctAnswer: i }))}
                        className="w-4 h-4 accent-amber-500 cursor-pointer"
                      />
                      <span className="font-bold text-amber-400 w-5">{String.fromCharCode(65 + i)}.</span>
                      <input
                        type="text"
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const opts = [...form.options];
                          opts[i] = e.target.value;
                          setForm(f => ({ ...f, options: opts }));
                        }}
                        className="pv-input flex-1"
                      />
                    </div>
                  ))}
                </div>

                {/* Category & Difficulty */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'rgba(212,160,23,0.85)' }}>Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                      className="pv-input"
                      style={{ color: '#f5e6c8' }}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ color: 'rgba(212,160,23,0.85)' }}>Difficulty</label>
                    <select
                      value={form.difficulty}
                      onChange={(e) => setForm(f => ({ ...f, difficulty: e.target.value }))}
                      className="pv-input"
                      style={{ color: '#f5e6c8' }}
                    >
                      {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                {/* Image URL */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-1" style={{ color: 'rgba(212,160,23,0.85)' }}>Image URL (optional)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={form.imageUrl}
                    onChange={(e) => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                    className="pv-input"
                  />
                  {form.imageUrl && (
                    <img src={form.imageUrl} alt="Preview" className="mt-2 max-h-24 object-contain rounded-lg" onError={(e) => { e.target.style.display = 'none'; }} />
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={handleAddOrSave} className="pv-btn pv-btn-gold flex-1">
                    {editingId ? '💾 Save Changes' : '✅ Add Question'}
                  </button>
                  <button onClick={handleCancelForm} className="pv-btn flex-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search & Filter */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <input
              type="text"
              placeholder="🔍 Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pv-input flex-1"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="pv-input"
              style={{ color: '#f5e6c8' }}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Questions Table */}
          {filtered.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'rgba(245,230,200,0.35)' }}>
              <div className="text-4xl mb-3">📝</div>
              <p>{questions.length === 0 ? 'No custom questions yet. Add your first one!' : 'No questions match your search.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((q, idx) => (
                <div key={q.id} className="pv-felt-section p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="pv-badge text-xs">{q.category}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{
                          background: q.difficulty === 'easy' ? 'rgba(34,197,94,0.2)' : q.difficulty === 'hard' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                          color: q.difficulty === 'easy' ? '#4ade80' : q.difficulty === 'hard' ? '#f87171' : '#fbbf24',
                          border: `1px solid ${q.difficulty === 'easy' ? 'rgba(34,197,94,0.3)' : q.difficulty === 'hard' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`
                        }}>
                          {q.difficulty}
                        </span>
                      </div>
                      <p className="font-semibold mb-2" style={{ color: '#f5e6c8' }}>
                        {idx + 1}. {q.text}
                      </p>
                      {q.imageUrl && (
                        <img src={q.imageUrl} alt="" className="max-h-16 object-contain rounded mb-2" onError={(e) => { e.target.style.display = 'none'; }} />
                      )}
                      <div className="grid grid-cols-2 gap-1">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`text-sm px-2 py-1 rounded ${i === q.correctAnswer ? 'font-bold' : ''}`} style={{
                            background: i === q.correctAnswer ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                            color: i === q.correctAnswer ? '#4ade80' : 'rgba(245,230,200,0.6)',
                            border: `1px solid ${i === q.correctAnswer ? 'rgba(34,197,94,0.3)' : 'transparent'}`
                          }}>
                            {String.fromCharCode(65 + i)}. {opt} {i === q.correctAnswer && '✓'}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => handleEdit(q)} className="pv-btn pv-btn-gold text-xs py-1 px-3">✏️ Edit</button>
                      <button onClick={() => handleDelete(q.id)} className="pv-btn text-xs py-1 px-3" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
