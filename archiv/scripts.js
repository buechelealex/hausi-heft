/* Aktivität „Archiv" — was abgehakt wurde. Von hier lässt sich eine Aufgabe
   zurück ins Heft holen oder endgültig löschen. Braucht shared/core.js. */
"use strict";

(function (C) {

  var el = C.el, byId = C.byId, clear = C.clear;
  var S = C.state;

  function zeichneArchiv() {
    var fertig = C.erledigte();
    byId("summary").textContent = fertig.length
      ? fertig.length + " " + C.plural(fertig.length, "erledigte Aufgabe", "erledigte Aufgaben")
      : "Noch nichts abgehakt";
    byId("clearBtn").hidden = !fertig.length;

    var liste = byId("liste");
    clear(liste);

    if (!fertig.length) {
      liste.append(el("div", { class: "card" },
        el("p", { class: "empty" },
          "Hier sammelt sich, was im Heft abgehakt wurde.")));
      return;
    }

    /* Zuletzt Abgehaktes zuoberst, Tag für Tag. */
    gruppiere(fertig).forEach(function (g) {
      var karte = el("div", { class: "card" });
      g.eintraege.forEach(function (a) { karte.append(zeile(a)); });

      /* Überschrift und Karte bilden einen Block — am Laptop stehen mehrere
         Tage nebeneinander. */
      liste.append(el("section", { class: "group" },
        el("p", { class: "section-title head" },
          el("span", {}, tagTitel(g.tag)),
          el("span", { class: "count" }, String(g.eintraege.length))),
        karte));
    });
  }

  /* Nach dem Tag des Abhakens bündeln; Einträge ohne Datum (etwa von Hand im
     Speicher verändert) landen gemeinsam am Ende. */
  function gruppiere(liste) {
    var tage = [], nach = {};
    liste.slice()
      .sort(function (a, b) {
        var x = a.erledigtAm || "", y = b.erledigtAm || "";
        if (x !== y) return x < y ? 1 : -1;
        return a.erstellt < b.erstellt ? 1 : -1;
      })
      .forEach(function (a) {
        var tag = a.erledigtAm || "";
        if (!nach[tag]) { nach[tag] = []; tage.push(tag); }
        nach[tag].push(a);
      });
    return tage.map(function (t) { return { tag: t, eintraege: nach[t] }; });
  }

  function tagTitel(tag) {
    if (!tag) return "Ohne Datum";
    var d = C.tageBis(tag);
    if (d === 0) return "Heute";
    if (d === -1) return "Gestern";
    return C.langDatum(tag);
  }

  function zeile(a) {
    return C.aufgabeZeile(a, {
      meta: a.faellig ? el("span", {}, "war fällig " + C.kurzDatum(a.faellig)) : null,
      /* Das Kästchen wirkt hier andersherum: der Haken geht weg, die Aufgabe
         steht wieder im Heft. */
      onBox: function () { C.abhaken(a.id, false); C.render(); },
      onBody: function () { C.go("eintragen", "?id=" + encodeURIComponent(a.id)); },
      extra: el("button", {
        type: "button", class: "icon-btn", "aria-label": "Endgültig löschen: " + a.titel,
        onclick: function () {
          if (!confirm("„" + a.titel + "“ endgültig löschen?")) return;
          C.loeschen(a.id);
          C.render();
        }
      }, "×")
    });
  }

  byId("clearBtn").onclick = function () {
    var anzahl = C.erledigte().length;
    if (!anzahl) return;
    if (!confirm(anzahl + " " + C.plural(anzahl, "erledigten Eintrag", "erledigte Einträge") +
                 " endgültig löschen?")) return;
    S.aufgaben = S.aufgaben.filter(function (a) { return !a.erledigt; });
    C.save();
    C.render();
  };

  C.start(zeichneArchiv);

})(Heft);
