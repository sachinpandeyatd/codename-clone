import React from 'react';

function Card({ cardData, onClick, isSpymaster, showSpymasterView, isGuesser, canGuess, currentTurnTeam }) {
    const { word, type, revealed, revealedBy } = cardData;

    const isVisibleToSpymaster = isSpymaster && showSpymasterView;
    const isRevealed = revealed;

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

        if (isGuesser && canGuess) {
            cursorStyle = 'cursor-pointer';
            hoverEffect = 'hover:bg-gray-300'; // Only guessers get hover effect when it's their turn
        } else {
            cursorStyle = 'cursor-not-allowed';
        }
    }

    // Construct the final classes
    const cardClasses = `card
        ${baseCardStyle}
        ${bgColor}
        ${textColor}
        ${hoverEffect}
        ${cursorStyle}
        ${isVisibleToSpymaster && !isRevealed ? spymasterHighlight : ''} // Ring highlight only for Spymaster unrevealed
        ${isRevealed && revealedBy ? (revealedBy === 'RED' ? 'ring-2 ring-offset-1 ring-red-700' : 'ring-2 ring-offset-1 ring-blue-700') : ''} // Ring for team that revealed
    `;

    // Determine if the card should be clickable
    // Clickable ONLY if it's an unrevealed card, for a guesser, during their turn, when guessing is allowed
    const isClickable = !isRevealed && isGuesser && canGuess && !isVisibleToSpymaster;

    return (
        <div
            className={cardClasses}
            // Only attach onClick handler if it's actually clickable
            onClick={isClickable ? onClick : undefined}
            aria-disabled={!isClickable} // Accessibility hint
        >
            {word}
        </div>
    );
}

export default Card;