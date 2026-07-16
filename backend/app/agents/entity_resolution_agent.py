import logging
from typing import Any, Dict, List, Optional
from rapidfuzz import fuzz

logger = logging.getLogger("app.agents.entity_resolution")

class EntityResolutionAgent:
    """Agent responsible for matching onboarded entity/director names against 
    watchlist hits and adverse news sources, reducing false positives.
    """

    def __init__(self, threshold: float = 80.0) -> None:
        self.threshold = threshold

    def resolve_directors(
        self, 
        director_name: str, 
        candidates: List[Dict[str, Any]], 
        nationality: Optional[str] = None, 
        dob: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Filters watchlist candidates using string similarity and optional metadata.
        
        Args:
            director_name: Name of the onboarded company director.
            candidates: List of match records retrieved from the sanctions database.
            nationality: Optional nationality of the director.
            dob: Optional date of birth of the director.
            
        Returns:
            List[Dict[str, Any]]: Resolved matches exceeding threshold with confidence scores.
        """
        resolved_matches: List[Dict[str, Any]] = []
        logger.info("Resolving matches for director: '%s' against %d candidates", director_name, len(candidates))

        for candidate in candidates:
            cand_name = candidate.get("name", "")
            if not cand_name:
                continue

            # 1. Compute fuzzy text match score
            score = fuzz.token_sort_ratio(director_name.lower(), cand_name.lower())
            
            # Additional match check for Jaro-Winkler for nickname/short name variations
            jw_score = fuzz.WRatio(director_name.lower(), cand_name.lower())
            best_score = max(score, jw_score)

            if best_score < self.threshold:
                logger.debug("Discarded match '%s' - Score %.2f below threshold", cand_name, best_score)
                continue

            # 2. Metadata verification (Age, Country, Nationality)
            penalty = 0.0
            bonus = 0.0
            
            # Country verification
            cand_countries = candidate.get("countries", "")
            if nationality and cand_countries:
                # Normalize strings
                nat_norm = nationality.strip().lower()
                countries_list = [c.strip().lower() for c in cand_countries.split(";")]
                
                # Check if matching country abbreviations or country names
                if not any(nat_norm in c or c in nat_norm for c in countries_list):
                    # Slight penalty for mismatching nationality/residence
                    penalty += 10.0
                    logger.debug("Applying penalty for nationality mismatch. Director: %s, Candidate Countries: %s", nationality, cand_countries)
                else:
                    bonus += 5.0

            # DOB Verification
            cand_dob = candidate.get("dob", "")
            if dob and cand_dob:
                dob_norm = dob.strip()
                # Parse years or check substring matching
                if dob_norm in cand_dob or cand_dob in dob_norm:
                    bonus += 10.0
                else:
                    # Check year mismatch
                    dir_year = dob_norm.split("-")[0] if "-" in dob_norm else dob_norm
                    if dir_year and dir_year not in cand_dob:
                        penalty += 15.0
                        logger.debug("Applying penalty for birth year mismatch. Director DOB: %s, Candidate DOB: %s", dob, cand_dob)

            final_confidence = min(100.0, max(0.0, best_score + bonus - penalty))
            
            # Only retain matches if confidence remains above threshold
            if final_confidence >= self.threshold:
                resolved_match = {
                    **candidate,
                    "resolution_score": round(final_confidence, 2),
                    "match_type": candidate.get("match_type", "sanction_list"),
                    "matched_director": director_name
                }
                resolved_matches.append(resolved_match)
                logger.info("Match RESOLVED: '%s' matches '%s' (Confidence: %.2f%%)", director_name, cand_name, final_confidence)

        return sorted(resolved_matches, key=lambda x: x["resolution_score"], reverse=True)
