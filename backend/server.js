const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// In-memory storage for games
const games = new Map();

// Helper function to generate unique game PIN
function generateGamePin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Game state management
class Game {
  constructor(hostId, hostName) {
    this.id = uuidv4();
    this.pin = generateGamePin();
    this.hostId = hostId;
    this.hostName = hostName;
    this.teams = new Map();
    this.questions = [];
    this.currentQuestionIndex = -1;
    this.state = 'lobby'; // lobby, question, answer-reveal, ended
    this.timer = null;
    this.questionStartTime = null;
  }

  addTeam(teamId, teamName, socketId) {
    this.teams.set(teamId, {
      id: teamId,
      name: teamName,
      socketId: socketId,
      score: 0,
      answers: []
    });
  }

  removeTeam(teamId) {
    this.teams.delete(teamId);
  }

  addQuestion(question) {
    this.questions.push({
      id: uuidv4(),
      text: question.text,
      options: question.options,
      correctAnswer: question.correctAnswer,
      timeLimit: question.timeLimit || 30,
      category: question.category || 'General'
    });
  }

  getCurrentQuestion() {
    if (this.currentQuestionIndex >= 0 && this.currentQuestionIndex < this.questions.length) {
      const question = this.questions[this.currentQuestionIndex];
      // Return question without correct answer to players
      return {
        id: question.id,
        text: question.text,
        options: question.options,
        timeLimit: question.timeLimit,
        category: question.category,
        questionNumber: this.currentQuestionIndex + 1,
        totalQuestions: this.questions.length
      };
    }
    return null;
  }

  submitAnswer(teamId, answer) {
    const team = this.teams.get(teamId);
    if (!team) return false;

    const question = this.questions[this.currentQuestionIndex];
    if (!question) return false;

    const answerTime = Date.now() - this.questionStartTime;
    const isCorrect = answer === question.correctAnswer;
    
    // Score calculation: correct answer + time bonus
    let points = 0;
    if (isCorrect) {
      points = 100;
      // Time bonus: up to 50 extra points for quick answers
      const timeBonus = Math.max(0, Math.floor(50 * (1 - answerTime / (question.timeLimit * 1000))));
      points += timeBonus;
    }

    team.answers.push({
      questionId: question.id,
      answer: answer,
      isCorrect: isCorrect,
      points: points,
      time: answerTime
    });

    team.score += points;
    return { isCorrect, points };
  }

  getLeaderboard() {
    return Array.from(this.teams.values())
      .map(team => ({
        name: team.name,
        score: team.score,
        answersCount: team.answers.length
      }))
      .sort((a, b) => b.score - a.score);
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    this.state = 'question';
    this.questionStartTime = Date.now();
    return this.currentQuestionIndex < this.questions.length;
  }

  revealAnswer() {
    this.state = 'answer-reveal';
    const question = this.questions[this.currentQuestionIndex];
    return {
      correctAnswer: question.correctAnswer,
      leaderboard: this.getLeaderboard()
    };
  }

  endGame() {
    this.state = 'ended';
    return {
      finalLeaderboard: this.getLeaderboard(),
      totalQuestions: this.questions.length
    };
  }
}

// REST API endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', games: games.size });
});

app.post('/api/games/create', (req, res) => {
  const { hostName } = req.body;
  const hostId = uuidv4();
  const game = new Game(hostId, hostName);
  games.set(game.pin, game);
  
  console.log(`Game created: PIN ${game.pin} by ${hostName}`);
  
  res.json({
    gameId: game.id,
    pin: game.pin,
    hostId: hostId
  });
});

app.get('/api/games/:pin', (req, res) => {
  const { pin } = req.params;
  const game = games.get(pin);
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  
  res.json({
    pin: game.pin,
    state: game.state,
    teams: game.teams.size,
    questions: game.questions.length
  });
});

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Host creates game
  socket.on('host:create-game', (data, callback) => {
    const { hostName } = data;
    const hostId = uuidv4();
    const game = new Game(hostId, hostName);
    games.set(game.pin, game);
    
    socket.join(`game-${game.pin}`);
    socket.join(`host-${game.pin}`);
    
    console.log(`Game created: PIN ${game.pin} by ${hostName}`);
    
    callback({
      success: true,
      gameId: game.id,
      pin: game.pin,
      hostId: hostId
    });
  });

  // Team joins game
  socket.on('team:join', (data, callback) => {
    const { pin, teamName } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    if (game.state !== 'lobby') {
      return callback({ success: false, error: 'Game already started' });
    }
    
    const teamId = uuidv4();
    game.addTeam(teamId, teamName, socket.id);
    
    socket.join(`game-${pin}`);
    
    console.log(`Team "${teamName}" joined game ${pin}`);
    
    // Notify host about new team
    io.to(`host-${pin}`).emit('team:joined', {
      teamId: teamId,
      teamName: teamName,
      totalTeams: game.teams.size
    });
    
    callback({
      success: true,
      teamId: teamId,
      teamName: teamName,
      gameState: game.state
    });
  });

  // Host adds questions
  socket.on('host:add-question', (data, callback) => {
    const { pin, question } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    game.addQuestion(question);
    
    callback({
      success: true,
      totalQuestions: game.questions.length
    });
  });

  // Host starts game
  socket.on('host:start-game', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    if (game.questions.length === 0) {
      return callback({ success: false, error: 'No questions added' });
    }
    
    game.nextQuestion();
    const question = game.getCurrentQuestion();
    
    // Notify all players
    io.to(`game-${pin}`).emit('game:started', { question });
    
    console.log(`Game ${pin} started with ${game.questions.length} questions`);
    
    callback({ success: true });
  });

  // Host shows next question
  socket.on('host:next-question', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    const hasMore = game.nextQuestion();
    
    if (!hasMore) {
      const result = game.endGame();
      io.to(`game-${pin}`).emit('game:ended', result);
      return callback({ success: true, ended: true });
    }
    
    const question = game.getCurrentQuestion();
    io.to(`game-${pin}`).emit('question:new', { question });
    
    callback({ success: true, question });
  });

  // Team submits answer
  socket.on('team:submit-answer', (data, callback) => {
    const { pin, teamId, answer } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    if (game.state !== 'question') {
      return callback({ success: false, error: 'Not accepting answers' });
    }
    
    const result = game.submitAnswer(teamId, answer);
    
    if (!result) {
      return callback({ success: false, error: 'Invalid team or question' });
    }
    
    // Notify host
    io.to(`host-${pin}`).emit('answer:submitted', {
      teamId: teamId,
      answered: true
    });
    
    callback({
      success: true,
      submitted: true
    });
  });

  // Host reveals answer
  socket.on('host:reveal-answer', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    const result = game.revealAnswer();
    
    // Show results to everyone
    io.to(`game-${pin}`).emit('answer:revealed', result);
    
    callback({ success: true, ...result });
  });

  // Get current leaderboard
  socket.on('game:get-leaderboard', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    callback({
      success: true,
      leaderboard: game.getLeaderboard()
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Remove team from games if they disconnect
    games.forEach((game, pin) => {
      game.teams.forEach((team, teamId) => {
        if (team.socketId === socket.id) {
          game.removeTeam(teamId);
          io.to(`host-${pin}`).emit('team:left', {
            teamId: teamId,
            teamName: team.name,
            totalTeams: game.teams.size
          });
        }
      });
      
      // Clean up empty games
      if (game.teams.size === 0 && game.state === 'lobby') {
        games.delete(pin);
        console.log(`Empty game ${pin} removed`);
      }
    });
  });
});

// Cleanup old games periodically (after 2 hours)
setInterval(() => {
  const now = Date.now();
  games.forEach((game, pin) => {
    // Remove games that have been ended for more than 30 minutes
    if (game.state === 'ended') {
      games.delete(pin);
      console.log(`Ended game ${pin} cleaned up`);
    }
  });
}, 30 * 60 * 1000); // Every 30 minutes

server.listen(PORT, () => {
  console.log(`🎮 Bar Trivia Server running on port ${PORT}`);
  console.log(`Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});
