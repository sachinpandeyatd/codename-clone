import React, { useState, useEffect, useCallback } from 'react';
import { db, getRoomRef, getGameStateRef, getPlayersRef, getPlayerRef, update, set, remove } from '../firebase';
import { onValue } from "firebase/database";
import GameBoard from './GameBoard';
import Controls from './Controls';
import RoleSelector from './RoleSelector';
import GameOver from './GameOver';
import wordsData from '../words.json'; // Import the word list
import { get } from "firebase/database";

// Fisher-Yates shuffle algorithm
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function initializeGame(players) {
    const playerList = Object.values(players || {});
    if (playerList.length < 4) return null; // Need at least 4 players

    // Basic validation: Ensure at least one spymaster per team
    const redSpymaster = playerList.find(p => p.team === 'RED' && p.role === 'SPYMASTER');
    const blueSpymaster = playerList.find(p => p.team === 'BLUE' && p.role === 'SPYMASTER');
    const redGuesser = playerList.find(p => p.team === 'RED' && p.role === 'GUESSER');
    const blueGuesser = playerList.find(p => p.team === 'BLUE' && p.role === 'GUESSER');

    if (!redSpymaster || !blueSpymaster || !redGuesser || !blueGuesser) {
        alert("Each team needs at least one Spymaster and one Guesser to start.");
        return null;
    }

    const shuffledWords = shuffle([...wordsData]).slice(0, 25);
    const startingTeam = Math.random() < 0.5 ? 'RED' : 'BLUE';
    const redCardsCount = startingTeam === 'RED' ? 9 : 8;
    const blueCardsCount = startingTeam === 'BLUE' ? 9 : 8;
    const neutralCardsCount = 7;
    const assassinCardCount = 1;

    let types = [];
    for (let i = 0; i < redCardsCount; i++) types.push('RED');
    for (let i = 0; i < blueCardsCount; i++) types.push('BLUE');
    for (let i = 0; i < neutralCardsCount; i++) types.push('NEUTRAL');
    for (let i = 0; i < assassinCardCount; i++) types.push('ASSASSIN');

    const shuffledTypes = shuffle(types);

    const board = shuffledWords.map((word, index) => ({
        word: word,
        type: shuffledTypes[index],
        revealed: false,
        revealedBy: null // Store which team revealed it ('RED' or 'BLUE')
    }));

    return {
        board: board,
        turn: startingTeam,
        startingTeam: startingTeam,
        clue: { word: null, number: null, submittedBy: null },
        guessesMade: 0,
        guessesRemaining: null,
        score: {
            red: redCardsCount, // Store cards *remaining* for each team
            blue: blueCardsCount,
        },
        status: 'PLAYING', // LOBBY, PLAYING, RED_WON, BLUE_WON, ASSASSIN_HIT_RED, ASSASSIN_HIT_BLUE
        // Optional Timer State (if implemented)
        // timer: { startTime: null, duration: 60 }
    };
}


function Game({ roomId, playerId, playerName, navigate }) {
    const [gameState, setGameState] = useState(null);
    const [players, setPlayers] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showSpymasterView, setShowSpymasterView] = useState(false); // Client-side toggle

    const currentPlayer = players?.[playerId];
    const isSpymaster = currentPlayer?.role === 'SPYMASTER';
    const isGuesser = currentPlayer?.role === 'GUESSER';
    const isMyTurn = gameState?.status === 'PLAYING' && gameState?.turn === currentPlayer?.team;

    // Subscribe to game state and players
    useEffect(() => {
        const roomRef = getRoomRef(roomId);
        const gameStateRef = getGameStateRef(roomId);
        const playersRef = getPlayersRef(roomId);

        const unsubscribeGameState = onValue(gameStateRef, (snapshot) => {
            setGameState(snapshot.val());
            setLoading(false);
        }, (err) => {
            console.error("Firebase gameState read failed:", err);
            setError(`Failed to load game state for room ${roomId}. It might not exist or you lack permission.`);
            setLoading(false);
        });

        const unsubscribePlayers = onValue(playersRef, (snapshot) => {
            setPlayers(snapshot.val() || {}); // Ensure players is an object
        }, (err) => {
            console.error("Firebase players read failed:", err);
            setError("Failed to load player list.");
        });

        // Add player if they aren't listed (e.g., rejoining)
        const playerRef = getPlayerRef(roomId, playerId);
        get(playerRef).then(snapshot => {
            if (!snapshot.exists()) {
                set(playerRef, { id: playerId, name: playerName });
            } else {
                // Ensure name is up-to-date if changed in lobby
                if (snapshot.val()?.name !== playerName) {
                    update(playerRef, { name: playerName });
                }
            }
        });


        // Cleanup on unmount
        return () => {
            unsubscribeGameState();
            unsubscribePlayers();

            // Optional: Remove player if they leave the page?
            // Be careful with this - maybe only if they are the last player?
            // get(playersRef).then(snapshot => {
            //     const currentPlayers = snapshot.val();
            //     if (currentPlayers && Object.keys(currentPlayers).length === 1 && currentPlayers[playerId]) {
            //         remove(roomRef); // Remove entire room if last player leaves
            //     } else {
            //        remove(playerRef); // Remove just this player
            //     }
            // });
        };
    }, [roomId, playerId, playerName]); // Rerun if roomId or playerId changes


    const handleRoleChange = useCallback((team, role) => {
        if (!playerId || !roomId) return;
        const playerRef = getPlayerRef(roomId, playerId);

        // Create an updates object. Ensure 'role' is set to null if it's undefined/nullish.
        const updates = {};
        // You could also check if team is undefined, though less likely in this flow
        if (team !== undefined) {
            updates.team = team;
        }
        // This is the crucial part: convert undefined/null/'' etc. to null for Firebase
        updates.role = role || null;

        update(playerRef, updates)
            .catch(err => {
                 console.error("Error updating role/team:", err);
                 alert(`Failed to update team/role: ${err.message}`);
            });
    }, [roomId, playerId]);

    const handleStartGame = useCallback(() => {
        const newGameState = initializeGame(players);
        if (newGameState) {
            const gameStateRef = getGameStateRef(roomId);
            set(gameStateRef, newGameState)
                .catch(err => {
                    console.error("Error starting game:", err);
                    alert("Failed to start game.");
                });
        }
    }, [roomId, players]);

     const handleRestartGame = useCallback(() => {
        // Reset roles/teams but keep players
        const playerUpdates = {};
         Object.keys(players).forEach(pId => {
             playerUpdates[`${pId}/team`] = null;
             playerUpdates[`${pId}/role`] = null;
         });
         update(getPlayersRef(roomId), playerUpdates);

        // Reset game state to LOBBY
        update(getGameStateRef(roomId), { status: 'LOBBY', board: null, score: null, clue: null, turn: null })
            .catch(err => console.error("Error restarting game:", err));
    }, [roomId, players]);

    const handleClueSubmit = useCallback((clueWord, clueNumber) => {
        if (!isSpymaster || !isMyTurn || gameState.status !== 'PLAYING') return;

        const clueNum = parseInt(clueNumber, 10);
        if (!clueWord.trim() || isNaN(clueNum) || clueNum < 0) {
            alert("Invalid clue. Enter a word and a non-negative number.");
            return;
        }

        update(getGameStateRef(roomId), {
            clue: { word: clueWord.trim().toUpperCase(), number: clueNum, submittedBy: playerId },
            guessesMade: 0,
            guessesRemaining: clueNum === 0 ? 1 : clueNum + 1 // Allow 1 guess for 0 clue, else number + 1
        }).catch(err => console.error("Error submitting clue:", err));

    }, [roomId, gameState, isSpymaster, isMyTurn, playerId]);


    const handleCardClick = useCallback((cardIndex) => {
        if (!isGuesser || !isMyTurn || gameState.status !== 'PLAYING' || !gameState.clue?.word || gameState.guessesRemaining <= 0) {
            console.log("Cannot guess now:", { isGuesser, isMyTurn, status: gameState?.status, clue: gameState?.clue, guessesRemaining: gameState?.guessesRemaining });
            return; // Not allowed to guess
        }

        const card = gameState.board[cardIndex];
        if (card.revealed) return; // Already revealed

        const updates = {};
        const currentTeam = gameState.turn;
        const opponentTeam = currentTeam === 'RED' ? 'BLUE' : 'RED';
        let nextTurn = currentTeam;
        let gameEndStatus = null;
        let remainingGuesses = gameState.guessesRemaining - 1;
        let guessesMade = gameState.guessesMade + 1;

        // Reveal the card
        updates[`board/${cardIndex}/revealed`] = true;
        updates[`board/${cardIndex}/revealedBy`] = currentTeam;
        updates['guessesMade'] = guessesMade;

        // Update Score and Check Win/Loss/Turn End
        let newScore = { ...gameState.score };

        if (card.type === currentTeam) {
            newScore[currentTeam.toLowerCase()]--;
            updates['score'] = newScore;
            if (newScore[currentTeam.toLowerCase()] === 0) {
                gameEndStatus = `${currentTeam}_WON`;
            } else if (remainingGuesses === 0) {
                nextTurn = opponentTeam; // End turn if out of guesses
            }
            // else: continue guessing
        } else if (card.type === opponentTeam) {
            newScore[opponentTeam.toLowerCase()]--;
            updates['score'] = newScore;
            nextTurn = opponentTeam; // End turn
            if (newScore[opponentTeam.toLowerCase()] === 0) {
                gameEndStatus = `${opponentTeam}_WON`; // Opponent wins
            }
        } else if (card.type === 'NEUTRAL') {
            nextTurn = opponentTeam; // End turn
        } else if (card.type === 'ASSASSIN') {
            gameEndStatus = `ASSASSIN_HIT_${currentTeam}`; // Team that clicked loses
            nextTurn = null; // No next turn
        }

        // Apply game end status if applicable
        if (gameEndStatus) {
            updates['status'] = gameEndStatus;
            updates['clue'] = { word: null, number: null, submittedBy: null };
            updates['guessesRemaining'] = null;
            updates['turn'] = null;
        } else {
            // If turn changes, reset clue and guesses
            if (nextTurn !== currentTeam) {
                updates['turn'] = nextTurn;
                updates['clue'] = { word: null, number: null, submittedBy: null };
                updates['guessesRemaining'] = null;
                updates['guessesMade'] = 0; // Reset guesses made for next turn
            } else {
                 updates['guessesRemaining'] = remainingGuesses; // Just update remaining guesses
            }
        }

        // Perform the update
        update(getGameStateRef(roomId), updates)
            .catch(err => console.error("Error processing guess:", err));

    }, [roomId, gameState, isGuesser, isMyTurn, playerId]);


    const handleEndTurn = useCallback(() => {
         if (!isGuesser || !isMyTurn || gameState.status !== 'PLAYING' || !gameState.clue?.word) return;

         const opponentTeam = gameState.turn === 'RED' ? 'BLUE' : 'RED';
         update(getGameStateRef(roomId), {
             turn: opponentTeam,
             clue: { word: null, number: null, submittedBy: null },
             guessesRemaining: null,
             guessesMade: 0
         }).catch(err => console.error("Error ending turn:", err));
    }, [roomId, gameState, isGuesser, isMyTurn]);

    const handleLeaveRoom = () => {
        const playerRef = getPlayerRef(roomId, playerId);
        remove(playerRef).then(() => {
            navigate('/'); // Go back to lobby
        }).catch(err => console.error("Error leaving room:", err));
        // Consider logic to delete the room if it becomes empty
    };


    // --- Rendering Logic ---

    if (loading) return <div className="text-center text-xl font-semibold">Loading Game...</div>;
    if (error) return <div className="text-center text-red-600 bg-red-100 p-4 rounded border border-red-300">{error} <button onClick={() => navigate('/')} className="ml-4 px-2 py-1 bg-red-500 text-white rounded text-sm">Go Back</button></div>;
    if (!gameState) return <div className="text-center text-yellow-600">Waiting for game data...</div>; // Should be handled by loading/error

    const canStartGame = Object.values(players).length >= 4 &&
                         Object.values(players).some(p => p.team === 'RED' && p.role === 'SPYMASTER') &&
                         Object.values(players).some(p => p.team === 'BLUE' && p.role === 'SPYMASTER') &&
                         Object.values(players).some(p => p.team === 'RED' && p.role === 'GUESSER') &&
                         Object.values(players).some(p => p.team === 'BLUE' && p.role === 'GUESSER');


    // --- Render different states ---

    if (gameState.status === 'LOBBY') {
        return (
            <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-4 text-center">Game Lobby - Room Code: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{roomId}</span></h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <RoleSelector players={players} playerId={playerId} onRoleChange={handleRoleChange} />
                    <div className="bg-white p-6 rounded shadow">
                       <h3 className="text-lg font-semibold mb-3 border-b pb-2">Players in Room:</h3>
                        <ul className="space-y-2">
                            {Object.values(players).map(p => (
                                <li key={p.id} className={`flex justify-between items-center p-2 rounded ${p.id === playerId ? 'bg-blue-100' : ''}`}>
                                    <span className="font-medium">{p.name} {p.id === playerId ? '(You)' : ''} {p.isHost ? '👑' : ''}</span>
                                    <span className="text-sm text-gray-600">
                                        {p.team ? <span className={`font-bold ${p.team === 'RED' ? 'text-red-600' : 'text-blue-600'}`}>{p.team}</span> : 'No Team'}
                                        {' / '}
                                        {p.role ? p.role : 'No Role'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                         {currentPlayer?.isHost && (
                             <button
                                onClick={handleStartGame}
                                disabled={!canStartGame}
                                className={`mt-6 w-full font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out ${
                                    canStartGame
                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                    : 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                }`}
                            >
                                {canStartGame ? 'Start Game' : 'Need 1 Spymaster & 1 Guesser per team (min 4 players)'}
                            </button>
                         )}
                          {!currentPlayer?.isHost && !canStartGame && (
                              <p className="mt-6 text-center text-gray-500">Waiting for Host to start the game (requires valid team/role setup).</p>
                          )}
                           {!currentPlayer?.isHost && canStartGame && (
                              <p className="mt-6 text-center text-green-600 font-semibold">Ready to start! Waiting for Host.</p>
                           )}
                    </div>
                </div>
                 <button onClick={handleLeaveRoom} className="mt-8 block mx-auto bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                    Leave Room
                 </button>
            </div>
        );
    }

     if (gameState.status !== 'PLAYING') {
        return (
            <GameOver
                status={gameState.status}
                startingTeam={gameState.startingTeam}
                board={gameState.board}
                onRestart={handleRestartGame}
                onLeave={handleLeaveRoom}
                isHost={currentPlayer?.isHost}
            />
        );
    }

    // --- Render main game view ---
    return (
        <div className="flex flex-col h-full">
            <Controls
                gameState={gameState}
                currentPlayer={currentPlayer}
                players={players}
                isSpymaster={isSpymaster}
                isMyTurn={isMyTurn}
                showSpymasterView={showSpymasterView}
                onClueSubmit={handleClueSubmit}
                onEndTurn={handleEndTurn}
                onToggleSpymasterView={() => isSpymaster && setShowSpymasterView(!showSpymasterView)}
                roomId={roomId}
            />
            <GameBoard
                board={gameState.board}
                onCardClick={handleCardClick}
                isSpymaster={isSpymaster}
                showSpymasterView={showSpymasterView}
                isGuesser={isGuesser}
                canGuess={isMyTurn && isGuesser && !!gameState.clue?.word && gameState.guessesRemaining > 0}
                currentTurnTeam={gameState.turn} // Pass current turn team for highlighting
            />
             <button onClick={handleLeaveRoom} className="mt-8 block mx-auto bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                Leave Room
            </button>
            {/* Optional: Display player list during game */}
        </div>
    );
}

export default Game;