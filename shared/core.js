/* Hausaufgabenheft — gemeinsame Grundlage aller Aktivitäten.
   Hier liegt, was mehr als eine Aktivität braucht: der Zustand im localStorage,
   Datumsrechnerei, kleine Helfer, die Navigationsleiste und die Installation
   als App. Jede Aktivität (Heft, eintragen, faecher, archiv) hat daneben ihre
   eigene scripts.js und style.css in ihrem Ordner.

   Alle Adressen werden aus dem Ort dieser Datei abgeleitet, damit die App sowohl
   im Wurzelverzeichnis als auch in einem Unterordner (GitHub Pages) läuft. */
"use strict";

var Heft = (function () {

  /* .../shared/core.js -> Wurzelordner der App */
  var ROOT = new URL("../", document.currentScript.src).href;

  /* ---------- Vorgaben ---------- */

  var KEY = "hausi-heft-v1";

  /* Jede Aktivität liegt in ihrem eigenen Ordner; das Heft selbst ist die
     Startseite und liegt deshalb im Wurzelverzeichnis. */
  var PAGES = {
    heft:      ROOT,
    eintragen: ROOT + "eintragen/",
    faecher:   ROOT + "faecher/",
    archiv:    ROOT + "archiv/"
  };

  /* Farben für die Fächer — gedämpfte Töne, die neben dem Orange bestehen. */
  var FARBEN = [
    { id: "orange",  hex: "#c9762f", name: "Orange" },
    { id: "rot",     hex: "#b04a3a", name: "Rot" },
    { id: "gruen",   hex: "#3f7d55", name: "Grün" },
    { id: "blau",    hex: "#3f6b8f", name: "Blau" },
    { id: "violett", hex: "#7a5a92", name: "Violett" },
    { id: "gold",    hex: "#b08a1e", name: "Gold" },
    { id: "tuerkis", hex: "#2f7d7d", name: "Türkis" },
    { id: "grau",    hex: "#7c7268", name: "Grau" }
  ];

  var MAX_FAECHER = 20;
  var TITEL_MAX = 80;

  /* ---------- Kleine Helfer ---------- */

  function el(tag, attrs) {
    var node = document.createElement(tag), k, v, i, kid;
    if (attrs) for (k in attrs) {
      v = attrs[k];
      if (v === null || v === false || v === undefined) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (i = 2; i < arguments.length; i++) {
      kid = arguments[i];
      if (kid === null || kid === false || kid === undefined) continue;
      if (Array.isArray(kid)) kid.forEach(function (c) { if (c) node.append(c.nodeType ? c : document.createTextNode(c)); });
      else node.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return node;
  }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }
  function byId(id) { return document.getElementById(id); }
  function plural(n, one, many) { return n === 1 ? one : many; }

  /* Kennung, die sich zwischen zwei Einträgen nicht wiederholt. */
  function uid() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  /* Die Adresszeile trägt beim Bearbeiten die Kennung der Aufgabe. */
  function param(name) {
    return new URL(location.href).searchParams.get(name);
  }

  /* ---------- Datum ---------- */

  var WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  var MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni",
                "Juli", "August", "September", "Oktober", "November", "Dezember"];

  /* Termine stehen als "JJJJ-MM-TT" im Speicher — genau das Format, das
     <input type="date"> liefert, und es sortiert sich von selbst. Gerechnet
     wird über die lokale Mittagszeit, damit weder Zeitzone noch Sommerzeit
     einen Tag verschieben. */
  function iso(date) {
    var m = date.getMonth() + 1, t = date.getDate();
    return date.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (t < 10 ? "0" : "") + t;
  }

  function heute() { return iso(new Date()); }

  function inTagen(n) {
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return iso(d);
  }

  function zuDatum(isoStr) {
    var p = String(isoStr).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0, 0);
  }

  function istDatum(isoStr) {
    return typeof isoStr === "string" && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(isoStr) &&
      !isNaN(zuDatum(isoStr).getTime());
  }

  /* Volle Tage von heute bis zum Termin: 0 = heute, negativ = vorbei. */
  function tageBis(isoStr) {
    return Math.round((zuDatum(isoStr) - zuDatum(heute())) / 86400000);
  }

  /* Kurze Angabe für die Liste, dazu die Farbklasse für Nähe und Verzug. */
  function faelligText(isoStr) {
    var d = tageBis(isoStr), datum = zuDatum(isoStr);
    if (d < -1) return { text: "seit " + (-d) + " Tagen fällig", klasse: "late" };
    if (d === -1) return { text: "gestern fällig", klasse: "late" };
    if (d === 0) return { text: "heute fällig", klasse: "soon" };
    if (d === 1) return { text: "morgen fällig", klasse: "soon" };
    if (d <= 6) return { text: WOCHENTAGE[datum.getDay()], klasse: "" };
    return { text: kurzDatum(isoStr), klasse: "" };
  }

  function kurzDatum(isoStr) {
    var d = zuDatum(isoStr);
    return WOCHENTAGE[d.getDay()].slice(0, 2) + ", " +
      d.getDate() + "." + (d.getMonth() + 1) + ".";
  }

  function langDatum(isoStr) {
    var d = zuDatum(isoStr);
    return WOCHENTAGE[d.getDay()] + ", " + d.getDate() + ". " + MONATE[d.getMonth()];
  }

  /* ---------- Zustand ---------- */

  var S, speicherOk = true;

  function frisch() {
    return {
      version: 1,
      faecher: [
        { id: uid(), name: "Deutsch", farbe: "rot" },
        { id: uid(), name: "Mathematik", farbe: "blau" },
        { id: uid(), name: "Englisch", farbe: "gruen" }
      ],
      aufgaben: []
    };
  }

  /* Was aus dem Speicher kommt, kann aus einer älteren Fassung stammen oder von
     Hand verändert worden sein. Darum wird jeder Eintrag geprüft, statt ihm zu
     vertrauen — eine kaputte Zeile darf nicht das ganze Heft leeren. */
  function laden() {
    var roh = null;
    try {
      roh = JSON.parse(localStorage.getItem(KEY) || "null");
    } catch (e) {
      roh = null;
      /* Speicher gesperrt (etwa ein privates Fenster): die App läuft weiter,
         merkt sich aber nichts. Das Heft weist darauf hin. */
      speicherOk = false;
    }
    if (!roh || typeof roh !== "object") return frisch();

    var farbIds = FARBEN.map(function (f) { return f.id; });

    var faecher = (Array.isArray(roh.faecher) ? roh.faecher : [])
      .filter(function (f) { return f && typeof f.name === "string"; })
      .map(function (f) {
        return {
          id: f.id || uid(),
          name: String(f.name).slice(0, 24),
          farbe: farbIds.indexOf(f.farbe) >= 0 ? f.farbe : "grau"
        };
      });

    var aufgaben = (Array.isArray(roh.aufgaben) ? roh.aufgaben : [])
      .filter(function (a) { return a && typeof a.titel === "string" && a.titel.trim(); })
      .map(function (a) {
        return {
          id: a.id || uid(),
          titel: String(a.titel).slice(0, TITEL_MAX),
          fach: a.fach || null,
          notiz: typeof a.notiz === "string" ? a.notiz.slice(0, 500) : "",
          faellig: istDatum(a.faellig) ? a.faellig : null,
          erledigt: !!a.erledigt,
          erledigtAm: istDatum(a.erledigtAm) ? a.erledigtAm : (a.erledigt ? heute() : null),
          erstellt: typeof a.erstellt === "string" ? a.erstellt : new Date().toISOString()
        };
      });

    return { version: 1, faecher: faecher, aufgaben: aufgaben };
  }

  function sichern() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
      speicherOk = true;
    } catch (e) {
      speicherOk = false;
    }
  }

  /* ---------- Fragen an den Zustand ---------- */

  function fachVon(aufgabe) {
    var id = aufgabe && aufgabe.fach;
    if (!id) return null;
    var treffer = S.faecher.filter(function (f) { return f.id === id; });
    return treffer.length ? treffer[0] : null;
  }

  function farbeVon(fach) {
    if (!fach) return "#b8afa4";
    var treffer = FARBEN.filter(function (f) { return f.id === fach.farbe; });
    return treffer.length ? treffer[0].hex : "#b8afa4";
  }

  function aufgabeMit(id) {
    var treffer = S.aufgaben.filter(function (a) { return a.id === id; });
    return treffer.length ? treffer[0] : null;
  }

  function offene() {
    return S.aufgaben.filter(function (a) { return !a.erledigt; });
  }

  function erledigte() {
    return S.aufgaben.filter(function (a) { return a.erledigt; });
  }

  /* Was zuerst fällig ist, steht oben; Aufgaben ohne Termin ganz unten. */
  function nachTermin(liste) {
    return liste.slice().sort(function (a, b) {
      if (!a.faellig && !b.faellig) return a.erstellt < b.erstellt ? -1 : 1;
      if (!a.faellig) return 1;
      if (!b.faellig) return -1;
      if (a.faellig !== b.faellig) return a.faellig < b.faellig ? -1 : 1;
      return a.erstellt < b.erstellt ? -1 : 1;
    });
  }

  function abhaken(id, erledigt) {
    var a = aufgabeMit(id);
    if (!a) return;
    a.erledigt = !!erledigt;
    a.erledigtAm = a.erledigt ? heute() : null;
    sichern();
  }

  function loeschen(id) {
    S.aufgaben = S.aufgaben.filter(function (a) { return a.id !== id; });
    sichern();
  }

  /* ---------- Eine Zeile der Aufgabenliste ---------- */

  /* Heft und Archiv zeigen dieselbe Zeile: Kästchen zum Abhaken, Titel, darunter
     Fach und Termin. Was sich unterscheidet, kommt über `opts`:
       meta     zusätzliche Angabe hinter dem Fach (Knoten oder Text)
       onBox    Klick auf das Kästchen
       onBody   Klick auf den Text (im Heft: bearbeiten)
       extra    Knopf am rechten Rand (im Archiv: löschen) */
  function aufgabeZeile(a, opts) {
    opts = opts || {};
    var fach = fachVon(a);
    var meta = [];

    if (fach) {
      meta.push(el("span", { class: "dot", style: "background:" + farbeVon(fach) }));
      meta.push(fach.name);
    }
    if (opts.meta) {
      if (meta.length) meta.push(" · ");
      meta.push(opts.meta);
    }

    return el("div", { class: "task" + (a.erledigt ? " done" : "") },
      el("button", {
        type: "button",
        class: "box" + (a.erledigt ? " done" : ""),
        "aria-pressed": a.erledigt ? "true" : "false",
        "aria-label": (a.erledigt ? "Wieder offen: " : "Erledigt: ") + a.titel,
        onclick: opts.onBox || null
      }, "✓"),
      el("button", {
        type: "button", class: "body",
        onclick: opts.onBody || null
      },
        el("div", { class: "title" }, a.titel),
        meta.length ? el("div", { class: "meta" }, meta) : null,
        a.notiz ? el("div", { class: "note" }, a.notiz) : null),
      opts.extra || null);
  }

  /* Termin als eingefärbter Text: nah am Termin orange, überfällig rot. */
  function faelligKnoten(isoStr) {
    var f = faelligText(isoStr);
    return el("span", { class: "due " + f.klasse }, f.text);
  }

  /* ---------- Ansichtswechsel ---------- */

  var pageView = document.querySelector("main[data-view]").dataset.view;
  var draw = null;

  /* Jede Aktivität meldet am Ende ihrer scripts.js ihre Zeichenfunktion an. */
  function start(fn) { draw = fn; render(); }

  /* Dieselbe Aktivität noch einmal zeichnen. */
  function render() { buildNav(pageView); draw(); }

  /* Zu einer anderen Aktivität wechseln — das ist ein normaler Seitenwechsel. */
  function go(view, query) {
    location.href = PAGES[view] + (query || "");
  }

  function buildNav(view) {
    var nav = byId("nav");
    if (!nav) return;
    clear(nav);
    var anzahl = offene().length;
    var items = [
      ["heft", anzahl ? "Heft · " + anzahl : "Heft"],
      ["faecher", "Fächer"],
      ["archiv", "Archiv"]
    ];
    items.forEach(function (it) {
      nav.append(el("a", {
        href: PAGES[it[0]],
        class: view === it[0] ? "active" : null
      }, it[1]));
    });
  }

  /* ---------- Installation als App ---------- */

  /* Der Service Worker macht die App offlinefähig — ohne ihn bietet Chrome
     unter Android keine Installation an. Über file:// ist er nicht erlaubt. */
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(ROOT + "sw.js").catch(function (err) {
        console.warn("Service Worker nicht angemeldet:", err);
      });
    });
  }

  var installPrompt = null;

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();          /* eigenen Knopf zeigen statt Chromes Leiste */
    installPrompt = e;
    renderInstall();
  });

  window.addEventListener("appinstalled", function () {
    installPrompt = null;
    renderInstall();
  });

  function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true;
  }

  /* Der Knopf erscheint nur dort, wo Platz dafür ist — im Heft. */
  function renderInstall() {
    var slot = byId("installSlot");
    if (!slot) return;
    clear(slot);
    if (!installPrompt || isStandalone()) return;
    slot.append(el("button", {
      class: "btn", onclick: function () {
        var prompt = installPrompt;
        if (!prompt) return;
        installPrompt = null;
        prompt.prompt();
        if (prompt.userChoice) prompt.userChoice.then(function () { renderInstall(); });
      }
    }, "App installieren"));
  }

  /* ---------- Was die Aktivitäten benutzen ---------- */

  S = laden();

  return {
    ROOT: ROOT,
    PAGES: PAGES,
    FARBEN: FARBEN,
    MAX_FAECHER: MAX_FAECHER,
    TITEL_MAX: TITEL_MAX,
    el: el,
    clear: clear,
    byId: byId,
    plural: plural,
    uid: uid,
    param: param,
    heute: heute,
    inTagen: inTagen,
    istDatum: istDatum,
    tageBis: tageBis,
    faelligText: faelligText,
    kurzDatum: kurzDatum,
    langDatum: langDatum,
    state: S,
    save: sichern,
    speicherOk: function () { return speicherOk; },
    fachVon: fachVon,
    farbeVon: farbeVon,
    aufgabeMit: aufgabeMit,
    offene: offene,
    erledigte: erledigte,
    nachTermin: nachTermin,
    abhaken: abhaken,
    loeschen: loeschen,
    aufgabeZeile: aufgabeZeile,
    faelligKnoten: faelligKnoten,
    renderInstall: renderInstall,
    start: start,
    render: render,
    go: go
  };

})();
