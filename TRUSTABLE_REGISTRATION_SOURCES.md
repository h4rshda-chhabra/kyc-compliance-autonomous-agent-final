# Trustable Registration Number Sources & Integration

## Current State: NOT TRUSTABLE ❌

**What we're doing now:**
- Hardcoded in JSON seed files
- Made-up example numbers for demo
- No verification against official registries

**Is this acceptable?**
- ✅ **For demo/testing:** Yes
- ❌ **For production/compliance:** Absolutely not

---

## Trustable Sources (By Jurisdiction)

### 1. Government Company Registries (Most Trustable ⭐⭐⭐⭐⭐)

**USA:**
- **SEC EDGAR** (sedar.sec.gov)
  - Free API access
  - CIK (Central Index Key) unique identifier
  - Official registration documents
  - Latency: Real-time (daily updates)
  - Coverage: All publicly traded + many private companies
  - **API:** `https://www.sec.gov/cgi-bin/browse-edgar`

**UK:**
- **Companies House** (companies-house.gov.uk)
  - Free API access
  - Company Number (8-digit)
  - Incorporation date, status, directors
  - Latency: Real-time
  - Coverage: All UK registered companies (~4M)
  - **API:** `https://api.company-information.service.gov.uk`

**India:**
- **Registrar of Companies (ROC)** (mca.gov.in)
  - CIN (Permanent Identification Number)
  - Free database lookup
  - Latency: 24-48 hours (not real-time)
  - Coverage: All Indian registered companies
  - **Method:** Manual lookup or batch CSV download (no official API)

**Germany:**
- **Bundesanzeiger** (Handelsregister)
  - HRA/HRB numbers
  - Free access via Bundesanzeiger.de
  - Latency: 1-3 days
  - **Method:** Web scraping or batch exports

**UAE:**
- **Ministry of Economy** (mofaic.gov.ae)
  - Trade License Registry
  - Free lookup
  - Latency: 1-2 days
  - **Method:** API not public; requires integration request

**Russia:**
- **Federal Tax Service (ФНС)** (egrul.nalog.ru)
  - EGRUL number (14 digits)
  - Free API
  - Latency: Real-time
  - **API:** `https://egrul.nalog.ru`

**Singapore:**
- **ACRA** (Accounting and Corporate Regulatory Authority)
  - UEN (Unique Entity Number)
  - Free API access
  - Latency: Real-time
  - Coverage: All Singapore registered entities
  - **API:** `https://api.acra.gov.sg`

**Cyprus:**
- **Republic of Cyprus, Ministry of Finance**
  - Company number (6-8 digits)
  - Free lookup database
  - Latency: 1-2 days
  - **Method:** Manual lookup

---

### 2. Commercial Data Providers (Trustable ⭐⭐⭐⭐)

These integrate government data + add risk assessment:

**Bloomberg Terminal**
- Coverage: Global (50M+ companies)
- Registration data: Yes (from government sources)
- Trustability: Very high (audited)
- Cost: $20-30K/year
- API: Yes
- **Integration:** Bloomberg API for registration lookup

**Refinitiv** (formerly Reuters)
- Coverage: Global (80M+ companies)
- Registration data: Yes
- Trustability: Very high (institutional data)
- Cost: $15-25K/year
- API: Yes (REST + WebSocket)
- **Integration:** Refinitiv Workspace API

**Bureau van Dijk (Moody's Analytics)**
- Coverage: Global (150M+ companies)
- Registration data: Yes
- Trustability: Excellent (acquired by Moody's)
- Cost: $10-20K/year (varies by coverage)
- API: Yes
- **Integration:** OneSource API

**Dun & Bradstreet**
- Coverage: Global (270M+ companies)
- Registration data: Yes + credit ratings
- Trustability: High
- Cost: $5-15K/year
- API: Yes
- **Integration:** D&B API

**CorpWatch** (USA-focused)
- Coverage: USA (30M+ companies)
- Source: SEC, IRS, state business registries
- Trustability: Open-source aggregation
- Cost: Free (some features paid)
- API: Yes (REST)
- **Integration:** CorpWatch API

---

### 3. Open-Source Data (Moderate Trustability ⭐⭐⭐)

**OpenCorporates**
- Coverage: 150M+ companies globally
- Source: Scrapes official registries from 250+ jurisdictions
- Trustability: Moderate (aggregator, sometimes outdated)
- Cost: Free API (rate-limited) or paid tier
- **Integration:** OpenCorporates REST API
- **Example:** https://api.opencorporates.com/companies/gb/10545342

**Wikidata** (Community-maintained)
- Coverage: Limited but growing
- Trustability: Depends on community; crowdsourced
- Cost: Free
- API: SPARQL endpoint
- **Integration:** Wikidata SPARQL query

---

## Proposed System Architecture

### Option 1: Multi-Source Verification (Most Trustable)

**Goal:** Capture registration number from primary source (government) + verify with secondary (commercial provider)

```
User Input or API Request
        ↓
   [Legal Name, Jurisdiction]
        ↓
   Lookup Government Registry
   (SEC EDGAR, UK Companies House, etc.)
        ↓
   Found? → Extract Registration Number
        ↓
   Verify with Commercial Provider
   (Refinitiv, Bloomberg, Dun & Bradstreet)
        ↓
   Match? → ✅ Store + flag as VERIFIED
   No Match? → ⚠️ Store + flag as UNVERIFIED
        ↓
   Store in Database with:
   - registration_number
   - source (e.g., "SEC EDGAR")
   - verified_at (timestamp)
   - verification_status ("verified" / "unverified")
```

### Option 2: Single Trusted Source (Simpler)

**Goal:** Pick one commercial provider (e.g., Refinitiv) as single source of truth

```
User Input [Legal Name, Jurisdiction]
        ↓
   Query Refinitiv API
        ↓
   Found? → Extract + Store
   Not Found? → Mark as "requires_manual_review"
        ↓
   Flag for Compliance Officer review
```

---

## Implementation: How to Add Trustable Sources

### Step 1: Update Database Schema

Add verification fields to Company model:

**File:** `backend/app/models/company.py`

```python
class Company(Base):
    __tablename__ = "companies"
    
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    legal_name: Mapped[str] = mapped_column(String(255), index=True)
    registration_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    registration_verified: Mapped[bool] = mapped_column(default=False)  # ← NEW
    registration_source: Mapped[str | None] = mapped_column(String(100), nullable=True)  # ← NEW
    registration_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # ← NEW
    registration_verification_provider: Mapped[str | None] = mapped_column(String(100), nullable=True)  # ← NEW (e.g., "SEC_EDGAR", "COMPANIES_HOUSE")
    jurisdiction: Mapped[str | None] = mapped_column(String(100), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(150), nullable=True)
    # ... rest of fields
```

### Step 2: Create Registry Service Layer

**File:** `backend/app/services/company_registry.py` (NEW)

```python
"""Integration with trustable company registration sources.

Provides APIs to look up and verify company registration numbers
from official government registries and commercial providers.
"""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime
import httpx
import logging

logger = logging.getLogger("app.company_registry")

@dataclass
class RegistryLookupResult:
    registration_number: str
    legal_name: str
    jurisdiction: str
    source: str  # "SEC_EDGAR", "COMPANIES_HOUSE", "REFINITIV", etc.
    verified: bool
    verified_at: datetime
    raw_data: dict  # Store full response for audit trail


class CompanyRegistryService:
    """Query official registries for registration numbers."""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def lookup_usa_sec(self, company_name: str) -> Optional[RegistryLookupResult]:
        """Lookup company in US SEC EDGAR database.
        
        Returns CIK number if found.
        """
        try:
            # SEC EDGAR API: search by company name
            url = "https://www.sec.gov/cgi-bin/browse-edgar"
            params = {
                "company": company_name,
                "CIK": "",
                "action": "getcompany",
                "output": "json"
            }
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("cik_lookup"):
                # Found a match
                cik = data["cik_lookup"]["CIK"]
                return RegistryLookupResult(
                    registration_number=str(cik),
                    legal_name=company_name,
                    jurisdiction="USA",
                    source="SEC_EDGAR",
                    verified=True,
                    verified_at=datetime.utcnow(),
                    raw_data=data,
                )
            return None
        except Exception as e:
            logger.error(f"SEC EDGAR lookup failed for '{company_name}': {e}")
            return None
    
    async def lookup_uk_companies_house(self, company_name: str) -> Optional[RegistryLookupResult]:
        """Lookup company in UK Companies House database.
        
        Requires API key from Companies House.
        """
        try:
            # Companies House API (requires auth)
            api_key = os.getenv("COMPANIES_HOUSE_API_KEY")
            if not api_key:
                logger.warning("COMPANIES_HOUSE_API_KEY not set")
                return None
            
            url = "https://api.company-information.service.gov.uk/search/companies"
            headers = {
                "Authorization": f"Basic {base64.b64encode(f'{api_key}:'.encode()).decode()}"
            }
            params = {"q": company_name}
            
            response = await self.client.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("items"):
                # Found a match
                company = data["items"][0]
                return RegistryLookupResult(
                    registration_number=company["company_number"],
                    legal_name=company["title"],
                    jurisdiction="UK",
                    source="COMPANIES_HOUSE",
                    verified=True,
                    verified_at=datetime.utcnow(),
                    raw_data=company,
                )
            return None
        except Exception as e:
            logger.error(f"Companies House lookup failed for '{company_name}': {e}")
            return None
    
    async def lookup_singapore_acra(self, company_name: str) -> Optional[RegistryLookupResult]:
        """Lookup company in Singapore ACRA registry.
        
        Requires API key from ACRA.
        """
        try:
            api_key = os.getenv("ACRA_API_KEY")
            if not api_key:
                logger.warning("ACRA_API_KEY not set")
                return None
            
            url = "https://api.acra.gov.sg/search"
            headers = {"Authorization": f"Bearer {api_key}"}
            params = {"name": company_name}
            
            response = await self.client.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("entities"):
                entity = data["entities"][0]
                return RegistryLookupResult(
                    registration_number=entity["uen"],
                    legal_name=entity["name"],
                    jurisdiction="Singapore",
                    source="ACRA",
                    verified=True,
                    verified_at=datetime.utcnow(),
                    raw_data=entity,
                )
            return None
        except Exception as e:
            logger.error(f"ACRA lookup failed for '{company_name}': {e}")
            return None
    
    async def lookup_opencorporates(self, company_name: str, jurisdiction: str) -> Optional[RegistryLookupResult]:
        """Fallback: lookup in OpenCorporates (aggregates multiple registries).
        
        Free but rate-limited. Good for global coverage.
        """
        try:
            url = "https://api.opencorporates.com/companies/search"
            params = {
                "q": company_name,
                "jurisdiction_code": self._map_jurisdiction_to_opencorp(jurisdiction)
            }
            
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("companies"):
                company = data["companies"][0]
                return RegistryLookupResult(
                    registration_number=company["company_number"],
                    legal_name=company["name"],
                    jurisdiction=jurisdiction,
                    source="OPENCORPORATES",
                    verified=False,  # Lower confidence for aggregator
                    verified_at=datetime.utcnow(),
                    raw_data=company,
                )
            return None
        except Exception as e:
            logger.error(f"OpenCorporates lookup failed for '{company_name}': {e}")
            return None
    
    async def lookup_multi_source(self, company_name: str, jurisdiction: str) -> Optional[RegistryLookupResult]:
        """Try multiple sources in order of trustability."""
        
        # Map jurisdiction to appropriate lookup service
        if jurisdiction.upper() in ["USA", "UNITED STATES"]:
            result = await self.lookup_usa_sec(company_name)
            if result:
                return result
        
        if jurisdiction.upper() in ["UK", "UNITED KINGDOM", "ENGLAND"]:
            result = await self.lookup_uk_companies_house(company_name)
            if result:
                return result
        
        if jurisdiction.upper() == "SINGAPORE":
            result = await self.lookup_singapore_acra(company_name)
            if result:
                return result
        
        # Fallback: OpenCorporates (covers 250+ jurisdictions)
        result = await self.lookup_opencorporates(company_name, jurisdiction)
        if result:
            return result
        
        return None
    
    @staticmethod
    def _map_jurisdiction_to_opencorp(jurisdiction: str) -> str:
        """Map jurisdiction name to OpenCorporates jurisdiction code."""
        mapping = {
            "USA": "us",
            "UNITED STATES": "us",
            "UK": "gb",
            "UNITED KINGDOM": "gb",
            "SINGAPORE": "sg",
            "INDIA": "in",
            "RUSSIA": "ru",
            "CYPRUS": "cy",
            "UAE": "ae",
            "UNITED ARAB EMIRATES": "ae",
        }
        return mapping.get(jurisdiction.upper(), jurisdiction.lower())
```

### Step 3: Update Company Onboarding Route

**File:** `backend/app/routes/companies.py`

```python
from app.services.company_registry import CompanyRegistryService

registry_service = CompanyRegistryService()

@router.post("")
async def create_custom_company(
    payload: CompanyCreate, 
    db: Session = Depends(get_db)
) -> dict:
    """Create a custom company and verify registration number if provided."""
    
    company_id = f"CUSTOM-{uuid.uuid4().hex[:8]}"
    
    # Try to lookup registration number from trustable source
    registration_number = payload.registration_number
    registration_verified = False
    registration_source = None
    
    if not registration_number:
        # Attempt automatic lookup
        logger.info(f"Attempting automatic registration lookup for '{payload.legal_name}'")
        lookup_result = await registry_service.lookup_multi_source(
            company_name=payload.legal_name,
            jurisdiction=payload.jurisdiction or "Unknown"
        )
        
        if lookup_result:
            registration_number = lookup_result.registration_number
            registration_source = lookup_result.source
            registration_verified = lookup_result.verified
            logger.info(
                f"Found registration '{registration_number}' from {registration_source} "
                f"for '{payload.legal_name}'"
            )
    
    company = Company(
        id=company_id,
        legal_name=payload.legal_name,
        jurisdiction=payload.jurisdiction,
        industry=payload.industry,
        registration_number=registration_number,
        registration_verified=registration_verified,
        registration_source=registration_source,
        registration_verified_at=datetime.utcnow() if registration_verified else None,
        monitoring_status="not_monitored",
        risk_level="unknown",
    )
    
    db.add(company)
    db.commit()
    db.refresh(company)
    
    return _serialize_scanned(company)
```

### Step 4: Add Environment Variables for API Keys

**File:** `.env`

```bash
# Trustable Registry APIs
SEC_EDGAR_API_KEY=  # No key needed, free API
COMPANIES_HOUSE_API_KEY=sk_live_XXXXX  # Requires registration
ACRA_API_KEY=XXXXX  # Singapore, requires registration
OPENCORPORATES_API_KEY=XXXXX  # Optional, for higher rate limits
```

---

## Verification Workflow in SAR

Update SAR template to show verification status:

**File:** `backend/app/templates/sar_template.md`

```markdown
## 2. Subject Information
### Corporate Entity
* **Legal Name**: {{ company_name }}
* **Registration Number**: {{ registration_number }}
* **Registration Source**: {{ registration_source }}
* **Registration Verified**: {{ registration_verified }} ({{ registration_verified_at }})
* **Jurisdiction**: {{ jurisdiction }}
```

**Example SAR output:**
```
* **Legal Name**: APPLE INC
* **Registration Number**: 1018724
* **Registration Source**: SEC_EDGAR (Primary, Official)
* **Registration Verified**: Yes (2026-07-16T10:45:00Z)
* **Jurisdiction**: USA
```

---

## Trustability Ranking

### Tier 1: Official Government Registries ⭐⭐⭐⭐⭐
- **Examples:** SEC EDGAR, UK Companies House, Singapore ACRA, India ROC
- **Trustability:** Highest
- **Cost:** Free or $0-5K/year
- **Latency:** Real-time to 24 hours
- **Use for:** Primary source of truth
- **Verification:** Mark as `registration_verified = true` with `registration_source`

### Tier 2: Commercial Data Aggregators ⭐⭐⭐⭐
- **Examples:** Refinitiv, Bloomberg, Dun & Bradstreet, Bureau van Dijk
- **Trustability:** Very high (institutional data, audited)
- **Cost:** $5-30K/year
- **Latency:** Near real-time
- **Use for:** Primary (if government API unavailable) or verification layer
- **Verification:** Mark as `registration_verified = true`, but note provider

### Tier 3: Open-Source Aggregators ⭐⭐⭐
- **Examples:** OpenCorporates, Wikidata
- **Trustability:** Moderate (depends on source data, sometimes outdated)
- **Cost:** Free
- **Latency:** 1-7 days
- **Use for:** Fallback when Tier 1 & 2 unavailable
- **Verification:** Mark as `registration_verified = false` or `uncertain`

### Tier 4: Manual Entry ⭐
- **Trustability:** Low (user error, no verification)
- **Cost:** Staff time
- **Use for:** Only when other sources exhausted + manual review required
- **Verification:** Always `registration_verified = false` until checked

---

## Production Recommendation

### Minimum Viable Setup (Week 1)

1. **Add database fields:** `registration_verified`, `registration_source`, `registration_verified_at`
2. **Integrate SEC EDGAR:** (free, covers USA)
3. **Integrate OpenCorporates:** (free, covers 250+ jurisdictions as fallback)
4. **Mark in SAR:** Show verification status

### Full Setup (2-4 weeks)

1. **Integrate primary jurisdiction-specific APIs:**
   - USA: SEC EDGAR (free)
   - UK: Companies House (£100/year)
   - Singapore: ACRA ($200/year)
   - India: Manual ROC CSV export (free, batch daily)

2. **Add commercial provider** (choose one):
   - **Budget:** Refinitiv ($15K/year) — good coverage globally
   - **Budget-conscious:** CorpWatch ($0-5K) — USA-focused but affordable

3. **Implement verification workflow:**
   - Automatic lookup on company creation
   - Flag unverified for manual review
   - Store audit trail of verification

4. **Dashboard:**
   - Show verification status for each company
   - Alert on unverified registrations
   - Manual override capability for edge cases

---

## Summary: Can We Capture Trustably?

| Scenario | Answer | Effort | Cost |
|----------|--------|--------|------|
| **Demo (current)** | No, hardcoded | N/A | N/A |
| **Add SEC EDGAR** | Yes (USA only) | 1 day | $0 |
| **Add OpenCorporates** | Partially (250+ jurisdictions, lower confidence) | 1 day | $0-100/month |
| **Add all major APIs** | Yes (covers 95% of target companies) | 2 weeks | $5-20K/year |
| **Add Refinitiv + EDGAR** | Yes (very trustable) | 3 weeks | $15-20K/year |

**Recommendation:** If this goes to production, start with SEC EDGAR (free) + OpenCorporates (free fallback), then add jurisdiction-specific APIs + commercial provider based on compliance requirements.
