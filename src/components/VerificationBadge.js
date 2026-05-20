import { icon } from '../icons.js';

/**
 * Creates a DOM element for the Verification Badge based on the tier.
 * 
 * Tiers: Bronze, Silver, Gold
 */
export function createVerificationBadge(tier = 'Bronze') {
  const badge = document.createElement('div');
  
  // Base styles maintaining design tokens #02040A, #D4AF37
  badge.style.display = 'inline-flex';
  badge.style.alignItems = 'center';
  badge.style.gap = '4px';
  badge.style.padding = '2px 8px';
  badge.style.borderRadius = '12px';
  badge.style.fontSize = '11px';
  badge.style.fontWeight = 'bold';
  badge.style.fontFamily = 'var(--font-en)';
  badge.style.border = '1px solid';

  let color, bgColor, borderColor;

  switch (tier.toLowerCase()) {
    case 'gold':
      color = '#D4AF37'; // var(--gold)
      bgColor = 'rgba(212,175,55,0.12)'; // var(--goldf)
      borderColor = 'rgba(212,175,55,0.2)'; // var(--goldl)
      break;
    case 'silver':
      color = '#edf1ff'; // var(--white)
      bgColor = 'rgba(255,255,255,0.05)';
      borderColor = 'rgba(255,255,255,0.15)';
      break;
    case 'bronze':
    default:
      color = '#ff3820'; // var(--ember)
      bgColor = 'rgba(255,56,32,0.1)'; // var(--emberf)
      borderColor = 'rgba(255,56,32,0.2)';
      break;
  }

  badge.style.color = color;
  badge.style.backgroundColor = bgColor;
  badge.style.borderColor = borderColor;

  // Add an icon (using check-seal or similar from icons.js if available, else a star)
  badge.appendChild(icon('check-seal', { size: 12, color: color }) || icon('star', { size: 12, color: color }));
  
  const text = document.createElement('span');
  text.textContent = tier.toUpperCase();
  badge.appendChild(text);

  return badge;
}
