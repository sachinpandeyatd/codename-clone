import React from 'react';
import Card from './Card';

function GameBoard({ board, onCardClick, isSpymaster, showSpymasterView, isGuesser, canGuess, currentTurnTeam }) {
    return (
        <div className="grid grid-cols-5 gap-2 md:gap-3 lg:gap-4 p-4 bg-gray-100 rounded shadow-inner flex-grow">
            {board.map((card, index) => (
                <Card
                    key={index}
                    cardData={card}
                    onClick={() => onCardClick(index)}
                    isSpymaster={isSpymaster}
                    showSpymasterView={showSpymasterView}
                    isGuesser={isGuesser}
                    canGuess={canGuess}
                    currentTurnTeam={currentTurnTeam} // Pass for spymaster highlighting
                />
            ))}
        </div>
    );
}

export default GameBoard;