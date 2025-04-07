import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, ref, set, get, child } from '../firebase';
import { v4 as uuidv4 } from 'uuid';

function Lobby({ playerId, playerName, setPlayerName }) {
  const [roomIdToJoin, setRoomIdToJoin] = useState('');
  const navigate = useNavigate();

  const handleNameChange = (e) => {
    setPlayerName(e.target.value);
  };

  const createRoom = async () => {
    const newRoomId = uuidv4().substring(0, 6).toUpperCase(); // Simple room ID
    const roomRef = ref(db, `rooms/${newRoomId}`);

    try {
      await set(roomRef, {
        roomId: newRoomId,
        players: {
          [playerId]: { id: playerId, name: playerName, isHost: true } // Initial player is host
        },
        gameState: {
          status: 'LOBBY', // Initial status
          // Other game state fields will be initialized on game start
        }
      });
      navigate(`/room/${newRoomId}`);
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Failed to create room. Please try again.");
    }
  };

  const joinRoom = async () => {
    if (!roomIdToJoin.trim()) {
        alert("Please enter a Room Code.");
        return;
    }
    const normalizedRoomId = roomIdToJoin.trim().toUpperCase();
    const roomRef = ref(db, `rooms/${normalizedRoomId}`);

    try {
        const snapshot = await get(roomRef);
        if (snapshot.exists()) {
            // Room exists, add player (or update name if already joined)
            const playerRef = ref(db, `rooms/${normalizedRoomId}/players/${playerId}`);
            await set(playerRef, { id: playerId, name: playerName, isHost: false }); // Joining player is not host
            navigate(`/room/${normalizedRoomId}`);
        } else {
            alert("Room not found. Check the code and try again.");
        }
    } catch (error) {
        console.error("Error joining room:", error);
        alert("Failed to join room. Please try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded shadow-lg">
      <h2 className="text-2xl font-semibold mb-6 text-center">Join or Create a Game</h2>

      <div className="mb-4">
        <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-1">Your Name:</label>
        <input
          type="text"
          id="playerName"
          value={playerName}
          onChange={handleNameChange}
          maxLength="20"
          className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="mb-6">
        <button
          onClick={createRoom}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
        >
          Create New Room
        </button>
      </div>

      <div className="relative flex items-center mb-6">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
          <div className="flex-grow border-t border-gray-300"></div>
      </div>

      <div>
        <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 mb-1">Enter Room Code:</label>
        <div className="flex">
          <input
            type="text"
            id="roomCode"
            value={roomIdToJoin}
            onChange={(e) => setRoomIdToJoin(e.target.value)}
            maxLength="6"
            placeholder="e.g. ABCDEF"
            className="flex-grow px-3 py-2 border border-gray-300 rounded-l shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 uppercase"
          />
          <button
            onClick={joinRoom}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-r focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}

export default Lobby;