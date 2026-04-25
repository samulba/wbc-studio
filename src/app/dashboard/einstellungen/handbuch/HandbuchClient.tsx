'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Search, X, ChevronRight, ChevronDown,
  LayoutDashboard, Users, FolderOpen, ShoppingCart, CheckSquare,
  Link2, ClipboardList, Target, CalendarDays, UserCircle,
  Tag, UsersRound, Paintbrush, Settings, FileDown, HelpCircle,
  Lightbulb, AlertTriangle, Info, Keyboard, Command,
  Home, FileText, FileSignature, Grid3X3, MonitorSmartphone,
} from 'lucide-react'

// ── Typen ─────────────────────────────────────────────────────

interface Abschnitt {
  id: string
  titel: string
  suchtext: string
}

interface Kapitel {
  id: string
  icon: React.ReactNode
  titel: string
  abschnitte: Abschnitt[]
}

interface Suchtreffer {
  kapitelId: string
  kapitelTitel: string
  abschnittId: string
  abschnittTitel: string
  snippet: string
}

// ── Sub-Komponenten ────────────────────────────────────────────

function InfoBox({
  type = 'info',
  title,
  children,
}: {
  type?: 'tip' | 'warning' | 'info'
  title: string
  children: React.ReactNode
}) {
  const stile = {
    tip:     'border-wellbeing-green/40 bg-wellbeing-green/5 text-wellbeing-green-dark',
    warning: 'border-amber-400/50 bg-amber-50 text-amber-800',
    info:    'border-blue-300/60 bg-blue-50/60 text-blue-800',
  }
  const icons = {
    tip:     <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />,
    info:    <Info className="w-4 h-4 shrink-0 mt-0.5" />,
  }
  return (
    <div className={`flex gap-2.5 border rounded-xl px-4 py-3 text-sm my-4 ${stile[type]}`}>
      {icons[type]}
      <div>
        <p className="font-semibold mb-0.5">{title}</p>
        <div className="opacity-90 text-[13px] leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function Kb({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-1 mx-1">
      {keys.map((k, i) => (
        <span key={i} className="inline-flex items-center gap-0.5">
          {i > 0 && <span className="text-gray-400 text-xs">+</span>}
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-mono font-medium bg-gray-100 border border-gray-300 rounded shadow-[0_1px_0_0_rgba(0,0,0,0.15)] text-gray-700">
            {k === 'CMD' ? <Command className="w-3 h-3" /> : k === 'CTRL' ? 'Ctrl' : k}
          </kbd>
        </span>
      ))}
    </span>
  )
}


function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-xl font-semibold text-gray-900 mt-10 mb-4 scroll-mt-24 flex items-center gap-2 group">
      {children}
      <a href={`#${id}`} className="opacity-0 group-hover:opacity-40 text-gray-400 hover:text-gray-600 transition-opacity">
        <ChevronRight className="w-4 h-4" />
      </a>
    </h2>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[15px] font-semibold text-gray-800 mt-6 mb-2">{children}</h3>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] text-gray-600 leading-relaxed mb-3.5">{children}</p>
}

function Ol({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal list-inside space-y-2 text-[15px] text-gray-600 mb-3.5 ml-1">{children}</ol>
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc list-inside space-y-2 text-[15px] text-gray-600 mb-3.5 ml-1">{children}</ul>
}

function Divider() {
  return <hr className="my-6 border-gray-100" />
}

// ── Kapitel-Daten ──────────────────────────────────────────────

const KAPITEL: Kapitel[] = [
  {
    id: 'dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
    titel: 'Dashboard',
    abschnitte: [
      { id: 'dashboard-kpi',       titel: 'KPI-Karten',       suchtext: 'kpi karten aktive kunden laufende projekte offene angebote monatsumsatz' },
      { id: 'dashboard-deadlines', titel: 'Deadlines',        suchtext: 'deadlines countdown projekt fällig' },
      { id: 'dashboard-followups', titel: 'Follow-Ups',       suchtext: 'follow up wiedervorlage kommunikation kunden' },
      { id: 'dashboard-budget',    titel: 'Budget-Übersicht', suchtext: 'budget übersicht ist kosten gesamt projekt' },
      { id: 'dashboard-letzte',    titel: 'Letzte Projekte',  suchtext: 'letzte projekte tabelle' },
    ],
  },
  {
    id: 'kunden',
    icon: <Users className="w-4 h-4" />,
    titel: 'Kunden',
    abschnitte: [
      { id: 'kunden-anlegen',       titel: 'Kunde anlegen',         suchtext: 'kunde anlegen neu erstellen name' },
      { id: 'kunden-detail',        titel: 'Detail-Seite (360°)',   suchtext: 'detail seite cockpit stats projektliste timeline' },
      { id: 'kunden-kontakte',      titel: 'Mehrere Ansprechpartner', suchtext: 'ansprechpartner mehrere kontakte hauptkontakt rolle email telefon mobil' },
      { id: 'kunden-website',       titel: 'Website + Auto-Favicon', suchtext: 'website url logo favicon auto automatisch' },
      { id: 'kunden-kommunikation', titel: 'Kommunikationslog',     suchtext: 'kommunikation anruf email meeting follow-up notiz' },
      { id: 'kunden-archiv',        titel: 'Archivieren / Löschen', suchtext: 'archivieren wiederherstellen löschen impact' },
    ],
  },
  {
    id: 'projekte',
    icon: <FolderOpen className="w-4 h-4" />,
    titel: 'Projekte',
    abschnitte: [
      { id: 'projekte-erstellen',  titel: 'Projekt erstellen',          suchtext: 'projekt erstellen neu anlegen kunde' },
      { id: 'projekte-status',     titel: 'Status-Flow',                suchtext: 'status aktiv warten auf kunde abgeschlossen offen freigegeben' },
      { id: 'projekte-budget',     titel: 'Budget (gesamt + Produkt)',  suchtext: 'budget gesamtbudget produkt budget tausenderpunkt' },
      { id: 'projekte-service',    titel: 'Service-Modell',             suchtext: 'service pauschale stundensatz abrechnung honorar' },
      { id: 'projekte-zeit',       titel: 'Zeiterfassung',              suchtext: 'zeiterfassung stunden eintragen abrechnen' },
      { id: 'projekte-deadline',   titel: 'Deadline + Verantwortlicher', suchtext: 'deadline countdown verantwortlicher overdue fällig' },
      { id: 'projekte-actions',    titel: 'Duplizieren / Archivieren', suchtext: 'archivieren duplizieren kopieren wiederherstellen löschen' },
    ],
  },
  {
    id: 'raeume',
    icon: <Home className="w-4 h-4" />,
    titel: 'Räume',
    abschnitte: [
      { id: 'raeume-anlegen',     titel: 'Raum anlegen',             suchtext: 'raum anlegen typ kategorie wohnzimmer büro' },
      { id: 'raeume-budget',      titel: 'Budget pro Raum',          suchtext: 'budget raum fortschritt' },
      { id: 'raeume-produkte',    titel: 'Produkte zuweisen',        suchtext: 'produkt zuweisen menge override preis rabatt' },
      { id: 'raeume-grundriss',   titel: 'Grundriss-Vorschau',       suchtext: 'grundriss vorschau raumplaner' },
      { id: 'raeume-reihenfolge', titel: 'Reihenfolge per Drag&Drop', suchtext: 'sortieren drag drop reihenfolge' },
    ],
  },
  {
    id: 'produkte',
    icon: <ShoppingCart className="w-4 h-4" />,
    titel: 'Produkte',
    abschnitte: [
      { id: 'produkte-bibliothek',  titel: 'Bibliothek vs. Raum-Einsatz', suchtext: 'bibliothek katalog raum produkte einsatz junction' },
      { id: 'produkte-autofill',    titel: 'Auto-Fill (URL + AI)',        suchtext: 'autofill url ai claude haiku scraper automatisch' },
      { id: 'produkte-screenshot',  titel: 'Screenshot-Upload',           suchtext: 'screenshot bild upload vision ai sonnet' },
      { id: 'produkte-bilder',      titel: 'Mehrere Bilder',              suchtext: 'bilder mehrere galerie carousel auswählen' },
      { id: 'produkte-preise',      titel: 'Preisberechnung',             suchtext: 'preis einkaufspreis marge verkaufspreis provision mwst' },
      { id: 'produkte-status',      titel: 'Status pro Raum-Einsatz',     suchtext: 'bestellstatus freigabestatus pro raum geliefert ausstehend' },
      { id: 'produkte-varianten',   titel: 'Varianten',                   suchtext: 'varianten attribute farbe größe option produkt' },
    ],
  },
  {
    id: 'freigaben',
    icon: <CheckSquare className="w-4 h-4" />,
    titel: 'Freigaben',
    abschnitte: [
      { id: 'freigaben-uebersicht', titel: 'Dashboard',         suchtext: 'freigabe übersicht progress bar status' },
      { id: 'freigaben-bulk',       titel: 'Bulk-Aktionen',     suchtext: 'bulk markieren mehrere freigeben ablehnen zurücksetzen' },
      { id: 'freigaben-filter',     titel: 'Filter & Suche',    suchtext: 'filter chip suche projekt status' },
      { id: 'freigaben-ansichten',  titel: 'Ansichten',         suchtext: 'gruppen tabelle balken view toggle' },
    ],
  },
  {
    id: 'kundenfreigabe',
    icon: <Link2 className="w-4 h-4" />,
    titel: 'Kundenfreigabe',
    abschnitte: [
      { id: 'kf-link',     titel: 'Link erstellen (Scopes)', suchtext: 'freigabelink erstellen scope projekt raum auswahl token' },
      { id: 'kf-pin',      titel: 'PIN-Schutz',              suchtext: 'pin schutz code sicherheit kunde' },
      { id: 'kf-mobile',   titel: 'Mobile Kundenansicht',    suchtext: 'mobile produkt freigabe bestätigen ablehnen donut' },
      { id: 'kf-audit',    titel: 'Audit-Log',               suchtext: 'audit verlauf wer hat was wann freigegeben' },
    ],
  },
  {
    id: 'portal',
    icon: <MonitorSmartphone className="w-4 h-4" />,
    titel: 'Kunden-Portal',
    abschnitte: [
      { id: 'portal-zugang',      titel: 'Zugang einrichten',      suchtext: 'portal zugang einladung email passwort kunde' },
      { id: 'portal-welcome',     titel: 'Willkommens-Tour',       suchtext: 'welcome tour intro ersttour onboarding' },
      { id: 'portal-projekt',     titel: 'Projektansicht',         suchtext: 'portal projekt produkte fortschritt timeline' },
      { id: 'portal-chat',        titel: 'Chat & Dokumente',       suchtext: 'chat nachrichten dokumente upload' },
      { id: 'portal-team',        titel: 'Team & Einstellungen',   suchtext: 'team mitglieder portal einstellungen profil' },
    ],
  },
  {
    id: 'onboarding',
    icon: <ClipboardList className="w-4 h-4" />,
    titel: 'Onboarding',
    abschnitte: [
      { id: 'ob-link',      titel: 'Link erstellen',          suchtext: 'onboarding link erstellen typ vorlage' },
      { id: 'ob-empfaenger', titel: 'Empfänger-Etikett',      suchtext: 'empfänger etikett label name email für wen' },
      { id: 'ob-vorlagen',  titel: 'Vorlagen-Editor',         suchtext: 'vorlage template editor sektion gruppe feldtyp' },
      { id: 'ob-status',    titel: 'Status-Flow',             suchtext: 'status offen in bearbeitung eingereicht abgeschlossen abgelehnt fortschritt' },
      { id: 'ob-uebernehmen', titel: 'Als Kunde / Projekt anlegen', suchtext: 'übernehmen kunde projekt anlegen aus anfrage' },
    ],
  },
  {
    id: 'konfigurator',
    icon: <Target className="w-4 h-4" />,
    titel: 'Konfigurator',
    abschnitte: [
      { id: 'konf-session',     titel: 'Session erstellen',        suchtext: 'session erstellen link token kunde produkt' },
      { id: 'konf-aktionen',    titel: 'Kunden-Aktionen (4)',      suchtext: 'übernehmen ablehnen alternative unentschieden' },
      { id: 'konf-budget',      titel: 'Budget-Tracking',          suchtext: 'budget tracking limit verbleibend' },
      { id: 'konf-uebernahme',  titel: 'Ergebnis übernehmen',      suchtext: 'übernehmen produkte freigabe angebot erstellen' },
    ],
  },
  {
    id: 'timeline',
    icon: <CalendarDays className="w-4 h-4" />,
    titel: 'Timeline',
    abschnitte: [
      { id: 'tl-events',        titel: 'Events erstellen',          suchtext: 'event erstellen termin lieferung phase meilenstein typ' },
      { id: 'tl-autosync',      titel: 'Auto-Sync',                 suchtext: 'auto sync produkt liefertermin angebot vertrag deadline automatisch' },
      { id: 'tl-gantt',         titel: 'Gantt + Abhängigkeiten',    suchtext: 'gantt balken bezier abhängigkeiten kaskade verschieben' },
      { id: 'tl-raumfilter',    titel: 'Raum-Filter',               suchtext: 'raum filter chip projekt ebene' },
      { id: 'tl-kundensicht',   titel: 'Kunde-sichtbar',            suchtext: 'kunde sichtbar portal toggle event' },
    ],
  },
  {
    id: 'angebote',
    icon: <FileText className="w-4 h-4" />,
    titel: 'Angebote',
    abschnitte: [
      { id: 'ang-erstellen',    titel: 'Angebot erstellen',           suchtext: 'angebot erstellen positionen einleitung manuell' },
      { id: 'ang-aus-raeumen',  titel: 'Aus Raum-Produkten generieren', suchtext: 'angebot aus räumen generieren raum produkte automatisch' },
      { id: 'ang-status',       titel: 'Status-Flow',                 suchtext: 'angebot status entwurf gesendet angesehen angenommen abgelehnt überarbeitung' },
      { id: 'ang-pdf',          titel: 'PDF-Export',                  suchtext: 'angebot pdf export download branding' },
      { id: 'ang-vertrag',      titel: '→ Vertrag erstellen',         suchtext: 'angebot vertrag erstellen umwandeln' },
    ],
  },
  {
    id: 'vertraege',
    icon: <FileSignature className="w-4 h-4" />,
    titel: 'Verträge',
    abschnitte: [
      { id: 'ver-vorlagen',   titel: 'Vertragsvorlagen',         suchtext: 'vorlage platzhalter vertrag standard html' },
      { id: 'ver-erstellen',  titel: 'Vertrag erstellen',        suchtext: 'vertrag erstellen aus vorlage projekt' },
      { id: 'ver-signatur',   titel: 'Digitale Signatur',        suchtext: 'signatur unterschrift token canvas digital touch' },
      { id: 'ver-anhaenge',   titel: 'Anhänge & Meilensteine',   suchtext: 'anhänge meilenstein vertrag' },
      { id: 'ver-pdf',        titel: 'PDF-Export',               suchtext: 'vertrag pdf export download' },
    ],
  },
  {
    id: 'raumplaner',
    icon: <Grid3X3 className="w-4 h-4" />,
    titel: 'Raumplaner',
    abschnitte: [
      { id: 'rp-start',         titel: 'Erste Schritte',           suchtext: 'raumplaner editor öffnen canvas wand' },
      { id: 'rp-tools',         titel: 'Werkzeuge',                suchtext: 'tools wand tür fenster maß möbel radierer formen' },
      { id: 'rp-moebel',        titel: 'Möbel & Custom',           suchtext: 'möbel symbole custom favoriten kategorie' },
      { id: 'rp-boden-waende',  titel: 'Boden + Wandfarbe',        suchtext: 'boden textur wand farbe parkett fliesen' },
      { id: 'rp-etagen',        titel: 'Etagen / Stockwerke',      suchtext: 'etage stockwerk tab' },
      { id: 'rp-versionen',     titel: 'Versionen',                suchtext: 'version speichern laden vergleich' },
      { id: 'rp-export',        titel: 'Export & Freigabe',        suchtext: 'export pdf png screenshot freigabe link qr code kunde' },
    ],
  },
  {
    id: 'partner',
    icon: <UserCircle className="w-4 h-4" />,
    titel: 'Partner',
    abschnitte: [
      { id: 'partner-anlegen',     titel: 'Partner anlegen',                  suchtext: 'partner anlegen hersteller lieferant typ' },
      { id: 'partner-tabs',        titel: 'Sub-Tabs (Übersicht/Kontakte/...)', suchtext: 'tabs übersicht kontakte konditionen verträge produkte' },
      { id: 'partner-kontakte',    titel: 'Mehrere Kontakte',                 suchtext: 'kontaktpersonen mehrere hauptkontakt rolle' },
      { id: 'partner-konditionen', titel: 'Konditionen',                      suchtext: 'kondition prozent fix staffelung kategorie skonto' },
      { id: 'partner-vertraege',   titel: 'Verträge / Dokumente',             suchtext: 'partner verträge upload pdf dokument' },
      { id: 'partner-produkte',    titel: 'Sortiment + Einsatz',              suchtext: 'sortiment einsatz raum verbau bestellt umsatz' },
      { id: 'partner-bewertung',   titel: 'Bewertung + Filter',               suchtext: 'bewertung sterne filter sortierung' },
    ],
  },
  {
    id: 'kategorien',
    icon: <Tag className="w-4 h-4" />,
    titel: 'Kategorien',
    abschnitte: [
      { id: 'kat-produkt', titel: 'Produktkategorien', suchtext: 'produktkategorie kategorie möbel beleuchtung' },
      { id: 'kat-raum', titel: 'Raumtypen', suchtext: 'raumtyp büro wohnzimmer küche bad' },
      { id: 'kat-projekt', titel: 'Projektarten', suchtext: 'projektart typ einrichtung renovation' },
      { id: 'kat-icons', titel: 'Icons anpassen', suchtext: 'icon lucide name anpassen kategorie' },
    ],
  },
  {
    id: 'team',
    icon: <UsersRound className="w-4 h-4" />,
    titel: 'Team & Rollen',
    abschnitte: [
      { id: 'team-rollen', titel: 'Rollen (Admin/Editor/Viewer)', suchtext: 'rolle admin editor viewer berechtigung' },
      { id: 'team-einladen', titel: 'Mitglied einladen', suchtext: 'mitglied einladen email einladung' },
      { id: 'team-berechtigungen', titel: 'Berechtigungen', suchtext: 'berechtigung zugriff rechte lesen schreiben' },
    ],
  },
  {
    id: 'branding',
    icon: <Paintbrush className="w-4 h-4" />,
    titel: 'Branding',
    abschnitte: [
      { id: 'brand-logo', titel: 'Logo & Favicon', suchtext: 'logo favicon hochladen bild marke' },
      { id: 'brand-farben', titel: 'Farben anpassen', suchtext: 'farben primary secondary accent hintergrund' },
      { id: 'brand-schrift', titel: 'Schriftart wählen', suchtext: 'schriftart font inter syne dm sans' },
      { id: 'brand-kontakt', titel: 'Kontaktdaten', suchtext: 'kontakt email telefon website adresse' },
      { id: 'brand-vorschau', titel: 'Live-Vorschau', suchtext: 'vorschau live echtzeit branding preview' },
    ],
  },
  {
    id: 'einstellungen',
    icon: <Settings className="w-4 h-4" />,
    titel: 'Einstellungen',
    abschnitte: [
      { id: 'eins-allgemein', titel: 'Allgemein', suchtext: 'allgemein app name währung mwst zeitzone' },
      { id: 'eins-profil', titel: 'Profil', suchtext: 'profil name email konto' },
      { id: 'eins-sicherheit', titel: 'Sicherheit', suchtext: 'sicherheit passwort ändern' },
    ],
  },
  {
    id: 'export',
    icon: <FileDown className="w-4 h-4" />,
    titel: 'Export',
    abschnitte: [
      { id: 'exp-csv', titel: 'CSV-Export', suchtext: 'csv export tabelle excel download' },
      { id: 'exp-pdf', titel: 'PDF-Export', suchtext: 'pdf export drucken a4 bericht' },
    ],
  },
  {
    id: 'faq',
    icon: <HelpCircle className="w-4 h-4" />,
    titel: 'FAQ',
    abschnitte: [
      { id: 'faq-fragen', titel: 'Häufige Fragen', suchtext: 'häufige fragen antworten hilfe' },
      { id: 'faq-trouble', titel: 'Troubleshooting', suchtext: 'troubleshooting fehler problem lösung' },
    ],
  },
]

// ── Kapitel-Inhalte ────────────────────────────────────────────

function KapitelInhalt({ kapitelId }: { kapitelId: string }) {
  switch (kapitelId) {
    case 'dashboard':      return <DashboardKapitel />
    case 'kunden':         return <KundenKapitel />
    case 'projekte':       return <ProjekteKapitel />
    case 'raeume':         return <RaeumeKapitel />
    case 'produkte':       return <ProdukteKapitel />
    case 'freigaben':      return <FreigabenKapitel />
    case 'kundenfreigabe': return <KundenfreigabeKapitel />
    case 'portal':         return <PortalKapitel />
    case 'onboarding':     return <OnboardingKapitel />
    case 'konfigurator':   return <KonfiguratorKapitel />
    case 'timeline':       return <TimelineKapitel />
    case 'angebote':       return <AngeboteKapitel />
    case 'vertraege':      return <VertraegeKapitel />
    case 'raumplaner':     return <RaumplanerKapitel />
    case 'partner':        return <PartnerKapitel />
    case 'kategorien':     return <KategorienKapitel />
    case 'team':           return <TeamKapitel />
    case 'branding':       return <BrandingKapitel />
    case 'einstellungen':  return <EinstellungenKapitel />
    case 'export':         return <ExportKapitel />
    case 'faq':            return <FaqKapitel />
    default: return null
  }
}

function DashboardKapitel() {
  return (
    <div>
      <H2 id="dashboard-kpi">KPI-Karten</H2>
      <P>Vier Kennzahlen ganz oben fürs tägliche Reporting:</P>
      <Ul>
        <li><strong>Aktive Kunden</strong> – Kunden ohne Soft-Delete.</li>
        <li><strong>Laufende Projekte</strong> – alles außer &bdquo;Abgeschlossen&ldquo; und Archiviert (inkl. Status &bdquo;Warten auf Kunde&ldquo;).</li>
        <li><strong>Offene Angebote</strong> – Status &bdquo;Entwurf&ldquo; oder &bdquo;Gesendet&ldquo;.</li>
        <li><strong>Monatsumsatz</strong> – Summe aller in diesem Monat angenommenen Angebote (brutto).</li>
      </Ul>
      <InfoBox type="tip" title="Klickbar">
        Jede Karte verlinkt direkt zur dazugehörigen Übersicht.
      </InfoBox>

      <Divider />
      <H2 id="dashboard-deadlines">Deadlines</H2>
      <P>Die Karte &bdquo;Nächste Deadlines&ldquo; zeigt alle Projekte mit Deadline in den nächsten 60 Tagen plus alle Timeline-Events der nächsten 30 Tage. Pro Eintrag siehst du:</P>
      <Ul>
        <li>Projekt-Name + Kunde</li>
        <li>Countdown (&bdquo;in 3 Tagen&ldquo;) oder &bdquo;überfällig&ldquo;-Badge bei vergangenen Daten</li>
        <li>Event-Icon je Typ (Meilenstein / Lieferung / Termin / Phase)</li>
      </Ul>

      <Divider />
      <H2 id="dashboard-followups">Follow-Ups</H2>
      <P>Aus dem Kommunikationslog: alle Einträge mit gesetztem Follow-Up-Datum innerhalb der nächsten 7 Tage, gruppiert pro Kunde. Klick → springt direkt in den Kunden-Kontext.</P>

      <Divider />
      <H2 id="dashboard-budget">Budget-Übersicht</H2>
      <P>Die Top-5 aktiven Projekte mit gesetztem Budget — Ist-Kosten (effektiver VP × Menge aller Raum-Produkte) gegen Budget mit Fortschrittsbalken. Über 100 % wird rot.</P>
      <InfoBox type="info" title="Berechnung">
        Effektiver VP = override (falls gesetzt) sonst Bibliothekspreis × (1 − Rabatt %). Werte sind netto.
      </InfoBox>

      <Divider />
      <H2 id="dashboard-letzte">Letzte Projekte</H2>
      <P>Tabelle mit den 8 zuletzt angelegten Projekten (Name / Kunde / Status / Budget / Deadline-Countdown). Direkt-Link in die Detailseite per Zeilenklick.</P>
    </div>
  )
}

function KundenKapitel() {
  return (
    <div>
      <H2 id="kunden-anlegen">Kunde anlegen</H2>
      <P>Pflichtfeld ist nur der Firmenname. Adresse, Notizen und Website sind optional. Ansprechpartner werden NICHT mehr im Formular erfasst — die pflegst du nach dem Speichern auf der Detailseite (siehe &bdquo;Mehrere Ansprechpartner&ldquo;).</P>
      <Ol>
        <li>Sidebar → <strong>Kunden</strong> → <strong>+ Neuer Kunde</strong></li>
        <li>Firmenname (Pflicht)</li>
        <li>Optional: Adresse, Website, Notizen</li>
        <li><strong>Speichern</strong> → landest auf der Detail-Seite, kannst Ansprechpartner hinzufügen</li>
      </Ol>

      <Divider />
      <H2 id="kunden-detail">Detail-Seite (360°-Cockpit)</H2>
      <P>Die Kunden-Detail-Seite zeigt alle wichtigen Infos auf einen Blick:</P>
      <Ul>
        <li><strong>Stats-Band</strong> oben: Projekte (gesamt + aktiv) · Offene Angebote (mit Summe) · Aktive Verträge · Letzter Kontakt</li>
        <li><strong>Projektliste</strong> rechts: alle Projekte mit Status-Punkt, Freigabe-Progressbar, Budget-Kurzanzeige, Deadline-Countdown</li>
        <li><strong>Multi-Projekt-Timeline</strong>: alle Events aller Projekte des Kunden, optional nach Projekt filterbar</li>
        <li><strong>Kommunikationslog</strong>: chronologische Liste aller Anrufe, E-Mails, Meetings</li>
        <li><strong>Sidebar</strong>: Firma (Adresse/Website), Ansprechpartner-Block, Notizen, Portal-Zugang</li>
      </Ul>

      <Divider />
      <H2 id="kunden-kontakte">Mehrere Ansprechpartner</H2>
      <P>Statt nur einer Kontaktperson legst du beliebig viele an, jede mit eigenen Daten:</P>
      <Ul>
        <li>Name + Rolle (Geschäftsführung / Inhaber:in / Buchhaltung / Assistenz / …)</li>
        <li>Eigene E-Mail, Telefon, Mobil</li>
        <li>Persönliche Notizen pro Person</li>
        <li><strong>Hauptkontakt</strong> mit Stern-Badge — pro Kunde genau einer, wird in Listen + PDFs verwendet</li>
      </Ul>
      <InfoBox type="info" title="Backwards-kompatibel">
        Die alten Felder <code>kunden.ansprechpartner / email / telefon</code> werden automatisch mit dem aktuellen Hauptkontakt synchronisiert — alle alten Listen, Filter und PDFs funktionieren ohne Änderung weiter.
      </InfoBox>

      <Divider />
      <H2 id="kunden-website">Website + Auto-Favicon</H2>
      <P>Wenn du eine Website hinterlegst und kein eigenes Logo hochgeladen ist, wird automatisch das Favicon der Domain als Logo gesetzt (via Google Favicon Service). Funktioniert beim Anlegen UND beim späteren Bearbeiten der Website. Eigene Logo-Uploads werden niemals überschrieben.</P>

      <Divider />
      <H2 id="kunden-kommunikation">Kommunikationslog</H2>
      <P>Auf der Kunden-Detail-Seite kannst du jeden Kontakt protokollieren:</P>
      <Ul>
        <li><strong>6 Typen</strong>: E-Mail, Anruf, Meeting, Notiz, Chat, Vor Ort, Sonstiges</li>
        <li>Richtung (eingehend / ausgehend), Dauer, Betreff, Inhalt</li>
        <li><strong>Follow-Up-Datum</strong> setzen → erscheint im Dashboard-Widget &bdquo;Offene Follow-Ups&ldquo;</li>
        <li>Erledigen-Button schließt den Follow-Up ab</li>
      </Ul>

      <P><strong>Archivieren</strong> — versteckt den Kunden inkl. aller Projekte aus der aktiven Liste, Daten bleiben erhalten. Wiederherstellen jederzeit möglich. Im Header der Detail-Seite erscheint ein gelber Banner.</P>
      <P><strong>Löschen (Soft-Delete)</strong> — nur Admins. Modal zeigt vorher den Impact: wie viele Projekte / Räume / Produkte / Angebote / Verträge / Notizen / Kommunikation / Portal-User betroffen sind. Bestätigen → alles wird ausgeblendet (deleted_at gesetzt). Auto-Cleanup nach 30 Tagen via Cron möglich.</P>
    </div>
  )
}

function ProjekteKapitel() {
  return (
    <div>
      <H2 id="projekte-erstellen">Projekt erstellen</H2>
      <Ol>
        <li>Sidebar → <strong>Projekte</strong> → <strong>+ Neues Projekt</strong></li>
        <li>Name + Kunde aus Dropdown wählen</li>
        <li>Optional: Standort, Projektart, Beschreibung, Deadline</li>
        <li>Optional: Service-Modell (Pauschale / Stundensatz)</li>
        <li>Optional: Gesamtbudget + Produkt-Budget (mit Tausenderpunkten)</li>
        <li><strong>Speichern</strong> → landest auf der Projekt-Detail-Seite</li>
      </Ol>

      <Divider />
      <H2 id="projekte-status">Status-Flow</H2>
      <P>Drei sichtbare Status-Buttons im Header:</P>
      <Ul>
        <li><strong>Aktiv</strong> (grau) — Standard, du arbeitest gerade dran</li>
        <li><strong>Warten auf Kunde</strong> (blau) — Freigabe-Link versendet, wartest auf Antwort</li>
        <li><strong>Abgeschlossen</strong> (grün) — fertig, mit Bestätigungs-Modal</li>
      </Ul>
      <P>Intern gibt es noch <code>in_bearbeitung</code> als Legacy-Status, wird aber auf &bdquo;Aktiv&ldquo; gemappt. Das Dashboard-Widget &bdquo;Laufende Projekte&ldquo; zählt alles außer &bdquo;Abgeschlossen&ldquo; und Archiviert.</P>

      <Divider />
      <H2 id="projekte-budget">Budget (gesamt + Produkt)</H2>
      <P>Zwei separate Budget-Felder mit automatischen <strong>Tausenderpunkten</strong> bei der Eingabe:</P>
      <Ul>
        <li><strong>Gesamtbudget</strong> — intern, inkl. Service-Honorar (z. B. 25.000 €)</li>
        <li><strong>Produkt-Budget</strong> — wird dem Kunden mitgeteilt, ohne Service-Anteil (z. B. 18.000 €)</li>
      </Ul>
      <P>Auf der Detail-Seite zeigt der Budget-Ring den Verbrauch (Ist-Kosten aus Raum-Produkten / Produkt-Budget oder Fallback Gesamtbudget). Service-Kosten werden separat aufgelistet.</P>

      <Divider />
      <H2 id="projekte-service">Service-Modell</H2>
      <P>Wie verrechnest du dein Honorar?</P>
      <Ul>
        <li><strong>Keins</strong> — kein Service-Honorar getrennt</li>
        <li><strong>Pauschale</strong> — fester Betrag (z. B. 5.000 €)</li>
        <li><strong>Stundensatz</strong> — €/h, wird mit erfasster Zeit multipliziert</li>
      </Ul>

      <Divider />
      <H2 id="projekte-zeit">Zeiterfassung</H2>
      <P>Bei <strong>Stundensatz-Projekten</strong> erscheint auf der Detail-Seite ein Zeiterfassungs-Block. Inline-Formular: Datum + Stunden + Beschreibung + Toggle &bdquo;abrechenbar&ldquo;. Liste aller Einträge mit Summen-Zeile in € (Stundensatz × Stunden).</P>

      <Divider />
      <H2 id="projekte-deadline">Deadline + Verantwortlicher</H2>
      <P>Im Header siehst du den Countdown — &bdquo;noch 5 Tage&ldquo; (grau), &bdquo;in 7 Tagen&ldquo; (amber bei ≤ 7 Tagen), &bdquo;3 Tage überfällig&ldquo; (rot). Der Verantwortliche wird im Team-Tab eingestellt und ist optional sichtbar.</P>

      <Divider />
      <H2 id="projekte-actions">Duplizieren / Archivieren / Löschen</H2>
      <P>Im Header rechts gibt es ein ⋮-Dropdown:</P>
      <Ul>
        <li><strong>Duplizieren</strong> — kopiert Projekt inkl. Räume; Modal lässt dich auswählen, ob Produkte mitkopiert werden sollen</li>
        <li><strong>Archivieren</strong> — versteckt aus aktiver Liste, kein Löschen</li>
        <li><strong>Löschen</strong> (nur Admin) — Soft-Delete mit Bestätigung</li>
      </Ul>

    </div>
  )
}

function ProdukteKapitel() {
  return (
    <div>
      <H2 id="produkte-bibliothek">Bibliothek vs. Raum-Einsatz</H2>
      <P>Wir trennen <strong>Bibliotheks-Produkt</strong> und <strong>Raum-Einsatz</strong> sauber:</P>
      <Ul>
        <li><strong>Produkt</strong> = der Eintrag in der Bibliothek (Sidebar → <strong>Produkte</strong>) mit Stammdaten: Name, Bild, Bibliotheks-Preis, Material, Maße, Partner</li>
        <li><strong>Raum-Einsatz</strong> = die Verknüpfung Produkt ↔ Raum (Junction-Tabelle <code>raum_produkte</code>) mit Menge, optionalem Preis-Override, Rabatt %, eigenem Bestell- und Freigabe-Status</li>
      </Ul>
      <P>Daher kann derselbe Bibliotheks-Eintrag in 5 Räumen verschieden viel kosten und unterschiedliche Status haben. Auf der Bibliotheks-Seite siehst du pro Produkt &bdquo;In 3 Räumen verbaut · 8 Stk.&ldquo;.</P>

      <Divider />
      <H2 id="produkte-autofill">Auto-Fill (URL + AI)</H2>
      <P>Beim Anlegen eines Produkts URL einfügen → <strong>Auto-Fill</strong>:</P>
      <Ol>
        <li><strong>Klassischer Scraper</strong> (cheerio) liest JSON-LD, Microdata, OpenGraph + Shop-spezifische Selektoren (Shopify, WooCommerce, Magento).</li>
        <li>Findet er weniger als 3 Felder, eskaliert das System automatisch zu <strong>Claude Haiku 4.5</strong> mit dem bereinigten Seitentext — füllt fehlende Felder strukturiert auf. Im Modal-Header erscheint ein violettes &bdquo;✨ AI&ldquo;-Badge.</li>
        <li>Mehrere Bilder werden gesammelt, du wählst im Modal als Grid bis zu 5 aus.</li>
        <li><strong>Auto-Partner</strong>: passt die Domain zu einem deiner Partner, wird dieser direkt im Formular gesetzt + Logo via Favicon übernommen.</li>
        <li><strong>URL-History</strong>: zuletzt gescrapte Domains als Klick-Chips unter dem URL-Feld.</li>
      </Ol>

      <Divider />
      <H2 id="produkte-screenshot">Screenshot-Upload</H2>
      <P>Wenn die Seite gescraped nicht funktioniert (Cloudflare, Login, JavaScript-only): klick auf <strong>Screenshot</strong> neben dem Auto-Fill-Knopf.</P>
      <Ul>
        <li>Drag-and-Drop oder Datei-Picker, PNG/JPG/WebP/GIF, max. 5 MB</li>
        <li>Live-Vorschau, &bdquo;Analysieren&ldquo;-Button</li>
        <li><strong>Claude Sonnet 4.6 Vision</strong> liest die sichtbaren Daten aus → öffnet das normale Auto-Fill-Modal mit den extrahierten Feldern</li>
        <li>Konservativer Prompt: keine Halluzinationen, weglassen statt raten</li>
      </Ul>
      <InfoBox type="info" title="Cost">
        Haiku-HTML-Fallback ~$0.001 pro Aufruf · Sonnet-Vision-Screenshot ~$0.005. Voraussetzung ist <code>ANTHROPIC_API_KEY</code> in den Server-Env-Vars (Vercel).
      </InfoBox>

      <Divider />
      <H2 id="produkte-bilder">Mehrere Bilder</H2>
      <P>Pro Produkt bis zu <strong>5 Bilder</strong>. Drag-and-Drop im Bilder-Grid, Reihenfolge per Pfeil-Buttons. Erste Bild ist das Hauptbild für Listen + Kunden-Freigabe.</P>

      <Divider />
      <H2 id="produkte-preise">Preisberechnung</H2>
      <Ul>
        <li><strong>EP netto</strong> = dein Einkaufspreis</li>
        <li><strong>VP netto</strong> = EP × (1 + Marge / 100)</li>
        <li><strong>VP brutto</strong> = VP netto × (1 + MwSt-Satz, default 19 %)</li>
        <li><strong>Provision</strong> = VP netto × Provision %</li>
      </Ul>
      <P>Du kannst alternativ direkt <strong>VP netto</strong> oder <strong>VP brutto</strong> eingeben — die anderen Werte rechnen sich rückwärts. Im Raum-Einsatz lassen sich VP-Override + Rabatt zusätzlich setzen, ohne den Bibliothekspreis zu ändern.</P>
      <InfoBox type="tip" title="MwSt-Satz">
        Global in <strong>Einstellungen → Workspace</strong> einstellbar. Wirkt überall gleich.
      </InfoBox>

      <Divider />
      <H2 id="produkte-status">Status pro Raum-Einsatz</H2>
      <P>Bestell- und Freigabe-Status liegen <strong>pro raum_produkte-Eintrag</strong> (Migration 076):</P>
      <H3>Bestell-Status</H3>
      <Ul>
        <li><strong>Ausstehend</strong> — noch nichts bestellt</li>
        <li><strong>Bestellt</strong> — Bestellung beim Lieferanten raus</li>
        <li><strong>Geliefert</strong> — Ware eingetroffen</li>
        <li><strong>Rechnung erhalten</strong> — Rechnung vom Lieferant da</li>
      </Ul>
      <H3>Freigabe-Status</H3>
      <Ul>
        <li><strong>Ausstehend</strong> · <strong>Freigegeben</strong> · <strong>Abgelehnt</strong> · <strong>Überarbeitung</strong></li>
      </Ul>
      <P>Inline ändern in der Sortable-Produkt-Tabelle pro Raum (optimistisches UI). Liefertermin + Bestellt-Datum lassen sich direkt am Raum-Einsatz setzen.</P>

      <Divider />
      <H2 id="produkte-varianten">Varianten</H2>
      <P>Ein Produkt kann <strong>Varianten</strong> haben — selbe Basis, unterschiedliche Attribute (z. B. Farbe, Größe). Auf der Produkt-Bearbeiten-Seite legst du Varianten-Definitionen an (Attribut + Optionen) und erzeugst pro Kombination eine Variante. Jede Variante ist ein eigenes Produkt mit Verweis auf das Eltern-Produkt.</P>
    </div>
  )
}

function FreigabenKapitel() {
  return (
    <div>
      <H2 id="freigaben-uebersicht">Dashboard</H2>
      <P>Sidebar → <strong>Freigaben</strong> zeigt alle Produkte aller Projekte:</P>
      <Ul>
        <li><strong>Hero-Progressbar</strong> oben — Verteilung über alle Status (grün/amber/rot/violett) auf einen Blick</li>
        <li><strong>Status-Chips</strong>: 4 farbige Filter-Pills mit Anzahl (• 4 Freigegeben, • 34 Ausstehend …) — klickbar zum Umschalten + Alle-Chip rechts</li>
        <li><strong>Action-Bar</strong>: Volltextsuche (Produkt / Raum / Projekt / Kategorie) + Projekt-Filter-Dropdown + View-Toggle</li>
      </Ul>

      <Divider />
      <H2 id="freigaben-bulk">Bulk-Aktionen</H2>
      <P>Pro Zeile + pro Gruppen-Header gibt es eine Checkbox. Sobald mindestens 1 Produkt markiert ist, erscheint unten eine <strong>Floating Action-Bar</strong>:</P>
      <Ul>
        <li>&bdquo;N ausgewählt&ldquo; · Freigeben · Ablehnen · Überarbeiten · Zurücksetzen · Alle sichtbaren · X (deselect)</li>
        <li>Sammel-Aktion betrifft alle markierten Produkte gleichzeitig (1 Batch-Update statt N Requests)</li>
        <li>Alle Bulk-Änderungen werden ins <strong>Audit-Log</strong> geschrieben (Kanal &bdquo;admin&ldquo;)</li>
      </Ul>

      <Divider />
      <H2 id="freigaben-filter">Filter &amp; Suche</H2>
      <P>Status-Chips funktionieren als Filter + Volltext + Projekt-Dropdown lassen sich kombinieren (UND).</P>

      <Divider />
      <H2 id="freigaben-ansichten">Ansichten</H2>
      <P>View-Toggle rechts:</P>
      <Ul>
        <li><strong>Gruppen</strong> — aufklappbare Projekt-Karten mit Mini-Progressbar pro Projekt, VP-Summe, Offen-Badge</li>
        <li><strong>Tabelle</strong> — flache Liste mit Projekt-Info pro Zeile (CSV-ähnlich)</li>
        <li><strong>Balken</strong> — visueller Vergleich der Statusverteilung</li>
      </Ul>
    </div>
  )
}

function KundenfreigabeKapitel() {
  return (
    <div>
      <H2 id="kf-link">Link erstellen (Scopes)</H2>
      <P>Auf der Projekt-Detail-Seite öffnest du die <strong>Freigabe-Link</strong>-Karte. Pro Link kannst du den <strong>Scope</strong> wählen — was der Kunde sehen darf:</P>
      <Ul>
        <li><strong>Gesamtes Projekt</strong> — alle Räume + alle Produkte</li>
        <li><strong>Einzelner Raum</strong> — nur die Produkte eines Raums</li>
        <li><strong>Auswahl</strong> — du markierst genau die Produkte, die freigegeben werden sollen</li>
      </Ul>
      <P>Token wird kryptographisch erzeugt, Gültigkeitsdauer ist konfigurierbar (default unbegrenzt). Beim Abschluss wird der Token <strong>nicht gelöscht</strong> — er bleibt für Audit-Zwecke abrufbar, aber inaktiv.</P>

      <Divider />
      <H2 id="kf-pin">PIN-Schutz</H2>
      <P>Pro Link optional ein <strong>4–6-stelliger PIN</strong> aktivieren — der Kunde muss ihn beim Öffnen eingeben. Wir hashen den PIN serverseitig (bcrypt). Toast-Feedback im Admin-UI zeigt nach Speichern an, dass der PIN aktiv ist. Versende den PIN immer auf einem anderen Kanal als den Link.</P>

      <Divider />
      <H2 id="kf-mobile">Mobile Kundenansicht</H2>
      <P>Die Freigabe-Seite (<code>/freigabe/&lt;token&gt;</code>) ist mobil-first gebaut:</P>
      <Ul>
        <li>Großes Produktbild oben, einklappbare Beschreibung</li>
        <li>Touch-optimierte Buttons (py-3.5, flex-col → row auf größeren Screens): Freigeben · Ablehnen · Überarbeitung · Zurücksetzen</li>
        <li>Mini-Donut im Header zeigt Gesamtfortschritt</li>
        <li>Preis-Grid in 2 Spalten (VP netto / brutto)</li>
        <li>Branding: Logo, Farben, Schrift, Welcome-Text aus deinem Branding-Tab werden übernommen</li>
      </Ul>

      <Divider />
      <H2 id="kf-audit">Audit-Log</H2>
      <P>Jede Status-Änderung (durch Kunde oder Admin) wird im <code>freigabe_audit</code>-Log mit Timestamp + IP + User-Agent festgehalten. Auf Wunsch im Admin-Tool einsehbar.</P>
    </div>
  )
}

function OnboardingKapitel() {
  return (
    <div>
      <H2 id="ob-link">Link erstellen</H2>
      <P>Onboarding-Links ermöglichen es neuen Interessenten, sich selbst mit einem Fragebogen vorzustellen, bevor ein erstes Gespräch stattfindet.</P>
      <Ol>
        <li>Seitenleiste → <strong>Onboarding</strong> → <strong>+ Neu</strong></li>
        <li>Vorlage auswählen (oder leer starten)</li>
        <li>Link generieren und teilen</li>
      </Ol>

      <Divider />
      <H2 id="ob-vorlagen">Vorlagen verwalten</H2>
      <P>Vorlagen speichern Fragenkonfigurationen, die bei neuen Onboarding-Links automatisch angewendet werden.</P>
      <P>Unter <strong>Einstellungen → Onboarding-Vorlagen</strong> (oder direkt im Onboarding-Bereich) können Sie Vorlagen erstellen, bearbeiten und löschen.</P>

      <Divider />
      <H2 id="ob-fragen">Fragen-Editor</H2>
      <P>Im Vorlagen-Editor erstellen Sie individuelle Fragen für Ihren Onboarding-Prozess. Folgende Fragetypen stehen zur Verfügung:</P>
      <Ul>
        <li><strong>Text (kurz)</strong> – Einzeiliges Textfeld</li>
        <li><strong>Text (lang)</strong> – Mehrzeiliges Textarea</li>
        <li><strong>Ja/Nein</strong> – Einfache Checkbox</li>
        <li><strong>Auswahl</strong> – Dropdown mit vordefinierten Optionen</li>
        <li><strong>Datum</strong> – Datumsauswahl</li>
        <li><strong>Zahl</strong> – Numerische Eingabe</li>
      </Ul>
      <P>Per Drag & Drop lassen sich die Fragen in der gewünschten Reihenfolge sortieren.</P>

      <Divider />
      <H2 id="ob-anfragen">Anfragen bearbeiten</H2>
      <P>Ausgefüllte Onboarding-Formulare erscheinen in der <strong>Onboarding → Eingang</strong>-Liste. Der Status einer Anfrage:</P>
      <Ul>
        <li><strong>Neu</strong> – Noch nicht gesichtet</li>
        <li><strong>In Bearbeitung</strong> – Bereits geöffnet und bearbeitet</li>
        <li><strong>Abgeschlossen</strong> – Prozess abgeschlossen</li>
      </Ul>

      <Divider />
      <H2 id="ob-kunde">Als Kunde anlegen</H2>
      <P>Aus einer Onboarding-Anfrage heraus können Sie mit einem Klick direkt einen neuen Kunden (und optional gleich ein Projekt) anlegen. Die Antworten aus dem Formular werden automatisch in die Felder übertragen.</P>
      <Ol>
        <li>Anfrage öffnen</li>
        <li>Button <strong>Als Kunde anlegen</strong> klicken</li>
        <li>Vorausgefüllte Daten prüfen und ggf. ergänzen</li>
        <li>Speichern</li>
      </Ol>
    </div>
  )
}

function KonfiguratorKapitel() {
  return (
    <div>
      <H2 id="konf-session">Session erstellen</H2>
      <P>Der Kunden-Konfigurator ist ein interaktiver Link, über den der Kunde selbst Produkte seines Projekts auswählen, ablehnen oder Alternativen anfragen kann.</P>
      <Ol>
        <li>Projekt öffnen → Karte <strong>Kunden-Konfigurator</strong></li>
        <li>Auf <strong>Neu</strong> klicken</li>
        <li>Optionen konfigurieren (Budget, Preise, Ablaufdatum)</li>
        <li><strong>Link erstellen</strong> klicken</li>
        <li>Generierten Link teilen</li>
      </Ol>
      <InfoBox type="info" title="Session vs. Freigabe-Link">
        Der Konfigurator ist flexibler als der Freigabe-Link: Er unterstützt Budget-Tracking, versteckte Preise und aktive Beratung durch die Auswahlspalten.
      </InfoBox>

      <Divider />
      <H2 id="konf-optionen">Optionen</H2>
      <P>Beim Erstellen einer Konfigurator-Session konfigurieren Sie:</P>
      <Ul>
        <li><strong>Budget-Limit</strong> – Maximalbetrag, der dem Kunden angezeigt wird. Der Fortschrittsbalken zeigt, wieviel bereits verplant ist.</li>
        <li><strong>Preise anzeigen</strong> – Steuert ob Verkaufspreise sichtbar sind</li>
        <li><strong>Alternative erlauben</strong> – Erlaubt dem Kunden, &bdquo;Alternative gewünscht&ldquo; zu wählen</li>
        <li><strong>Ablaufdatum</strong> – Link wird danach ungültig</li>
      </Ul>

      <Divider />
      <H2 id="konf-kundenansicht">Kundenansicht</H2>
      <P>Die Konfigurator-Seite ist mobiloptimiert. Produkte werden als Karten mit Bild dargestellt. Pro Produkt hat der Kunde vier Aktionen:</P>
      <Ul>
        <li><strong>Auswählen</strong> (grün) – Produkt wird ins Budget gezählt</li>
        <li><strong>Ablehnen</strong> (rot) – Produkt nicht gewünscht</li>
        <li><strong>Alternative</strong> (orange) – Wunsch nach Alternativoption</li>
        <li><strong>Offen</strong> (grau) – Entscheidung noch nicht getroffen</li>
      </Ul>
      <P>Am Ende schließt der Kunde die Session über <strong>Auswahl abschicken</strong> ab. Dabei kann er noch eine Gesamtnotiz hinterlassen.</P>

      <Divider />
      <H2 id="konf-ergebnisse">Ergebnisse auswerten</H2>
      <P>Nach Abschluss der Session erscheint in der Konfigurator-Karte des Projekts ein <strong>Ergebnis ansehen</strong>-Button. Das Ergebnis-Modal zeigt:</P>
      <Ul>
        <li>Zusammenfassung aller Entscheidungen</li>
        <li>Gesamtsumme der ausgewählten Produkte</li>
        <li>Notizen des Kunden</li>
      </Ul>
      <P>Über <strong>Auswahl übernehmen</strong> werden die Kundenentscheidungen automatisch als Freigabe-Status in die Produkttabelle übertragen.</P>
    </div>
  )
}

function TimelineKapitel() {
  return (
    <div>
      <H2 id="tl-events">Events erstellen</H2>
      <P>Die Timeline-Funktion ermöglicht es, Projekttermine, Lieferungen, Phasen und Meilensteine visuell zu planen.</P>
      <Ol>
        <li>Projekt öffnen → Button <strong>Timeline</strong> im Projekt-Header</li>
        <li>Auf <strong>+ Event</strong> klicken</li>
        <li>Typ, Titel, Datum und Status festlegen</li>
        <li>Speichern</li>
      </Ol>
      <P><strong>Event-Typen:</strong></P>
      <Ul>
        <li><strong>Meilenstein</strong> – Einzelner Zeitpunkt (Raute-Symbol auf der Gantt-Achse)</li>
        <li><strong>Lieferung</strong> – Erwartete Warenlieferung</li>
        <li><strong>Termin</strong> – Meeting, Abnahme, Kundengespräch</li>
        <li><strong>Phase</strong> – Zeitspanne mit Start- und Enddatum (Balken)</li>
      </Ul>

      <Divider />
      <H2 id="tl-gantt">Gantt-Ansicht</H2>
      <P>Die Gantt-Ansicht zeigt alle Events als horizontale Zeitachse. Der aktuelle Tag wird mit einer roten Linie markiert.</P>
      <Ul>
        <li>Die Ansicht scrollt automatisch zum heutigen Tag</li>
        <li>Farbige Balken zeigen Phasen und Termine</li>
        <li>Überfällige Events werden rot hervorgehoben</li>
        <li>Die obere Leiste zeigt Monats-Labels zur Orientierung</li>
      </Ul>
      <InfoBox type="tip" title="Liste vs. Gantt">
        Wechseln Sie mit dem Toggle oben rechts zwischen Gantt-Diagramm und Liste. Die Liste gruppiert Events nach Monat und ist für mobile Geräte optimiert.
      </InfoBox>

      <Divider />
      <H2 id="tl-meilensteine">Meilensteine</H2>
      <P>Meilensteine sind einzelne, punktuelle Ereignisse ohne Zeitspanne. In der Gantt-Ansicht erscheinen sie als <strong>lilafarbene Raute ◆</strong> an der entsprechenden Datumsposition.</P>
      <P>Typische Meilensteine: Auftragserteilung, Baugenehmigung, Abnahme, Schlüsselübergabe.</P>

      <Divider />
      <H2 id="tl-liefertermine">Liefertermine</H2>
      <P>Neben Timeline-Events können einzelne Produkte ein eigenes <strong>Lieferdatum</strong> haben. Dieses wird in der Produkttabelle gesetzt und erscheint zusätzlich auf der Timeline.</P>
      <Ul>
        <li>Liefertermin setzen: Produkt bearbeiten → Feld <strong>Liefertermin</strong></li>
        <li><strong>Bestätigt</strong>-Checkbox: zeigt ob das Datum verbindlich ist</li>
      </Ul>
    </div>
  )
}

function PartnerKapitel() {
  return (
    <div>
      <H2 id="partner-anlegen">Partner anlegen</H2>
      <P>Partner sind Lieferanten, Hersteller oder Handwerksbetriebe, die einem Produkt zugewiesen werden können.</P>
      <Ol>
        <li>Seitenleiste → <strong>Partner</strong> → <strong>+ Neu</strong></li>
        <li>Name eingeben (Pflicht)</li>
        <li>Kontaktdaten und Website ergänzen</li>
        <li>Speichern</li>
      </Ol>

      <Divider />
      <H2 id="partner-provision">Provision</H2>
      <P>Jedem Partner kann ein Standard-Provisionssatz (%) zugewiesen werden. Dieser Wert wird beim Anlegen eines neuen Produkts automatisch vorausgefüllt, wenn der Partner ausgewählt wird.</P>
      <P>Die Provision wird berechnet als: <strong>VP netto × Provisions%</strong>. Sie erscheint nur in der internen Admin-Ansicht – nie beim Kunden.</P>

      <Divider />
      <H2 id="partner-logo">Logo</H2>
      <P>In der Partner-Detailansicht können Sie ein Logo hochladen. Es erscheint in der Produkttabelle neben dem Partnernamen und erleichtert die visuelle Zuordnung.</P>
    </div>
  )
}

function RaeumeKapitel() {
  return (
    <div>
      <H2 id="raeume-anlegen">Raum anlegen</H2>
      <P>Räume strukturieren ein Projekt thematisch. Auf der Projekt-Detail-Seite klickst du auf <strong>+ Raum hinzufügen</strong>:</P>
      <Ol>
        <li>Name eingeben (z. B. &bdquo;Wohnzimmer&ldquo;, &bdquo;Büro EG Süd&ldquo;)</li>
        <li>Optional: Raumtyp aus Dropdown wählen (Wohnzimmer, Büro, Bad, Küche, …) — Icon erscheint später in der Karte</li>
        <li>Speichern</li>
      </Ol>
      <P>Raumtypen kommen aus dem Kategorien-Tab in den Einstellungen — kannst eigene anlegen mit eigenem Icon (Lucide-Name).</P>

      <Divider />
      <H2 id="raeume-budget">Budget pro Raum</H2>
      <P>Jeder Raum hat ein eigenes optionales Budget. In der Raum-Karte auf der Projekt-Seite siehst du einen <strong>Fortschrittsbalken</strong>: Ist-Kosten (effektiver VP × Menge aller zugewiesenen Produkte) gegen Raum-Budget. Über 100 % wird rot.</P>

      <Divider />
      <H2 id="raeume-produkte">Produkte zuweisen</H2>
      <P>Auf der Raum-Detail-Seite gibt es zwei Wege:</P>
      <Ul>
        <li><strong>Neues Produkt anlegen</strong> — direkt im Raum, geht direkt in die Bibliothek + den Raum zugleich</li>
        <li><strong>Aus Bibliothek zuweisen</strong> — Modal mit Suche, klickst dir bestehende Produkte rein</li>
      </Ul>
      <P>Pro Raum-Einsatz kannst du:</P>
      <Ul>
        <li><strong>Menge</strong> setzen (z. B. 2 Stk.)</li>
        <li><strong>VP-Override</strong> — eigener Preis nur für diesen Einsatz (ohne den Bibliotheks-Preis zu ändern)</li>
        <li><strong>Rabatt %</strong> — wird auf den effektiven VP angewendet</li>
        <li><strong>Bestellstatus + Freigabe-Status</strong> getrennt pro Einsatz (siehe Produkte-Kapitel)</li>
      </Ul>
      <InfoBox type="tip" title="Hintergrund">
        Junction-Tabelle <code>raum_produkte</code>: derselbe Bibliotheks-Artikel kann in Raum A 2x und in Raum B 5x verbaut sein — mit eigenen Mengen, Preisen und Status pro Einsatz.
      </InfoBox>

      <Divider />
      <H2 id="raeume-grundriss">Grundriss-Vorschau</H2>
      <P>Über der Produkttabelle siehst du eine <strong>Mini-Vorschau des Grundrisses</strong>, sobald du im Raumplaner einen Plan gespeichert hast. Klick auf &bdquo;Im Raumplaner bearbeiten&ldquo; öffnet den vollen Editor (siehe Raumplaner-Kapitel).</P>

      <Divider />
      <H2 id="raeume-reihenfolge">Reihenfolge per Drag &amp; Drop</H2>
      <P>Auf der Projekt-Seite kannst du Räume per <strong>⠿-Handle</strong> links neben der Karte umsortieren. Optimistisches UI — sofort sichtbar, im Hintergrund gespeichert. Genauso für Produkte innerhalb eines Raums.</P>
    </div>
  )
}
function PortalKapitel() {
  return (
    <div>
      <H2 id="portal-zugang">Zugang einrichten</H2>
      <P>Im Gegensatz zum öffentlichen Freigabe-Link hat das Portal einen <strong>echten Login</strong>. Schritte:</P>
      <Ol>
        <li>Auf der Kunden-Detail-Seite Block <strong>Kunden-Portal</strong> öffnen</li>
        <li><strong>Einladung erstellen</strong> → E-Mail eingeben, optional Vor-/Nachname</li>
        <li>Einladungslink wird generiert (bcrypt + Session-Cookie-Auth, unabhängig von Supabase Auth)</li>
        <li>Link an Kunde senden — er setzt sein Passwort beim Erstaufruf</li>
      </Ol>
      <InfoBox type="info" title="Hintergrund">
        Eigenes Auth-System (Tabellen <code>client_users</code>, Session-Token-Cookie), damit Portal-User nicht im Supabase-User-Pool landen. Admin-Operationen via <code>createAdminClient()</code>.
      </InfoBox>

      <Divider />
      <H2 id="portal-welcome">Willkommens-Tour</H2>
      <P>Beim ersten Login startet automatisch ein 3-Schritt-Intro:</P>
      <Ul>
        <li>&bdquo;Willkommen bei {'{'}Firma{'}'}&ldquo; mit Branding-Akzentfarbe</li>
        <li>&bdquo;Produkte freigeben&ldquo; — kurze Erklärung des Freigabe-Workflows</li>
        <li>&bdquo;Direkter Chat statt E-Mail-Ping-Pong&ldquo; — Verweis auf Chat-Block</li>
      </Ul>
      <P>LocalStorage-Flag verhindert, dass die Tour bei jedem Login wieder aufpoppt. X-Button oder Hintergrund-Klick schließt sie jederzeit.</P>

      <Divider />
      <H2 id="portal-projekt">Projektansicht</H2>
      <P>Pro Projekt sieht der Kunde:</P>
      <Ul>
        <li>Produkte gruppiert nach Raum mit Status-Badges</li>
        <li>Freigabe-Aktionen direkt inline (selber Mechanismus wie Freigabe-Link, aber mit Login)</li>
        <li>Mini-Timeline mit allen Events, die <strong>kunde_sichtbar = true</strong> markiert sind</li>
        <li>Fortschrittsanzeige (Freigaben %)</li>
      </Ul>

      <Divider />
      <H2 id="portal-chat">Chat &amp; Dokumente</H2>
      <P><strong>Chat</strong> — Echtzeit-Nachrichten zwischen Kunde und Studio, mit Datei-/Bild-/Audio-Anhängen (max. 50 MB). Ungelesene Nachrichten erscheinen als Badge im Sidebar-Tab.</P>
      <P><strong>Dokumente</strong> — Der Kunde kann Briefings, Skizzen, Inspirationsbilder hochladen, die du im Admin sehen kannst.</P>

      <Divider />
      <H2 id="portal-team">Team &amp; Einstellungen</H2>
      <P>Wenn der Kunde mehrere Mitarbeiter hat, kann er weitere Portal-User einladen (Rolle: Owner / Member). Im Profil-Tab kann er Vorname, Nachname, Avatar und Passwort ändern.</P>
    </div>
  )
}
function AngeboteKapitel() { return <P>(folgt)</P> }
function VertraegeKapitel() { return <P>(folgt)</P> }
function RaumplanerKapitel() { return <P>(folgt)</P> }

function KategorienKapitel() {
  return (
    <div>
      <H2 id="kat-produkt">Produktkategorien</H2>
      <P>Produktkategorien helfen dabei, Produkte thematisch zu gruppieren (z. B. Möbel, Beleuchtung, Bodenbelag).</P>
      <P>Verwaltet werden sie unter <strong>Einstellungen → Kategorien → Produktkategorien</strong>.</P>
      <InfoBox type="info" title="Format">
        Kategorien werden im Format <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">Name|IconName</code> gespeichert – z. B. <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">Möbel|Sofa</code>. Der Icon-Name entspricht einem Lucide-Icon.
      </InfoBox>

      <Divider />
      <H2 id="kat-raum">Raumtypen</H2>
      <P>Raumtypen definieren die verfügbaren Kategorien beim Anlegen eines neuen Raums (z. B. Büro, Wohnzimmer, Küche). Sie werden ebenfalls im <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">Name|Icon</code>-Format gespeichert.</P>

      <Divider />
      <H2 id="kat-projekt">Projektarten</H2>
      <P>Projektarten beschreiben die Art des Auftrags (z. B. Neueinrichtung, Renovation, Einzelmöbel). Sie werden beim Erstellen eines Projekts aus einer Dropdown-Liste gewählt.</P>

      <Divider />
      <H2 id="kat-icons">Icons anpassen</H2>
      <P>Alle Icons basieren auf der <strong>Lucide React</strong>-Bibliothek. Den Icon-Namen finden Sie auf <strong>lucide.dev</strong> – suchen Sie das gewünschte Icon und kopieren Sie den CamelCase-Namen (z. B. <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">ArmChair</code>, <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">Lamp</code>).</P>
      <InfoBox type="warning" title="Achtung">
        Ungültige Icon-Namen führen zu einem Fallback-Icon. Prüfen Sie den Namen auf lucide.dev, bevor Sie speichern.
      </InfoBox>
    </div>
  )
}

function TeamKapitel() {
  return (
    <div>
      <H2 id="team-rollen">Rollen</H2>
      <P>Wellbeing Spaces unterscheidet drei Rollen:</P>
      <Ul>
        <li><strong>Admin</strong> – Vollzugriff auf alle Bereiche inkl. Einstellungen, Team und Branding</li>
        <li><strong>Editor</strong> – Kann Projekte, Kunden und Produkte anlegen und bearbeiten; kein Zugriff auf Einstellungen</li>
        <li><strong>Viewer</strong> – Nur lesender Zugriff; keine Bearbeitungsrechte</li>
      </Ul>
      <InfoBox type="info" title="Interne Felder">
        Einkaufspreise, Margen, Provisionen und interne Notizen sind für Viewer ausgeblendet.
      </InfoBox>

      <Divider />
      <H2 id="team-einladen">Mitglied einladen</H2>
      <Ol>
        <li>Einstellungen → <strong>Team</strong> → <strong>+ Einladen</strong></li>
        <li>E-Mail-Adresse des neuen Mitglieds eingeben</li>
        <li>Rolle (Admin / Editor / Viewer) auswählen</li>
        <li><strong>Einladung senden</strong> klicken</li>
      </Ol>
      <P>Das eingeladene Mitglied erhält eine E-Mail mit einem Aktivierungslink. Ausstehende Einladungen werden in der Team-Tabelle als <strong>Ausstehend</strong> angezeigt.</P>

      <Divider />
      <H2 id="team-berechtigungen">Berechtigungen</H2>
      <P>Berechtigungen werden über die Rolle gesteuert. Eine Änderung der Rolle eines Mitglieds ist jederzeit über <strong>Einstellungen → Team → Rolle ändern</strong> möglich (nur für Admins).</P>
      <InfoBox type="warning" title="Achtung">
        Es muss immer mindestens ein aktives Admin-Konto existieren. Die letzte Admin-Rolle kann nicht entfernt werden.
      </InfoBox>
    </div>
  )
}

function BrandingKapitel() {
  return (
    <div>
      <H2 id="brand-logo">Logo & Favicon</H2>
      <P>Das Unternehmens-Logo erscheint auf Freigabe-Links, Konfigurator-Sessions und Onboarding-Formularen, die Sie an Kunden versenden.</P>
      <Ol>
        <li>Einstellungen → <strong>Branding</strong></li>
        <li>Im Bereich <strong>Logo hochladen</strong> eine Datei wählen</li>
        <li>Auf <strong>Hochladen</strong> klicken</li>
      </Ol>
      <InfoBox type="info" title="Empfehlung">
        Logo: PNG mit transparentem Hintergrund, min. 400 px Breite. Favicon: quadratisches PNG, 32 × 32 px.
      </InfoBox>

      <Divider />
      <H2 id="brand-farben">Farben anpassen</H2>
      <P>Sechs Farb-Slots stehen zur Verfügung:</P>
      <Ul>
        <li><strong>Primärfarbe</strong> – Hauptakzentfarbe (Buttons, aktive Elemente)</li>
        <li><strong>Sekundärfarbe</strong> – Untergeordnete Akzente</li>
        <li><strong>Akzentfarbe</strong> – Highlights und Call-to-Action</li>
        <li><strong>Hintergrundfarbe</strong> – Seitenhintergrund der Kundenansicht</li>
        <li><strong>Textfarbe</strong> – Haupttextfarbe</li>
      </Ul>
      <P>Klicken Sie auf das Farbfeld oder geben Sie einen Hex-Code direkt ein.</P>

      <Divider />
      <H2 id="brand-schrift">Schriftart wählen</H2>
      <P>Wählen Sie aus vordefinierten Google Fonts für die Kundenansicht: Inter, Syne, DM Sans, Playfair Display, Lato, Roboto.</P>
      <InfoBox type="tip" title="Vorschau">
        Die Live-Vorschau rechts im Branding-Editor aktualisiert sich sofort – ohne Speichern.
      </InfoBox>

      <Divider />
      <H2 id="brand-kontakt">Kontaktdaten</H2>
      <P>E-Mail, Telefon, Website und Adresse erscheinen im Footer der Kundenansichten. Impressum-Text und Datenschutz-URL können für rechtliche Angaben hinterlegt werden.</P>
      <P>Die Option <strong>Powered by Wellbeing Spaces</strong> blendet den Hinweis im Footer ein oder aus.</P>

      <Divider />
      <H2 id="brand-vorschau">Live-Vorschau</H2>
      <P>Der Branding-Editor zeigt rechts neben den Einstellungen eine Echtzeit-Vorschau der Kundenansicht. Die Vorschau umfasst Header, Produktkarte und Footer mit allen konfigurierten Werten.</P>
    </div>
  )
}

function EinstellungenKapitel() {
  return (
    <div>
      <H2 id="eins-allgemein">Allgemein</H2>
      <P>Unter <strong>Einstellungen → Allgemein</strong> konfigurieren Sie globale Parameter:</P>
      <Ul>
        <li><strong>App-Name</strong> – Wird in der Seitenleiste angezeigt</li>
        <li><strong>Standardwährung</strong> – EUR, CHF oder USD</li>
        <li><strong>MwSt.-Satz</strong> – Gilt für alle Preisberechnungen</li>
        <li><strong>Zeitzone</strong> – Für korrekte Datums-/Zeitanzeigen</li>
        <li><strong>Datumsformat</strong> – DD.MM.YYYY oder alternatives Format</li>
      </Ul>
      <InfoBox type="info" title="Sofortige Wirkung">
        Änderungen am MwSt.-Satz wirken sich sofort auf alle Preisanzeigen aus – bestehende Daten werden nicht verändert, nur die Anzeige neu berechnet.
      </InfoBox>

      <Divider />
      <H2 id="eins-profil">Profil</H2>
      <P>Unter <strong>Einstellungen → Profil</strong> können Sie Ihren Anzeigenamen und Ihre E-Mail-Adresse verwalten. Diese Daten werden für Teammitglieder-Anzeigen verwendet.</P>

      <Divider />
      <H2 id="eins-sicherheit">Sicherheit</H2>
      <P>Unter <strong>Einstellungen → Sicherheit</strong> ändern Sie Ihr Passwort. Geben Sie das aktuelle Passwort sowie das neue Passwort (2× zur Bestätigung) ein.</P>
      <InfoBox type="warning" title="Empfehlung">
        Verwenden Sie ein starkes Passwort mit mindestens 12 Zeichen, Groß-/Kleinbuchstaben, Zahlen und Sonderzeichen.
      </InfoBox>
    </div>
  )
}

function ExportKapitel() {
  return (
    <div>
      <H2 id="exp-csv">CSV-Export</H2>
      <P>Der CSV-Export erzeugt eine tabellarische Datei aller Produkte eines Projekts – kompatibel mit Excel, Google Sheets und anderen Tabellenkalkulationsprogrammen.</P>
      <Ol>
        <li>Projekt öffnen</li>
        <li>Button <strong>CSV</strong> im Projekt-Header klicken</li>
        <li>Datei wird sofort heruntergeladen</li>
      </Ol>
      <P>Die CSV enthält: Raumname, Produktname, Partner, Status, EP netto, Marge %, VP netto, VP brutto, Provision.</P>
      <InfoBox type="info" title="Interne Felder im Export">
        Der CSV-Export ist nur für eingeloggte Mitglieder zugänglich und enthält alle internen Felder.
      </InfoBox>

      <Divider />
      <H2 id="exp-pdf">PDF-Export</H2>
      <P>Der PDF-Export erzeugt ein A4-Dokument mit Projektübersicht und Produkttabelle – geeignet für Angebote und Kundenpräsentationen.</P>
      <Ol>
        <li>Projekt öffnen</li>
        <li>Button <strong>PDF</strong> im Projekt-Header klicken</li>
        <li>Das PDF wird im Browser generiert und heruntergeladen</li>
      </Ol>
      <P>Das PDF enthält: Projektname, Datum, Produkttabelle je Raum, Gesamtsummen, Status-Farben und Seitennummerierung.</P>
      <InfoBox type="tip" title="Tipp">
        Für Kundenpräsentationen empfiehlt sich der PDF-Export. Für weitere Verarbeitung in Excel nutzen Sie CSV.
      </InfoBox>
    </div>
  )
}

function FaqKapitel() {
  return (
    <div>
      <H2 id="faq-fragen">Häufige Fragen</H2>

      <H3>Warum erscheint ein Produkt nicht in der Freigabe-Ansicht?</H3>
      <P>Produkte müssen einem Raum (nicht nur der Bibliothek) zugewiesen sein und dürfen kein <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">deleted_at</code>-Datum haben. Prüfen Sie auch, ob der Freigabe-Link für das richtige Projekt erstellt wurde.</P>

      <H3>Können mehrere Konfigurator-Sessions gleichzeitig aktiv sein?</H3>
      <P>Ja. Pro Projekt können mehrere Sessions existieren. Alle aktiven Sessions sind über eigene Links erreichbar. In der Karte werden sie jeweils mit Status und Datum angezeigt.</P>

      <H3>Wie ändere ich nachträglich den Partner eines Produkts?</H3>
      <P>Öffnen Sie das Produkt (Stift-Icon in der Tabelle), wählen Sie im Dropdown-Feld <strong>Partner</strong> den neuen Partner aus und speichern Sie. Die Provision wird automatisch mit dem Standard-Provisionssatz des neuen Partners aktualisiert.</P>

      <H3>Kann ich den Freigabe-Link deaktivieren?</H3>
      <P>Ja. In der Freigabe-Link-Karte des Projekts gibt es ein Löschen-Icon neben jedem Link. Nach dem Löschen wird der Token ungültig und der Kunde erhält beim Öffnen des Links eine Fehlermeldung.</P>

      <H3>Was passiert mit dem Konfigurator nach Ablauf des Datums?</H3>
      <P>Der Link wechselt automatisch auf Status <strong>Abgelaufen</strong>. Kunden erhalten eine entsprechende Meldung. Die bisherigen Auswahlen bleiben gespeichert und sind weiterhin im Dashboard einsehbar.</P>

      <Divider />
      <H2 id="faq-trouble">Troubleshooting</H2>

      <H3>Die Seite lädt nicht / zeigt einen Fehler</H3>
      <P>Häufige Ursachen:</P>
      <Ul>
        <li>Sitzung abgelaufen → erneut einloggen</li>
        <li>Browser-Cache veraltet → Hard-Reload mit <Kb keys={['CTRL', 'Shift', 'R']} /> (Windows) oder <Kb keys={['CMD', 'Shift', 'R']} /> (Mac)</li>
        <li>VPN oder Firewall blockiert Supabase (Frankfurt) → Verbindung prüfen</li>
      </Ul>

      <H3>Bilder werden nicht angezeigt</H3>
      <P>Prüfen Sie ob der Supabase Storage Bucket <strong>branding</strong> existiert und als öffentlich markiert ist. Für Produkt-Bilder ist der Bucket <strong>produkt-bilder</strong> erforderlich.</P>

      <H3>Der MwSt.-Satz wird nicht korrekt angezeigt</H3>
      <P>Stellen Sie sicher, dass in der Datenbank-Tabelle <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">einstellungen</code> ein Eintrag mit dem Schlüssel <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">mwst_satz</code> existiert. Prüfen Sie dies in <strong>Einstellungen → Allgemein</strong> und speichern Sie den Wert einmal neu.</P>

      <InfoBox type="tip" title="Support">
        Bei Problemen, die sich nicht selbst lösen lassen, wenden Sie sich an das Entwicklungsteam und beschreiben Sie die Schritte, die zum Fehler geführt haben.
      </InfoBox>
    </div>
  )
}

// ── Suche ─────────────────────────────────────────────────────

function sucheTreffer(query: string): Suchtreffer[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  const treffer: Suchtreffer[] = []
  for (const kap of KAPITEL) {
    for (const abs of kap.abschnitte) {
      const inTitel = abs.titel.toLowerCase().includes(q)
      const inText  = abs.suchtext.toLowerCase().includes(q)
      if (inTitel || inText) {
        const words = query.trim().split(/\s+/)
        const snippet = abs.suchtext
          .split(' ')
          .filter((w) => words.some((qw) => w.toLowerCase().includes(qw.toLowerCase())))
          .slice(0, 6)
          .join(' ')
        treffer.push({
          kapitelId:     kap.id,
          kapitelTitel:  kap.titel,
          abschnittId:   abs.id,
          abschnittTitel: abs.titel,
          snippet: snippet || abs.suchtext.split(' ').slice(0, 6).join(' '),
        })
      }
    }
  }
  return treffer.slice(0, 8)
}

// ── Haupt-Komponente ───────────────────────────────────────────

export default function HandbuchClient() {
  const [aktivesKapitel, setAktivesKapitel]     = useState(KAPITEL[0].id)
  const [aufgeklappt,    setAufgeklappt]         = useState<Set<string>>(new Set([KAPITEL[0].id]))
  const [suchQuery,      setSuchQuery]            = useState('')
  const [suchOffen,      setSuchOffen]            = useState(false)
  const [suchFokus,      setSuchFokus]            = useState(0)
  const [aktiverAbschnitt, setAktiverAbschnitt]  = useState('')
  const suchRef  = useRef<HTMLInputElement>(null)
  const hauptRef = useRef<HTMLDivElement>(null)

  const treffer = useMemo(() => sucheTreffer(suchQuery), [suchQuery])

  // CMD+K Shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSuchOffen(true)
        setTimeout(() => suchRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setSuchOffen(false)
        setSuchQuery('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Tastatur-Navigation in der Suche
  const handleSuchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSuchFokus((f) => Math.min(f + 1, treffer.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSuchFokus((f) => Math.max(f - 1, 0)) }
    if (e.key === 'Enter' && treffer[suchFokus]) {
      navigiereZu(treffer[suchFokus].kapitelId, treffer[suchFokus].abschnittId)
    }
  }, [treffer, suchFokus])

  // IntersectionObserver für rechte Sidebar
  useEffect(() => {
    const kapitel = KAPITEL.find((k) => k.id === aktivesKapitel)
    if (!kapitel) return
    const ids = kapitel.abschnitte.map((a) => a.id)
    const obs = new IntersectionObserver(
      (entries) => {
        const sichtbar = entries.filter((e) => e.isIntersecting)
        if (sichtbar.length > 0) setAktiverAbschnitt(sichtbar[0].target.id)
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [aktivesKapitel])

  function navigiereZu(kapitelId: string, abschnittId: string) {
    setAktivesKapitel(kapitelId)
    setAufgeklappt((prev) => new Set(Array.from(prev).concat(kapitelId)))
    setSuchOffen(false)
    setSuchQuery('')
    setTimeout(() => {
      const el = document.getElementById(abschnittId)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  function toggleKapitel(id: string) {
    setAufgeklappt((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  function kapitelWaehlen(id: string) {
    setAktivesKapitel(id)
    setAufgeklappt((prev) => new Set(Array.from(prev).concat(id)))
    hauptRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setAktiverAbschnitt('')
  }

  const aktuellesKapitel = KAPITEL.find((k) => k.id === aktivesKapitel)!

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Suchleiste ──────────────────────────────────────── */}
      <div className="border-b border-gray-100 px-6 py-3 bg-white shrink-0">
        <div className="relative max-w-xl">
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus-within:ring-2 focus-within:ring-wellbeing-green/20 focus-within:border-wellbeing-green transition-all">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              ref={suchRef}
              value={suchQuery}
              onChange={(e) => { setSuchQuery(e.target.value); setSuchOffen(true); setSuchFokus(0) }}
              onFocus={() => setSuchOffen(true)}
              onKeyDown={handleSuchKeyDown}
              placeholder="Handbuch durchsuchen…"
              className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
            />
            {suchQuery ? (
              <button onClick={() => { setSuchQuery(''); setSuchOffen(false) }} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:flex items-center gap-0.5 text-gray-400">
                <kbd className="text-[10px] px-1 py-0.5 bg-gray-200 rounded border border-gray-300 font-mono">⌘</kbd>
                <kbd className="text-[10px] px-1 py-0.5 bg-gray-200 rounded border border-gray-300 font-mono">K</kbd>
              </span>
            )}
          </div>

          {/* Suchergebnisse */}
          {suchOffen && suchQuery && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {treffer.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  Keine Ergebnisse für &bdquo;{suchQuery}&ldquo;
                </div>
              ) : (
                <ul>
                  {treffer.map((t, i) => (
                    <li key={t.abschnittId}>
                      <button
                        onClick={() => navigiereZu(t.kapitelId, t.abschnittId)}
                        className={`w-full text-left px-4 py-3 flex flex-col gap-0.5 transition-colors ${
                          i === suchFokus ? 'bg-wellbeing-green/8 text-wellbeing-green-dark' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{t.kapitelTitel}</span>
                          <ChevronRight className="w-3 h-3 text-gray-300" />
                          <span className="text-xs font-medium text-gray-700">{t.abschnittTitel}</span>
                        </div>
                        {t.snippet && (
                          <p className="text-xs text-gray-400 truncate">{t.snippet}…</p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 3-Spalten-Layout ─────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Linke Sidebar */}
        <aside className="w-60 xl:w-64 shrink-0 border-r border-gray-100 bg-gray-50/50 overflow-y-auto py-5">
          <nav className="space-y-0.5 px-2">
            {KAPITEL.map((kap) => {
              const istAktiv   = aktivesKapitel === kap.id
              const istOffen   = aufgeklappt.has(kap.id)
              return (
                <div key={kap.id}>
                  <button
                    onClick={() => { kapitelWaehlen(kap.id); toggleKapitel(kap.id) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                      istAktiv
                        ? 'bg-wellbeing-green text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className={istAktiv ? 'text-white' : 'text-gray-400'}>{kap.icon}</span>
                    <span className="flex-1">{kap.titel}</span>
                    {istAktiv
                      ? <ChevronDown className="w-3 h-3 text-white/70 shrink-0" />
                      : <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
                    }
                  </button>

                  {/* Unterkapitel */}
                  {istOffen && istAktiv && (
                    <div className="ml-4 mt-0.5 mb-1 space-y-0.5 border-l border-gray-200 pl-3">
                      {kap.abschnitte.map((abs) => (
                        <button
                          key={abs.id}
                          onClick={() => {
                            const el = document.getElementById(abs.id)
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }}
                          className={`w-full text-left text-xs py-1.5 px-2 rounded transition-colors ${
                            aktiverAbschnitt === abs.id
                              ? 'text-wellbeing-green font-medium'
                              : 'text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          {abs.titel}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </aside>

        {/* Hauptbereich */}
        <main ref={hauptRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl 2xl:max-w-4xl mx-auto px-8 lg:px-12 xl:px-16 py-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
              <span>Handbuch</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-600 font-medium">{aktuellesKapitel.titel}</span>
            </div>

            {/* Kapitel-Titel */}
            <div className="flex items-center gap-3.5 mb-8 pb-5 border-b border-gray-100">
              <div className="w-11 h-11 rounded-2xl bg-wellbeing-green/10 flex items-center justify-center text-wellbeing-green">
                {aktuellesKapitel.icon}
              </div>
              <h1 className="text-[28px] xl:text-3xl font-bold text-gray-900 leading-tight">{aktuellesKapitel.titel}</h1>
            </div>

            {/* Inhalt */}
            <KapitelInhalt kapitelId={aktivesKapitel} />

            {/* Nächste/Vorherige Navigation */}
            <div className="flex justify-between mt-12 pt-6 border-t border-gray-100">
              {(() => {
                const idx = KAPITEL.findIndex((k) => k.id === aktivesKapitel)
                const prev = KAPITEL[idx - 1]
                const next = KAPITEL[idx + 1]
                return (
                  <>
                    <div>
                      {prev && (
                        <button
                          onClick={() => kapitelWaehlen(prev.id)}
                          className="group flex items-center gap-2 text-sm text-gray-500 hover:text-wellbeing-green transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 rotate-180" />
                          <div className="text-left">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Zurück</p>
                            <p className="font-medium group-hover:text-wellbeing-green">{prev.titel}</p>
                          </div>
                        </button>
                      )}
                    </div>
                    <div>
                      {next && (
                        <button
                          onClick={() => kapitelWaehlen(next.id)}
                          className="group flex items-center gap-2 text-sm text-gray-500 hover:text-wellbeing-green transition-colors"
                        >
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Weiter</p>
                            <p className="font-medium group-hover:text-wellbeing-green">{next.titel}</p>
                          </div>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </main>

        {/* Rechte Sidebar – "Auf dieser Seite" */}
        <aside className="hidden xl:block w-56 2xl:w-64 shrink-0 border-l border-gray-100 overflow-y-auto py-8 px-5 sticky top-0 self-start">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Auf dieser Seite</p>
          <nav className="space-y-1">
            {aktuellesKapitel.abschnitte.map((abs) => (
              <button
                key={abs.id}
                onClick={() => {
                  const el = document.getElementById(abs.id)
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className={`w-full text-left text-xs py-1 px-2 rounded transition-colors leading-snug ${
                  aktiverAbschnitt === abs.id
                    ? 'text-wellbeing-green font-medium bg-wellbeing-green/5'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {abs.titel}
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-4 border-t border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Shortcuts</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Keyboard className="w-3 h-3 text-gray-300 shrink-0" />
                <span className="text-[11px] text-gray-400">Suche</span>
                <span className="ml-auto flex gap-0.5">
                  <kbd className="text-[9px] px-1 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono text-gray-500">⌘</kbd>
                  <kbd className="text-[9px] px-1 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono text-gray-500">K</kbd>
                </span>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  )
}
