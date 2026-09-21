/* Aktivität „Heft" — die Startseite: alle offenen Hausaufgaben, nach Termin
   gruppiert, zum Abhaken und Öffnen. Braucht shared/core.js; das HTML dazu ist
   die index.html im Wurzelverzeichnis. */
"use strict";

(function (C) {

  var el = C.el, byId = C.byId, clear = C.clear;
  var S = C.state;

  /* Kennung des Fachs, nach dem gefiltert wird — null zeigt alle. Das ist
     Ansichtssache und wird bewusst nicht mitgespeichert. */
  var filter = null;

  var ruhig = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Die Abschnitte des Hefts, von oben nach unten. `passt` bekommt die Anzahl
     Tage bis zum Termin (null, wenn keiner gesetzt ist). */
  var GRUPPEN = [
    { titel: "Überfällig",  passt: function (d) { return d !== null && d < 0; } },
    { titel: "Heute",       passt: function (d) { return d === 0; } },
    { titel: "Morgen",      passt: function (d) { return d === 1; } },
    { titel: "Diese Woche", passt: function (d) { return d !== null && d >= 2 && d <= 6; } },
    { titel: "Später",      passt: function (d) { return d !== null && d >= 7; } },
    { titel: "Ohne Termin", passt: function (d) { return d === null; } }
  ];

  function zeichneHeft() {
    hinweisSpeicher();
    kopfzeile();
    filterLeiste();
    aufgabenListe();
    C.renderInstall();
  }

  /* ---------- Kopf ---------- */

  function kopfzeile() {
    var offen = C.offene();
    var heute = offen.filter(function (a) { return a.faellig && C.tageBis(a.faellig) === 0; }).length;
    var spaet = offen.filter(function (a) { return a.faellig && C.tageBis(a.faellig) < 0; }).length;

    var text;
    if (!S.aufgaben.length) text = "Noch nichts eingetragen";
    else if (!offen.length) text = "Alles erledigt";
    else {
      text = offen.length + " " + C.plural(offen.length, "Aufgabe", "Aufgaben") + " offen";
      if (spaet) text += " · " + spaet + " überfällig";
      else if (heute) text += " · " + heute + " heute fällig";
    }
    byId("summary").textContent = text;
  }

  /* Ohne Speicher wäre das Heft nach dem Schliessen des Tabs leer — dann ist ein
     Hinweis ehrlicher als ein stiller Datenverlust. */
  function hinweisSpeicher() {
    var slot = byId("warnSlot");
    clear(slot);
    if (C.speicherOk()) return;
    slot.append(el("div", { class: "card warn" },
      el("p", { class: "hint warn" },
        "Dieser Browser speichert gerade nichts (privates Fenster oder blockierte " +
        "Website-Daten). Einträge sind nach dem Schliessen weg.")));
  }

  /* ---------- Filter nach Fach ---------- */

  function filterLeiste() {
    var slot = byId("filterSlot");
    clear(slot);

    var offen = C.offene();
    /* Nur Fächer anbieten, in denen wirklich etwas offen ist. */
    var faecher = S.faecher.filter(function (f) {
      return offen.some(function (a) { return a.fach === f.id; });
    });
    if (filter && !faecher.some(function (f) { return f.id === filter; })) filter = null;
    if (faecher.length < 2) { filter = null; return; }

    var chips = el("div", { class: "chips filter-row" });
    chips.append(marke("Alle", null));
    faecher.forEach(function (f) {
      chips.append(marke(f.name, f.id, C.farbeVon(f)));
    });
    slot.append(chips);
  }

  function marke(text, id, farbe) {
    return el("button", {
      type: "button", class: "chip",
      "aria-pressed": filter === id ? "true" : "false",
      onclick: function () { filter = id; zeichneHeft(); }
    }, farbe ? el("span", { class: "dot", style: "background:" + farbe }) : null, text);
  }

  /* ---------- Liste ---------- */

  function aufgabenListe() {
    var wrap = byId("liste");
    clear(wrap);

    var offen = C.nachTermin(C.offene().filter(function (a) {
      return !filter || a.fach === filter;
    }));

    if (!offen.length) { wrap.append(leerKarte()); return; }

    GRUPPEN.forEach(function (g) {
      var teil = offen.filter(function (a) {
        return g.passt(a.faellig ? C.tageBis(a.faellig) : null);
      });
      if (!teil.length) return;

      wrap.append(el("p", { class: "section-title group" },
        el("span", {}, g.titel),
        el("span", { class: "count" }, String(teil.length))));

      var karte = el("div", { class: "card" });
      teil.forEach(function (a) { karte.append(zeile(a)); });
      wrap.append(karte);
    });
  }

  function zeile(a) {
    var node = C.aufgabeZeile(a, {
      meta: a.faellig ? C.faelligKnoten(a.faellig) : null,
      onBox: function () { erledige(a, node); },
      onBody: function () { C.go("eintragen", "?id=" + encodeURIComponent(a.id)); }
    });
    return node;
  }

  /* Abgehakt verschwindet die Aufgabe aus dem Heft und liegt ab dann im Archiv.
     Der kurze Übergang macht sichtbar, wohin sie geht. */
  function erledige(a, node) {
    C.abhaken(a.id, true);
    if (ruhig) { zeichneHeft(); return; }
    node.classList.add("gone");
    setTimeout(zeichneHeft, 180);
  }

  function leerKarte() {
    var text;
    if (filter) text = "In diesem Fach ist nichts offen.";
    else if (S.aufgaben.length) text = "Alles erledigt. Nichts zu tun.";
    else text = "Noch keine Hausaufgabe eingetragen.";
    return el("div", { class: "card" }, el("p", { class: "empty" }, text));
  }

  /* ---------- Start ---------- */

  byId("addBtn").onclick = function () { C.go("eintragen"); };

  C.start(zeichneHeft);

})(Heft);
