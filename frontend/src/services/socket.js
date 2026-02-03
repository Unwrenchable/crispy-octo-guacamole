import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to server');
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  // Host events
  createGame(hostName, gameMode, genre, callback) {
    this.socket.emit('host:create-game', { hostName, gameMode, genre }, callback);
  }

  loadQuestions(pin, count, callback) {
    this.socket.emit('host:load-questions', { pin, count }, callback);
  }

  loadAPIQuestions(pin, count, callback) {
    this.socket.emit('host:load-api-questions', { pin, count }, callback);
  }

  addQuestion(pin, question, callback) {
    this.socket.emit('host:add-question', { pin, question }, callback);
  }

  startGame(pin, callback) {
    this.socket.emit('host:start-game', { pin }, callback);
  }

  nextQuestion(pin, callback) {
    this.socket.emit('host:next-question', { pin }, callback);
  }

  revealAnswer(pin, callback) {
    this.socket.emit('host:reveal-answer', { pin }, callback);
  }

  // Buzzer mode
  activateBuzzer(pin, callback) {
    this.socket.emit('host:activate-buzzer', { pin }, callback);
  }

  clearBuzzer(pin, callback) {
    this.socket.emit('host:clear-buzzer', { pin }, callback);
  }

  teamBuzz(pin, teamId, callback) {
    this.socket.emit('team:buzz', { pin, teamId }, callback);
  }

  // Team events
  joinGame(pin, teamName, callback) {
    this.socket.emit('team:join', { pin, teamName }, callback);
  }

  submitAnswer(pin, teamId, answer, callback) {
    this.socket.emit('team:submit-answer', { pin, teamId, answer }, callback);
  }

  getLeaderboard(pin, callback) {
    this.socket.emit('game:get-leaderboard', { pin }, callback);
  }

  // Event listeners
  onTeamJoined(callback) {
    this.socket.on('team:joined', callback);
  }

  onTeamLeft(callback) {
    this.socket.on('team:left', callback);
  }

  onGameStarted(callback) {
    this.socket.on('game:started', callback);
  }

  onNewQuestion(callback) {
    this.socket.on('question:new', callback);
  }

  onAnswerRevealed(callback) {
    this.socket.on('answer:revealed', callback);
  }

  onGameEnded(callback) {
    this.socket.on('game:ended', callback);
  }

  onAnswerSubmitted(callback) {
    this.socket.on('answer:submitted', callback);
  }

  // Buzzer mode listeners
  onBuzzerActivated(callback) {
    this.socket.on('buzzer:activated', callback);
  }

  onTeamBuzzed(callback) {
    this.socket.on('team:buzzed', callback);
  }

  onBuzzerCleared(callback) {
    this.socket.on('buzzer:cleared', callback);
  }

  // Remove listeners
  removeListener(event, callback) {
    this.socket.off(event, callback);
  }
}

export default new SocketService();
