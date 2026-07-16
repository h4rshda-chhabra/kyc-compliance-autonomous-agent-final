import re
from typing import Dict, List, Tuple

# Pre-defined keyword mappings to classify adverse news articles and assign severity levels.
# Categories: Fraud, Money Laundering, Corruption, Bribery, Sanctions, Tax Evasion, 
#             Terror Financing, Organized Crime, Cybercrime, Litigation, Other.
# Severities: Low, Medium, High, Critical.

KEYWORDS_MAPPING: Dict[str, Tuple[List[str], str]] = {
    "Terror Financing": (
        [
            r"\bterror(ism|ist)?\b", r"\bisis\b", r"\bal-qaeda\b", r"\bhamas\b", 
            r"\bbomb(ing)?\b", r"\bhijack\b", r"\bmilitant\b", r"\bextremist\b"
        ],
        "Critical"
    ),
    "Sanctions": (
        [
            r"\bsanction(ed|s)?\b", r"\bofac\b", r"\bblacklist\b", r"\bembargo\b", 
            r"\bfrozen assets\b", r"\brestrictive measures\b"
        ],
        "Critical"
    ),
    "Money Laundering": (
        [
            r"\bmoney laundering\b", r"\blaundering\b", r"\bfincen\b", r"\bsmuggling\b",
            r"\bshell company\b", r"\bstructuring deposits\b", r"\baml\b", r"\bkyc violation\b"
        ],
        "Critical"
    ),
    "Organized Crime": (
        [
            r"\bcartel\b", r"\bmafia\b", r"\bsyndicate\b", r"\bhuman trafficking\b", 
            r"\bdrug trafficking\b", r"\bgang\b", r"\borganized crime\b"
        ],
        "High"
    ),
    "Bribery": (
        [
            r"\bbrib(e|ery|ing)?\b", r"\bkickback\b", r"\bfcaps\b", r"\bgraft\b", 
            r"\bfacilitation payment\b"
        ],
        "High"
    ),
    "Corruption": (
        [
            r"\bcorrupt(ion)?\b", r"\bembezz(le|lement)?\b", r"\bmisappropriat(e|ion)?\b", 
            r"\bnepotism\b", r"\bplunder\b"
        ],
        "High"
    ),
    "Tax Evasion": (
        [
            r"\btax evasion\b", r"\btax fraud\b", r"\boffshore shelter\b", r"\btax haven\b", 
            r"\bpanama papers\b"
        ],
        "High"
    ),
    "Fraud": (
        [
            r"\bfraud(ulent)?\b", r"\bponzi\b", r"\bscam\b", r"\bcheat\b", r"\bdeceiv(e|ed)?\b", 
            r"\bfalsif(y|ied)?\b", r"\btheranos\b", r"\bwirecard\b", r"\benron\b", r"\bforger(y)?\b"
        ],
        "High"
    ),
    "Cybercrime": (
        [
            r"\bhack(er|ed|ing)?\b", r"\bransomware\b", r"\bcyberattack\b", r"\bphishing\b", 
            r"\bdata breach\b", r"\bmalware\b"
        ],
        "Medium"
    ),
    "Litigation": (
        [
            r"\bsue(d)?\b", r"\blawsuit\b", r"\bcourt\b", r"\bprosecut(or|ed|ion)?\b", 
            r"\bindict(ed)?\b", r"\bcharg(ed|es)?\b", r"\btrial\b", r"\bconvict(ed)?\b",
            r"\barrest(ed)?\b", r"\bsettlement\b"
        ],
        "Medium"
    )
}

class NewsClassifier:
    """Keyword-based adverse news classifier that runs deterministically without calling an LLM."""

    @staticmethod
    def classify(title: str, description: str) -> Tuple[str, str]:
        """Analyzes title and description text to classify it and assign a severity.
        
        Returns:
            Tuple[str, str]: (Category, Severity)
        """
        combined_text = f"{title} {description}".lower()
        
        highest_severity = "Low"
        matched_category = "Other"
        
        # Severity rank to easily compare which is higher
        severity_rank = {
            "Low": 0,
            "Medium": 1,
            "High": 2,
            "Critical": 3
        }
        
        for category, (patterns, severity) in KEYWORDS_MAPPING.items():
            for pattern in patterns:
                if re.search(pattern, combined_text):
                    # If this category has a higher severity than our current best, update it
                    if severity_rank[severity] > severity_rank[highest_severity]:
                        highest_severity = severity
                        matched_category = category
                    # If same severity, default to the first matching category (or keep current)
                    elif severity_rank[severity] == severity_rank[highest_severity] and matched_category == "Other":
                        matched_category = category
                        
        return matched_category, highest_severity
