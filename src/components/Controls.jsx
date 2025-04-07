import React, { useState } from 'react';

function Controls({ gameState, currentPlayer, players, isSpymaster, isMyTurn, showSpymasterView, onClueSubmit, onEndTurn, onToggleSpymasterView, roomId }) {
    const [clueWord, setClueWord] = useState('');
    const [clueNumber, setClueNumber] = useState('');

    const { turn, score, clue, guessesMade, guessesRemaining, status } = gameState;
    const { team, role } = currentPlayer || {};

    const handleSubmit = (e) => {
        e.preventDefault();
        if (clueWord && clueNumber) {
            onClueSubmit(clueWord, clueNumber);
            setClueWord('');
            setClueNumber('');
        }
    };

     const getPlayerName = (playerId) => {
        return players[playerId]?.name || 'Unknown Player';
     }

    const renderTurnIndicator = () => {
        if (status !== 'PLAYING') return null;

        const turnColor = turn === 'RED' ? 'text-red-600' : 'text-blue-600';
        let message = '';

        if (clue?.word) {
            const spymasterName = getPlayerName(clue.submittedBy);
            message = `${turn}'s Turn: ${spymasterName} gave clue "${clue.word.toUpperCase()} : ${clue.number}". Guesses made: ${guessesMade}. Guesses remaining: ${guessesRemaining ?? 'N/A'}.`;
             if (isMyTurn && role === 'GUESSER') {
                 message += " Your guess.";
             } else if (isMyTurn && role === 'SPYMASTER') {
                 message += " Waiting for your team to guess.";
             } else {
                  message += ` Waiting for ${turn} team.`;
             }

        } else {
             message = `${turn}'s Turn: Waiting for ${turn} Spymaster to give a clue.`;
             if (isMyTurn && role === 'SPYMASTER') {
                 message += " Your turn to give a clue.";
             }
        }

        return <p className={`text-lg font-semibold mb-2 ${turnColor}`}>{message}</p>;
    };

    return (
        <div className="mb-4 p-4 bg-white rounded shadow">
             <div className="flex justify-between items-center mb-3">
                <div className="text-xl font-bold">
                    Room Code: <span className="font-mono bg-gray-200 px-2 py-1 rounded text-lg">{roomId}</span>
                </div>
                 {role === 'SPYMASTER' && (
                    <button
                        onClick={onToggleSpymasterView}
                        className={`px-3 py-1 rounded text-sm font-medium ${showSpymasterView ? 'bg-gray-600 text-white' : 'bg-gray-300 text-black'}`}
                    >
                        {showSpymasterView ? 'Hide Key' : 'Show Key'}
                    </button>
                )}
             </div>

             <div className="flex justify-around items-center mb-4 text-center">
                 <div className="text-red-600 font-bold text-2xl">
                     RED: {score?.red ?? 'N/A'} left
                 </div>
                 <div className="text-blue-600 font-bold text-2xl">
                     BLUE: {score?.blue ?? 'N/A'} left
                 </div>
             </div>

             {renderTurnIndicator()}


            {/* Spymaster Clue Input */}
            {isSpymaster && isMyTurn && !clue?.word && status === 'PLAYING' && (
                <form onSubmit={handleSubmit} className="flex gap-2 items-end mt-2">
                    <div className="flex-grow">
                         <label htmlFor="clueWord" className="block text-sm font-medium text-gray-700">Clue Word:</label>
                         <input
                            id="clueWord"
                            type="text"
                            value={clueWord}
                            onChange={(e) => setClueWord(e.target.value.replace(/\s/g, ''))} // Prevent spaces
                            placeholder="One word only"
                            className="w-full px-2 py-1 border border-gray-300 rounded shadow-sm"
                            required
                        />
                    </div>
                    <div>
                         <label htmlFor="clueNumber" className="block text-sm font-medium text-gray-700">Number:</label>
                         <input
                            id="clueNumber"
                            type="number"
                            min="0"
                            max="9" // Max reasonable number
                            value={clueNumber}
                            onChange={(e) => setClueNumber(e.target.value)}
                            placeholder="Num"
                            className="w-20 px-2 py-1 border border-gray-300 rounded shadow-sm"
                            required
                        />
                    </div>
                    <button type="submit" className="px-4 py-1 bg-green-500 hover:bg-green-600 text-white font-bold rounded self-end h-[34px]">
                        Give Clue
                    </button>
                </form>
            )}

            {/* Guesser End Turn Button */}
             {role === 'GUESSER' && isMyTurn && clue?.word && status === 'PLAYING' && guessesMade > 0 && (
                <button
                    onClick={onEndTurn}
                    className="mt-2 px-4 py-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded"
                >
                    End Turn ({guessesRemaining ?? 'N/A'} guess{guessesRemaining !== 1 ? 'es' : ''} left)
                </button>
            )}
        </div>
    );
}

export default Controls;