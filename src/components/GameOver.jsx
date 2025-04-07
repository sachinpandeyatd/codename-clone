import React, { useState } from 'react';
import Card from './Card'; // Re-use Card component for display

function GameOver({ status, startingTeam, board, onRestart, onLeave, isHost }) {
    const [showBoard, setShowBoard] = useState(false);

    let message = '';
    let winner = null;
    let messageColor = 'text-gray-800';

    if (status === 'RED_WON') {
        message = 'RED Team Wins!';
        winner = 'RED';
        messageColor = 'text-red-600';
    } else if (status === 'BLUE_WON') {
        message = 'BLUE Team Wins!';
        winner = 'BLUE';
        messageColor = 'text-blue-600';
    } else if (status === 'ASSASSIN_HIT_RED') {
        message = 'RED Team hit the Assassin! BLUE Team Wins!';
        winner = 'BLUE';
         messageColor = 'text-blue-600';
    } else if (status === 'ASSASSIN_HIT_BLUE') {
        message = 'BLUE Team hit the Assassin! RED Team Wins!';
        winner = 'RED';
         messageColor = 'text-red-600';
    } else {
        message = 'Game Over - Unknown State'; // Fallback
    }

    return (
        <div className="max-w-3xl mx-auto text-center p-6 bg-white rounded shadow-lg">
            <h2 className={`text-4xl font-bold mb-4 ${messageColor}`}>{message}</h2>
            <p className="mb-6 text-gray-600">The starting team was: <span className={`font-semibold ${startingTeam === 'RED' ? 'text-red-600' : 'text-blue-600'}`}>{startingTeam}</span></p>


             <div className="flex justify-center gap-4 mb-6">
                {isHost && (
                    <button
                        onClick={onRestart}
                        className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded transition duration-150"
                    >
                        Restart Game (New Roles/Board)
                    </button>
                )}
                 {!isHost && (
                     <p className="text-gray-600 italic">Waiting for Host to restart the game.</p>
                 )}
                <button
                    onClick={() => setShowBoard(!showBoard)}
                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded transition duration-150"
                >
                    {showBoard ? 'Hide Final Board' : 'Show Final Board'}
                </button>
                 <button
                    onClick={onLeave}
                    className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded transition duration-150"
                 >
                    Leave Room
                 </button>
            </div>


            {showBoard && board && (
                <div className="mt-6">
                    <h3 className="text-xl font-semibold mb-4">Final Board Layout:</h3>
                    <div className="grid grid-cols-5 gap-2 md:gap-3 lg:gap-4 p-4 bg-gray-100 rounded shadow-inner mx-auto max-w-xl">
                        {board.map((card, index) => (
                            <Card
                                key={index}
                                cardData={{...card, revealed: true}} // Treat all as revealed
                                onClick={() => {}} // No action on click
                                isSpymaster={true} // Force spymaster view essentially
                                showSpymasterView={true}
                                isGuesser={false}
                                canGuess={false}
                                currentTurnTeam={null}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default GameOver;