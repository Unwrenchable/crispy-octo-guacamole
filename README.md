# 🎮 Bar Games Night - Multiplayer Game Platform

A real-time multiplayer game platform perfect for bar game nights, built with React, Node.js, and Socket.io. Features multiple game modes, genres, and themes - your phone is your gamepad!

## ✨ Features

### 🎯 Multiple Game Modes
- **Classic Trivia** - Traditional quiz with 30-second timed questions
- **Buzzer Mode** - First to buzz in gets to answer (game show style)
- **Speed Round** - Fast-paced 15-second questions
- **Lightning Round** - Ultra-fast 10-second questions for maximum challenge!

### 🎲 Multiple Genres & Themes (200+ Questions!)
- **Mixed** - Questions from all categories
- **Sports** ⚽ - Basketball, football, tennis, and more (20 questions)
- **Movies** 🎬 - Film trivia and cinema knowledge (20 questions)
- **Music** 🎵 - Artists, albums, and music history (20 questions)
- **Science** 🔬 - Chemistry, physics, and biology (20 questions)
- **History** 📜 - World events and historical figures (20 questions)
- **Geography** 🌍 - Countries, capitals, and landmarks (20 questions)
- **Pop Culture** 📱 - Social media, trends, and entertainment (20 questions)
- **Food & Drink** 🍔 - Culinary knowledge and beverages (20 questions)
- **Technology** 💻 - Tech, programming, and innovation (20 questions)
- **Games** 🎮 - Video games and gaming culture (20 questions)

### 🌐 Open Trivia DB Integration
- **External Question API** - Load questions from Open Trivia Database
- **Unlimited variety** - Access thousands of additional questions
- **One-click loading** - Easy integration with existing game flow

### 📊 Player Stats & Achievements
- **Game History** - Track your last 50 games with detailed stats
- **Persistent Leaderboard** - All-time high scores across all players
- **Player Statistics** - Total games, wins, average score, win rate
- **7 Achievements** - Unlock special achievements:
  - 🏆 First Victory - Win your first game
  - ⚡ Speed Demon - Complete a speed or lightning round
  - 🎓 Trivia Master - Play 10 games
  - 💯 Perfect Score - Get all questions correct
  - 🦋 Social Butterfly - Play with 5+ teams
  - 🦉 Night Owl - Play after midnight
  - 🌟 Category Expert - Win in every category

### 📱 Phone-as-Gamepad
- **No Bluetooth needed** - Pure web-based, works on any device
- **QR Code joining** for instant access
- **Mobile-optimized** interface
- **Real-time updates** via WebSocket

### 🎪 Additional Features
- **Smart question tracking** - No repeats within a session
- **Custom questions** - Add your own questions
- **Team-based competition**
- **Host Dashboard** for TV/projector display
- **Live leaderboards** with real-time scoring
- **Time bonuses** for quick answers
- **Progressive Web App (PWA)** support
- **In-memory game state** (no database needed)
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
   - Enter your name
   - Select a game mode (Classic, Buzzer, or Speed Round)
   - Choose a genre/theme (or Mixed for variety)
   - Click "Create Game"

2. **Set Up Questions**
   - **Easy way**: Click "Load 10 Pre-Made Questions" for instant setup
   - **Custom way**: Add your own questions manually
   - You'll get a unique 4-digit PIN and QR code

3. **Wait for Teams**
   - Share the PIN or QR code with players
   - Watch as teams join the lobby on their phones

4. **Start the Game**
   - Click "Start Game" when ready
   - Control the game flow:
     - Questions appear on host screen and player phones
     - Reveal answers when time is up
     - View live leaderboard after each question
     - Progress to final results

### For Players:

1. **Join a Game**
   - Scan QR code OR enter the 4-digit PIN
   - Choose your team name
   - Your phone is now your gamepad!

2. **Play the Game**
   - **Classic Mode**: Select your answer before time runs out
   - **Buzzer Mode**: Hit the buzzer when you know the answer
   - **Speed Round**: Answer quickly for maximum points

3. **Track Your Score**
   - See if you're correct after each question
   - View your ranking on the leaderboard
   - Compete for the top spot!

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
- [x] Image/media questions support
- [ ] Multiple game modes (buzzer-style, fastest finger, etc.)
- [ ] Persistent leaderboards across games
- [x] Sound effects and animations
- [x] Admin dashboard for managing questions
- [ ] Category selection before game starts
- [x] Configurable scoring rules
- [x] Team chat/reactions
- [x] Export game results

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
