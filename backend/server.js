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

// Pre-loaded question banks by genre
const QUESTION_BANKS = {
  sports: [
    { text: "How many players are on a basketball team on the court?", options: ["4", "5", "6", "7"], correctAnswer: "5", category: "Sports" },
    { text: "Which country won the 2018 FIFA World Cup?", options: ["Brazil", "Germany", "France", "Argentina"], correctAnswer: "France", category: "Sports" },
    { text: "What is the diameter of a basketball hoop in inches?", options: ["16", "18", "20", "22"], correctAnswer: "18", category: "Sports" },
    { text: "In which sport would you perform a 'slam dunk'?", options: ["Volleyball", "Basketball", "Tennis", "Baseball"], correctAnswer: "Basketball", category: "Sports" },
    { text: "How many Grand Slam tournaments are there in tennis?", options: ["3", "4", "5", "6"], correctAnswer: "4", category: "Sports" }
  ],
  movies: [
    { text: "Who directed 'The Shawshank Redemption'?", options: ["Steven Spielberg", "Frank Darabont", "Martin Scorsese", "Quentin Tarantino"], correctAnswer: "Frank Darabont", category: "Movies" },
    { text: "What year was the first 'Star Wars' movie released?", options: ["1975", "1977", "1979", "1980"], correctAnswer: "1977", category: "Movies" },
    { text: "Which movie won the Oscar for Best Picture in 2020?", options: ["1917", "Joker", "Parasite", "Once Upon a Time in Hollywood"], correctAnswer: "Parasite", category: "Movies" },
    { text: "Who played Iron Man in the Marvel Cinematic Universe?", options: ["Chris Evans", "Robert Downey Jr.", "Chris Hemsworth", "Mark Ruffalo"], correctAnswer: "Robert Downey Jr.", category: "Movies" },
    { text: "What is the highest-grossing film of all time?", options: ["Titanic", "Avatar", "Avengers: Endgame", "Star Wars"], correctAnswer: "Avatar", category: "Movies" }
  ],
  music: [
    { text: "Who is known as the 'King of Pop'?", options: ["Elvis Presley", "Michael Jackson", "Prince", "Madonna"], correctAnswer: "Michael Jackson", category: "Music" },
    { text: "Which band released the album 'Abbey Road'?", options: ["The Rolling Stones", "The Beatles", "Led Zeppelin", "Pink Floyd"], correctAnswer: "The Beatles", category: "Music" },
    { text: "What instrument does Yo-Yo Ma play?", options: ["Violin", "Piano", "Cello", "Harp"], correctAnswer: "Cello", category: "Music" },
    { text: "Which artist has won the most Grammy Awards?", options: ["Beyoncé", "Michael Jackson", "Quincy Jones", "Georg Solti"], correctAnswer: "Beyoncé", category: "Music" },
    { text: "What year did MTV launch?", options: ["1979", "1981", "1983", "1985"], correctAnswer: "1981", category: "Music" }
  ],
  science: [
    { text: "What is the chemical symbol for gold?", options: ["Go", "Au", "Gd", "Ag"], correctAnswer: "Au", category: "Science" },
    { text: "How many planets are in our solar system?", options: ["7", "8", "9", "10"], correctAnswer: "8", category: "Science" },
    { text: "What is the speed of light?", options: ["299,792 km/s", "300,000 km/s", "250,000 km/s", "350,000 km/s"], correctAnswer: "299,792 km/s", category: "Science" },
    { text: "What is the largest organ in the human body?", options: ["Heart", "Brain", "Liver", "Skin"], correctAnswer: "Skin", category: "Science" },
    { text: "What gas do plants absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correctAnswer: "Carbon Dioxide", category: "Science" }
  ],
  history: [
    { text: "In what year did World War II end?", options: ["1943", "1944", "1945", "1946"], correctAnswer: "1945", category: "History" },
    { text: "Who was the first President of the United States?", options: ["Thomas Jefferson", "John Adams", "George Washington", "Benjamin Franklin"], correctAnswer: "George Washington", category: "History" },
    { text: "Which ancient wonder still stands today?", options: ["Hanging Gardens", "Colossus of Rhodes", "Great Pyramid of Giza", "Lighthouse of Alexandria"], correctAnswer: "Great Pyramid of Giza", category: "History" },
    { text: "What year did the Berlin Wall fall?", options: ["1987", "1988", "1989", "1990"], correctAnswer: "1989", category: "History" },
    { text: "Who painted the Mona Lisa?", options: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"], correctAnswer: "Leonardo da Vinci", category: "History" }
  ],
  geography: [
    { text: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Brisbane"], correctAnswer: "Canberra", category: "Geography" },
    { text: "Which river is the longest in the world?", options: ["Amazon", "Nile", "Yangtze", "Mississippi"], correctAnswer: "Nile", category: "Geography" },
    { text: "How many continents are there?", options: ["5", "6", "7", "8"], correctAnswer: "7", category: "Geography" },
    { text: "What is the smallest country in the world?", options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], correctAnswer: "Vatican City", category: "Geography" },
    { text: "Which desert is the largest in the world?", options: ["Sahara", "Arabian", "Gobi", "Antarctic"], correctAnswer: "Antarctic", category: "Geography" }
  ],
  "pop-culture": [
    { text: "What is the most-watched series on Netflix?", options: ["Stranger Things", "Squid Game", "Wednesday", "The Crown"], correctAnswer: "Squid Game", category: "Pop Culture" },
    { text: "Who is the author of Harry Potter?", options: ["J.R.R. Tolkien", "J.K. Rowling", "Stephen King", "George R.R. Martin"], correctAnswer: "J.K. Rowling", category: "Pop Culture" },
    { text: "What social media platform uses a bird as its logo?", options: ["Facebook", "Instagram", "Twitter", "Snapchat"], correctAnswer: "Twitter", category: "Pop Culture" },
    { text: "Which video game character is known for eating mushrooms?", options: ["Sonic", "Mario", "Link", "Pac-Man"], correctAnswer: "Mario", category: "Pop Culture" },
    { text: "What year was Facebook founded?", options: ["2002", "2004", "2006", "2008"], correctAnswer: "2004", category: "Pop Culture" }
  ],
  "food-drink": [
    { text: "What is the main ingredient in guacamole?", options: ["Tomato", "Avocado", "Pepper", "Onion"], correctAnswer: "Avocado", category: "Food & Drink" },
    { text: "Which country is the origin of the cocktail Mojito?", options: ["Mexico", "Cuba", "Brazil", "Spain"], correctAnswer: "Cuba", category: "Food & Drink" },
    { text: "What type of pasta is shaped like a butterfly?", options: ["Penne", "Rigatoni", "Farfalle", "Fusilli"], correctAnswer: "Farfalle", category: "Food & Drink" },
    { text: "Which fruit has the highest vitamin C content?", options: ["Orange", "Lemon", "Kiwi", "Guava"], correctAnswer: "Guava", category: "Food & Drink" },
    { text: "What is the main ingredient in Japanese miso soup?", options: ["Soy sauce", "Miso paste", "Rice", "Fish"], correctAnswer: "Miso paste", category: "Food & Drink" }
  ]
};

// Game state management
class Game {
  constructor(hostId, hostName, gameMode = 'classic', genre = 'mixed') {
    this.id = uuidv4();
    this.pin = generateGamePin();
    this.hostId = hostId;
    this.hostName = hostName;
    this.gameMode = gameMode; // classic, buzzer, speed-round
    this.genre = genre; // sports, movies, music, science, history, geography, pop-culture, food-drink, mixed
    this.teams = new Map();
    this.questions = [];
    this.currentQuestionIndex = -1;
    this.state = 'lobby'; // lobby, question, answer-reveal, ended, buzzer-active
    this.timer = null;
    this.questionStartTime = null;
    this.buzzerQueue = []; // For buzzer mode
    this.buzzedTeam = null; // Team that buzzed first
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

  // Load questions from pre-loaded bank
  loadQuestionsFromBank(count = 10) {
    let questionPool = [];
    
    if (this.genre === 'mixed') {
      // Mix questions from all genres
      Object.values(QUESTION_BANKS).forEach(bank => {
        questionPool = questionPool.concat(bank);
      });
    } else if (QUESTION_BANKS[this.genre]) {
      questionPool = [...QUESTION_BANKS[this.genre]];
    }

    // Shuffle and select questions
    const shuffled = questionPool.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    
    selected.forEach(q => {
      this.addQuestion({
        ...q,
        timeLimit: this.gameMode === 'speed-round' ? 15 : 30
      });
    });

    return this.questions.length;
  }

  // Buzzer mode methods
  handleBuzz(teamId) {
    if (this.state !== 'buzzer-active') return false;
    
    if (!this.buzzedTeam) {
      this.buzzedTeam = teamId;
      this.buzzerQueue.push({ teamId, time: Date.now() });
      return true;
    }
    return false;
  }

  clearBuzzer() {
    this.buzzedTeam = null;
    this.buzzerQueue = [];
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
        totalQuestions: this.questions.length,
        gameMode: this.gameMode
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
    const { hostName, gameMode = 'classic', genre = 'mixed' } = data;
    const hostId = uuidv4();
    const game = new Game(hostId, hostName, gameMode, genre);
    games.set(game.pin, game);
    
    socket.join(`game-${game.pin}`);
    socket.join(`host-${game.pin}`);
    
    console.log(`Game created: PIN ${game.pin} by ${hostName}, Mode: ${gameMode}, Genre: ${genre}`);
    
    callback({
      success: true,
      gameId: game.id,
      pin: game.pin,
      hostId: hostId,
      gameMode: gameMode,
      genre: genre
    });
  });

  // Host loads questions from bank
  socket.on('host:load-questions', (data, callback) => {
    const { pin, count = 10 } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    const questionsLoaded = game.loadQuestionsFromBank(count);
    
    console.log(`${questionsLoaded} questions loaded for game ${pin}`);
    
    callback({
      success: true,
      questionsCount: questionsLoaded
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

  // Buzzer mode: Team buzzes in
  socket.on('team:buzz', (data, callback) => {
    const { pin, teamId } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    if (game.gameMode !== 'buzzer') {
      return callback({ success: false, error: 'Not in buzzer mode' });
    }
    
    const buzzed = game.handleBuzz(teamId);
    
    if (buzzed) {
      const team = game.teams.get(teamId);
      // Notify everyone that this team buzzed first
      io.to(`game-${pin}`).emit('team:buzzed', {
        teamId: teamId,
        teamName: team.name
      });
      
      callback({ success: true, buzzedFirst: true });
    } else {
      callback({ success: false, buzzedFirst: false, message: 'Someone else buzzed first' });
    }
  });

  // Buzzer mode: Host activates buzzer
  socket.on('host:activate-buzzer', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    game.state = 'buzzer-active';
    game.clearBuzzer();
    
    io.to(`game-${pin}`).emit('buzzer:activated');
    
    callback({ success: true });
  });

  // Buzzer mode: Host clears buzzer
  socket.on('host:clear-buzzer', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    game.clearBuzzer();
    game.state = 'question';
    
    io.to(`game-${pin}`).emit('buzzer:cleared');
    
    callback({ success: true });
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
