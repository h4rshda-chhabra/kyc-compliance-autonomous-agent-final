import csv
import sqlite3
import os
import sys

def preprocess():
    processed_dir = "datasets/processed"
    opensanctions_path = os.path.join(processed_dir, "opensactions.csv")
    ofac_path = os.path.join(processed_dir, "ofac_sdn.csv")
    db_path = os.path.join(processed_dir, "sanctions_lookup.db")

    print("Checking dataset files...")
    if not os.path.exists(opensanctions_path):
        print(f"Error: OpenSanctions file not found at {opensanctions_path}. Please rename targets.simple.csv to opensactions.csv.")
        sys.exit(1)
    if not os.path.exists(ofac_path):
        print(f"Error: OFAC SDN file not found at {ofac_path}. Please rename sdn.csv to ofac_sdn.csv.")
        sys.exit(1)

    # Remove existing preprocessed DB if it exists
    if os.path.exists(db_path):
        os.remove(db_path)

    print(f"Creating SQLite search index at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Create tables
    cursor.execute("""
        CREATE TABLE entities (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT,
            source TEXT,
            countries TEXT,
            dob TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE aliases (
            entity_id TEXT,
            alias_name TEXT NOT NULL,
            FOREIGN KEY(entity_id) REFERENCES entities(id)
        )
    """)

    # Index names for fast lookup
    cursor.execute("CREATE INDEX idx_entity_name ON entities(name)")
    cursor.execute("CREATE INDEX idx_alias_name ON aliases(alias_name)")
    conn.commit()

    # Ingest OFAC SDN (delimited, no headers)
    print("Ingesting OFAC SDN list...")
    ofac_count = 0
    with open(ofac_path, mode="r", encoding="utf-8", errors="ignore") as f:
        reader = csv.reader(f)
        entities_batch = []
        for row in reader:
            if len(row) < 4:
                continue
            ent_num = f"OFAC-{row[0].strip()}"
            name = row[1].strip()
            sdn_type = row[2].strip()
            program = row[3].strip()
            
            # Map OFAC type to standard schema types
            entity_type = "Person" if sdn_type.lower() == "individual" else "Organization"
            if sdn_type.lower() == "vessel":
                entity_type = "Vessel"
            elif sdn_type.lower() == "aircraft":
                entity_type = "Aircraft"

            remarks = row[11].strip() if len(row) > 11 else ""
            
            entities_batch.append((ent_num, name, entity_type, f"OFAC SDN ({program})", "", remarks))
            ofac_count += 1

            if len(entities_batch) >= 1000:
                cursor.executemany(
                    "INSERT OR REPLACE INTO entities VALUES (?, ?, ?, ?, ?, ?)", 
                    entities_batch
                )
                entities_batch = []
        
        if entities_batch:
            cursor.executemany("INSERT OR REPLACE INTO entities VALUES (?, ?, ?, ?, ?, ?)", entities_batch)
    
    print(f"Successfully loaded {ofac_count} OFAC SDN entities.")

    # Ingest OpenSanctions (has headers)
    print("Ingesting OpenSanctions list (this may take a minute due to file size)...")
    opensanctions_count = 0
    alias_count = 0
    with open(opensanctions_path, mode="r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        entities_batch = []
        aliases_batch = []
        
        for row in reader:
            ent_id = row.get("id")
            name = row.get("name")
            if not ent_id or not name:
                continue
                
            schema = row.get("schema", "Person")
            countries = row.get("countries", "")
            dob = row.get("birth_date", "")
            dataset = row.get("dataset", "OpenSanctions")

            # Store entity
            entities_batch.append((ent_id, name, schema, dataset, countries, dob))
            opensanctions_count += 1

            # Store aliases
            aliases_str = row.get("aliases", "")
            if aliases_str:
                for alias in aliases_str.split(";"):
                    alias = alias.strip()
                    if alias:
                        aliases_batch.append((ent_id, alias))
                        alias_count += 1

            # Commit batches
            if len(entities_batch) >= 5000:
                cursor.executemany("INSERT OR REPLACE INTO entities VALUES (?, ?, ?, ?, ?, ?)", entities_batch)
                entities_batch = []
            if len(aliases_batch) >= 5000:
                cursor.executemany("INSERT INTO aliases VALUES (?, ?)", aliases_batch)
                aliases_batch = []

        if entities_batch:
            cursor.executemany("INSERT OR REPLACE INTO entities VALUES (?, ?, ?, ?, ?, ?)", entities_batch)
        if aliases_batch:
            cursor.executemany("INSERT INTO aliases VALUES (?, ?)", aliases_batch)

    conn.commit()
    conn.close()
    print(f"Successfully loaded {opensanctions_count} OpenSanctions entities and {alias_count} aliases.")
    print("Preprocessing completed successfully. Pre-indexed SQLite lookup database is ready!")

if __name__ == "__main__":
    preprocess()
