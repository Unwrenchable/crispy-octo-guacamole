# 🎮 Bar Trivia - Multiplayer Quiz Platform

A real-time multiplayer trivia quiz platform perfect for bar game nights, built with React, Node.js, and Socket.io.

## ✨ Features

- **Real-time multiplayer gameplay** using Socket.io
- **Team-based competition** instead of individual players
- **Host Dashboard** for TV/projector display
- **Mobile-friendly player interface** 
- **Progressive Web App (PWA)** - add to home screen for app-like experience
- **QR Code joining** for easy game access
- **Live leaderboards** with real-time scoring
- **Timed questions** with bonus points for speed
- **In-memory game state** (no database needed for MVP)
- **Completely free** to host and deploy

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- npm or yarn package manager

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd improved-enigma
   ```

2. **Start the backend server**
   ```bash
   cd backend
   npm install
   npm start
   ```
   Backend runs on `http://localhost:3001`

3. **Start the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend runs on `http://localhost:5173`

4. **Open your browser**
   - Host: Go to `http://localhost:5173` and create a game
   - Players: Go to `http://localhost:5173/join` or scan QR code

## 🎯 How to Play

### For Hosts:

1. **Create a Game**
   - Enter your name and click "Create Game"
   - You'll get a unique 4-digit PIN and QR code

2. **Add Questions**
   - Click "+ Add Question"
   - Enter question text, 4 answer options, and select the correct answer
   - Set time limit and category

3. **Wait for Teams**
   - Share the PIN or QR code with players
   - Watch as teams join the lobby

4. **Start the Game**
   - Click "Start Game" when ready
   - Control the game flow:
     - Show questions to players
     - Reveal answers when time is up
     - Progress through all questions
     - View final leaderboard

### For Players:

1. **Join a Game**
   - Enter the 4-digit PIN from your host
   - Choose your team name

2. **Answer Questions**
   - Read the question on your phone
   - Select your answer quickly (speed bonus!)
   - Wait for the host to reveal the answer

3. **Track Your Progress**
   - See your current score
   - View rankings after each question
   - Celebrate your victory at the end!

## 📱 Progressive Web App (PWA)

This app works as a PWA, meaning:
- Players can "Add to Home Screen" on their phones
- Works offline after first load
- App-like experience without app store downloads
- Fast loading and smooth performance

### How to Add to Home Screen:

**iOS (Safari):**
1. Tap the Share button
2. Scroll and tap "Add to Home Screen"
3. Tap "Add"

**Android (Chrome):**
1. Tap the menu (⋮)
2. Tap "Add to Home screen"
3. Tap "Add"

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18 with Vite
- React Router for navigation
- Socket.io Client for real-time communication
- Tailwind CSS for styling
- QR Code generation for easy joining
- Vite PWA Plugin for Progressive Web App functionality

**Backend:**
- Node.js with Express
- Socket.io for WebSocket connections
- UUID for game/team identification
- In-memory game state (Map structure)

### Project Structure

```
improved-enigma/
├── backend/
│   ├── server.js           # Main server with Socket.io
│   ├── package.json        # Backend dependencies
│   └── render.yaml         # Render.com deployment config
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Landing page
│   │   │   ├── HostLobby.jsx      # Host game setup
│   │   │   ├── HostGame.jsx       # Host game control
│   │   │   ├── PlayerJoin.jsx     # Player join page
│   │   │   └── PlayerGame.jsx     # Player game view
│   │   ├── services/
│   │   │   └── socket.js          # Socket.io service
│   │   ├── App.jsx                # Main app with routing
│   │   └── index.css              # Global styles
│   ├── package.json               # Frontend dependencies
│   ├── vite.config.js             # Vite + PWA config
│   └── vercel.json                # Vercel deployment config
│
└── README_TRIVIA.md               # This file
```

## 🚢 Deployment

### Backend (Render.com - Free)

1. **Create Render account** at [render.com](https://render.com)

2. **Create New Web Service**
   - Connect your GitHub repository
   - Select `backend` directory
   - Use these settings:
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Add environment variable: `CLIENT_URL` = your frontend URL

3. **Get your backend URL** (e.g., `https://your-app.onrender.com`)

### Frontend (Vercel - Free)

1. **Create Vercel account** at [vercel.com](https://vercel.com)

2. **Import your repository**
   - Select `frontend` directory
   - Framework Preset: Vite
   - Add environment variable:
     - `VITE_SOCKET_URL` = your backend URL from Render

3. **Deploy!**
   - Vercel will auto-deploy on every push
   - Get your frontend URL (e.g., `https://your-app.vercel.app`)

4. **Update backend CLIENT_URL**
   - Go back to Render
   - Update `CLIENT_URL` environment variable to your Vercel URL
   - Redeploy backend

### Alternative: Deploy Both on Render

You can also deploy both backend and frontend on Render.com's free tier.

## 🎨 Customization

### Adding More Questions

Currently, hosts add questions manually. You can integrate the Open Trivia DB API:

```javascript
// Example: Fetch questions from Open Trivia DB
const response = await fetch('https://opentdb.com/api.php?amount=10&type=multiple');
const data = await response.json();
```

### Changing Scoring

Edit the scoring logic in `backend/server.js`:

```javascript
submitAnswer(teamId, answer) {
  // Current: 100 points + 50 time bonus
  // Customize here!
  let points = 0;
  if (isCorrect) {
    points = 100;
    const timeBonus = Math.max(0, Math.floor(50 * (1 - answerTime / (question.timeLimit * 1000))));
    points += timeBonus;
  }
  // ...
}
```

### Styling

The app uses Tailwind CSS. Modify colors and styles in:
- Individual component files (`.jsx` files in `frontend/src/pages/`)
- Tailwind config: `frontend/tailwind.config.js`
- Global styles: `frontend/src/index.css`

## 🐛 Troubleshooting

### Players can't connect to the game

- Check that backend is running and accessible
- Verify CORS settings in `backend/server.js`
- Ensure `VITE_SOCKET_URL` in frontend matches backend URL

### PWA not updating

- Clear browser cache
- Uninstall and reinstall the PWA
- Check service worker in browser DevTools

### Socket connection issues

- Check browser console for errors
- Verify WebSocket support in your hosting environment
- Render.com free tier may sleep after inactivity (takes ~30 seconds to wake up)

## 📝 Future Enhancements

- [ ] Open Trivia DB API integration
- [ ] Image/media questions support
- [ ] Multiple game modes (buzzer-style, fastest finger, etc.)
- [ ] Persistent leaderboards across games
- [ ] Sound effects and animations
- [ ] Admin dashboard for managing questions
- [ ] Category selection before game starts
- [ ] Configurable scoring rules
- [ ] Team chat/reactions
- [ ] Export game results

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Better mobile UX
- Additional game modes
- Sound effects and animations
- Question database
- Analytics dashboard

## 📄 License

MIT License - Free to use and modify for your bar game nights!

## 🎉 Credits

Built following the principles from the QuizClash tutorial and adapted for bar game nights.

Perfect for bars, pubs, trivia nights, team building events, and parties!

---

**Have fun and may the best team win! 🏆**
