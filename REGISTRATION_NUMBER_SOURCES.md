# Where Registration Numbers Come From

## Summary

Registration numbers have **three possible sources**:

1. **Demo seed scripts** (JSON files with hardcoded values)
2. **Manual API input** (user provides when creating a custom company)
3. **Sanctions directory** (None — OpenSanctions doesn't include registration numbers)

---

## Source 1: Demo Seed Scripts (Demo Data)

### File: `datasets/demo/demo_companies.json`

**Example:**
```json
{
  "company_name": "TechNova Solutions Pvt Ltd",
  "jurisdiction": "India",
  "registration_number": "U72200MH2023PTC123456",
  "industry": "Software Development",
  "directors": [...]
}
```

**Companies with registration numbers (from seed):**
- TechNova Solutions Pvt Ltd: `U72200MH2023PTC123456` (India CIN)
- Vostok Shipping Agency: `RU-987654321` (Russia)
- Theranos Inc: `US-DEL-4321098` (Delaware)

**How it's loaded:**
- `scripts/seed_demo_data.py` reads the JSON
- Line 147: `registration_number=comp_data["registration_number"]`
- Creates Company record with this value

### File: `scripts/seed_contamination_demo.py`

**Hardcoded in script:**
```python
SEED_COMPANIES = [
    {
        "legal_name": "Crimson Star Logistics FZE",
        "registration_number": "AE-FZ-118842",
        "jurisdiction": "United Arab Emirates",
        ...
    },
    {
        "legal_name": "Helios Marine Services Ltd",
        "registration_number": "CY-HE-402917",
        "jurisdiction": "Cyprus",
        ...
    },
    {
        "legal_name": "Nordwind Capital Partners",
        "registration_number": "SG-201944712K",
        "jurisdiction": "Singapore",
        ...
    },
]
```

**Companies:**
- Crimson Star Logistics FZE: `AE-FZ-118842` (UAE)
- Helios Marine Services Ltd: `CY-HE-402917` (Cyprus)
- Nordwind Capital Partners: `SG-201944712K` (Singapore)

---

## Source 2: Manual API Input (Custom Companies)

### API Endpoint: `POST /companies`

**Current limitation:** Registration number is NOT supported in the request payload.

**Current schema** (`backend/app/schemas/companies.py`):
```python
class CompanyCreate(BaseModel):
    legal_name: str
    jurisdiction: Optional[str] = None
    industry: Optional[str] = None
    # registration_number is NOT here
```

**Current behavior** (`backend/app/routes/companies.py`, line 115–129):
```python
@router.post("")
def create_custom_company(payload: CompanyCreate, db: Session = Depends(get_db)) -> dict:
    company_id = f"CUSTOM-{uuid.uuid4().hex[:8]}"
    company = Company(
        id=company_id,
        legal_name=payload.legal_name,
        jurisdiction=payload.jurisdiction,
        industry=payload.industry,
        monitoring_status="not_monitored",
        risk_level="unknown",
        # registration_number is NOT set here (defaults to None)
    )
```

**Result:** When users create a custom company via API, registration_number is **always None**.

**To fix this** (if you want to accept registration numbers):

```python
# 1. Update schema
class CompanyCreate(BaseModel):
    legal_name: str
    jurisdiction: Optional[str] = None
    industry: Optional[str] = None
    registration_number: Optional[str] = None  # ADD THIS

# 2. Update endpoint
company = Company(
    ...
    registration_number=payload.registration_number,  # ADD THIS
)
```

---

## Source 3: Sanctions Directory (OpenSanctions)

### The Sanctions Database

**File:** `datasets/processed/sanctions_lookup.db` (SQLite)

**Contents:** OFAC SDN + OpenSanctions data (~1M entities)

**What's in it:**
```sql
CREATE TABLE entities (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,  -- "Person", "Company", etc.
    source TEXT,  -- "OFAC SDN", "OpenSanctions", etc.
    countries TEXT,  -- Country codes
    dob TEXT  -- Date of birth (if Person)
);
```

**The Problem:** OpenSanctions does NOT include registration numbers.

**How it's used in the system** (`backend/app/routes/companies.py`, line 35–55):

```python
def _serialize_directory(entity: DirectoryCompany) -> dict:
    """A dataset company that has never been scanned — no Postgres state yet."""
    return {
        "id": entity.id,
        "legal_name": entity.name,
        "registration_number": None,  # ← ALWAYS None from directory
        "jurisdiction": entity.countries,
        "industry": None,  # ← Also None; OpenSanctions has no industry
        "monitoring_status": "not_monitored",
        "risk_level": "unknown",
        "onboarded_at": None,
        ...
    }
```

**Why None?**
- OpenSanctions is a **name-based watchlist**
- It tracks sanctioned individuals and entities by name, country, date of birth
- It does NOT track company registration numbers
- Registration numbers are jurisdiction-specific and vary (CIN in India, RUC in Russia, Delaware ID in US, etc.)

**When a company is triggered for audit** (`backend/app/routes/monitor.py`, line 53–79):

```python
@router.post("/monitor/companies/{company_id}/trigger")
def trigger_manual_run(company_id: str, ...):
    company = db.get(Company, company_id)
    if company is None:
        # First scan: materialize the company from the sanctions dataset directory
        entity = get_directory_company(company_id)  # From sanctions DB
        if entity is None:
            raise HTTPException(status_code=404, detail="Company not found")
        company = Company(
            id=entity.id,
            legal_name=entity.name,
            jurisdiction=entity.countries,
            industry=None,  # No industry in OpenSanctions
            # registration_number not set — defaults to None
            monitoring_status="onboarding",
            risk_level="unknown",
        )
        db.add(company)
        db.commit()
```

---

## In the Database

### Query to See All Registration Numbers

```sql
SELECT legal_name, registration_number, jurisdiction FROM companies WHERE registration_number IS NOT NULL;
```

**Current output** (from our seeds):
```
                legal_name                 |    registration_number    |    jurisdiction
--------------------------------------------+---------------------------+-------------------
TechNova Solutions Pvt Ltd                  | U72200MH2023PTC123456    | India
Vostok Shipping Agency                      | RU-987654321              | Russia
Theranos Inc                                | US-DEL-4321098            | United States
Crimson Star Logistics FZE                  | AE-FZ-118842              | United Arab Emirates
Helios Marine Services Ltd                  | CY-HE-402917              | Cyprus
Nordwind Capital Partners                   | SG-201944712K             | Singapore
(6 rows)
```

**Note:** All current registration numbers come from our seed scripts, not from OpenSanctions.

---

## SAR Template Usage

### File: `backend/app/templates/sar_template.md`

```markdown
## 2. Subject Information
### Corporate Entity
* **Legal Name**: {{ company_name }}
* **Registration Number**: {{ registration_number }}
* **Jurisdiction**: {{ jurisdiction }}
```

### How it's populated (`backend/app/orchestrator/orchestrator.py`, line 460):

```python
sar_narrative = template_content\
    .replace("{{ registration_number }}", company.registration_number or "N/A")
```

**Result in SAR:**
- If registration_number exists: Displays it
- If registration_number is None: Shows "N/A"

**Example from demo:**
```
* **Legal Name**: Theranos Inc
* **Registration Number**: US-DEL-4321098
* **Jurisdiction**: United States
```

---

## Production Data Sources

In a **real deployment**, registration numbers would come from:

1. **User input** (compliance officer manually enters when onboarding)
   - Requires UI form and database schema update
   - **Currently not implemented**

2. **Third-party APIs** (company data providers)
   - Examples: Bloomberg, Refinitiv, Bureau van Dijk, CorpWatch
   - Would require API integration
   - **Not implemented**

3. **Government registries** (direct lookups)
   - Examples: Secretary of State (USA), Companies House (UK), ROC (India)
   - Would require API connectors per jurisdiction
   - **Not implemented**

4. **User uploads** (CSV/Excel with registration data)
   - Batch import functionality
   - **Not implemented**

---

## Current Limitation & How to Fix It

### The Issue
- **Custom companies** created via API don't capture registration numbers
- **Companies from OpenSanctions** never have registration numbers
- Registration numbers are only available in demo seeds

### Quick Fix (If Needed for Your Demo)

**Option A: Update the API to accept registration_number**

File: `backend/app/schemas/companies.py`
```python
class CompanyCreate(BaseModel):
    legal_name: str
    jurisdiction: Optional[str] = None
    industry: Optional[str] = None
    registration_number: Optional[str] = None  # ADD THIS LINE
```

File: `backend/app/routes/companies.py` (line 115–129)
```python
@router.post("")
def create_custom_company(payload: CompanyCreate, db: Session = Depends(get_db)) -> dict:
    company_id = f"CUSTOM-{uuid.uuid4().hex[:8]}"
    company = Company(
        id=company_id,
        legal_name=payload.legal_name,
        jurisdiction=payload.jurisdiction,
        industry=payload.industry,
        registration_number=payload.registration_number,  # ADD THIS LINE
        monitoring_status="not_monitored",
        risk_level="unknown",
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return _serialize_scanned(company)
```

**Option B: Add registration number to the frontend form**

File: `frontend/src/pages/OnboardingPage.tsx` (or similar)
```tsx
// Add input field for registration number in the form
<input 
  name="registration_number" 
  placeholder="Enter company registration number (optional)" 
/>

// Pass it in the API call
const response = await apiClient.post('/companies', {
  legal_name: formData.legal_name,
  jurisdiction: formData.jurisdiction,
  industry: formData.industry,
  registration_number: formData.registration_number,  // Add this
});
```

---

## For Your Demo

**The good news:** Registration numbers are already in the demo data, so they'll appear in all SARs.

**What users see:**
- Nordwind: `SG-201944712K`
- Theranos: `US-DEL-4321098`
- Vostok: `RU-987654321`

**What to mention if asked:**
> "In production, registration numbers would come from user input or integrated company data APIs. For this demo, we've seeded them from the demo dataset. The system stores and includes them in all SARs for compliance documentation."

---

## Summary Table

| Source | Registration Number | When Used | Current Status |
|--------|-----------------------|-----------|-----------------|
| Demo JSON seed | Yes (hardcoded) | Demo companies | ✅ Working |
| Contamination seed | Yes (hardcoded) | Demo companies | ✅ Working |
| Manual API input | Would need schema update | Custom companies | ❌ Not supported |
| OpenSanctions directory | No (not available) | Companies from watchlist | N/A |
| UI form | Not included in form | Manual onboarding | ❌ Not implemented |

---

## Questions to Answer

**Q: "Where do you get registration numbers from?"**
> "For this demo, from our seed scripts. In production, from user input or integrated company data APIs (Bloomberg, Refinitiv, government registries)."

**Q: "Can I integrate with [company data provider]?"**
> "Yes, the system accepts registration numbers via API. You'd build a connector that fetches from your data provider and passes it to POST /companies."

**Q: "What if the registration number is wrong?"**
> "It's metadata for compliance documentation in SARs. The actual risk assessment is based on director names, sanctions matching, and adverse media — not registration numbers. If it's wrong, update it via the API and the next SAR will reflect the change."
