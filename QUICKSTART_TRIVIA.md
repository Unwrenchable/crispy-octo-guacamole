# 🎮 Bar Trivia Platform - Quick Start Guide

## What is this?

A **real-time multiplayer trivia quiz platform** perfect for bar game nights, built with React, Node.js, and Socket.io. Players join via their phones, and the host controls the game on a TV/projector.

## ⚡ Quick Start (5 Minutes)

### 1. Install Node.js
- Download from [nodejs.org](https://nodejs.org) (version 16+)

### 2. Clone & Start
```bash
git clone <your-repo-url>
cd improved-enigma

# Option A: Use start script
./start-trivia.sh        # Mac/Linux
start-trivia.bat         # Windows

# Option B: Manual start
cd backend && npm install && npm start &
cd frontend && npm install && npm run dev
```

### 3. Play!
- **Host**: Open http://localhost:5173
- **Players**: Scan QR code or go to same URL and click "Join Game"

## 🎯 How to Play

### For the Host (Bar Staff/Organizer):
1. Open http://localhost:5173
2. Enter your name → Click "Create Game"
3. Display the QR code on TV/projector
4. Add questions (click "+ Add Question")
5. Wait for teams to join
6. Click "Start Game" when ready
7. Control game flow:
   - Questions appear on TV and player phones
   - Click "Reveal Answer" when time is up
   - Click "Next Question" to continue
   - View live leaderboard
   - Winner announced at the end

### For Players (Bar Patrons):
1. Scan QR code OR go to URL and enter PIN
2. Choose your team name
3. Wait in lobby until host starts
4. Answer questions on your phone
5. See if you're correct after each question
6. Track your score throughout the game
7. Celebrate if you win! 🏆

## 📱 Features

✅ **Works on phones** - No app download needed
✅ **QR code joining** - Easy access
✅ **Real-time** - Everyone sees updates instantly
✅ **Team-based** - Perfect for bars
✅ **Time bonuses** - Quick answers get more points
✅ **Progressive Web App** - Add to home screen
✅ **Free to host** - Zero cost to run

## 🚀 Deployment (Going Live)

### Frontend (Free on Vercel):
1. Push code to GitHub
2. Sign up at [vercel.com](https://vercel.com)
3. Import your repo → Select `frontend` folder
4. Add environment variable: `VITE_SOCKET_URL=<your-backend-url>`
5. Deploy! You get a URL like `your-app.vercel.app`

### Backend (Free on Render.com):
1. Sign up at [render.com](https://render.com)
2. Create New → Web Service
3. Connect GitHub → Select `backend` folder
4. Add environment variable: `CLIENT_URL=<your-frontend-url>`
5. Deploy! You get a URL like `your-app.onrender.com`

### Update Both:
- Update frontend `VITE_SOCKET_URL` with backend URL
- Update backend `CLIENT_URL` with frontend URL
- Redeploy both

## 🎨 Customization

### Change Colors
Edit `frontend/tailwind.config.js` and component files in `frontend/src/pages/`

### Change Scoring
Edit `backend/server.js` in the `submitAnswer()` function:
```javascript
let points = 0;
if (isCorrect) {
  points = 100;  // Change base points here
  const timeBonus = Math.max(0, Math.floor(50 * ...));  // Change time bonus here
  points += timeBonus;
}
```

### Add Open Trivia DB Integration
In `frontend/src/pages/HostLobby.jsx`, add:
```javascript
const fetchQuestions = async () => {
  const response = await fetch('https://opentdb.com/api.php?amount=10&type=multiple');
  const data = await response.json();
  // Parse and add questions
};
```

## 🐛 Troubleshooting

**Players can't connect:**
- Check both backend and frontend are running
- Verify firewall isn't blocking ports 3001/5173
- Check browser console for errors

**QR code not showing PIN:**
- Refresh the page
- Check browser console for Socket.io connection errors
- Ensure backend is running on port 3001

**Game PIN not working:**
- Make sure players enter the exact 4-digit PIN
- Check that game hasn't already started
- Try creating a new game

## 📞 Need Help?

- Check the full documentation: [README_TRIVIA.md](README_TRIVIA.md)
- Open an issue on GitHub
- Ensure you're running Node.js 16+

## 🎉 Have Fun!

Perfect for:
- Bar trivia nights
- Pub quizzes  
- Team building
- Family game nights
- Educational quizzes
- Party games

**May the best team win! 🏆**
