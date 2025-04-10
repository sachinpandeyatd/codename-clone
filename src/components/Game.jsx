import React, { useState, useEffect, useCallback } from 'react';
import { db, getRoomRef, getGameStateRef, getPlayersRef, getPlayerRef, update, set, remove, get, child, serverTimestamp, push, getLogRef } from '../firebase'; // Added push, serverTimestamp, getLogRef
import { onValue } from "firebase/database";
import GameBoard from './GameBoard';
import Controls from './Controls';
import RoleSelector from './RoleSelector';
import GameOver from './GameOver';
import ActionLog from './ActionLog';
import wordsData from '../words.json';
import { HandRaisedIcon } from '@heroicons/react/24/solid';
import TeamPanel from './TeamPanel';

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

// Updated Initialization Function
function initializeGame(players) {
    const playerList = Object.values(players || {});
    if (playerList.length < 4) return null;

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

    let types = [];
    for (let i = 0; i < redCardsCount; i++) types.push('RED');
    for (let i = 0; i < blueCardsCount; i++) types.push('BLUE');
    for (let i = 0; i < 7; i++) types.push('NEUTRAL');
    types.push('ASSASSIN');

    const shuffledTypes = shuffle(types);

    const board = shuffledWords.map((word, index) => ({
        word: word,
        type: shuffledTypes[index],
        revealed: false,
        revealedBy: null
    }));

    // Initial log entry
    const startingLog = {
        timestamp: serverTimestamp(), // Use server time
        type: 'START',
        text: `🆕 Game started. ${startingTeam} team goes first.`,
    };

    return {
        board: board,
        turn: startingTeam,
        startingTeam: startingTeam,
        clue: { word: null, number: null, submittedBy: null },
        guessesMade: 0,
        guessesRemaining: null,
        score: {
            red: redCardsCount,
            blue: blueCardsCount,
        },
        status: 'PLAYING',
        votes: {}, // Initialize votes
        logEntries: [startingLog], // Initialize log entries array
    };
}


function Game({ roomId, playerId, playerName, navigate }) {
    const [gameState, setGameState] = useState(null);
    const [players, setPlayers] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showSpymasterView, setShowSpymasterView] = useState(false);

    const currentPlayer = players?.[playerId];
    const isSpymaster = currentPlayer?.role === 'SPYMASTER';
    const isGuesser = currentPlayer?.role === 'GUESSER';
    // Derived state: Recalculated on each render based on current gameState and currentPlayer
    const isMyTurn = gameState?.status === 'PLAYING' && gameState?.turn === currentPlayer?.team;

    // --- Helper Function to Add Log Entries ---
    const addLogEntry = useCallback((roomIdForLog, type, text) => {
        if (!roomIdForLog) {
            console.error("Cannot add log entry: roomId is missing.");
            return;
        }
        const logRef = getLogRef(roomIdForLog);
        const newLogEntry = {
            timestamp: serverTimestamp(),
            type: type,
            text: text,
        };
        // Use push to generate a unique key and add to the list
        push(logRef, newLogEntry)
            .catch(err => console.error("Failed to add log entry:", err));
    }, []); // This helper doesn't depend on component state directly, only args


    // Subscribe to game state and players
    useEffect(() => {
        const gameStateRef = getGameStateRef(roomId);
        const playersRef = getPlayersRef(roomId);

        const unsubscribeGameState = onValue(gameStateRef, (snapshot) => {
            const data = snapshot.val();
            // Convert logEntries object from Firebase back to array if needed
            if (data && data.logEntries && typeof data.logEntries === 'object' && !Array.isArray(data.logEntries)) {
                 data.logEntries = Object.entries(data.logEntries).map(([key, value]) => ({ ...value, key })); // Add key if needed
            }
            setGameState(data);
            setLoading(false);
        }, (err) => {
            console.error("Firebase gameState read failed:", err);
            setError(`Failed to load game state for room ${roomId}.`);
            setLoading(false);
        });

        const unsubscribePlayers = onValue(playersRef, (snapshot) => {
            setPlayers(snapshot.val() || {});
        }, (err) => {
            console.error("Firebase players read failed:", err);
            setError("Failed to load player list.");
        });

        // Add/update player on join/rejoin
        const playerRef = getPlayerRef(roomId, playerId);
        get(playerRef).then(snapshot => {
            if (!snapshot.exists()) {
                set(playerRef, { id: playerId, name: playerName });
            } else if (snapshot.val()?.name !== playerName) {
                update(playerRef, { name: playerName });
            }
        });

        return () => {
            unsubscribeGameState();
            unsubscribePlayers();
            // Optional: Cleanup logic if needed
        };
    }, [roomId, playerId, playerName]); // Dependencies for subscriptions


    const handleRoleChange = useCallback((team, role) => {
        if (!playerId || !roomId) return;
        const playerRef = getPlayerRef(roomId, playerId);
        const updates = { team: team || null, role: role || null };
        update(playerRef, updates)
            .catch(err => console.error("Error updating role/team:", err));
    }, [roomId, playerId]);

    const handleStartGame = useCallback(() => {
        const newGameState = initializeGame(players); // Includes starting log
        if (newGameState) {
            const gameStateRef = getGameStateRef(roomId);
            set(gameStateRef, newGameState)
                // No separate log needed here anymore
                .catch(err => {
                    console.error("Error starting game:", err);
                    alert("Failed to start game.");
                });
        }
    }, [roomId, players]); // Removed addLogEntry dependency

     const handleRestartGame = useCallback(() => {
        const playerUpdates = {};
         Object.keys(players).forEach(pId => {
             playerUpdates[`${pId}/team`] = null;
             playerUpdates[`${pId}/role`] = null;
         });
         update(getPlayersRef(roomId), playerUpdates);

        // Reset game state to LOBBY, clearing logs
        update(getGameStateRef(roomId), { status: 'LOBBY', board: null, score: null, clue: null, turn: null, votes: null, logEntries: null }) // Explicitly clear logs
             .then(() => {
                // Optional: Log after clear if needed, but might vanish on screen change
                // addLogEntry(roomId, 'RESTART', '🔁 Game settings reset.');
             })
             .catch(err => console.error("Error restarting game:", err));
    }, [roomId, players]); // Removed addLogEntry dependency

    const handleClueSubmit = useCallback((clueWord, clueNumber) => {
        console.log("--- Debugging Clue Submit Validation ---");
        console.log("Current Player ID:", playerId);
        console.log("Current Player Object:", currentPlayer);
        console.log("Is Spymaster?", isSpymaster);
        console.log("Is My Turn?", isMyTurn);
        console.log("Game State Object:", gameState);
        console.log("Game Status:", gameState?.status);
        console.log("Current Turn:", gameState?.turn);
        console.log("My Team:", currentPlayer?.team);
        console.log("--- End Debugging ---");

        if (!isSpymaster || !isMyTurn || gameState?.status !== 'PLAYING') {
            console.warn("Clue submission blocked: Not spymaster's turn or invalid state."); return;
        }
        const clueNum = parseInt(clueNumber, 10);
        const trimmedClueWord = clueWord.trim(); // Trim here
        if (!trimmedClueWord || isNaN(clueNum) || clueNum < 0) {
            console.warn("Clue submission blocked: Invalid input."); alert("Invalid clue. Enter clue word(s) and a non-negative number."); return;
        }

        const gameStateRef = getGameStateRef(roomId);
        const clueText = trimmedClueWord.toUpperCase(); // Use trimmed version for update/log

        const updates = {
            clue: { word: clueText, number: clueNum, submittedBy: playerId },
            guessesMade: 0,
            guessesRemaining: clueNum === 0 ? 1 : clueNum + 1,
            votes: null // Clear votes
        };
        console.log("Attempting to update Firebase gameState with:", updates);

        update(gameStateRef, updates)
            .then(() => {
                console.log("Firebase gameState update successful for clue submission.");
                const playerName = currentPlayer?.name || 'Spymaster';
                addLogEntry(roomId, 'CLUE', `🔍 ${playerName} gave clue: "${clueText} (${clueNum})"`);
            })
            .catch(err => {
                console.error("!!!!!!!! Firebase clue update FAILED: !!!!!!!!", err);
                alert(`Failed to submit clue. Check console for error. (${err.message})`);
            });

    }, [roomId, playerId, gameState, currentPlayer, isSpymaster, isMyTurn, addLogEntry]); // Added gameState, currentPlayer, isSpymaster, isMyTurn, addLogEntry


    const handleVote = useCallback((cardIndex) => {
        if (!isGuesser || !isMyTurn || gameState?.status !== 'PLAYING' || !gameState?.clue?.word) {
             return;
        }
        const card = gameState?.board?.[cardIndex];
        if (!card || card.revealed) return;

        const currentVotesForCard = gameState.votes?.[cardIndex] || [];
        const playerIndexInVotes = currentVotesForCard.indexOf(playerId);
        let newVotesForCard;
        let isAddingVote = false;

        if (playerIndexInVotes > -1) {
            newVotesForCard = currentVotesForCard.filter(id => id !== playerId);
        } else {
            newVotesForCard = [...currentVotesForCard, playerId];
            isAddingVote = true;
        }

        const voteUpdate = {};
        voteUpdate[`votes/${cardIndex}`] = newVotesForCard.length > 0 ? newVotesForCard : null;

        update(getGameStateRef(roomId), voteUpdate)
             .then(() => {
                 if (isAddingVote) {
                     const playerName = currentPlayer?.name || 'Guesser';
                     addLogEntry(roomId, 'VOTE', `🗳️ ${playerName} voted for "${card.word}"`);
                 }
             })
            .catch(err => console.error("Error updating votes:", err));

    }, [roomId, gameState, isGuesser, isMyTurn, playerId, currentPlayer, addLogEntry]); // Added gameState, currentPlayer, addLogEntry


    const processConfirmedGuess = useCallback((cardIndex) => {
        const card = gameState?.board?.[cardIndex];
        if (!card || card.revealed || gameState?.status !== 'PLAYING' || !currentPlayer || !gameState.turn) return; // Added null checks

        const updates = {};
        const currentTeam = gameState.turn;
        const opponentTeam = currentTeam === 'RED' ? 'BLUE' : 'RED';
        let nextTurn = currentTeam;
        let gameEndStatus = null;
        let remainingGuesses = (gameState.guessesRemaining ?? 0) - 1;
        let guessesMade = (gameState.guessesMade ?? 0) + 1;

        updates[`board/${cardIndex}/revealed`] = true;
        updates[`board/${cardIndex}/revealedBy`] = currentTeam;
        updates['guessesMade'] = guessesMade;
        updates['votes'] = null; // Clear all votes after confirmation

        let revealLogText = '';
        const guesserName = currentPlayer?.name || 'Guesser';
        const cardWord = card.word;
        const cardType = card.type;

        let newScore = { ...(gameState.score || { red: 0, blue: 0 }) }; // Handle case where score might be null temporarily

        if (cardType === currentTeam) {
            newScore[currentTeam.toLowerCase()]--;
            updates['score'] = newScore;
            revealLogText = `🎯 ${guesserName} selected "${cardWord}" - Correct! (${currentTeam})`;
            if (newScore[currentTeam.toLowerCase()] <= 0) {
                gameEndStatus = `${currentTeam}_WON`;
                revealLogText += `. ${currentTeam} team wins!`;
            } else if (remainingGuesses <= 0) {
                nextTurn = opponentTeam;
                revealLogText += `. Turn passes to ${opponentTeam}.`;
            }
        } else if (cardType === opponentTeam) {
            newScore[opponentTeam.toLowerCase()]--;
            updates['score'] = newScore;
            revealLogText = `😩 ${guesserName} selected "${cardWord}" - Opponent's Agent! (${opponentTeam})`;
            nextTurn = opponentTeam;
            revealLogText += `. Turn passes to ${opponentTeam}.`;
            if (newScore[opponentTeam.toLowerCase()] <= 0) {
                gameEndStatus = `${opponentTeam}_WON`;
                 revealLogText += ` ${opponentTeam} team wins!`;
            }
        } else if (cardType === 'NEUTRAL') {
            revealLogText = `😐 ${guesserName} selected "${cardWord}" - Neutral Bystander.`;
            nextTurn = opponentTeam;
            revealLogText += ` Turn passes to ${opponentTeam}.`;
        } else if (cardType === 'ASSASSIN') {
             revealLogText = `☠️ ${guesserName} selected the Assassin ("${cardWord}")! ${opponentTeam} team wins!`;
            gameEndStatus = `ASSASSIN_HIT_${currentTeam}`;
            nextTurn = null;
        }

        if (gameEndStatus) {
            updates['status'] = gameEndStatus;
            updates['clue'] = { word: null, number: null, submittedBy: null };
            updates['guessesRemaining'] = null;
            updates['turn'] = null;
            updates['guessesMade'] = 0;
        } else {
            if (nextTurn !== currentTeam) {
                updates['turn'] = nextTurn;
                updates['clue'] = { word: null, number: null, submittedBy: null };
                updates['guessesRemaining'] = null;
                updates['guessesMade'] = 0;
            } else {
                 updates['guessesRemaining'] = remainingGuesses;
            }
        }

        update(getGameStateRef(roomId), updates)
            .then(() => {
                if (revealLogText) {
                     addLogEntry(roomId, 'REVEAL', revealLogText);
                }
            })
            .catch(err => console.error("Error processing confirmed guess:", err));

    }, [roomId, gameState, currentPlayer, addLogEntry]); // Added gameState, currentPlayer, addLogEntry


    const handleEndTurn = useCallback(() => {
         if (!isGuesser || !isMyTurn || gameState?.status !== 'PLAYING' || !gameState?.clue?.word) return;

         const currentTeam = gameState.turn;
         const opponentTeam = currentTeam === 'RED' ? 'BLUE' : 'RED';
         update(getGameStateRef(roomId), {
             turn: opponentTeam,
             clue: { word: null, number: null, submittedBy: null },
             guessesRemaining: null,
             guessesMade: 0,
             votes: null // Clear votes
         }).then(() => {
            const playerName = currentPlayer?.name || 'Guesser';
            addLogEntry(roomId, 'TURN', `✋ ${playerName} ended ${currentTeam}'s turn. Passing to ${opponentTeam}.`);
         }).catch(err => console.error("Error ending turn:", err));
    }, [roomId, gameState, isGuesser, isMyTurn, currentPlayer, addLogEntry]); // Added gameState, currentPlayer, addLogEntry


    const handleLeaveRoom = useCallback(() => {
        const playerRef = getPlayerRef(roomId, playerId);
        remove(playerRef).then(() => {
            navigate('/');
        }).catch(err => console.error("Error leaving room:", err));
        // Consider adding logic to remove room if empty
    }, [roomId, playerId, navigate]);


    const handleSwitchTeam = useCallback(() => {
        if (!currentPlayer || !currentPlayer.team || !currentPlayer.role) {
            console.warn("Switch Team blocked: Player has no team/role assigned yet.");
            return; // Cannot switch if not fully assigned
        }
    
        // Optional restriction: Prevent switching while a clue is active?
        // if (gameState?.clue?.word) {
        //     alert("Cannot switch teams while a clue is active.");
        //     return;
        // }
    
        const currentTeam = currentPlayer.team;
        const currentRole = currentPlayer.role;
        const newTeam = currentTeam === 'RED' ? 'BLUE' : 'RED';
    
        // --- Spymaster Collision Check ---
        if (currentRole === 'SPYMASTER') {
            const existingSpymasterOnNewTeam = Object.values(players).find(
                p => p.team === newTeam && p.role === 'SPYMASTER'
            );
            if (existingSpymasterOnNewTeam) {
                alert(`Cannot switch: Team ${newTeam} already has a Spymaster (${existingSpymasterOnNewTeam.name}). Ask them to switch roles first if you want to be the Spymaster.`);
                return; // Block the switch
            }
            // If no collision, the player remains Spymaster on the new team
        }
        // If the player is a Guesser, they just become a Guesser on the new team.
    
        // --- Prepare and Execute Update ---
        const playerRef = getPlayerRef(roomId, playerId);
        const updates = { team: newTeam }; // Role stays the same
    
        update(playerRef, updates)
            .then(() => {
                console.log(`Player ${currentPlayer.name} switched to team ${newTeam}`);
                // Optional: Log the action
                addLogEntry(roomId, 'SWITCH', `🔄 ${currentPlayer.name} switched from ${currentTeam} to ${newTeam}`);
            })
            .catch(err => {
                console.error("Error switching team:", err);
                alert("Failed to switch team. Please try again.");
            });
    
    // Add `players` to dependency array as we check it for spymaster collision
    }, [roomId, playerId, currentPlayer, players, gameState, addLogEntry]);


    // --- Rendering Logic ---

    if (loading) return <div className="text-center text-xl font-semibold">Loading Game...</div>;
    if (error) return <div className="text-center text-red-600 bg-red-100 p-4 rounded border border-red-300">{error} <button onClick={() => navigate('/')} className="ml-4 px-2 py-1 bg-red-500 text-white rounded text-sm">Go Back</button></div>;
    if (!gameState && !loading) return <div className="text-center text-yellow-600">Waiting for game data... (Room might be empty or invalid)</div>; // Handle case where gameState remains null


    // --- LOBBY STATE ---
    if (gameState?.status === 'LOBBY' || !gameState?.status) { // Check if gameState or status is null/undefined
        const canStartGame = Object.values(players).length >= 4 &&
                         Object.values(players).some(p => p.team === 'RED' && p.role === 'SPYMASTER') &&
                         Object.values(players).some(p => p.team === 'BLUE' && p.role === 'SPYMASTER') &&
                         Object.values(players).some(p => p.team === 'RED' && p.role === 'GUESSER') &&
                         Object.values(players).some(p => p.team === 'BLUE' && p.role === 'GUESSER');
        return (
             <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-4 text-center">Game Lobby - Room Code: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{roomId}</span></h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <RoleSelector players={players} playerId={playerId} onRoleChange={handleRoleChange} />
                    <div className="bg-white p-6 rounded shadow">
                       {/* ... Player list display ... */}
                       <h3 className="text-lg font-semibold mb-3 border-b pb-2">Players in Room:</h3>
                        <ul className="space-y-2 max-h-60 overflow-y-auto"> {/* Added max-height and scroll */}
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
                          {!currentPlayer?.isHost && !canStartGame && ( <p className="mt-6 text-center text-gray-500">Waiting for Host (requires valid team/role setup).</p> )}
                          {!currentPlayer?.isHost && canStartGame && ( <p className="mt-6 text-center text-green-600 font-semibold">Ready! Waiting for Host.</p> )}
                    </div>
                </div>
                 <button onClick={handleLeaveRoom} className="mt-8 block mx-auto bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                    Leave Room
                 </button>
            </div>
        );
    }

    // --- GAME OVER STATE ---
     if (gameState.status !== 'PLAYING') {
        return (
            <GameOver
                status={gameState.status}
                startingTeam={gameState.startingTeam}
                board={gameState.board} // Pass board for display
                onRestart={handleRestartGame}
                onLeave={handleLeaveRoom}
                isHost={currentPlayer?.isHost}
            />
        );
    }


    // --- PLAYING STATE ---
    if (gameState?.status === 'PLAYING') {
        return (
            // Use h-screen for full viewport height, flex-col for main layout
            <div className="flex flex-col h-screen overflow-hidden bg-gray-200">
    
                {/* Controls Section - Fixed Height */}
                <div className="flex-shrink-0">
                    <Controls
                        // ... props
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
                </div>
    
                {/* Main Content Area: [Stacked Panels] | [Board] | [Log] */}
                <div className="flex-grow flex flex-row gap-2 md:gap-4 overflow-hidden p-2 md:p-4 min-h-0">

                    {/* Left Column: Stacked Team Panels */}
                    {/* Fixed width, flex-col to stack, gap for spacing */}
                    <div className="w-48 md:w-56 lg:w-60 flex-shrink-0 flex flex-col gap-4 min-h-0"> {/* Adjust width */}
    
                        {/* Red Team Panel - Fixed width, allow internal scroll if needed */}
                        {/* Removed h-full, added min-h-0 */}
                        <div className="w-48 md:w-56 lg:w-60 flex-shrink-0 flex flex-col gap-4 min-h-0"> {/* Example: Use fixed widths */}
                            <TeamPanel
                                teamColor="RED"
                                players={players}
                                score={gameState.score?.red ?? '?'}
                                isCurrentTurn={gameState.turn === 'RED'}
                                playerId={playerId}
                                onSwitchTeam={handleSwitchTeam}
                            />
                        </div>
        
                        {/* Blue Team Panel - Fixed width */}
                        {/* Removed h-full, added min-h-0 */}
                        <div className="flex-1 min-h-0"> {/* Example: Use fixed widths */}
                            <TeamPanel
                                teamColor="BLUE"
                                players={players}
                                score={gameState.score?.blue ?? '?'}
                                isCurrentTurn={gameState.turn === 'BLUE'}
                                playerId={playerId}
                                onSwitchTeam={handleSwitchTeam}
                            />
                        </div>
                    </div>
    
                    {/* Game Board Area - Flexible width, allow internal scroll */}
                    {/* flex-grow lets it take space, flex-col for board layout, overflow-y-auto */}
                    {/* min-h-0 allows it to shrink properly */}
                    <div className="flex-grow flex flex-col overflow-y-auto min-h-0">
                         <GameBoard
                            // Pass necessary props for GameBoard
                            board={gameState.board}
                            onVote={handleVote}
                            onConfirmGuess={processConfirmedGuess}
                            votes={gameState.votes || {}}
                            players={players}
                            playerId={playerId}
                            isSpymaster={isSpymaster}
                            showSpymasterView={showSpymasterView}
                            isGuesser={isGuesser}
                            canVoteOrGuess={isMyTurn && isGuesser && !!gameState.clue?.word && (gameState.guessesRemaining ?? 0) > 0}
                            currentTurnTeam={gameState.turn}
                         />
                     </div>
    
                     {/* Action Log Sidebar - Fixed width */}
                     {/* Removed h-full, added min-h-0 */}
                     {/* overflow-hidden okay here if ActionLog handles internal scroll */}
                     <div className="w-56 md:w-64 lg:w-72 flex-shrink-0 min-h-0"> {/* Example: Use fixed widths */}
                         <ActionLog logEntries={gameState.logEntries} />
                     </div>
                </div>
    
                 {/* Leave Room button - Fixed Height */}
                 <div className="flex-shrink-0 p-2 text-center">
                     <button onClick={handleLeaveRoom} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                        Leave Room
                     </button>
                 </div>
            </div>
        );
    }

    // Fallback or handle cases where gameState might still be null after loading
    return <div className="text-center text-gray-500">Loading or initializing game...</div>;
}

export default Game;