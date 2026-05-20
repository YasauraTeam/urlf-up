/**
 * AI Matching Engine
 * Ranks candidates against a user profile based on a weighted scoring model.
 */

/**
 * Calculates the match score between a user profile and a candidate.
 * 
 * @param {Object} userProfile - The user seeking matches.
 * @param {Object} candidate - The potential match.
 * @returns {number} Score from 0 to 100.
 */
function calculateMatchScore(userProfile, candidate) {
  let score = 0;

  // 1. Industry Match (40% weight)
  // If industries match exactly, award 40 points.
  if (userProfile.industry && candidate.industry && userProfile.industry.toLowerCase() === candidate.industry.toLowerCase()) {
    score += 40;
  }

  // 2. Skill Complementarity (30% weight)
  // If the user's required expertise matches the candidate's expertise, award points.
  let skillScore = 0;
  const userNeeds = Array.isArray(userProfile.required_skills) ? userProfile.required_skills : [];
  const candidateHas = Array.isArray(candidate.expertise) ? candidate.expertise : [];
  
  if (userNeeds.length > 0 && candidateHas.length > 0) {
    const matchCount = userNeeds.filter(skill => candidateHas.includes(skill)).length;
    // Calculate percentage of needed skills the candidate has, up to 30 points
    skillScore = Math.min((matchCount / userNeeds.length) * 30, 30);
  } else if (userProfile.role === 'Allocator' && candidate.role === 'Architect') {
    // Basic role synergy fallback if skills array is empty
    skillScore = 15; 
  }
  score += skillScore;

  // 3. Risk/Capital Alignment (30% weight)
  // Calculate synergy based on risk appetite and capital capacity.
  let riskCapitalScore = 0;
  
  // Normalize riskAppetite (Low, Medium, High) to 1, 2, 3
  const riskMap = { low: 1, medium: 2, high: 3 };
  const userRisk = riskMap[(userProfile.riskAppetite || '').toLowerCase()] || 2;
  const candidateRisk = riskMap[(candidate.riskAppetite || '').toLowerCase()] || 2;
  
  // Closer risk appetite means better alignment (max 15 points)
  const riskDiff = Math.abs(userRisk - candidateRisk);
  if (riskDiff === 0) riskCapitalScore += 15;
  else if (riskDiff === 1) riskCapitalScore += 7;
  
  // Capital capacity check: if an Allocator has high capital, they match well with High capital requirement Architects/Executors
  const capMap = { low: 1, medium: 2, high: 3 };
  const userCap = capMap[(userProfile.capitalCapacity || '').toLowerCase()] || 2;
  const candidateCap = capMap[(candidate.capitalCapacity || '').toLowerCase()] || 2;
  
  // Complementary capital synergy (max 15 points)
  if (userProfile.role === 'Allocator') {
    // Allocator wants someone whose needs they can fulfill
    if (userCap >= candidateCap) riskCapitalScore += 15;
    else riskCapitalScore += 7;
  } else {
    // If not an Allocator, just basic alignment
    const capDiff = Math.abs(userCap - candidateCap);
    if (capDiff === 0) riskCapitalScore += 15;
    else if (capDiff === 1) riskCapitalScore += 7;
  }
  
  score += riskCapitalScore;

  return Math.round(score);
}

/**
 * Returns the top 3 ranked matches for a given user profile.
 * 
 * @param {Object} userProfile - The user's profile.
 * @param {Array<Object>} candidates - Array of potential candidate profiles.
 * @returns {Array<Object>} Top 3 matches with added match_score.
 */
export function rankMatches(userProfile, candidates) {
  if (!candidates || candidates.length === 0) return [];

  // Map candidates to include their score
  const scoredCandidates = candidates.map(candidate => {
    return {
      ...candidate,
      match_score: calculateMatchScore(userProfile, candidate)
    };
  });

  // Sort by score descending and take top 3
  scoredCandidates.sort((a, b) => b.match_score - a.match_score);
  return scoredCandidates.slice(0, 3);
}
