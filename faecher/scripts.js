/* Aktivität „Fächer" — die Fächer des Stundenplans anlegen, umbenennen,
   einfärben und löschen. Braucht shared/core.js. */
"use strict";

(function (C) {

  var el = C.el, byId = C.byId, clear = C.clear;
  var S = C.state;

  /* Nach dem Hinzufügen soll der Kursor im neuen Feld stehen; welches das ist,
     merkt sich diese Kennung bis zum nächsten Zeichnen. */
  var frischAngelegt = null;

  function zeichneFaecher() {
    var liste = byId("liste");
    clear(liste);

    if (!S.faecher.length) {
      liste.append(el("p", { class: "empty" },
        "Noch keine Fächer. Hausaufgaben gehen auch ohne — mit Fach findet man sie schneller."));
    }

    S.faecher.forEach(function (f, i) {
      liste.append(zeile(f, i));
    });

    byId("addBtn").disabled = S.faecher.length >= C.MAX_FAECHER;
  }

  function zeile(f, i) {
    var feld = el("input", {
      type: "text", value: f.name, maxlength: "24", placeholder: "Fachname",
      "aria-label": "Name des Fachs",
      oninput: function (e) { f.name = e.target.value; C.save(); },
      onblur: function () {
        /* Ein leeres Fach wäre im Heft nur ein farbiger Punkt ohne Bedeutung. */
        if (!f.name.trim()) { f.name = "Fach " + (i + 1); C.save(); zeichneFaecher(); }
      }
    });

    if (frischAngelegt === f.id) {
      frischAngelegt = null;
      setTimeout(function () { feld.focus(); }, 0);
    }

    return el("div", { class: "fitem" },
      el("button", {
        type: "button", class: "farbe",
        style: "background:" + C.farbeVon(f),
        "aria-label": "Farbe von " + (f.name || "Fach") + " wechseln",
        onclick: function () { naechsteFarbe(f); }
      }),
      feld,
      el("button", {
        type: "button", class: "icon-btn", "aria-label": "Fach löschen",
        onclick: function () { loesche(f); }
      }, "×"));
  }

  /* Ein Tipp auf den Punkt nimmt die nächste Farbe der Liste — das kommt ohne
     Farbwähler aus und trifft mit acht Tönen schnell den gewünschten. */
  function naechsteFarbe(f) {
    var ids = C.FARBEN.map(function (x) { return x.id; });
    f.farbe = ids[(ids.indexOf(f.farbe) + 1) % ids.length];
    C.save();
    zeichneFaecher();
  }

  function loesche(f) {
    var betroffen = S.aufgaben.filter(function (a) { return a.fach === f.id; }).length;
    var frage = "Fach „" + (f.name || "ohne Namen") + "“ löschen?";
    if (betroffen) {
      frage += "\n\n" + betroffen + " " + C.plural(betroffen, "Hausaufgabe steht", "Hausaufgaben stehen") +
        " danach ohne Fach im Heft.";
    }
    if (!confirm(frage)) return;

    S.aufgaben.forEach(function (a) { if (a.fach === f.id) a.fach = null; });
    S.faecher = S.faecher.filter(function (x) { return x.id !== f.id; });
    C.save();
    C.render();
  }

  byId("addBtn").onclick = function () {
    if (S.faecher.length >= C.MAX_FAECHER) return;
    /* Eine Farbe vorschlagen, die noch nicht vergeben ist. */
    var benutzt = S.faecher.map(function (f) { return f.farbe; });
    var frei = C.FARBEN.filter(function (x) { return benutzt.indexOf(x.id) < 0; });
    var neu = {
      id: C.uid(),
      name: "",
      farbe: (frei.length ? frei[0] : C.FARBEN[S.faecher.length % C.FARBEN.length]).id
    };
    S.faecher.push(neu);
    frischAngelegt = neu.id;
    C.save();
    zeichneFaecher();
  };

  C.start(zeichneFaecher);

})(Heft);
