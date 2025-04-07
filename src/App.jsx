import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import Lobby from './components/Lobby';
import Game from './components/Game';
import { v4 as uuidv4 } from 'uuid';

// Simple persistent player ID using localStorage
function getPlayerId() {
  let playerId = localStorage.getItem('codenamesPlayerId');
  if (!playerId) {
    playerId = uuidv4();
    localStorage.setItem('codenamesPlayerId', playerId);
  }
  return playerId;
}

function App() {
  const [playerId] = useState(getPlayerId());
  const [playerName, setPlayerName] = useState(localStorage.getItem('codenamesPlayerName') || `Player_${playerId.substring(0, 4)}`);

  useEffect(() => {
      localStorage.setItem('codenamesPlayerName', playerName);
  }, [playerName]);

  return (
    <Router>
      <div className="container mx-auto p-4 min-h-screen flex flex-col">
        <header className="mb-4 text-center">
          <h1 className="text-4xl font-bold text-gray-700">Codenames Clone</h1>
        </header>
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Lobby playerId={playerId} playerName={playerName} setPlayerName={setPlayerName} />} />
            <Route path="/room/:roomId" element={<GameWrapper playerId={playerId} playerName={playerName} />} />
          </Routes>
        </main>
         <footer className="text-center text-gray-500 text-sm mt-4">
             Built as a demonstration. Inspired by Codenames.
         </footer>
      </div>
    </Router>
  );
}

// Wrapper to easily pass route params and navigate hook to Game component
function GameWrapper({ playerId, playerName }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  return <Game roomId={roomId} playerId={playerId} playerName={playerName} navigate={navigate} />;
}

export default App;