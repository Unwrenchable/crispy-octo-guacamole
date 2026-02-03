import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import HostLobby from './pages/HostLobby';
import HostGame from './pages/HostGame';
import PlayerJoin from './pages/PlayerJoin';
import PlayerGame from './pages/PlayerGame';
import PlayerStats from './pages/PlayerStats';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host/lobby" element={<HostLobby />} />
        <Route path="/host/game" element={<HostGame />} />
        <Route path="/join" element={<PlayerJoin />} />
        <Route path="/play" element={<PlayerGame />} />
        <Route path="/stats" element={<PlayerStats />} />
      </Routes>
    </Router>
  );
}

export default App;
