# WELLBEING SPACES – MASTERPLAN v2.0

## Übersicht
Komplette Architektur-Überarbeitung + neue Features für B2B SaaS.
Codebase: ~27.700 LOC, ~100 TypeScript-Dateien, 35 DB-Migrations.

---

## PHASE 1: FOUNDATION (Sicherheit + Datenintegrität)

### 1.1 Multi-Tenancy (KRITISCH)

**Problem:** Alle RLS-Policies sind `USING (true)` – jeder Auth-User sieht ALLE Daten.

**Lösung:** `organisationen`-Tabelle + `organisation_id` auf JEDER Datentabelle.

```sql
-- Migration 036: Multi-Tenancy Foundation

-- Organisationen (= Firmen/Abonnenten)
CREATE TABLE IF NOT EXISTS organisationen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE,
  email           TEXT,
  telefon         TEXT,
  website         TEXT,
  adresse         TEXT,
  logo_url        TEXT,
  abo_plan        TEXT NOT NULL DEFAULT 'trial'
                  CHECK (abo_plan IN ('trial','starter','professional','enterprise')),
  abo_aktiv_bis   TIMESTAMPTZ,
  max_projekte    INTEGER DEFAULT 5,
  max_mitglieder  INTEGER DEFAULT 3,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- organisation_id auf team_mitglieder (Brücke User → Org)
ALTER TABLE team_mitglieder 
  ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;

-- organisation_id auf ALLE Datentabellen:
ALTER TABLE kunden ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE projekte ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE raeume ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE partner ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE produkte ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE einstellungen ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE branding ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE notizen ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE dateien ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE freigabe_tokens ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE onboarding_anfragen ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE onboarding_vorlagen ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE konfigurator_sessions ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE projekt_aktivitaeten ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE client_users ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE client_nachrichten ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE client_dokumente ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE client_aktivitaeten ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE client_benachrichtigungen ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE demo_anfragen ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;

-- Indizes
CREATE INDEX IF NOT EXISTS idx_kunden_org ON kunden(organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projekte_org ON projekte(organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_produkte_org ON produkte(organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_partner_org ON partner(organisation_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_org ON team_mitglieder(organisation_id);

-- Helper: Organisation-ID des aktuellen Users ermitteln
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organisation_id FROM team_mitglieder
  WHERE user_id = auth.uid() AND status = 'aktiv'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ALLE alten Policies droppen + neue erstellen
-- (Beispiel für kunden – muss für ALLE Tabellen wiederholt werden)
DROP POLICY IF EXISTS "Admin: voller Zugriff" ON kunden;
CREATE POLICY "Org-Zugriff" ON kunden
  FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());
```

**Betroffene Dateien (Code):**
- JEDE Server Action muss `organisation_id` beim Insert setzen
- Neuer Helper: `getOrganisationId()` in `src/lib/supabase/server.ts`
- Middleware: Org-Kontext laden
- Registrierung: Org erstellen → User → team_mitglieder verknüpfen

---

### 1.2 Kategorien als echte Tabellen

**Problem:** Kategorien sind CSV-Strings in `einstellungen`. Kein FK, kein Rename-Cascading.

```sql
-- Migration 037: Kategorien-Tabellen

CREATE TABLE IF NOT EXISTS kategorien (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  typ             TEXT NOT NULL CHECK (typ IN ('produktkategorie','raumtyp','projektart')),
  name            TEXT NOT NULL,
  icon            TEXT DEFAULT 'Package',
  reihenfolge     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, typ, name)
);

CREATE INDEX IF NOT EXISTS idx_kategorien_org_typ ON kategorien(organisation_id, typ);

-- Produkte: kategorie TEXT → kategorie_id UUID
ALTER TABLE produkte ADD COLUMN IF NOT EXISTS kategorie_id UUID REFERENCES kategorien(id) ON DELETE SET NULL;
-- Räume: raumtyp aus Name → raumtyp_id
ALTER TABLE raeume ADD COLUMN IF NOT EXISTS raumtyp_id UUID REFERENCES kategorien(id) ON DELETE SET NULL;
-- Projekte: projektart TEXT → projektart_id
ALTER TABLE projekte ADD COLUMN IF NOT EXISTS projektart_id UUID REFERENCES kategorien(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE kategorien ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org-Zugriff" ON kategorien
  FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());
```

**Migration bestehender Daten:**
- CSV aus `einstellungen` lesen
- Für jeden Eintrag eine Zeile in `kategorien` anlegen
- `produkte.kategorie` → `produkte.kategorie_id` matchen
- Alte `kategorie` TEXT-Spalte behalten (Fallback), später droppen

---

### 1.3 Produkt-Referenz-System

**Problem:** Produkte werden kopiert statt verlinkt. Preis-Update in Bibliothek hat keinen Effekt auf Projekte.

```sql
-- Migration 038: Produkt-Referenzen

-- Neue Zwischentabelle: Raum ↔ Produkt (n:m)
CREATE TABLE IF NOT EXISTS raum_produkte (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  raum_id         UUID NOT NULL REFERENCES raeume(id) ON DELETE CASCADE,
  produkt_id      UUID NOT NULL REFERENCES produkte(id) ON DELETE CASCADE,
  menge           NUMERIC(10,2) NOT NULL DEFAULT 1,
  verkaufspreis_override NUMERIC(10,2), -- NULL = Preis vom Produkt
  reihenfolge     INTEGER NOT NULL DEFAULT 0,
  notizen         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (raum_id, produkt_id)
);

CREATE INDEX IF NOT EXISTS idx_raum_produkte_raum ON raum_produkte(raum_id);
CREATE INDEX IF NOT EXISTS idx_raum_produkte_produkt ON raum_produkte(produkt_id);
```

**Logik:**
- Produkt in Bibliothek erstellen (raum_id = NULL, immer)
- In Projekt zuweisen = Eintrag in `raum_produkte`
- Preis: `raum_produkte.verkaufspreis_override ?? produkte.verkaufspreis`
- Ein Produkt kann in MEHREREN Räumen/Projekten sein
- Produkt-Stammdaten ändern → wirkt sich überall aus (außer Override)

---

### 1.4 Audit-Log

```sql
-- Migration 039: Audit Log

CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id),
  user_email      TEXT,
  aktion          TEXT NOT NULL, -- 'erstellt','aktualisiert','geloescht','archiviert','login' etc.
  entitaet_typ    TEXT NOT NULL, -- 'kunde','projekt','produkt','partner','raum' etc.
  entitaet_id     UUID,
  entitaet_name   TEXT,
  details         JSONB, -- Alte/neue Werte, zusätzliche Infos
  ip_adresse      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_org_created ON audit_log(organisation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entitaet ON audit_log(entitaet_typ, entitaet_id);
```

---

## PHASE 2: CORE IMPROVEMENTS

### 2.1 Partner-Provisionen erweitert

```sql
-- Migration 040: Erweiterte Partner-Provisionen

CREATE TABLE IF NOT EXISTS partner_konditionen (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  partner_id        UUID NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
  name              TEXT NOT NULL DEFAULT 'Standard',
  typ               TEXT NOT NULL CHECK (typ IN (
    'prozent_fix',          -- Feste Prozent auf alles
    'prozent_gestaffelt',   -- Staffelung nach Umsatz
    'fix_pro_produkt',      -- Fixbetrag pro Produkt
    'fix_pro_bestellung',   -- Fixbetrag pro Bestellung
    'kategorie_basiert',    -- Unterschiedlich pro Kategorie
    'rabatt_einkauf',       -- Einkaufsrabatt in %
    'mindestbestellwert'    -- Mindestbestellwert
  )),
  wert              NUMERIC(10,2),          -- Hauptwert (%)
  staffelung        JSONB,                  -- [{ ab_umsatz: 1000, prozent: 5 }, ...]
  kategorie_werte   JSONB,                  -- { kategorie_id: prozent, ... }
  gueltig_von       DATE,
  gueltig_bis       DATE,
  zahlungsziel_tage INTEGER DEFAULT 30,
  skonto_prozent    NUMERIC(5,2),
  skonto_tage       INTEGER,
  notizen           TEXT,
  aktiv             BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2 Budget-Trennung (Produkte vs Service)

```sql
-- Migration 041: Service-Abrechnung

ALTER TABLE projekte ADD COLUMN IF NOT EXISTS service_modell TEXT 
  CHECK (service_modell IN ('pauschale','stundensatz')) DEFAULT 'pauschale';
ALTER TABLE projekte ADD COLUMN IF NOT EXISTS service_pauschale NUMERIC(12,2);
ALTER TABLE projekte ADD COLUMN IF NOT EXISTS service_stundensatz NUMERIC(10,2);
ALTER TABLE projekte ADD COLUMN IF NOT EXISTS produkt_budget NUMERIC(12,2); -- Budget nur für Produkte (Klient sichtbar)

-- Zeiterfassung
CREATE TABLE IF NOT EXISTS zeiterfassung (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  projekt_id      UUID NOT NULL REFERENCES projekte(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id),
  datum           DATE NOT NULL DEFAULT CURRENT_DATE,
  stunden         NUMERIC(5,2) NOT NULL,
  beschreibung    TEXT,
  abrechenbar     BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.3 Produkt-Varianten

```sql
-- Migration 042: Produkt-Varianten

ALTER TABLE produkte ADD COLUMN IF NOT EXISTS ist_variante BOOLEAN DEFAULT false;
ALTER TABLE produkte ADD COLUMN IF NOT EXISTS eltern_produkt_id UUID REFERENCES produkte(id) ON DELETE SET NULL;
ALTER TABLE produkte ADD COLUMN IF NOT EXISTS varianten_attribute JSONB; -- { "farbe": "Eiche", "größe": "120x80" }

-- Varianten-Konfiguration pro Produkt
CREATE TABLE IF NOT EXISTS varianten_definitionen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  produkt_id      UUID NOT NULL REFERENCES produkte(id) ON DELETE CASCADE,
  attribut_name   TEXT NOT NULL, -- "Farbe", "Material", "Größe"
  optionen        TEXT[] NOT NULL, -- ["Eiche", "Buche", "Walnuss"]
  reihenfolge     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (produkt_id, attribut_name)
);
```

### 2.4 Kunden-Kommunikationslog

```sql
-- Migration 043: Kommunikationslog

CREATE TABLE IF NOT EXISTS kommunikation (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  kunde_id        UUID NOT NULL REFERENCES kunden(id) ON DELETE CASCADE,
  projekt_id      UUID REFERENCES projekte(id) ON DELETE SET NULL,
  typ             TEXT NOT NULL CHECK (typ IN ('email','anruf','meeting','notiz','sms','sonstiges')),
  richtung        TEXT CHECK (richtung IN ('eingehend','ausgehend')),
  betreff         TEXT,
  inhalt          TEXT,
  kontaktperson   TEXT,
  user_id         UUID REFERENCES auth.users(id),
  datum            TIMESTAMPTZ NOT NULL DEFAULT now(),
  dauer_minuten   INTEGER,
  follow_up_datum DATE,
  erledigt        BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## PHASE 3: NEUE FEATURES

### 3.1 Vertragssystem

```sql
-- Migration 044: Vertragssystem

CREATE TABLE IF NOT EXISTS vertrags_vorlagen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  beschreibung    TEXT,
  inhalt_html     TEXT NOT NULL, -- HTML-Template mit Platzhaltern
  platzhalter     JSONB, -- Beschreibung der verfügbaren Platzhalter
  kategorie       TEXT CHECK (kategorie IN ('projektvertrag','rahmenvertrag','angebot','sonstiges')),
  ist_standard    BOOLEAN DEFAULT false,
  version         INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vertraege (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  vorlage_id      UUID REFERENCES vertrags_vorlagen(id) ON DELETE SET NULL,
  projekt_id      UUID REFERENCES projekte(id) ON DELETE SET NULL,
  kunde_id        UUID NOT NULL REFERENCES kunden(id) ON DELETE RESTRICT,
  titel           TEXT NOT NULL,
  inhalt_html     TEXT NOT NULL,  -- Ausgefülltes HTML
  pdf_url         TEXT,           -- Generierte PDF
  status          TEXT NOT NULL DEFAULT 'entwurf'
                  CHECK (status IN ('entwurf','gesendet','unterschrieben_kunde','unterschrieben_beide','abgelaufen','storniert')),
  -- Signatur-Felder
  signatur_kunde_url     TEXT,    -- URL zur Kunden-Signatur
  signatur_kunde_datum   TIMESTAMPTZ,
  signatur_firma_url     TEXT,
  signatur_firma_datum   TIMESTAMPTZ,
  signatur_token         TEXT UNIQUE, -- Token für externe Unterschrift
  signatur_token_gueltig TIMESTAMPTZ,
  -- Werte
  gesamtwert      NUMERIC(12,2),
  gueltig_bis     DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Platzhalter-System:**
```
{{firmenname}}, {{kunde_name}}, {{kunde_email}}, {{kunde_adresse}},
{{projekt_name}}, {{projekt_standort}}, {{projektart}},
{{produkt_budget}}, {{service_pauschale}}, {{gesamtbudget}},
{{datum_heute}}, {{deadline}},
{{produkt_tabelle}} → Auto-generierte HTML-Tabelle aller Produkte
{{raum_uebersicht}} → Räume mit Produkten
```

**e-Signatur-Optionen (Priorisierung):**
1. **Phase 3a (sofort):** Canvas-basierte Unterschrift im Browser (kein Drittanbieter, rechtlich schwächer aber funktional)
2. **Phase 3b (später):** DocuSign oder SignNow API-Integration für rechtsgültige QES

### 3.2 Angebotsmodul

```sql
-- Migration 045: Angebote

CREATE TABLE IF NOT EXISTS angebote (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  projekt_id      UUID REFERENCES projekte(id) ON DELETE SET NULL,
  kunde_id        UUID NOT NULL REFERENCES kunden(id) ON DELETE RESTRICT,
  nummer          TEXT NOT NULL, -- AG-2026-001
  titel           TEXT NOT NULL,
  einleitung      TEXT,
  positionen      JSONB NOT NULL, -- Array von Positionen
  -- Summen
  netto_summe     NUMERIC(12,2),
  mwst_satz       NUMERIC(5,2) DEFAULT 19,
  mwst_betrag     NUMERIC(12,2),
  brutto_summe    NUMERIC(12,2),
  rabatt_prozent  NUMERIC(5,2),
  rabatt_betrag   NUMERIC(12,2),
  -- Status
  status          TEXT NOT NULL DEFAULT 'entwurf'
                  CHECK (status IN ('entwurf','gesendet','angenommen','abgelehnt','abgelaufen')),
  gueltig_bis     DATE,
  pdf_url         TEXT,
  anmerkungen     TEXT,
  agb_text        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## PHASE 4: 2D RAUMPLANER

### Technologie-Stack
- **Canvas-Engine:** Fabric.js (MIT, bewährt für 2D-Design-Tools)
- **Speicherung:** JSON-Serialisierung des Canvas-State in Supabase
- **Export:** Canvas → PNG/SVG → PDF (mit jspdf)

```sql
-- Migration 046: Raumplaner

ALTER TABLE raeume ADD COLUMN IF NOT EXISTS grundriss_json JSONB; -- Fabric.js Canvas-State
ALTER TABLE raeume ADD COLUMN IF NOT EXISTS breite_m NUMERIC(6,2);
ALTER TABLE raeume ADD COLUMN IF NOT EXISTS laenge_m NUMERIC(6,2);
ALTER TABLE raeume ADD COLUMN IF NOT EXISTS hoehe_m NUMERIC(6,2) DEFAULT 2.50;

-- Möbel-Symbole für den Planer
CREATE TABLE IF NOT EXISTS moebel_symbole (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  kategorie_id    UUID REFERENCES kategorien(id) ON DELETE SET NULL,
  svg_pfad        TEXT NOT NULL, -- SVG-Path für das Symbol
  breite_cm       NUMERIC(6,1) NOT NULL,
  tiefe_cm        NUMERIC(6,1) NOT NULL,
  ist_system      BOOLEAN DEFAULT false, -- Vordefiniertes Symbol
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Features:**
- Grid-System mit Snap-to-Grid (einstellbar: 10cm, 25cm, 50cm)
- Wände zeichnen (Linie + Dicke)
- Türen/Fenster als vordefinierte Symbole
- Produkte aus Bibliothek per Drag&Drop platzieren
- Bemaßungs-Tool (automatische Maßketten)
- Zoom + Pan (Mausrad + Drag)
- Undo/Redo
- Export als PDF mit Maßen + Produktliste

---

## UMSETZUNGS-REIHENFOLGE (Claude Code Prompts)

### Prompt 1: Multi-Tenancy Migration + Helper
### Prompt 2: RLS-Policies komplett neu schreiben
### Prompt 3: Organisation-Helper + alle Server Actions updaten
### Prompt 4: Registrierungs-Flow (Org erstellen)
### Prompt 5: Kategorien-Tabelle Migration
### Prompt 6: Kategorien-Code umschreiben (Actions + Komponenten)
### Prompt 7: Produkt-Referenz-System (raum_produkte)
### Prompt 8: Produkte-Code umschreiben
### Prompt 9: Audit-Log System
### Prompt 10: Partner-Provisionen erweitert
### Prompt 11-20: Phase 2+3 Features
### Prompt 21+: 2D Raumplaner

---

## SICHERHEITS-CHECKLISTE

- [ ] Multi-Tenancy RLS auf ALLEN Tabellen
- [ ] organisation_id wird bei JEDEM Insert gesetzt
- [ ] Keine `USING (true)` Policies mehr
- [ ] Admin-Client nur serverseitig
- [ ] Interne Felder nie an externe Ansichten
- [ ] Freigabe-Tokens + Konfigurator validieren Org-Zugehörigkeit
- [ ] Portal-Auth prüft Org-Zugehörigkeit
- [ ] Rate Limiting auf Demo-Anfragen
- [ ] CSRF-Schutz auf Server Actions
- [ ] Input-Validierung (Zod) auf allen Formularen
