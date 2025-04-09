import React from 'react';
import { HandRaisedIcon } from '@heroicons/react/24/solid'; // For hand icon for voting

function Card({ cardIndex, cardData, onVote, onConfirmGuess, votes, players, playerId, 
        isSpymaster, showSpymasterView, isGuesser, canVoteOrGuess, currentTurnTeam}) {
    const { word, type, revealed, revealedBy } = cardData;

    const isVisibleToSpymaster = isSpymaster && showSpymasterView;
    const isRevealed = revealed;
    const currentVotes = votes || []; // votes is always an array, since multiple players will be doing it
    const playerHasVoted = currentVotes.includes(playerId);

    // Determine base styles, colors, text, cursor, and highlights
    let bgColor = '';
    let textColor = '';
    let spymasterHighlight = '';
    let cursorStyle = 'cursor-default'; // Default to non-clickable unless it's a guesser's turn
    let hoverEffect = '';
    let baseCardStyle = ''; // Will hold 'card-revealed' or 'card-covered' or be empty for spymaster hints

    if (isRevealed) {
        // --- REVEALED CARD ---
        baseCardStyle = 'card-revealed';
        textColor = 'text-white'; // Default for colored cards
        if (type === 'RED') bgColor = 'bg-codenames-red';
        else if (type === 'BLUE') bgColor = 'bg-codenames-blue';
        else if (type === 'NEUTRAL') { bgColor = 'bg-codenames-neutral'; textColor = 'text-black'; }
        else if (type === 'ASSASSIN') bgColor = 'bg-codenames-assassin';

    } else if (isVisibleToSpymaster) {
        // --- SPYMASTER VIEW (UNREVEALED) ---
        // Show color hints, no 'card-covered' style needed here
        baseCardStyle = ''; // Explicitly don't use covered style
        cursorStyle = 'cursor-default'; // Spymasters don't click
        // Use lighter hint colors and dark text for contrast
        textColor = 'text-black opacity-80 font-normal';
        if (type === 'RED') {
            bgColor = 'bg-red-200'; // Lighter red hint
            spymasterHighlight = 'spymaster-highlight-red'; // Add ring based on actual type
        } else if (type === 'BLUE') {
            bgColor = 'bg-blue-200'; // Lighter blue hint
            spymasterHighlight = 'spymaster-highlight-blue'; // Add ring
        } else if (type === 'NEUTRAL') {
            bgColor = 'bg-yellow-100'; // Lighter neutral hint
        } else if (type === 'ASSASSIN') {
            bgColor = 'bg-gray-400'; // Distinct assassin hint
            textColor = 'text-white opacity-90'; // White text on dark gray
        }
        // Word needs to be visible
        textColor += ' font-semibold'; // Make word stand out a bit on hints

    } else {
        // --- GUESSER VIEW (UNREVEALED) or SPYMASTER VIEW HIDDEN ---
        baseCardStyle = 'card-covered'; // Use the standard covered style
        bgColor = 'bg-codenames-covered'; // Apply the gray background
        textColor = 'text-gray-800'; // Standard text color for covered cards

        if (isGuesser && canVoteOrGuess) {
            cursorStyle = 'cursor-pointer';
            hoverEffect = 'hover:bg-gray-300'; // Only guessers get hover effect when it's their turn
        } else {
            cursorStyle = 'cursor-not-allowed';
        }
    }

    // Construct the final classes for the main card div
    const cardClasses = `card relative flex flex-col justify-between min-h-[120px] // Adjust min-height as needed
        ${baseCardStyle}
        ${bgColor}
        ${textColor}
        ${!isRevealed && isGuesser && canVoteOrGuess ? hoverEffect : ''} // Apply hover only when vote is possible
        ${cursorStyle}
        ${isVisibleToSpymaster && !isRevealed ? spymasterHighlight : ''}
        ${isRevealed && revealedBy ? (revealedBy === 'RED' ? 'ring-2 ring-offset-1 ring-red-700' : 'ring-2 ring-offset-1 ring-blue-700') : ''}
        ${!isRevealed && playerHasVoted ? 'ring-2 ring-offset-1 ring-green-500' : ''} // Highlight if current player voted
    `;

    // Determine if the main card area should trigger a vote
    const isVoteClickable = !isRevealed && isGuesser && canVoteOrGuess && !isVisibleToSpymaster;

    // Handle confirmation click - stop propagation to prevent voting
    const handleConfirmClick = (e) => {
        e.stopPropagation(); // Prevent click from triggering onVote on the parent div
        onConfirmGuess(); // Call the confirmation handler passed from Game.jsx
    };

    // Function to get player names safely
    const getPlayerName = (pId) => players[pId]?.name || '...';

    return (
        <div
            className={cardClasses}
            // Only attach onClick handler if it's actually clickable
            onClick={isVoteClickable ? onVote : undefined} // Main click triggers vote
            aria-disabled={!isVoteClickable} // Accessibility hint
        >
            {/* Word display */}
            <div className="flex-grow flex items-center justify-center text-center font-semibold uppercase break-words px-1">
                {word}
            </div>

            {/* --- Voter Names Display --- */}
            {/* Only show votes on unrevealed cards and not in spymaster key view */}
            {!isRevealed && !isVisibleToSpymaster && currentVotes.length > 0 && (
                <div className="text-xs text-gray-600 bg-black bg-opacity-10 rounded px-1 py-0.5 mt-1 w-full text-center truncate">
                   Votes: {currentVotes.map(getPlayerName).join(', ')}
                </div>
            )}


            {/* --- Confirmation Button (Hand Icon) --- */}
            {/* Show only if: not revealed, guesser can guess, *this* player has voted */}
            {!isRevealed && isGuesser && canVoteOrGuess && playerHasVoted && !isVisibleToSpymaster && (
                <button
                    title="Confirm this guess for the team"
                    onClick={handleConfirmClick}
                    className="absolute top-1 right-1 p-1 bg-green-600 text-white rounded-full shadow hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                    aria-label={`Confirm guess for ${word}`}
                >
                    <HandRaisedIcon className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}

export default Card;