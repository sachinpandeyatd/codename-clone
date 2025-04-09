import React from 'react';
import Card from './Card';

function GameBoard({ board, onVote, onConfirmGuess, votes, players, playerId, isSpymaster, 
        showSpymasterView, isGuesser, canVoteOrGuess, currentTurnTeam }) {
    return (
        <div className="grid grid-cols-5 gap-2 md:gap-3 lg:gap-4 p-4 bg-gray-100 rounded shadow-inner flex-grow">
            {board.map((card, index) => (
                <Card
                    key={index}
                    cardIndex={index}
                    cardData={card}
                    onVote={() => onVote(index)}
                    onConfirmGuess={() => onConfirmGuess(index)}
                    votes={votes[index] || []} // Pass votes specifically for this card
                    players={players}
                    playerId={playerId}
                    isSpymaster={isSpymaster}
                    showSpymasterView={showSpymasterView}
                    isGuesser={isGuesser}
                    canVoteOrGuess={canVoteOrGuess}
                    currentTurnTeam={currentTurnTeam}
                />
            ))}
        </div>
    );
}

export default GameBoard;