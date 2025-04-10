import React from 'react';
// Make sure Heroicons is installed: npm install @heroicons/react
import { HandRaisedIcon } from '@heroicons/react/24/solid';

function Card({ cardIndex, cardData, onVote, onConfirmGuess, votes, players, playerId, isSpymaster, showSpymasterView, isGuesser, canVoteOrGuess, currentTurnTeam }) {
    // --- Destructure card data ---
    const { word, type, revealed, revealedBy } = cardData || {}; // Added default {} for safety

    // --- Calculate derived states ---
    const isVisibleToSpymaster = isSpymaster && showSpymasterView;
    const isRevealed = revealed;
    const currentVotes = votes || []; // Ensure votes is always an array
    const playerHasVoted = currentVotes.includes(playerId);

    // --- Determine base styles, colors, text, cursor, and highlights ---
    let bgColor = '';
    let textColor = '';
    let spymasterHighlight = '';
    let cursorStyle = 'cursor-default'; // Default unless interactive
    let hoverEffect = '';
    let baseCardStyle = ''; // Will hold 'card-revealed' or 'card-covered' or be empty for spymaster hints

    // --- Style Calculation Logic ---
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
        baseCardStyle = ''; // Don't use covered style
        cursorStyle = 'cursor-default'; // Spymasters don't click
        // Use lighter hint colors and dark text for contrast
        textColor = 'text-black opacity-80 font-normal';
        if (type === 'RED') {
            bgColor = 'bg-red-200';
            spymasterHighlight = 'spymaster-highlight-red';
        } else if (type === 'BLUE') {
            bgColor = 'bg-blue-200';
            spymasterHighlight = 'spymaster-highlight-blue';
        } else if (type === 'NEUTRAL') {
            bgColor = 'bg-yellow-100';
        } else if (type === 'ASSASSIN') {
            bgColor = 'bg-gray-400';
            textColor = 'text-white opacity-90';
        }
        // Make word stand out a bit on hints
        textColor += ' font-semibold';

    } else {
        // --- GUESSER VIEW (UNREVEALED) or SPYMASTER VIEW HIDDEN ---
        baseCardStyle = 'card-covered'; // Use the standard covered style
        bgColor = 'bg-codenames-covered'; // Apply the gray background
        textColor = 'text-gray-800'; // Standard text color for covered cards

        if (isGuesser && canVoteOrGuess) { // Check if voting/guessing is allowed
            cursorStyle = 'cursor-pointer'; // Main card area is for voting
            hoverEffect = 'hover:bg-gray-300';
        } else {
            cursorStyle = 'cursor-not-allowed';
        }
    }
    // --- End Style Calculation ---

    // --- Construct the final classes for the main card div ---
    // Increased min-height slightly, added text-center and uppercase
    const cardClasses = `card relative flex flex-col justify-between min-h-[130px] p-2 md:p-3 text-center font-semibold uppercase
        ${baseCardStyle}
        ${bgColor}
        ${textColor}
        ${!isRevealed && isGuesser && canVoteOrGuess ? hoverEffect : ''} // Apply hover only when vote is possible
        ${cursorStyle}
        ${isVisibleToSpymaster && !isRevealed ? spymasterHighlight : ''} // Ring highlight only for Spymaster unrevealed
        ${isRevealed && revealedBy ? (revealedBy === 'RED' ? 'ring-2 ring-offset-1 ring-red-700' : 'ring-2 ring-offset-1 ring-blue-700') : ''} // Ring for team that revealed
        ${!isRevealed && playerHasVoted && !isVisibleToSpymaster ? 'ring-2 ring-offset-1 ring-green-500' : ''} // Highlight if current player voted (and not spymaster view)
    `;

    // --- Determine if the main card area should trigger a vote ---
    const isVoteClickable = !isRevealed && isGuesser && canVoteOrGuess && !isVisibleToSpymaster;

    // --- Event Handlers ---
    // Handle confirmation click - stop propagation to prevent voting
    const handleConfirmClick = (e) => {
        e.stopPropagation(); // Prevent click from triggering onVote on the parent div
        onConfirmGuess(); // Call the confirmation handler passed from Game.jsx
    };

    // Function to get player names safely
    const getPlayerName = (pId) => players?.[pId]?.name || '...'; // Use optional chaining

    // --- Render Component ---
    return (
        <div
            className={cardClasses}
            // Only attach onClick handler if it's actually clickable for voting
            onClick={isVoteClickable ? onVote : undefined}
            aria-disabled={!isVoteClickable} // Accessibility hint
        >
            {/* Word display area */}
            {/* flex-grow ensures it takes available space */}
            {/* items-center centers vertically, justify-center centers horizontally */}
            {/* break-words handles long words */}
            <div className="flex-grow flex items-center justify-center px-1 break-all">
                {word || '...'} {/* Display word or fallback */}
            </div>

            {/* --- Voter Names Display --- */}
            {/* Only show votes on unrevealed cards and not in spymaster key view */}
            {!isRevealed && !isVisibleToSpymaster && currentVotes.length > 0 && (
                <div className="text-xs text-gray-600 bg-black bg-opacity-10 rounded px-1 py-0.5 mt-1 w-full text-center truncate normal-case"> {/* normal-case for names */}
                   Votes: {currentVotes.map(getPlayerName).join(', ')}
                </div>
            )}

            {/* --- Confirmation Button (Hand Icon) --- */}
            {/* Show only if: not revealed, guesser can guess, *this* player has voted, not spymaster view */}
            {!isRevealed && isGuesser && canVoteOrGuess && playerHasVoted && !isVisibleToSpymaster && (
                <button
                    title="Confirm this guess for the team"
                    onClick={handleConfirmClick}
                    className="absolute top-1 right-1 p-1 bg-green-600 text-white rounded-full shadow hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 z-10" // Added z-index
                    aria-label={`Confirm guess for ${word}`}
                >
                    <HandRaisedIcon className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}

export default Card;