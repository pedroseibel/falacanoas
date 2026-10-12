/* Fala, Canoas · app (protótipo para iteração). AGPL-3.0. Dados fictícios. */
(function () {
  "use strict";
  var D = window.FC_DATA;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isPhone = function () { return matchMedia("(max-width:900px)").matches; };

  var CAT = {
    buraco: ["Buraco na rua", "Secretaria de Obras e Reconstrução", "ruas"],
    alaga: ["Rua que alaga toda chuva", "Secretaria de Obras e Reconstrução", "agua"],
    bocalobo: ["Boca de lobo entupida", "Secretaria de Obras e Reconstrução", "agua"],
    lixo: ["Lixo e descarte irregular", "Secretaria de Serviços e Zeladoria Urbana", "lixo"],
    entulho: ["Entulho", "Secretaria de Serviços e Zeladoria Urbana", "lixo"],
    poste: ["Poste apagado", "Iluminação pública", "luz"],
    arvore: ["Árvore: poda ou risco", "Secretaria de Serviços e Zeladoria Urbana", "arvores"],
    calcada: ["Calçada quebrada ou bloqueada", "Fiscalização (a confirmar)", "ruas"],
    esgoto: ["Esgoto a céu aberto", "Saneamento (a confirmar)", "agua"],
    sinal: ["Sinalização e semáforo", "Secretaria de Mobilidade Urbana", "ruas"],
    questao: ["Questão pública", "", "questoes"]
  };
  var FILTERS = [["tudo", "Tudo", null], ["agora", "Agora", "i-clock"], ["agua", "Água", "c-alaga"], ["ruas", "Ruas e calçadas", "c-buraco"], ["lixo", "Lixo", "c-lixo"], ["luz", "Luz", "c-poste"], ["arvores", "Árvores", "c-arvore"], ["questoes", "Questões públicas", "c-questao"]];
  var MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  var NOW = new Date(D.now);
  var BY_B = {}; D.bairros.forEach(function (b) { BY_B[b.slug] = b; });
  var ITEMS = D.items;
  var BY_ID = {}; ITEMS.forEach(function (i) { BY_ID[i.id] = i; });
  var FEAT = BY_ID["7K3QF"];
  var ME = D.me; ME.cpf = true;

  var S = {
    view: "mapa", filter: "tudo", sort: "perto", q: "", sel: null, detail: false, photoIdx: 0,
    density: 140, pins: "pontos", theme: localStorage.getItem("fc-theme") || "auto",
    bairro: ME.bairro, btab: "registros", stab: "tipo", thread: null, limit: 50,
    confirmed: {}, followed: { "7K3QF": true }, affected: {}, created: [], extra: {}
  };

  /* ---------- helpers ---------- */
  function bn(slug) { return slug && BY_B[slug] ? BY_B[slug].name : "Canoas"; }
  function dateAgo(days) { var d = new Date(NOW.getTime() - days * 864e5); return d.getDate() + " " + MES[d.getMonth()]; }
  function ago(min) {
    if (min < 1) return "agora";
    if (min < 60) return "há " + min + " min";
    if (min < 1440) return "há " + Math.round(min / 60) + " h";
    var d = Math.round(min / 1440); return d === 1 ? "ontem" : "há " + d + " dias";
  }
  function hav(a, b) {
    var R = 6371000, t = Math.PI / 180, dLa = (b[1] - a[1]) * t, dLo = (b[0] - a[0]) * t;
    var x = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function dist(it) { return it.lng == null ? Infinity : hav(ME.loc, [it.lng, it.lat]); }
  function fdist(m) { if (!isFinite(m)) return ""; return m < 1000 ? Math.round(m / 10) * 10 + " m" : (m / 1000).toFixed(1).replace(".", ",") + " km"; }
  function where(it) { return it.scope === "cidade" ? "Toda a cidade" : it.place ? it.place + " · " + bn(it.bairro) : bn(it.bairro); }
  function isOpen(it) { return it.community !== "resolvido"; }
  function confirms(it) { return it.confirm + (S.confirmed[it.id] ? 1 : 0); }
  function median(a) { if (!a.length) return null; a = a.slice().sort(function (x, y) { return x - y; }); var m = a.length >> 1; return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2); }
  function statusText(it) {
    var n = confirms(it);
    if (it.kind === "questao") return n + " dizem: me afeta";
    if (it.official && it.official.state === "resolvido" && it.community === "continua") return "Prefeitura: resolvido · " + (it.disagree || n) + " dizem que continua";
    return { relatado: "aguardando confirmação", confirmado: n + " confirmam", continua: n + " dizem que continua", parece_resolvido: "parece resolvido", resolvido: "resolvido e confirmado" }[it.community];
  }
  function code() { var a = "ACDEFHJKMNPRTUVWXY3479", s = ""; for (var i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  function pip(pt, geom) {
    var polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates, x = pt[0], y = pt[1], c = false;
    polys.forEach(function (p) { p.forEach(function (r) { for (var i = 0, j = r.length - 1; i < r.length; j = i++) { if ((r[i][1] > y) !== (r[j][1] > y) && x < (r[j][0] - r[i][0]) * (y - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; } }); });
    return c;
  }
  function bairroAt(pt) { var f = D.geo.features.find(function (f) { return pip(pt, f.geometry); }); return f ? f.properties.slug : null; }
  function cssv(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  function toast(msg) {
    var t = $(".toast") || document.body.appendChild(Object.assign(document.createElement("div"), { className: "toast", role: "status" }));
    t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("on"); }, 2600);
  }

  /* ---------- dataset in view ---------- */
  function base() {
    var occ = ITEMS.filter(function (i) { return i.kind === "ocorrencia"; }).slice(0, S.density);
    return S.created.concat(occ, ITEMS.filter(function (i) { return i.kind === "questao"; }));
  }
  function visible() {
    var q = S.q.trim().toLowerCase();
    var list = base().filter(function (it) {
      if (S.filter === "agora" && it.updatedMin > 180) return false;
      if (S.filter !== "tudo" && S.filter !== "agora" && CAT[it.cat][2] !== S.filter) return false;
      if (q && (it.title + " " + bn(it.bairro) + " " + it.id + " " + CAT[it.cat][0]).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var by = {
      perto: function (a, b) { return dist(a) - dist(b); },
      antigos: function (a, b) { return (isOpen(b) - isOpen(a)) || b.days - a.days; },
      confirmados: function (a, b) { return confirms(b) - confirms(a); },
      recentes: function (a, b) { return a.updatedMin - b.updatedMin; }
    }[S.sort];
    return list.sort(by);
  }

  /* ---------- filters + rail ---------- */
  function renderFilters() {
    $$("[data-filters]").forEach(function (box) {
      box.innerHTML = FILTERS.map(function (f) {
        return '<button class="fchip" type="button" data-f="' + f[0] + '" aria-pressed="' + (S.filter === f[0]) + '">' + (f[2] ? '<svg class="i"><use href="#' + f[2] + '"/></svg>' : "") + f[1] + "</button>";
      }).join("");
    });
  }
  function cardHTML(it) {
    var c = CAT[it.cat], open = isOpen(it);
    var media = it.photos.length ? '<img src="' + it.photos[0].src + '" alt="" loading="lazy" decoding="async">' : '<svg class="i"><use href="#c-' + it.cat + '"/></svg>';
    var anon = it.anon ? '<span class="anon" title="Publicado como Anônimo"><svg class="i"><use href="#i-mask"/></svg></span>' : "";
    var d = dist(it), dl = isFinite(d) ? " · " + fdist(d) : "";
    var clock = open
      ? '<span class="clock' + (it.days > 30 ? " over" : "") + '"><b>' + it.days + "</b>" + (it.days === 1 ? "dia" : "dias") + "</span>"
      : '<span class="clock done"><svg class="i"><use href="#i-check"/></svg><b>' + it.days + "</b>dias</span>";
    return '<button class="card' + (S.sel === it.id ? " is-sel" : "") + '" type="button" data-id="' + it.id + '">' +
      '<span class="media">' + media + anon + "</span>" +
      '<span class="cbody"><span class="ccat"><svg class="i"><use href="#c-' + it.cat + '"/></svg><span>' + esc(c[0]) + " · " + esc(where(it)) + dl + "</span></span>" +
      '<span class="ctitle">' + esc(it.title) + "</span>" +
      '<span class="cmeta">' + clock + '<span class="sep">·</span><span class="st">' + esc(statusText(it)) + " · " + ago(it.updatedMin) + "</span></span></span></button>";
  }
  var VIS = [];
  function renderRail() {
    VIS = visible();
    $$("[data-count]").forEach(function (el) { el.textContent = VIS.length; });
    var rail = $("#rail");
    if (!VIS.length) { rail.innerHTML = '<div class="empty-state"><svg class="i"><use href="#i-search"/></svg>Nenhum registro com esses filtros.<button class="btn btn-ghost btn-sm" type="button" data-reset>Limpar filtros</button></div>'; return; }
    rail.innerHTML = VIS.slice(0, S.limit).map(cardHTML).join("") +
      (VIS.length > S.limit ? '<button class="btn btn-ghost btn-sm more" type="button" data-more>Mostrar mais ' + Math.min(50, VIS.length - S.limit) + "</button>" : "");
  }
  function markSel() {
    $$("#rail .card").forEach(function (c) { c.classList.toggle("is-sel", c.getAttribute("data-id") === S.sel); });
  }

  /* ---------- map ---------- */
  var map, rmap, ready = false, selMarker, hovMarker, meMarker, fellBack = false;
  var STYLES = { light: "https://tiles.openfreemap.org/styles/positron", dark: "https://tiles.openfreemap.org/styles/dark" };
  /* CARTO, quando houver chave: "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json?key=" + KEY */
  function dark() { return S.theme === "dark" || (S.theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches); }
  function fc() {
    return { type: "FeatureCollection", features: VIS.filter(function (i) { return i.lng != null; }).map(function (i) {
      return { type: "Feature", geometry: { type: "Point", coordinates: [i.lng, i.lat] }, properties: { id: i.id, days: i.days, open: isOpen(i) ? 1 : 0, q: i.kind === "questao" ? 1 : 0 } };
    }) };
  }
  function fallbackStyle() {
    return { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": cssv("--ground") } }] };
  }
  function initMap() {
    if (!window.maplibregl) { mapNote("O mapa não carregou. A lista continua funcionando."); return; }
    map = new maplibregl.Map({
      container: "map", style: STYLES[dark() ? "dark" : "light"], center: [-51.178, -29.918], zoom: isPhone() ? 11.4 : 12.1,
      minZoom: 10.4, maxZoom: 18, attributionControl: false, dragRotate: false, pitchWithRotate: false,
      maxBounds: [[-51.42, -30.04], [-50.95, -29.79]], fadeDuration: 120
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: "Dados fictícios do protótipo" }), "bottom-right");
    map.on("style.load", onStyle);
    map.on("error", function (e) {
      if (!ready && !fellBack && e && e.error && /style|Failed to fetch|NetworkError/i.test(String(e.error.message || e.error))) useFallback();
    });
    setTimeout(function () { if (!ready && !fellBack) useFallback(); }, 9000);
    map.on("click", "clusters", function (e) {
      var f = e.features[0];
      map.getSource("items").getClusterExpansionZoom(f.properties.cluster_id).then(function (z) { map.easeTo({ center: f.geometry.coordinates, zoom: z + 0.3, duration: reduce ? 0 : 500 }); });
    });
    ["points", "questions"].forEach(function (l) {
      map.on("click", l, function (e) { select(e.features[0].properties.id, { from: "map" }); });
      map.on("mouseenter", l, function () { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", l, function () { map.getCanvas().style.cursor = ""; });
    });
    map.on("mouseenter", "clusters", function () { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "clusters", function () { map.getCanvas().style.cursor = ""; });
    var el = document.createElement("div"); el.className = "mepin"; el.title = "Você (aproximado)";
    meMarker = new maplibregl.Marker({ element: el }).setLngLat(ME.loc).addTo(map);
  }
  function useFallback() {
    fellBack = true; mapNote("Mapa de ruas indisponível agora. Mostrando só os bairros.");
    map.setStyle(fallbackStyle());
  }
  function mapNote(t) { var n = $("[data-map-note]"); if (!n) return; n.textContent = t; n.hidden = !t; }
  function onStyle() {
    var ink = cssv("--ink"), paper = cssv("--panel"), ground = cssv("--ground"), ink3 = cssv("--ink-3"), accent = cssv("--accent");
    var style = map.getStyle(), hasGlyphs = !!style.glyphs;
    style.layers.forEach(function (l) {
      if (l.type === "background") map.setPaintProperty(l.id, "background-color", ground);
      if (/poi|housenumber|aeroway|transit|railway_station/i.test(l.id)) map.setLayoutProperty(l.id, "visibility", "none");
    });
    map.addSource("bairros", { type: "geojson", data: D.geo, promoteId: "slug" });
    map.addSource("limite", { type: "geojson", data: D.limite });
    map.addSource("items", { type: "geojson", data: fc(), cluster: true, clusterMaxZoom: 13.4, clusterRadius: 42 });
    map.addLayer({ id: "bairro-fill", type: "fill", source: "bairros", paint: {
      "fill-color": ["case", ["boolean", ["feature-state", "sel"], false], accent, ink],
      "fill-opacity": ["case", ["boolean", ["feature-state", "sel"], false], 0.1, ["*", ["coalesce", ["feature-state", "v"], 0], 0.5]]
    } });
    map.addLayer({ id: "bairro-line", type: "line", source: "bairros", paint: {
      "line-color": ["case", ["boolean", ["feature-state", "sel"], false], accent, ink],
      "line-opacity": ["case", ["boolean", ["feature-state", "sel"], false], 1, 0.26],
      "line-width": ["case", ["boolean", ["feature-state", "sel"], false], 2, ["interpolate", ["linear"], ["zoom"], 11, 0.8, 15, 1.4]]
    } });
    map.addLayer({ id: "limite-line", type: "line", source: "limite", paint: { "line-color": ink, "line-opacity": 0.55, "line-width": 1.4 } });
    map.addLayer({ id: "clusters", type: "circle", source: "items", filter: ["has", "point_count"], paint: {
      "circle-color": ink, "circle-opacity": 0.94, "circle-stroke-color": paper, "circle-stroke-width": 2.5,
      "circle-radius": ["step", ["get", "point_count"], 13, 8, 16, 25, 20, 60, 24]
    } });
    if (hasGlyphs) map.addLayer({ id: "cluster-count", type: "symbol", source: "items", filter: ["has", "point_count"],
      layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-allow-overlap": true },
      paint: { "text-color": paper } });
    map.addLayer({ id: "points", type: "circle", source: "items", filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "q"], 0]], paint: {
      "circle-color": ["case", ["==", ["get", "open"], 1], ink, paper],
      "circle-stroke-color": ["case", ["==", ["get", "open"], 1], paper, ink3],
      "circle-stroke-width": ["case", ["==", ["get", "open"], 1], 2, 1.6],
      "circle-radius": ["interpolate", ["linear"], ["zoom"],
        11, ["case", ["==", ["get", "open"], 1], ["interpolate", ["linear"], ["get", "days"], 0, 3.2, 30, 4.4, 120, 6], 3],
        16, ["case", ["==", ["get", "open"], 1], ["interpolate", ["linear"], ["get", "days"], 0, 6, 30, 8.5, 120, 12], 5.5]]
    } });
    map.addLayer({ id: "questions", type: "circle", source: "items", filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "q"], 1]], paint: {
      "circle-color": paper, "circle-stroke-color": ink, "circle-stroke-width": 3,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 5, 16, 9]
    } });
    if (hasGlyphs) map.addLayer({ id: "days", type: "symbol", source: "items", minzoom: 13.6, filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "open"], 1]],
      layout: { "text-field": ["concat", ["to-string", ["get", "days"]], "d"], "text-font": ["Noto Sans Bold"], "text-size": 11, "text-offset": [0, -1.45], "text-anchor": "bottom", visibility: S.pins === "dias" ? "visible" : "none" },
      paint: { "text-color": ink, "text-halo-color": paper, "text-halo-width": 1.6 } });
    ready = true;
    applyPins(); applyBairroSel();
    if (S.sel) placeSel(BY_ID[S.sel] || findCreated(S.sel));
  }
  function applyData() { if (ready && map.getSource("items")) map.getSource("items").setData(fc()); }
  function applyPins() {
    if (!ready) return;
    var heat = S.pins === "calor";
    ["clusters", "cluster-count", "points", "questions"].forEach(function (l) { if (map.getLayer(l)) map.setLayoutProperty(l, "visibility", heat ? "none" : "visible"); });
    if (map.getLayer("days")) map.setLayoutProperty("days", "visibility", S.pins === "dias" ? "visible" : "none");
    var counts = {}, max = 1;
    if (heat) { VIS.forEach(function (i) { if (isOpen(i) && i.bairro) counts[i.bairro] = (counts[i.bairro] || 0) + 1; }); Object.keys(counts).forEach(function (k) { max = Math.max(max, counts[k]); }); }
    D.bairros.forEach(function (b) { map.setFeatureState({ source: "bairros", id: b.slug }, { v: heat ? (counts[b.slug] || 0) / max : 0 }); });
  }
  function applyBairroSel() {
    if (!ready) return;
    var it = S.sel && (BY_ID[S.sel] || findCreated(S.sel));
    D.bairros.forEach(function (b) { map.setFeatureState({ source: "bairros", id: b.slug }, { sel: !!(it && it.bairro === b.slug) }); });
  }
  function placeSel(it) {
    if (!map) return;
    if (selMarker) { selMarker.remove(); selMarker = null; }
    if (!it || it.lng == null) return;
    var el = document.createElement("div"); el.className = "selpin";
    el.innerHTML = '<span class="dot"></span><span class="tag">' + (isOpen(it) ? it.days + (it.days === 1 ? " dia" : " dias") : "resolvido") + "</span>";
    selMarker = new maplibregl.Marker({ element: el, anchor: "left", offset: [-9, 0] }).setLngLat([it.lng, it.lat]).addTo(map);
  }
  function hoverPin(it) {
    if (!map) return;
    if (hovMarker) { hovMarker.remove(); hovMarker = null; }
    if (!it || it.lng == null || it.id === S.sel) return;
    var el = document.createElement("div"); el.className = "hovpin"; el.innerHTML = '<span class="dot"></span>';
    hovMarker = new maplibregl.Marker({ element: el }).setLngLat([it.lng, it.lat]).addTo(map);
  }
  function fly(it) {
    if (!map || !it || it.lng == null) return;
    var pad = isPhone() ? { top: 120, bottom: (($(".side") || {}).offsetHeight || 170) + 20, left: 20, right: 20 } : { top: 40, bottom: 40, left: 40, right: 40 };
    map.easeTo({ center: [it.lng, it.lat], zoom: Math.max(map.getZoom(), 14.4), padding: pad, duration: reduce ? 0 : 750 });
  }

  /* ---------- selection & detail ---------- */
  function findCreated(id) { return S.created.find(function (i) { return i.id === id; }); }
  var programmatic = false;
  function select(id, opts) {
    opts = opts || {};
    var it = BY_ID[id] || findCreated(id); if (!it) return;
    S.sel = id; S.photoIdx = 0;
    markSel(); placeSel(it); hoverPin(null); applyBairroSel();
    if (opts.fly !== false) fly(it);
    if (opts.from === "map") {
      var card = $('#rail .card[data-id="' + id + '"]');
      if (!card) { S.limit = Math.max(S.limit, VIS.indexOf(it) + 1); renderRail(); card = $('#rail .card[data-id="' + id + '"]'); }
      if (card) { programmatic = true; card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest", inline: "start" }); setTimeout(function () { programmatic = false; }, 700); }
    }
    var open = opts.open !== undefined ? opts.open : !(isPhone() && opts.from !== "card");
    if (open) openDetail(it); else if (S.detail) renderDetail(it);
  }
  function openDetail(it) {
    S.detail = true; renderDetail(it);
    $("#detail").hidden = false;
    requestAnimationFrame(function () { $("#v-mapa").classList.add("has-detail"); });
    if (location.hash !== "#/r/" + it.id) history.replaceState(null, "", "#/r/" + it.id);
    setTimeout(function () { if (map) map.resize(); }, 480);
  }
  function closeDetail() {
    S.detail = false; $("#v-mapa").classList.remove("has-detail");
    setTimeout(function () { if (!S.detail && !isPhone()) $("#detail").hidden = true; if (map) map.resize(); }, 460);
    if (/^#\/r\//.test(location.hash)) history.replaceState(null, "", "#/mapa");
  }
  function timelineOf(it) {
    if (it.timeline) return it.timeline.concat(S.extra[it.id] || []);
    var t = [{ t: dateAgo(it.days), who: it.anon ? "Anônimo" : it.author || "Anônimo", kind: "criado", text: "Registrou" + (it.photos.length ? " com foto." : ".") }];
    t.push({ t: dateAgo(it.days) + " · 18:00", who: "Fala, Canoas", kind: "enviado", text: "Enviado à Prefeitura no resumo diário. O relógio começou." });
    if (it.confirm > 0) t.push({ t: dateAgo(Math.max(it.days - 2, 0)), who: it.confirm + (it.confirm === 1 ? " morador" : " moradores"), kind: "confirmado", text: it.kind === "questao" ? "Disseram que isso também os afeta." : "Confirmaram que está acontecendo." });
    if (it.official) t.push({ t: dateAgo(it.official.days), who: it.official.org, kind: "oficial", text: it.official.state === "resolvido" ? "Marcou como resolvido." : "“Demanda recebida e encaminhada.”" });
    if (it.disagree) t.push({ t: "hoje", who: it.disagree + " moradores", kind: "confirmado", text: "Dizem que continua: a quadra segue escura." });
    if (it.community === "resolvido") t.push({ t: dateAgo(0), who: "2 vizinhos", kind: "resolvido", text: "Confirmaram o conserto. Fechado em " + it.days + " dias." });
    return t.concat(S.extra[it.id] || []);
  }
  var KIND_ICON = { criado: "i-edit", enviado: "i-send", confirmado: "i-check", oficial: "i-badge", atualizacao: "i-chat", foto: "i-camera", resolvido: "i-check" };
  function rulerHTML(days) {
    var w = Math.min(days / 60, 1) * 100, over = days > 30, cut = over ? (30 / days) * 100 : 100;
    return '<div class="ruler" aria-hidden="true"><span class="ticks"></span><span class="fill' + (over ? " over" : "") + '" style="width:' + w.toFixed(1) + "%;--cut:" + cut.toFixed(1) + '%"></span><span class="ref" style="left:50%" data-l="30"></span></div>';
  }
  function renderDetail(it) {
    var c = CAT[it.cat], open = isOpen(it), q = it.kind === "questao";
    $("[data-d-code]").textContent = it.id;
    var ph = it.photos, cur = ph[S.photoIdx] || ph[0];
    var gal = ph.length
      ? '<div class="gallery"><img class="main" src="' + cur.src + '" alt="Foto do registro: ' + esc(it.title) + '"><span class="g-when">' + esc(cur.when) + " · " + esc(cur.by) + "</span>" + (cur.credit ? '<span class="g-credit">' + esc(cur.credit) + "</span>" : "") + "</div>" +
        '<div class="strip" role="group" aria-label="Fotos ao longo do tempo">' + ph.map(function (p, k) { return '<button type="button" data-ph="' + k + '" aria-pressed="' + (p === cur) + '"><img src="' + p.src + '" alt=""><small>' + esc(p.when.split(" · ")[0]) + "</small></button>"; }).join("") +
        '<button type="button" data-addphoto><span class="add"><svg class="i"><use href="#i-camera"/></svg></span><small>foto atual</small></button></div>'
      : '<div class="gallery"><div class="empty"><svg class="i"><use href="#c-' + it.cat + '"/></svg>Sem foto ainda.<button class="btn btn-ghost btn-sm" type="button" data-addphoto><svg class="i"><use href="#i-camera"/></svg>Adicionar foto</button></div></div>';
    var by = it.anon ? "por <b>Anônimo</b>" : "por <b>" + esc(it.author || ME.nick) + "</b>";
    var unit = q ? "dias em acompanhamento" : open ? "dias em aberto" : "dias até o conserto";
    var sent = q ? "Enviado à Prefeitura no resumo de " + dateAgo(it.days) + ", às 18:00." : open ? "Enviado à Prefeitura em " + dateAgo(it.days) + ", às 18:00. O relógio conta desde então." : "Fechado pelos vizinhos em " + dateAgo(0) + ".";
    var comm = q ? ["Isso me afeta", confirms(it) + " pessoas · atualizado " + ago(it.updatedMin)]
      : { relatado: ["Aguardando confirmação", "Ninguém confirmou ainda"], confirmado: ["Confirmado", confirms(it) + " confirmam · " + ago(it.updatedMin)], continua: ["Continua acontecendo", (it.disagree || confirms(it)) + " dizem que continua · " + ago(it.updatedMin)], parece_resolvido: ["Parece resolvido", "2 vizinhos sugeriram · falta confirmar"], resolvido: ["Resolvido", "Confirmado por 2 vizinhos"] }[it.community];
    var off = it.official
      ? '<div class="state"><span class="who"><svg class="i"><use href="#i-badge"/></svg>Prefeitura <span class="verified">verificada · exemplo</span></span><span class="what">' + { ciente: "Ciente", em_atendimento: "Em atendimento", resolvido: "Marcou como resolvido" }[it.official.state] + '</span><span class="how">' + esc(it.official.org) + " · há " + it.official.days + " dias</span></div>"
      : '<div class="state none"><span class="who"><svg class="i"><use href="#i-badge"/></svg>Prefeitura</span><span class="what">Sem resposta registrada</span><span class="how">' + (q ? "Questão enviada no resumo diário." : esc(c[1] || "") ) + "</span></div>";
    var disagree = it.official && it.official.state === "resolvido" && it.community === "continua"
      ? '<p class="disagree"><svg class="i"><use href="#i-info"/></svg>A Prefeitura diz que resolveu; ' + (it.disagree || confirms(it)) + " moradores dizem que continua. O Fala registra as duas coisas e não decide quem está certo.</p>" : "";
    var acts = q
      ? '<button class="btn btn-ghost" type="button" data-act="affect" aria-pressed="' + !!S.affected[it.id] + '"><svg class="i"><use href="#i-users"/></svg>Isso me afeta <span class="n">' + confirms(it) + "</span></button>" +
        '<button class="btn btn-ghost" type="button" data-act="update"><svg class="i"><use href="#i-info"/></svg>Tenho informação</button>'
      : '<button class="btn btn-ghost" type="button" data-act="confirm" aria-pressed="' + !!S.confirmed[it.id] + '"><svg class="i"><use href="#i-check"/></svg>Confirmo <span class="n">' + confirms(it) + "</span></button>" +
        '<button class="btn btn-ghost" type="button" data-act="continua"><svg class="i"><use href="#i-repeat"/></svg>Continua</button>';
    acts += '<button class="btn btn-ghost" type="button" data-act="update"><svg class="i"><use href="#i-edit"/></svg>Atualizar</button>' +
      '<button class="btn btn-ghost" type="button" data-act="follow" aria-pressed="' + !!S.followed[it.id] + '"><svg class="i"><use href="#i-bell"/></svg>' + (S.followed[it.id] ? "Acompanhando" : "Acompanhar") + "</button>";
    var fixq = (it.official && it.official.state === "resolvido") || it.community === "parece_resolvido"
      ? '<div class="fixq"><p><b>Está resolvido?</b> Quem mora perto confirma. Com dois vizinhos, o registro fecha e entra no placar.</p><div class="row"><button class="btn btn-ink btn-sm" type="button" data-act="fixed"><svg class="i"><use href="#i-camera"/></svg>Sim, confirmo com foto</button><button class="btn btn-ghost btn-sm" type="button" data-act="continua">Ainda não</button></div></div>' : "";
    var tl = timelineOf(it).map(function (e) {
      return '<li><span class="k' + (e.kind === "oficial" ? " of" : "") + '"><svg class="i"><use href="#' + (KIND_ICON[e.kind] || "i-info") + '"/></svg></span><div><p class="t">' + esc(e.t) + '</p><p class="w">' + esc(e.who) + (e.kind === "oficial" ? ' <span class="verified">verificada · exemplo</span>' : "") + '</p><p class="x">' + esc(e.text) + "</p></div></li>";
    }).join("");
    var comments = it.id === "7K3QF" ? [["biguá", "há 2 h", "Já abri pelo 0800 em agosto. Coloquei o protocolo aqui na conversa do bairro."], ["moradora-da-boqueirão", "há 38 min", "Tirei a foto de hoje de manhã. A água ainda estava lá."]] : it.confirm > 4 ? [[it.anon ? "timbaúva-12" : "vizinho-da-praça", ago(it.updatedMin), "Passei hoje e continua igual."]] : [];
    var cm = comments.map(function (x) { return '<div class="comment"><span class="av">' + x[0].slice(0, 2).toUpperCase() + '</span><div><p class="h"><b>' + esc(x[0]) + "</b><span>" + esc(x[1]) + "</span></p><p>" + esc(x[2]) + "</p></div></div>"; }).join("");
    $("#d-scroll").innerHTML = gal +
      '<div class="d-body">' +
        "<div><p class=\"d-cat\"><svg class=\"i\"><use href=\"#c-" + it.cat + '"/></svg>' + esc(c[0]) + " · " + esc(where(it)) + '</p><h2 class="d-title">' + esc(it.title) + '</h2><p class="d-by">' + by + " · " + dateAgo(it.days) + "</p></div>" +
        '<div class="clockrow"><div class="top"><span class="n' + (open && it.days > 30 ? " over" : "") + '" data-count-to="' + it.days + '">' + it.days + '</span><span class="u">' + unit + "</span></div>" + rulerHTML(it.days) + '<p class="sent">' + sent + "</p></div>" +
        '<div class="twin"><div class="state"><span class="who"><svg class="i"><use href="#i-users"/></svg>Comunidade</span><span class="what">' + comm[0] + '</span><span class="how">' + comm[1] + "</span></div>" + off + disagree + "</div>" +
        fixq + '<div class="actions">' + acts + "</div>" +
        '<p class="d-text">' + esc(it.text) + "</p>" +
        '<section><h3 class="sec-t">Histórico <small>' + (it.updates + (S.extra[it.id] || []).length) + " atualizações · " + ago(it.updatedMin) + '</small></h3><ol class="tl">' + tl + '</ol><p class="tl-note">O histórico não é apagado. Correções e moderação também ficam registradas.</p></section>' +
        '<section><h3 class="sec-t">Conversa <small>' + comments.length + '</small></h3>' + cm +
          '<form class="composer" data-composer><label class="sr" for="cmp">Escrever</label><input id="cmp" placeholder="Escreva uma atualização ou um comentário" autocomplete="off"><button class="btn btn-ink btn-sm" type="submit">Enviar</button></form></section>' +
      "</div>";
    $("#d-scroll").scrollTop = 0;
    var n = $("[data-count-to]", $("#d-scroll"));
    if (n && !reduce) { var to = +n.getAttribute("data-count-to"), t0 = null; n.textContent = "0"; requestAnimationFrame(function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 900), e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p); n.textContent = Math.round(to * e); if (p < 1) requestAnimationFrame(step); }); }
  }
  function refresh(keepScroll) {
    var y = $("#rail").scrollTop, x = $("#rail").scrollLeft;
    renderRail(); applyData(); applyPins();
    if (keepScroll) { $("#rail").scrollTop = y; $("#rail").scrollLeft = x; }
  }

  /* ---------- detail actions ---------- */
  var photoInput = Object.assign(document.createElement("input"), { type: "file", accept: "image/*", hidden: true });
  photoInput.setAttribute("capture", "environment"); document.body.appendChild(photoInput);
  var photoTarget = null;
  photoInput.addEventListener("change", function () {
    var f = photoInput.files && photoInput.files[0]; if (!f || !photoTarget) return;
    var it = photoTarget; it.photos = it.photos.concat([{ src: URL.createObjectURL(f), when: "agora", by: ME.nick }]);
    (S.extra[it.id] = S.extra[it.id] || []).push({ t: "agora", who: ME.nick, kind: "foto", text: "Adicionou foto atual." });
    it.updatedMin = 0; S.photoIdx = it.photos.length - 1; renderDetail(it); refresh(true); toast("Foto adicionada ao histórico.");
    photoInput.value = "";
  });
  $("#detail").addEventListener("click", function (e) {
    var it = BY_ID[S.sel] || findCreated(S.sel); if (!it) return;
    var ph = e.target.closest("[data-ph]"); if (ph) { S.photoIdx = +ph.getAttribute("data-ph"); renderDetail(it); return; }
    if (e.target.closest("[data-addphoto]")) { photoTarget = it; photoInput.click(); return; }
    var a = e.target.closest("[data-act]"); if (!a) return;
    var act = a.getAttribute("data-act"), extra = S.extra[it.id] = S.extra[it.id] || [];
    if (act === "confirm") { S.confirmed[it.id] = !S.confirmed[it.id]; if (S.confirmed[it.id]) { extra.push({ t: "agora", who: ME.nick, kind: "confirmado", text: "Confirmou que está acontecendo." }); toast("Confirmado. Obrigado."); } }
    if (act === "affect") { S.affected[it.id] = !S.affected[it.id]; it.confirm += S.affected[it.id] ? 1 : -1; }
    if (act === "continua") { extra.push({ t: "agora", who: ME.nick, kind: "confirmado", text: "Disse que continua acontecendo." }); it.updatedMin = 0; toast("Registrado: continua acontecendo."); }
    if (act === "follow") { S.followed[it.id] = !S.followed[it.id]; toast(S.followed[it.id] ? "Você será avisado de cada atualização." : "Você deixou de acompanhar."); }
    if (act === "fixed") { photoTarget = it; photoInput.click(); extra.push({ t: "agora", who: ME.nick, kind: "resolvido", text: "Confirmou o conserto. Falta mais 1 vizinho." }); }
    if (act === "update") { var i = $("#cmp"); if (i) { i.focus(); i.placeholder = "O que mudou? Ex.: a água baixou, a equipe passou"; } return; }
    renderDetail(it); refresh(true);
  });
  $("#detail").addEventListener("submit", function (e) {
    e.preventDefault(); var it = BY_ID[S.sel] || findCreated(S.sel), i = $("#cmp"); if (!it || !i.value.trim()) return;
    (S.extra[it.id] = S.extra[it.id] || []).push({ t: "agora", who: ME.nick, kind: "atualizacao", text: i.value.trim() });
    it.updatedMin = 0; renderDetail(it); refresh(true); toast("Atualização publicada no histórico.");
  });
  $$("[data-close-detail]").forEach(function (b) { b.addEventListener("click", closeDetail); });
  $("[data-share]").addEventListener("click", function () {
    var url = location.origin + location.pathname + "#/r/" + S.sel;
    if (navigator.share) navigator.share({ title: "Fala, Canoas", url: url }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast("Link copiado: " + url.replace(/^https?:\/\//, "")); });
  });

  /* ---------- rail events ---------- */
  var railEl = $("#rail");
  railEl.addEventListener("click", function (e) {
    if (e.target.closest("[data-more]")) { S.limit += 50; renderRail(); return; }
    if (e.target.closest("[data-reset]")) { S.filter = "tudo"; S.q = ""; $$("#q,[data-psearch]").forEach(function (i) { i.value = ""; }); renderFilters(); refresh(); return; }
    var c = e.target.closest(".card"); if (c) select(c.getAttribute("data-id"), { from: "card", open: true });
  });
  railEl.addEventListener("mouseover", function (e) { if (isPhone()) return; var c = e.target.closest(".card"); hoverPin(c ? BY_ID[c.getAttribute("data-id")] || findCreated(c.getAttribute("data-id")) : null); });
  railEl.addEventListener("mouseleave", function () { hoverPin(null); });
  var railT;
  railEl.addEventListener("scroll", function () {
    if (!isPhone() || programmatic) return;
    clearTimeout(railT);
    railT = setTimeout(function () {
      var r = railEl.getBoundingClientRect(), best = null, bd = 1e9;
      $$(".card", railEl).forEach(function (c) { var d = Math.abs(c.getBoundingClientRect().left - r.left - 14); if (d < bd) { bd = d; best = c; } });
      if (best && best.getAttribute("data-id") !== S.sel) select(best.getAttribute("data-id"), { from: "rail", open: false });
    }, 140);
  }, { passive: true });
  document.addEventListener("click", function (e) {
    var f = e.target.closest("[data-f]");
    if (f) { S.filter = f.getAttribute("data-f"); S.limit = 50; renderFilters(); refresh(); }
  });
  $$("[data-sort]").forEach(function (s) { s.addEventListener("change", function () { S.sort = s.value; $$("[data-sort]").forEach(function (o) { o.value = S.sort; }); S.limit = 50; renderRail(); railEl.scrollTo(0, 0); }); });
  $$("#q,[data-psearch]").forEach(function (i) {
    i.addEventListener("input", function () { S.q = i.value; if (S.view !== "mapa") location.hash = "#/mapa"; refresh(); });
  });
  $$("[data-zoom]").forEach(function (b) { b.addEventListener("click", function () { if (map) map.zoomTo(map.getZoom() + (+b.getAttribute("data-zoom")), { duration: reduce ? 0 : 300 }); }); });
  $("[data-locate]").addEventListener("click", function () { if (map) map.easeTo({ center: ME.loc, zoom: 15, duration: reduce ? 0 : 700 }); toast("Localização aproximada (protótipo)."); });

  /* ---------- report flow ---------- */
  var dlg = $("#report"), R = null;
  function startCenter() { return [FEAT.lng + 0.00026, FEAT.lat + 0.00018]; }
  function openReport() {
    R = { kind: "ocorrencia", photo: null, cat: null, center: startCenter(), text: "", as: "nick", scope: "lugar", title: "", dupeOff: false, taps: 0 };
    renderReport();
    if (!dlg.open) dlg.showModal();
    setTimeout(initRmap, 30);
  }
  function tap() { R.taps++; $("[data-taps]").textContent = R.taps + (R.taps === 1 ? " toque" : " toques"); }
  function renderReport() {
    var b = $("[data-rep-body]");
    var q = R.kind === "questao";
    b.innerHTML =
      '<div class="seg kind" role="group" aria-label="Tipo de registro"><button type="button" data-rk="ocorrencia" aria-pressed="' + !q + '">Problema num lugar</button><button type="button" data-rk="questao" aria-pressed="' + q + '">Questão pública</button></div>' +
      '<section data-rs="photo"></section>' +
      (q ? '<section data-rs="qtitle"></section>' : '<section data-rs="cat"></section>') +
      (!q || R.scope === "lugar" ? '<section data-rs="where"><div class="step-h"><h3><span class="num">3</span>Onde?</h3><small>Arraste o mapa até o ponto exato</small></div><div class="where"><div id="rmap"></div><div class="crosshair" aria-hidden="true"><span class="pin"></span><span class="base"></span></div></div><div class="where-foot"><span data-wl></span><button class="btn btn-quiet btn-sm" type="button" data-rloc><svg class="i"><use href="#i-locate"/></svg>Minha localização</button></div></section>' : "") +
      '<section data-rs="dupe"></section><section data-rs="text"></section><section data-rs="as"></section>';
    rPhoto(); if (q) rQTitle(); else rCat(); rDupe(); rText(); rAs(); rFoot(); rWhere();
    if (rmap) { rmap.remove(); rmap = null; }
  }
  function rPhoto() {
    var s = $('[data-rs="photo"]'), q = R.kind === "questao";
    s.innerHTML = '<div class="step-h"><h3><span class="num">1</span>' + (q ? "Foto ou documento" : "Mostre o que aconteceu") + "</h3><small>" + (q ? "opcional" : "foto obrigatória") + "</small></div>" +
      (R.photo
        ? '<div class="preview"><img src="' + R.photo + '" alt="Foto escolhida"><p class="note">Rostos e placas serão borrados ao publicar. Os dados escondidos da foto, como o GPS, são apagados.</p><button class="icon-btn" type="button" data-rphoto-x aria-label="Remover foto"><svg class="i"><use href="#i-close"/></svg></button></div>'
        : '<div class="shot"><label><input type="file" accept="image/*" capture="environment" data-rfile><svg class="i"><use href="#i-camera"/></svg>Tirar foto</label><button class="ex" type="button" data-rex><svg class="i"><use href="#i-image"/></svg>Usar foto de exemplo</button></div>');
  }
  function rCat() {
    var s = $('[data-rs="cat"]');
    s.innerHTML = '<div class="step-h"><h3><span class="num">2</span>O que é?</h3><small>Cada tipo vai para o órgão responsável</small></div><div class="cats">' +
      Object.keys(CAT).filter(function (k) { return k !== "questao"; }).map(function (k) { return '<button class="cat" type="button" data-rcat="' + k + '" aria-pressed="' + (R.cat === k) + '"><svg class="i"><use href="#c-' + k + '"/></svg>' + CAT[k][0] + "</button>"; }).join("") + "</div>";
  }
  function rQTitle() {
    var s = $('[data-rs="qtitle"]');
    s.innerHTML = '<div class="step-h"><h3><span class="num">2</span>Qual é a questão?</h3><small>Uma frase</small></div><input class="qt" data-rqt maxlength="90" value="' + esc(R.title) + '" placeholder="Ex.: Posto de saúde sem pediatra às terças" style="width:100%;height:46px;border-radius:12px;border:1px solid var(--line-2);background:var(--panel);color:var(--ink);font:500 .9375rem/1 var(--font);padding:0 12px">' +
      '<div class="seg" role="group" aria-label="Abrangência" style="margin-top:10px"><button type="button" data-rsc="lugar" aria-pressed="' + (R.scope === "lugar") + '">Um lugar</button><button type="button" data-rsc="bairro" aria-pressed="' + (R.scope === "bairro") + '">O bairro</button><button type="button" data-rsc="cidade" aria-pressed="' + (R.scope === "cidade") + '">Toda a cidade</button></div>';
  }
  function rWhere() { var w = $("[data-wl]"); if (!w) return; var b = bairroAt(R.center); w.innerHTML = b ? "<b>" + bn(b) + "</b> · " + fdist(hav(ME.loc, R.center)) + " de você" : "<b>Fora de Canoas</b> · mova o mapa"; }
  function findDupe() {
    if (R.kind !== "ocorrencia" || !R.cat || R.dupeOff) return null;
    var best = null, bd = 61;
    base().forEach(function (it) { if (it.cat === R.cat && isOpen(it) && it.lng != null) { var d = hav(R.center, [it.lng, it.lat]); if (d < bd) { bd = d; best = it; } } });
    return best ? { it: best, d: bd } : null;
  }
  function rDupe() {
    var s = $('[data-rs="dupe"]'), d = findDupe();
    s.innerHTML = d ? '<div class="dupe" role="status"><p class="h"><svg class="i"><use href="#i-info"/></svg><span>Parece que já existe: <b>' + esc(d.it.title) + "</b>, a " + Math.max(5, Math.round(d.d / 5) * 5) + " m daqui, aberto há " + d.it.days + " dias · " + confirms(d.it) + ' confirmam.</span></p><div class="row"><button class="btn btn-ink btn-sm" type="button" data-rdupe="join"><svg class="i"><use href="#i-check"/></svg>Confirmar e adicionar minha foto</button><button class="btn btn-ghost btn-sm" type="button" data-rdupe="no">É outro problema</button></div></div>' : "";
    s.hidden = !d;
  }
  function rText() {
    var s = $('[data-rs="text"]');
    s.innerHTML = '<div class="step-h"><h3><span class="num">4</span>Conte rapidamente</h3><small>opcional</small></div><textarea data-rtext maxlength="280" placeholder="' + (R.kind === "questao" ? "Desde quando? Quem é afetado?" : "Ex.: a água chega até o banco da parada") + '">' + esc(R.text) + '</textarea><p class="counter" data-rcount>' + R.text.length + "/280</p>";
  }
  function rAs() {
    var s = $('[data-rs="as"]');
    s.innerHTML = '<div class="step-h"><h3><span class="num">5</span>Publicar como</h3></div><div class="as" role="radiogroup">' +
      '<label><input type="radio" name="ras" value="nick"' + (R.as === "nick" ? " checked" : "") + '><b>' + esc(ME.nick) + "</b><small>" + bn(ME.bairro) + "</small></label>" +
      '<label><input type="radio" name="ras" value="anon"' + (R.as === "anon" ? " checked" : "") + '><b>Anônimo</b><small>Seu apelido não aparece</small></label></div>' +
      (R.as === "anon" ? '<p class="anon-note" style="margin-top:8px">Seu apelido não será exibido. O Fala ainda liga este registro à sua conta, para evitar abuso e permitir moderação. Nenhum outro dado seu aparece.</p>' : "");
  }
  function canPublish() {
    if (R.kind === "questao") return R.title.trim().length > 6 && (R.scope !== "lugar" || !!bairroAt(R.center));
    return !!R.photo && !!R.cat && !!bairroAt(R.center);
  }
  function rFoot() {
    var miss = [];
    if (R.kind === "ocorrencia") { if (!R.photo) miss.push("foto"); if (!R.cat) miss.push("tipo"); } else if (R.title.trim().length <= 6) miss.push("a questão");
    $("[data-rep-hint]").textContent = miss.length ? "Falta: " + miss.join(", ") + "." : "Entra no resumo de hoje, às 18h.";
    $("[data-publish]").disabled = !canPublish();
  }
  function initRmap() {
    var box = $("#rmap"); if (!box || !window.maplibregl) return;
    rmap = new maplibregl.Map({ container: box, style: STYLES[dark() ? "dark" : "light"], center: R.center, zoom: 16.4, attributionControl: false, dragRotate: false, pitchWithRotate: false, minZoom: 12, maxZoom: 18.5 });
    rmap.touchZoomRotate.disableRotation();
    rmap.on("style.load", function () {
      rmap.getStyle().layers.forEach(function (l) { if (l.type === "background") rmap.setPaintProperty(l.id, "background-color", cssv("--ground")); if (/poi|aeroway/i.test(l.id)) rmap.setLayoutProperty(l.id, "visibility", "none"); });
      rmap.addSource("near", { type: "geojson", data: { type: "FeatureCollection", features: base().filter(function (i) { return i.lng != null && isOpen(i); }).map(function (i) { return { type: "Feature", geometry: { type: "Point", coordinates: [i.lng, i.lat] }, properties: {} }; }) } });
      rmap.addLayer({ id: "near", type: "circle", source: "near", paint: { "circle-color": cssv("--ink"), "circle-radius": 6, "circle-stroke-color": cssv("--panel"), "circle-stroke-width": 2, "circle-opacity": 0.85 } });
    });
    rmap.on("moveend", function () { var c = rmap.getCenter(); R.center = [c.lng, c.lat]; rWhere(); rDupe(); rFoot(); });
  }
  dlg.addEventListener("pointerdown", function (e) { if (R && !R.sent && e.target.closest("button,label,input,select,textarea,a")) tap(); });
  dlg.addEventListener("click", function (e) {
    var t = e.target;
    if (t === dlg || t.closest("[data-rep-close]")) { dlg.close(); return; }
    var rk = t.closest("[data-rk]"); if (rk) { R.kind = rk.getAttribute("data-rk"); renderReport(); setTimeout(initRmap, 30); return; }
    var sc = t.closest("[data-rsc]"); if (sc) { R.scope = sc.getAttribute("data-rsc"); renderReport(); setTimeout(initRmap, 30); return; }
    if (t.closest("[data-rex]")) { R.photo = "media/parada-800.webp"; rPhoto(); rFoot(); return; }
    if (t.closest("[data-rphoto-x]")) { R.photo = null; rPhoto(); rFoot(); return; }
    var ct = t.closest("[data-rcat]"); if (ct) { R.cat = ct.getAttribute("data-rcat"); rCat(); rDupe(); rFoot(); return; }
    if (t.closest("[data-rloc]")) { R.center = startCenter(); if (rmap) rmap.easeTo({ center: R.center, duration: reduce ? 0 : 500 }); return; }
    var dp = t.closest("[data-rdupe]");
    if (dp) {
      if (dp.getAttribute("data-rdupe") === "no") { R.dupeOff = true; rDupe(); return; }
      var d = findDupe(); if (!d) return;
      S.confirmed[d.it.id] = true;
      if (R.photo) d.it.photos = d.it.photos.concat([{ src: R.photo, when: "agora", by: ME.nick }]);
      (S.extra[d.it.id] = S.extra[d.it.id] || []).push({ t: "agora", who: ME.nick, kind: R.photo ? "foto" : "confirmado", text: R.photo ? "Confirmou e adicionou foto atual." : "Confirmou que continua." });
      d.it.updatedMin = 0; dlg.close(); go("#/r/" + d.it.id); toast("Somado ao registro que já existia. Obrigado."); return;
    }
    if (t.closest("[data-publish]")) { publish(); return; }
    if (t.closest("[data-done-map]")) { dlg.close(); go("#/r/" + R.newId); return; }
    if (t.closest("[data-done-share]")) { var u = location.origin + location.pathname + "#/r/" + R.newId; if (navigator.clipboard) navigator.clipboard.writeText(u); toast("Link copiado."); }
  });
  dlg.addEventListener("change", function (e) {
    if (e.target.matches("[data-rfile]")) { var f = e.target.files && e.target.files[0]; if (f) { R.photo = URL.createObjectURL(f); rPhoto(); rFoot(); } }
    if (e.target.name === "ras") { R.as = e.target.value; rAs(); }
  });
  dlg.addEventListener("input", function (e) {
    if (e.target.matches("[data-rtext]")) { R.text = e.target.value; $("[data-rcount]").textContent = R.text.length + "/280"; }
    if (e.target.matches("[data-rqt]")) { R.title = e.target.value; rFoot(); }
  });
  dlg.addEventListener("close", function () { if (rmap) { rmap.remove(); rmap = null; } if (location.hash === "#/registrar") history.replaceState(null, "", "#/mapa"); });
  function publish() {
    var q = R.kind === "questao", b = R.scope === "cidade" && q ? null : bairroAt(R.center) || ME.bairro;
    var it = { id: code(), kind: R.kind, cat: q ? "questao" : R.cat, title: q ? R.title.trim() : (R.text.trim().split(/[.!?]/)[0] || CAT[R.cat][0]).slice(0, 80), text: R.text.trim() || "Sem descrição.",
      bairro: b, lng: q && R.scope !== "lugar" ? (b ? BY_B[b].center[0] : null) : R.center[0], lat: q && R.scope !== "lugar" ? (b ? BY_B[b].center[1] : null) : R.center[1],
      scope: q ? R.scope : "ponto", place: q && R.scope === "lugar" ? "Lugar marcado" : null, days: 0, updatedMin: 0, confirm: 0, follow: 1, updates: 0,
      photos: R.photo ? [{ src: R.photo, when: "agora", by: R.as === "anon" ? "Anônimo" : ME.nick }] : [], anon: R.as === "anon", author: R.as === "anon" ? null : ME.nick, community: "relatado", official: null };
    S.created.unshift(it); S.followed[it.id] = true; R.newId = it.id; R.sent = true;
    refresh();
    $("[data-rep-body]").innerHTML = '<div class="rep-done"><span class="ok"><svg class="i"><use href="#i-check"/></svg></span><h3>Registrado.</h3><p>Entra no resumo de hoje, às 18h. O relógio começa no envio. Você recebe um aviso a cada atualização.</p><span class="codebig">' + it.id + '</span><p style="font-size:.8125rem;color:var(--ink-3)">' + R.taps + " toques do começo ao fim.</p></div>";
    $("[data-rep-foot]").innerHTML = '<button class="btn btn-ghost" type="button" data-done-share><svg class="i"><use href="#i-share"/></svg>Compartilhar</button><button class="btn btn-primary btn-lg" type="button" data-done-map><svg class="i"><use href="#i-map"/></svg>Ver no mapa</button>';
  }
  function resetRepFoot() { $("[data-rep-foot]").innerHTML = '<span class="hint" data-rep-hint>Foto, tipo e lugar. O resto é opcional.</span><button class="btn btn-primary btn-lg" type="button" data-publish disabled>Publicar</button>'; }
  $$("[data-report]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); resetRepFoot(); $("[data-taps]").textContent = "0 toques"; openReport(); }); });

  /* ---------- Placar ---------- */
  function groupStats(keyFn) {
    var g = {};
    base().forEach(function (it) {
      if (it.kind !== "ocorrencia") return;
      var k = keyFn(it); if (!k) return;
      var x = g[k] = g[k] || { open: 0, over: 0, fixed: [], n: 0 };
      x.n++;
      if (isOpen(it)) { x.open++; if (it.days > 30) x.over++; } else x.fixed.push(it.days);
    });
    return Object.keys(g).map(function (k) {
      var x = g[k], all = x.fixed.length + x.open;
      return { k: k, open: x.open, over: x.over, n: x.n, med: x.fixed.length >= 3 ? median(x.fixed) : null, in30: all ? Math.round(x.fixed.filter(function (d) { return d <= 30; }).length / all * 100) : 0 };
    });
  }
  function renderPlacar() {
    var occ = base().filter(function (i) { return i.kind === "ocorrencia"; });
    var open = occ.filter(isOpen), over = open.filter(function (i) { return i.days > 30; }), fixed = occ.filter(function (i) { return !isOpen(i); }).map(function (i) { return i.days; });
    $("[data-kpis]").innerHTML =
      '<div class="kpi"><b>' + open.length + '</b><span>abertos</span></div><div class="kpi"><b class="over">' + over.length + '</b><span>abertos há +30 dias</span></div><div class="kpi"><b>' + (median(fixed) || "—") + '</b><span>mediana até o conserto</span></div><div class="kpi"><b>' + fixed.length + "</b><span>resolvidos e confirmados</span></div>";
    var rows, head;
    if (S.stab === "tipo") rows = groupStats(function (i) { return i.cat; }).map(function (r) { r.name = CAT[r.k][0]; r.go = "#/mapa"; return r; });
    else if (S.stab === "orgao") rows = groupStats(function (i) { return CAT[i.cat][1]; }).map(function (r) { r.name = r.k; return r; });
    else rows = groupStats(function (i) { return i.bairro; }).map(function (r) { r.name = bn(r.k); r.go = "#/bairro/" + r.k; return r; });
    rows.sort(function (a, b) { return (b.med || 0) - (a.med || 0); });
    $("[data-score-table]").innerHTML = '<table><thead><tr><th>' + { tipo: "Tipo", orgao: "Órgão responsável", bairro: "Bairro" }[S.stab] + '</th><th>Mediana até o conserto</th><th class="n">Dias</th><th class="n">Abertos</th><th class="n">Em 30 dias</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr class="' + (r.go ? "click" : "") + '"' + (r.go ? ' data-go="' + r.go + '"' : "") + '><td class="name">' + esc(r.name) + '</td><td class="td-ruler">' + (r.med != null ? rulerHTML(r.med) : '<span style="color:var(--ink-3);font-size:.75rem">poucos dados</span>') + '</td><td class="n">' + (r.med != null ? r.med : "—") + '</td><td class="n">' + r.open + '</td><td class="n">' + r.in30 + "%</td></tr>";
      }).join("") + "</tbody></table>";
    var counts = {}; over.forEach(function (i) { if (i.bairro) counts[i.bairro] = (counts[i.bairro] || 0) + 1; });
    $("[data-choro]").innerHTML = choroSVG(counts);
  }
  function project(feats) {
    var xs = [], ys = [];
    feats.forEach(function (f) { (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).forEach(function (p) { p[0].forEach(function (c) { xs.push(c[0]); ys.push(c[1]); }); }); });
    var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys), k = Math.cos(((y0 + y1) / 2) * Math.PI / 180);
    var W = 1000, H = Math.round(W * (y1 - y0) / ((x1 - x0) * k));
    return { W: W, H: H, d: function (f) {
      return (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).map(function (p) {
        return p.map(function (r) { return "M" + r.map(function (c) { return ((c[0] - x0) / (x1 - x0) * W).toFixed(1) + " " + ((y1 - c[1]) / (y1 - y0) * H).toFixed(1); }).join("L") + "Z"; }).join("");
      }).join("");
    } };
  }
  function choroSVG(counts) {
    var P = project(D.geo.features), max = 1; Object.keys(counts).forEach(function (k) { max = Math.max(max, counts[k]); });
    return '<svg viewBox="0 0 ' + P.W + " " + P.H + '" role="img" aria-label="Mapa de Canoas: bairros com mais registros abertos há mais de 30 dias aparecem mais escuros.">' + D.geo.features.map(function (f) {
      var s = f.properties.slug, v = (counts[s] || 0) / max, pct = Math.round(8 + v * 82);
      return '<path d="' + P.d(f) + '" data-go="#/bairro/' + s + '" style="fill:color-mix(in srgb,var(--ink) ' + pct + '%,var(--panel))"><title>' + esc(f.properties.name) + ": " + (counts[s] || 0) + " abertos há +30 dias</title></path>";
    }).join("") + "</svg>";
  }

  /* ---------- Bairro ---------- */
  function renderBairro() {
    var b = BY_B[S.bairro] || BY_B[ME.bairro];
    $("[data-bpick]").innerHTML = D.bairros.map(function (x) { return '<option value="' + x.slug + '"' + (x.slug === b.slug ? " selected" : "") + ">" + esc(x.name) + "</option>"; }).join("");
    var items = base().filter(function (i) { return i.bairro === b.slug; });
    var occ = items.filter(function (i) { return i.kind === "ocorrencia"; }), open = occ.filter(isOpen), over = open.filter(function (i) { return i.days > 30; }), qs = items.filter(function (i) { return i.kind === "questao"; });
    var fixed = occ.filter(function (i) { return !isOpen(i); }).map(function (i) { return i.days; });
    $("[data-b-name]").textContent = b.name;
    $("[data-b-sub]").textContent = b.threshold ? "Mapa aberto · fila de " + b.threshold + " vizinhos completa (exemplo)" : "Poucos moradores: abriu junto com o primeiro bairro";
    var f = D.geo.features.find(function (x) { return x.properties.slug === b.slug; }), P = project([f]);
    $("[data-b-outline]").innerHTML = '<svg viewBox="-20 -20 ' + (P.W + 40) + " " + (P.H + 40) + '" aria-hidden="true"><path d="' + P.d(f) + '"/></svg>';
    $("[data-b-kpis]").innerHTML = '<div class="kpi"><b>' + open.length + '</b><span>abertos</span></div><div class="kpi"><b class="over">' + over.length + '</b><span>há +30 dias</span></div><div class="kpi"><b>' + (median(fixed) || "—") + '</b><span>mediana até o conserto</span></div><div class="kpi"><b>' + qs.length + "</b><span>questões públicas</span></div>";
    $$("[data-btab]").forEach(function (t) { t.setAttribute("aria-selected", t.getAttribute("data-btab") === S.btab); });
    var threads = D.threads[b.slug] || [];
    if (!S.thread || !threads.some(function (t) { return t.id === S.thread; })) S.thread = threads.length ? threads[0].id : null;
    var list = $("[data-b-list]");
    if (S.btab === "registros") list.innerHTML = open.length ? '<div class="list">' + open.sort(function (a, b) { return b.days - a.days; }).slice(0, 30).map(cardHTML).join("") + "</div>" : '<div class="empty-state"><svg class="i"><use href="#i-check"/></svg>Nenhum registro aberto neste bairro.</div>';
    else if (S.btab === "questoes") list.innerHTML = qs.length ? '<div class="list">' + qs.map(cardHTML).join("") + "</div>" : '<div class="empty-state"><svg class="i"><use href="#c-questao"/></svg>Nenhuma questão pública neste bairro ainda.<button class="btn btn-ghost btn-sm" type="button" data-report-q>Abrir uma questão</button></div>';
    else list.innerHTML = threads.map(function (t) { return '<button class="thread" type="button" data-thread="' + t.id + '" aria-current="' + (t.id === S.thread) + '"><span class="tt">' + esc(t.title) + '</span><span class="tm"><span>' + esc(t.by) + "</span><span>" + esc(t.ago) + "</span><span>" + t.replies.length + (t.replies.length === 1 ? " resposta" : " respostas") + "</span></span></button>"; }).join("") || '<div class="empty-state">Nenhuma conversa ainda.</div>';
    var t = threads.find(function (x) { return x.id === S.thread; });
    $("[data-b-side]").innerHTML = '<div class="bar"><strong>Conversa do bairro</strong><span>' + threads.length + " tópicos</span></div>" + (t
      ? '<div class="tview"><p class="tm" style="font-size:.75rem;color:var(--ink-3)">' + esc(t.by) + " · " + esc(t.ago) + "</p><h2>" + esc(t.title) + "</h2>" + (t.pin && BY_ID[t.pin] ? '<button class="linkpin" type="button" data-go="#/r/' + t.pin + '"><svg class="i" style="width:15px;height:15px"><use href="#c-' + BY_ID[t.pin].cat + '"/></svg>' + esc(BY_ID[t.pin].title) + " · <b>" + BY_ID[t.pin].days + " dias</b></button>" : "") + "</div>" +
        '<div style="padding:0 18px 18px">' + t.replies.map(function (r) { return '<div class="comment"><span class="av">' + r.by.slice(0, 2).toUpperCase() + '</span><div><p class="h"><b>' + esc(r.by) + "</b><span>" + esc(r.ago) + "</span></p><p>" + esc(r.text) + "</p></div></div>"; }).join("") +
        '<form class="composer" data-tcomposer><label class="sr" for="tcmp">Responder</label><input id="tcmp" placeholder="Responder para o bairro" autocomplete="off"><button class="btn btn-ink btn-sm" type="submit">Enviar</button></form><p class="tl-note" style="margin-top:10px">Críticas a serviços e órgãos são bem-vindas. Ataques a pessoas, não. Moderado por vizinhos do bairro.</p></div>'
      : '<div class="empty-state">Nenhuma conversa ainda.</div>');
  }

  /* ---------- Você ---------- */
  function renderVoce() {
    var mine = S.created.concat(ITEMS.filter(function (i) { return i.author === ME.nick && !i.anon; })).slice(0, 6);
    var ic = { casa: "i-home", trajeto: "i-route", bairro: "i-map", pin: "i-bell" };
    $("[data-voce]").innerHTML =
      '<div class="page-head"><div><h1>Você</h1><p>Seu apelido aparece nos registros. Seu telefone e sua identidade, nunca.</p></div></div>' +
      '<div class="me-grid"><div class="stack"><div class="panel me-card"><div class="me-id"><span class="big">GS</span><div><h2>' + esc(ME.nick) + "</h2><p>" + bn(ME.bairro) + ' · desde agosto de 2026</p></div></div><ul class="levels">' +
      '<li><svg class="i ok"><use href="#i-check"/></svg><span>Telefone confirmado<small>Pode registrar problemas</small></span><span class="chip">nível 1</span></li>' +
      '<li><svg class="i ok"><use href="#i-check"/></svg><span>Identidade verificada<small>Pode confirmar consertos e conversar no bairro</small></span><span class="chip">nível 2</span></li></ul>' +
      '<div class="lbl" style="display:grid;gap:8px;font-size:.8125rem;color:var(--ink-3)">Publicar como, por padrão<div class="seg" role="group"><button type="button" aria-pressed="true">' + esc(ME.nick) + '</button><button type="button" aria-pressed="false">Anônimo</button></div></div></div>' +
      '<div class="panel"><div class="bar"><strong>Aparência</strong></div><div style="padding:14px 16px"><div class="seg" data-p="theme"><button type="button" data-v="auto">Sistema</button><button type="button" data-v="light">Claro</button><button type="button" data-v="dark">Escuro</button></div></div></div>' +
      '<button class="btn btn-ghost" type="button" data-proto><svg class="i"><use href="#i-sliders"/></svg>Ajustes do protótipo</button></div>' +
      '<div class="stack"><div class="panel"><div class="bar"><strong>Acompanhando</strong><span>avisos no celular</span></div><ul class="rows">' +
      ME.following.map(function (f, k) { return '<li><span class="ic"><svg class="i"><use href="#' + ic[f.type] + '"/></svg></span><span><b>' + esc(f.label) + "</b><small>" + esc(f.detail) + '</small></span><input class="switch" type="checkbox" checked aria-label="Avisos: ' + esc(f.label) + '"></li>'; }).join("") +
      '</ul><div style="padding:10px 16px 14px;border-top:1px solid var(--line)"><button class="btn btn-ghost btn-sm" type="button"><svg class="i"><use href="#i-plus"/></svg>Acompanhar um lugar ou trajeto</button></div></div>' +
      '<div class="panel"><div class="bar"><strong>Meus registros</strong><span>' + mine.length + '</span></div><div class="list">' + (mine.map(cardHTML).join("") || '<div class="empty-state">Você ainda não registrou nada.</div>') + "</div></div>" +
      '<div class="panel"><div class="bar"><strong>Sobre este protótipo</strong></div><p style="padding:14px 16px;font-size:.8125rem;color:var(--ink-2);line-height:1.55">Todos os registros, apelidos, respostas e números são fictícios. Fotos: Nilce Bravo (CC BY-SA 3.0), Yeuxpapilon (CC BY-SA 4.0), Myke Sena/DPU (CC0), via Wikimedia Commons. Mapa: OpenFreeMap, © OpenMapTiles, © colaboradores do OpenStreetMap. Limites dos bairros: IBGE, Censo 2022.</p></div></div></div>';
    syncSegs();
  }

  /* ---------- prototype panel & theme ---------- */
  function syncSegs() {
    $$('[data-p] button').forEach(function (b) {
      var p = b.parentNode.getAttribute("data-p"), v = b.getAttribute("data-v");
      b.setAttribute("aria-pressed", String({ density: String(S.density), pins: S.pins, theme: S.theme }[p] === v));
    });
  }
  function applyTheme(rebuildMap) {
    if (S.theme === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", S.theme);
    localStorage.setItem("fc-theme", S.theme);
    if (rebuildMap && map && !fellBack) { ready = false; map.setStyle(STYLES[dark() ? "dark" : "light"]); }
  }
  document.addEventListener("click", function (e) {
    var p = e.target.closest("[data-p] button");
    if (p) {
      var key = p.parentNode.getAttribute("data-p"), v = p.getAttribute("data-v");
      if (key === "density") { S.density = +v; S.limit = 50; refresh(); if (S.view === "placar") renderPlacar(); }
      if (key === "pins") { S.pins = v; applyPins(); }
      if (key === "theme") { S.theme = v; applyTheme(true); }
      syncSegs(); return;
    }
    if (e.target.closest("[data-proto]")) { $("#proto").hidden = !$("#proto").hidden; syncSegs(); return; }
    if (e.target.closest("[data-proto-close]")) { $("#proto").hidden = true; return; }
    var g = e.target.closest("[data-go]"); if (g) { go(g.getAttribute("data-go")); return; }
    var st = e.target.closest("[data-stab]"); if (st) { S.stab = st.getAttribute("data-stab"); $$("[data-stab]").forEach(function (t) { t.setAttribute("aria-selected", t === st); }); renderPlacar(); return; }
    var bt = e.target.closest("[data-btab]"); if (bt) { S.btab = bt.getAttribute("data-btab"); renderBairro(); return; }
    var th = e.target.closest("[data-thread]"); if (th) { S.thread = th.getAttribute("data-thread"); renderBairro(); if (isPhone()) $("[data-b-side]").scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); return; }
    var bc = e.target.closest("#v-bairro .card, #v-voce .card"); if (bc) { go("#/r/" + bc.getAttribute("data-id")); return; }
    if (e.target.closest("[data-report-q]")) { resetRepFoot(); openReport(); R.kind = "questao"; R.scope = "bairro"; renderReport(); }
  });
  document.addEventListener("submit", function (e) {
    if (!e.target.matches("[data-tcomposer]")) return;
    e.preventDefault(); var i = $("#tcmp"), t = (D.threads[S.bairro] || []).find(function (x) { return x.id === S.thread; });
    if (!t || !i.value.trim()) return; t.replies.push({ by: ME.nick, ago: "agora", text: i.value.trim() }); renderBairro();
  });
  $("[data-bpick]").addEventListener("change", function (e) { go("#/bairro/" + e.target.value); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { if (S.theme === "auto") applyTheme(true); });

  /* ---------- keyboard ---------- */
  document.addEventListener("keydown", function (e) {
    var typing = /input|textarea|select/i.test((document.activeElement || {}).tagName);
    if (e.key === "/" && !typing) { e.preventDefault(); var q = isPhone() ? $("[data-psearch]") : $("#q"); go("#/mapa"); q.focus(); return; }
    if (e.key === "Escape") { if (!$("#proto").hidden) { $("#proto").hidden = true; return; } if (S.detail && !dlg.open) closeDetail(); return; }
    if (typing || S.view !== "mapa" || isPhone()) return;
    if (e.key === "j" || e.key === "k") {
      var i = VIS.findIndex(function (x) { return x.id === S.sel; }), n = VIS[Math.max(0, Math.min(VIS.length - 1, i + (e.key === "j" ? 1 : -1)))];
      if (n) { select(n.id, { from: "map", open: S.detail }); }
    }
  });

  /* ---------- routing ---------- */
  function go(h) { if (location.hash === h) route(); else location.hash = h; }
  function show(v) {
    S.view = v;
    ["mapa", "placar", "bairro", "voce"].forEach(function (x) { $("#v-" + x).hidden = x !== v; });
    $$("[data-nav]").forEach(function (a) { if (a.getAttribute("data-nav") === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (v === "mapa" && map) setTimeout(function () { map.resize(); }, 0);
  }
  function route() {
    var p = location.hash.replace(/^#\/?/, "").split("/");
    if (p[0] === "r" && p[1]) { show("mapa"); var it = BY_ID[p[1]] || findCreated(p[1]); if (it) { if (VIS.indexOf(it) < 0) { S.filter = "tudo"; S.q = ""; renderFilters(); refresh(); } select(it.id, { from: "map", open: true }); } return; }
    if (p[0] === "placar") { show("placar"); renderPlacar(); return; }
    if (p[0] === "bairro") { if (p[1] && BY_B[p[1]]) S.bairro = p[1]; if (p[2] === "conversa") S.btab = "conversa"; show("bairro"); renderBairro(); return; }
    if (p[0] === "voce") { show("voce"); renderVoce(); return; }
    if (p[0] === "registrar") { show("mapa"); resetRepFoot(); openReport(); return; }
    show("mapa"); if (S.detail && !/^r$/.test(p[0])) closeDetail();
  }
  window.addEventListener("hashchange", route);

  window.FC_DEBUG = { map: function () { return map; }, state: S };
  /* ---------- boot ---------- */
  applyTheme(false);
  railEl.removeAttribute("role");
  renderFilters(); renderRail(); initMap(); route();
})();
