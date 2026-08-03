# Fliese & Fuge – Website

Eine vollständig statische, responsive Vorschau-Website für einen Fliesen- und Fugenbetrieb. Die aktuelle Version verwendet ausschließlich neutrale Beispieldaten und wird durch eine clientseitige Passwortabfrage verdeckt.

> Die JavaScript-Sperre verhindert nur den normalen Zugriff über die Oberfläche. Sie ist kein Ersatz für serverseitige Authentifizierung, weil die veröffentlichten Dateien bei GitHub Pages grundsätzlich abrufbar bleiben. Deshalb dürfen bis zur Freigabe keine echten Firmendaten oder vertraulichen Inhalte eingetragen werden. Das Vorschau-Passwort darf nirgendwo wiederverwendet werden.

## Enthalten

- responsive Startseite für Smartphone, Tablet und Desktop
- Leistungen, Einsatzbereiche, Ablauf, Über-uns-Bereich und FAQ
- statisches Kontaktformular, das eine E-Mail im lokalen Mailprogramm vorbereitet
- Impressum, Datenschutz und AGB als deutlich markierte Vorlagen
- zentrale Inhalts- und Farbkonfiguration in `site/content/site-content.js`
- Vorschau-Passwortabfrage auf allen HTML-Seiten
- GitHub-Actions-Workflow für Prüfung und GitHub-Pages-Deployment
- keine Cookies, kein Tracking, keine externen Schriftarten und keine Formulardienste

## Inhalte bearbeiten

Texte, Leistungen, Kontaktangaben und Farben liegen zentral in:

```text
site/content/site-content.js
```

Die Website benötigt keinen Framework-Build. Ein Commit auf `main` wird geprüft und anschließend als unveränderte statische Datei-Sammlung veröffentlicht.

Solange Beispieldaten verwendet werden, müssen diese Werte unverändert bleiben:

```json
"draft": true,
"emailReady": false,
"phoneReady": false
```

## Lokale Vorschau

Für eine realistische Vorschau sollte die Seite über HTTP geöffnet werden. Vom Repository-Ordner aus:

```bash
python3 -m http.server 4173 --directory site
```

Danach `http://localhost:4173/` öffnen.

## Vorschau-Passwort ändern

1. Hash erzeugen:

   ```bash
   node scripts/hash-password.mjs
   ```

   Das Skript fragt das Passwort verdeckt ab und nimmt nur Werte mit mindestens 16 Zeichen an.

2. Den ausgegebenen Wert in `site/assets/js/auth.js` bei `PASSWORD_HASH` einsetzen.

Das Klartextpasswort wird nicht im Repository gespeichert. Da die Prüfung vollständig im Browser stattfindet, ist sie dennoch nur eine Sichtschutzlösung.

## GitHub Pages

Der Workflow `.github/workflows/pages.yml` führt bei Pull Requests Prüfungen aus. Nach einem Push auf `main` lädt er ausschließlich den Ordner `site/` als GitHub-Pages-Artefakt hoch und veröffentlicht ihn.

Einmalig im Repository aktivieren:

1. **Settings → Pages** öffnen.
2. Unter **Build and deployment** als Quelle **GitHub Actions** wählen.
3. Den Workflow `Validate and deploy static site` starten oder auf `main` pushen.

Die Projektseite liegt anschließend normalerweise unter:

```text
https://ralphschuler.github.io/fundf/
```

## Vor dem echten Start

- Erlaubnis zur Nutzung der Firmendaten und Inhalte einholen.
- Beispieldaten durch bestätigte Angaben ersetzen.
- E-Mail und Telefon aktivieren.
- Rechtstexte individuell fachlich prüfen lassen.
- Eigene Projektfotos mit Nutzungsrechten ergänzen.
- `draft` auf `false` setzen, die statischen `noindex`-Metaangaben aktualisieren und die Passwortabfrage entfernen.
- Für echten Zugriffsschutz eine serverseitige oder vorgeschaltete Authentifizierung verwenden.
