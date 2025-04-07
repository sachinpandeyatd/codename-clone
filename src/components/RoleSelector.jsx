import React from 'react';

function RoleSelector({ players, playerId, onRoleChange }) {
    const currentPlayer = players?.[playerId];

    const handleTeamChange = (team) => {
        onRoleChange(team, currentPlayer?.role); // Keep role when changing team
    };

    const handleRoleChange = (role) => {
         // Basic check: prevent too many spymasters per team
        if (role === 'SPYMASTER') {
            const currentTeam = currentPlayer?.team;
            if (!currentTeam) {
                alert("Please select a team first.");
                return;
            }
            const existingSpymaster = Object.values(players).find(
                p => p.id !== playerId && p.team === currentTeam && p.role === 'SPYMASTER'
            );
            if (existingSpymaster) {
                alert(`Team ${currentTeam} already has a Spymaster (${existingSpymaster.name}).`);
                return; // Don't allow change
            }
        }
        onRoleChange(currentPlayer?.team, role);
    };

    const renderTeamSection = (teamColor, teamName) => {
        const teamPlayers = Object.values(players).filter(p => p.team === teamName);
        const spymaster = teamPlayers.find(p => p.role === 'SPYMASTER');
        const guessers = teamPlayers.filter(p => p.role === 'GUESSER');
        const unassigned = teamPlayers.filter(p => !p.role);

        return (
            <div className={`p-4 rounded shadow border-t-4 ${teamColor === 'red' ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'}`}>
                <h3 className={`text-xl font-bold mb-3 ${teamColor === 'red' ? 'text-red-700' : 'text-blue-700'}`}>{teamName} Team</h3>

                {/* Join Team Button */}
                {currentPlayer?.team !== teamName && (
                     <button
                        onClick={() => handleTeamChange(teamName)}
                        className={`w-full mb-3 px-4 py-2 font-semibold rounded transition duration-150 ease-in-out ${teamColor === 'red' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                    >
                        Join {teamName} Team
                    </button>
                )}

                 {/* Role Selection within Team */}
                 {currentPlayer?.team === teamName && (
                    <div className="mb-3 space-y-2">
                         <p className="font-semibold">Your Role:</p>
                        <button
                            onClick={() => handleRoleChange('SPYMASTER')}
                            disabled={!!spymaster && spymaster.id !== playerId} // Disable if someone else is spymaster
                            className={`w-full px-3 py-1 rounded ${currentPlayer.role === 'SPYMASTER' ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-200 hover:bg-gray-300'} ${!!spymaster && spymaster.id !== playerId ? 'opacity-50 cursor-not-allowed': ''}`}
                        >
                            Spymaster {currentPlayer.role === 'SPYMASTER' ? '✓' : ''}
                        </button>
                        <button
                             onClick={() => handleRoleChange('GUESSER')}
                             className={`w-full px-3 py-1 rounded ${currentPlayer.role === 'GUESSER' ? 'bg-green-500 text-white font-bold' : 'bg-gray-200 hover:bg-gray-300'}`}
                         >
                             Guesser {currentPlayer.role === 'GUESSER' ? '✓': ''}
                         </button>
                    </div>
                 )}


                {/* Display Team Members */}
                <div className="space-y-1 text-sm">
                    <p className="font-semibold">Spymaster:</p>
                    {spymaster ? <p className="ml-2">{spymaster.name} {spymaster.id === playerId ? '(You)' : ''}</p> : <p className="ml-2 text-gray-500 italic">Needed</p>}

                    <p className="font-semibold mt-2">Guessers:</p>
                    {guessers.length > 0 ? guessers.map(p => <p key={p.id} className="ml-2">{p.name} {p.id === playerId ? '(You)' : ''}</p>) : <p className="ml-2 text-gray-500 italic">Needed</p>}

                    {unassigned.length > 0 && <p className="font-semibold mt-2 text-gray-600">Unassigned:</p>}
                    {unassigned.map(p => <p key={p.id} className="ml-2 text-gray-500">{p.name} {p.id === playerId ? '(You)' : ''}</p>)}
                </div>
            </div>
        );
    };

     const unassignedPlayers = Object.values(players).filter(p => !p.team);

    return (
        <div className="space-y-6">
            {renderTeamSection('red', 'RED')}
            {renderTeamSection('blue', 'BLUE')}

             {unassignedPlayers.length > 0 && (
                 <div className="p-4 rounded shadow border-t-4 border-gray-400 bg-gray-50">
                     <h3 className="text-lg font-semibold mb-2 text-gray-700">Players Waiting for Team:</h3>
                     <ul className="list-disc list-inside text-gray-600">
                         {unassignedPlayers.map(p => (
                             <li key={p.id}>{p.name} {p.id === playerId ? '(You - Select a Team!)' : ''}</li>
                         ))}
                     </ul>
                 </div>
             )}
        </div>
    );
}

export default RoleSelector;