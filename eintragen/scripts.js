/* Aktivität „Eintragen" — eine Hausaufgabe anlegen oder ändern.
   Ohne ?id= entsteht ein neuer Eintrag, mit ?id=<Kennung> wird der bestehende
   bearbeitet. Braucht shared/core.js. */
"use strict";

(function (C) {

  var el = C.el, byId = C.byId, clear = C.clear;
  var S = C.state;

  /* Aus der Adresszeile: welche Aufgabe wird bearbeitet? Eine unbekannte
     Kennung (alter Verweis, gelöschter Eintrag) gilt als neuer Eintrag. */
  var bestehend = C.aufgabeMit(C.param("id"));

  /* Bis zum Speichern wird nur an diesem Entwurf gearbeitet — wer abbricht,
     lässt das Heft unberührt. */
  var entwurf = bestehend
    ? { titel: bestehend.titel, fach: bestehend.fach, faellig: bestehend.faellig, notiz: bestehend.notiz }
    : { titel: "", fach: null, faellig: C.inTagen(1), notiz: "" };

  /* Schnellwahl für den Termin — deckt ab, was im Heft am häufigsten vorkommt. */
  var TERMINE = [
    { text: "Heute", tage: 0 },
    { text: "Morgen", tage: 1 },
    { text: "Übermorgen", tage: 2 },
    { text: "Nächste Woche", tage: 7 },
    { text: "Kein Termin", tage: null }
  ];

  function zeichneEintragen() {
    kopf();
    fachMarken();
    terminMarken();
    byId("datum").value = entwurf.faellig || "";
    byId("datumHint").textContent = entwurf.faellig ? C.langDatum(entwurf.faellig) : "Ohne Termin";
    byId("saveBtn").disabled = !entwurf.titel.trim();
  }

  function kopf() {
    byId("pageTitle").textContent = bestehend ? "Hausaufgabe bearbeiten" : "Neue Hausaufgabe";
    byId("pageNote").textContent = bestehend && bestehend.erledigt
      ? "Diese Aufgabe liegt im Archiv."
      : "";
    byId("saveBtn").textContent = bestehend ? "Speichern" : "Eintragen";
    byId("deleteBtn").hidden = !bestehend;
  }

  /* ---------- Fach ---------- */

  function fachMarken() {
    var wrap = byId("fachChips");
    clear(wrap);

    wrap.append(marke("Kein Fach", entwurf.fach === null, null, function () {
      entwurf.fach = null; zeichneEintragen();
    }));

    S.faecher.forEach(function (f) {
      wrap.append(marke(f.name, entwurf.fach === f.id, C.farbeVon(f), function () {
        entwurf.fach = f.id; zeichneEintragen();
      }));
    });

    var hint = byId("fachHint");
    clear(hint);
    hint.append("Fächer anlegen und umbenennen: ");
    hint.append(el("a", { href: C.PAGES.faecher }, "Fächer"));
  }

  /* ---------- Termin ---------- */

  function terminMarken() {
    var wrap = byId("terminChips");
    clear(wrap);
    TERMINE.forEach(function (t) {
      var wert = t.tage === null ? null : C.inTagen(t.tage);
      wrap.append(marke(t.text, entwurf.faellig === wert, null, function () {
        entwurf.faellig = wert; zeichneEintragen();
      }));
    });
  }

  function marke(text, aktiv, farbe, klick) {
    return el("button", {
      type: "button", class: "chip",
      "aria-pressed": aktiv ? "true" : "false",
      onclick: klick
    }, farbe ? el("span", { class: "dot", style: "background:" + farbe }) : null, text);
  }

  /* ---------- Speichern ---------- */

  /* Der Seitenwechsel nach dem Speichern braucht einen Augenblick. Bis dahin
     darf kein zweiter Tastendruck denselben Eintrag noch einmal anlegen. */
  var laeuftSchon = false;

  function speichern() {
    var titel = entwurf.titel.trim();
    if (!titel || laeuftSchon) return;
    laeuftSchon = true;

    if (bestehend) {
      bestehend.titel = titel;
      bestehend.fach = entwurf.fach;
      bestehend.faellig = entwurf.faellig;
      bestehend.notiz = entwurf.notiz.trim();
    } else {
      S.aufgaben.push({
        id: C.uid(),
        titel: titel,
        fach: entwurf.fach,
        faellig: entwurf.faellig,
        notiz: entwurf.notiz.trim(),
        erledigt: false,
        erledigtAm: null,
        erstellt: new Date().toISOString()
      });
    }
    C.save();
    zurueck();
  }

  /* ---------- Bedienung ---------- */

  var titelFeld = byId("titel");
  titelFeld.value = entwurf.titel;
  titelFeld.oninput = function (e) {
    entwurf.titel = e.target.value;
    byId("saveBtn").disabled = !entwurf.titel.trim();
  };
  /* Enter im Titelfeld speichert — wie das Absenden eines Formulars. Mit Strg
     übernimmt das die Tastaturbedienung weiter unten. */
  titelFeld.onkeydown = function (e) {
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) speichern();
  };

  var notizFeld = byId("notiz");
  notizFeld.value = entwurf.notiz;
  notizFeld.oninput = function (e) { entwurf.notiz = e.target.value; };

  byId("datum").onchange = function (e) {
    entwurf.faellig = C.istDatum(e.target.value) ? e.target.value : null;
    zeichneEintragen();
  };

  byId("saveBtn").onclick = speichern;

  /* Zurück dorthin, wo die Aufgabe steht: Erledigtes kam aus dem Archiv. */
  function zurueck() { C.go(bestehend && bestehend.erledigt ? "archiv" : "heft"); }

  byId("cancelBtn").onclick = zurueck;

  /* Am Laptop: Strg+Enter speichert von überall auf der Seite, Esc bricht ab.
     Beides auch aus dem Notizfeld heraus, wo Enter einen Absatz macht. */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); speichern(); }
    else if (e.key === "Escape") { e.preventDefault(); zurueck(); }
  });

  byId("deleteBtn").onclick = function () {
    if (!bestehend) return;
    if (!confirm("Diese Hausaufgabe endgültig löschen?")) return;
    C.loeschen(bestehend.id);
    C.go("heft");
  };

  C.start(zeichneEintragen);

  /* Bei einem neuen Eintrag steht der Kursor gleich im Titelfeld. Am Handy
     öffnet das die Tastatur — dort nicht erzwingen. */
  if (!bestehend && !window.matchMedia("(pointer: coarse)").matches) titelFeld.focus();

})(Heft);
