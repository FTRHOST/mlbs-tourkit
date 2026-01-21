import React from 'react';
import { AppState } from '../types';

interface NextMatchOverlayProps {
  data: AppState;
}

const NextMatchOverlay: React.FC<NextMatchOverlayProps> = ({ data }) => {
  // Safe access to manualMatch with fallback
  const manualMatch = data.manualMatch || { teamAId: '', teamBId: '', scoreA: 0, scoreB: 0 };
  const registry = data.registry || [];

  const getTeamLogo = (id: string) => {
      if (!id) return "https://placehold.co/95x105"; // Default placeholder if no team selected
      
      const team = registry.find(t => t.id === id);
      const logo = team?.logo;
      
      if (!logo) return "https://placehold.co/95x105?text=No+Logo";
      
      if (logo.startsWith('data:')) return logo;
      if (logo.startsWith('http')) return logo;
      if (logo.startsWith('assets/') || logo.startsWith('/assets/')) {
        return logo.startsWith('/') ? logo : '/' + logo;
      }
      return `/assets/${logo}.png`;
  };

  return (
    <div style={{ width: '1920px', height: '1080px', position: 'relative', overflow: 'hidden', backgroundColor: '#00FF00' }}>
        {/* Team A Logo (Left Position per layout) */}
        <img 
            style={{ width: '95px', height: '105px', left: '1092px', top: '836px', position: 'absolute', objectFit: 'contain' }} 
            src={getTeamLogo(manualMatch.teamAId)}
            alt="Team A"
            onError={(e) => e.currentTarget.style.opacity = '0.5'}
        />
        
        {/* Team B Logo (Right Position per layout) */}
        <img 
            style={{ width: '95px', height: '105px', left: '1684px', top: '836px', position: 'absolute', objectFit: 'contain' }} 
            src={getTeamLogo(manualMatch.teamBId)} 
            alt="Team B"
            onError={(e) => e.currentTarget.style.opacity = '0.5'}
        />
    </div>
  );
};

export default NextMatchOverlay;