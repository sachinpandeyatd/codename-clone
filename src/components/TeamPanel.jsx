import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

// Simple placeholder for an avatar area
const AvatarPlaceholder = ({ teamColor, score = '?' }) => (
    <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-2 md:mb-4 shadow-md text-3xl md:text-4xl font-bold ${teamColor === 'RED' ? 'bg-red-900' : 'bg-blue-900'}`}>
        {score}
    </div>
);

function TeamPanel({ teamColor, players = {}, score = '?', isCurrentTurn, playerId, onSwitchTeam }) {
    const teamPlayers = Object.values(players).filter(p => p.team === teamColor);
    const spymasters = teamPlayers.filter(p => p.role === 'SPYMASTER');
    const operatives = teamPlayers.filter(p => p.role === 'GUESSER');

    const bgColor = teamColor === 'RED' ? 'bg-red-700' : 'bg-blue-700';
    const borderColor = isCurrentTurn ? (teamColor === 'RED' ? 'border-red-300' : 'border-blue-300') : 'border-transparent'; // Highlight border
    const shadow = isCurrentTurn ? 'shadow-xl scale-105' : 'shadow-md'; // Pop effect for current turn


    // Helper function to render player name with switch button if applicable
    const renderPlayerName = (player) => (
        <div key={player.id} className="flex items-center justify-between group">
            <p className={`truncate ${player.role === 'SPYMASTER' ? 'font-medium' : ''}`}>
                {player.name}
            </p>
            {/* Show switch button ONLY for the current player */}
            {player.id === playerId && (
                <button
                    onClick={onSwitchTeam} // Call the passed-in handler
                    title={`Switch to ${teamColor === 'RED' ? 'BLUE' : 'RED'} Team`}
                    // Make button subtle, appears on hover? Or always visible?
                    className="ml-2 p-0.5 rounded bg-white bg-opacity-20 hover:bg-opacity-40 text-white opacity-60 group-hover:opacity-100 transition-opacity"
                    aria-label="Switch Team"
                >
                    <ArrowPathIcon className="w-3 h-3" />
                </button>
            )}
        </div>
    );


    return (
        <div className={`flex flex-col items-center p-3 rounded-lg text-white ${bgColor} border-4 ${borderColor} ${shadow} transition-all duration-300`}>
            {/* ... AvatarPlaceholder and Score ... */}
            <AvatarPlaceholder teamColor={teamColor} score={score} />

            {/* Player Lists - Use the helper function */}
            <div className="w-full text-left text-xs md:text-sm space-y-2 overflow-y-auto px-1 py-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
                 <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wider opacity-80 mb-1">Spymaster(s)</h4>
                    {spymasters.length > 0 ? (
                        spymasters.map(renderPlayerName)
                    ) : (
                        <p className="text-xs italic opacity-60">None</p>
                    )}
                </div>
                 <div>
                    <h4 className="font-semibold text-xs uppercase tracking-wider opacity-80 mb-1">Operative(s)</h4>
                     {operatives.length > 0 ? (
                        operatives.map(renderPlayerName)
                    ) : (
                        <p className="text-xs italic opacity-60">None</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TeamPanel;