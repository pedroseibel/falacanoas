/* Fala, Canoas · landing page. AGPL-3.0. Sem dependências. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");

  var CFG = window.FALACANOAS_CONFIG || {};
  var BAIRROS = window.FALACANOAS_BAIRROS || [];
  var BY = {};
  BAIRROS.forEach(function (b) { BY[b.slug] = b; });
  var counts = {};
  var current = "";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var live = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function missing(b) { return Math.max(0, (b.threshold || 0) - (counts[b.slug] || 0)); }
  function plural(n, one, many) { return n === 1 ? one : many; }

  /* ---------- Header ---------- */
  var top = $("#top");
  function onScroll() { top.classList.toggle("is-stuck", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Number roll ---------- */
  function roll(el, to, dur) {
    if (reduce || !dur) { el.textContent = fmt(to); return; }
    var from = 0, t0 = null;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Bairro selection, shared by every map, list and select ---------- */
  function meterHTML(b) {
    if (!b) return "Cada bairro abre quando a fila enche.";
    if (!b.threshold) return "<b>" + b.name + "</b> abre junto com o primeiro bairro que encher.";
    var m = missing(b);
    if (m === 0) return "<b>" + b.name + "</b> já encheu a fila. O mapa abre em breve.";
    return "<b>" + b.name + "</b>: faltam <b data-roll>" + fmt(m) + "</b> " + plural(m, "inscrito", "inscritos") + " para abrir.";
  }

  function select(slug, opts) {
    opts = opts || {};
    var b = BY[slug];
    current = b ? slug : "";
    $$("[data-bairro-select]").forEach(function (s) { if (s.value !== current) s.value = current; });
    $$(".map .b[data-name]").forEach(function (p) { p.classList.toggle("is-on", p.getAttribute("data-name") === current); });
    $$("#blist li").forEach(function (li) {
      var on = li.getAttribute("data-b") === current;
      li.classList.toggle("is-on", on);
      $("button", li).setAttribute("aria-pressed", on ? "true" : "false");
    });
    $$("[data-meter]").forEach(function (el) {
      el.innerHTML = meterHTML(b);
      el.classList.toggle("is-count", !!(b && b.threshold));
      var r = $("[data-roll]", el);
      if (r && b && opts.roll !== false) roll(r, missing(b), 650);
    });
    if (opts.url !== false && window.history && history.replaceState) {
      var u = new URL(window.location.href);
      if (current) u.searchParams.set("b", current); else u.searchParams.delete("b");
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    }
  }

  $$("[data-bairro-select]").forEach(function (s) {
    s.addEventListener("change", function () { select(s.value); });
  });
  $$("[data-pick]").forEach(function (btn) {
    btn.addEventListener("click", function () { select(btn.getAttribute("data-pick")); });
  });

  /* ---------- Interactive map ---------- */
  var bmap = $("#bmap"), tip = $("#tip");
  function tipText(b) {
    if (!b.threshold) return "<b>" + b.name + "</b> · abre com o 1º bairro";
    var m = missing(b);
    return "<b>" + b.name + "</b> · " + (m ? "faltam " + fmt(m) : "fila cheia");
  }
  function placeTip(x, y) {
    var r = bmap.parentNode.getBoundingClientRect();
    tip.style.left = (x - r.left) + "px";
    tip.style.top = (y - r.top) + "px";
  }
  if (bmap) {
    $$(".b", bmap).forEach(function (p) {
      var slug = p.getAttribute("data-name"), b = BY[slug];
      function show(e) {
        tip.innerHTML = tipText(b);
        if (e && e.clientX) placeTip(e.clientX, e.clientY);
        else { var rr = p.getBoundingClientRect(); placeTip(rr.left + rr.width / 2, rr.top + rr.height / 2); }
        tip.classList.add("on");
      }
      p.addEventListener("pointermove", show);
      p.addEventListener("pointerleave", function () { tip.classList.remove("on"); });
      p.addEventListener("focus", function () { show(); });
      p.addEventListener("blur", function () { tip.classList.remove("on"); });
      p.addEventListener("click", function () { select(slug); });
      p.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(slug); }
      });
    });
  }

  /* ---------- Queue numbers (live when configured) ---------- */
  function paintCounts() {
    var total = 0;
    BAIRROS.forEach(function (b) {
      var n = counts[b.slug] || 0;
      total += n;
      var li = $('#blist li[data-b="' + b.slug + '"]');
      if (li) {
        var q = $("[data-bq]", li);
        if (b.threshold) {
          q.textContent = fmt(n) + " de " + fmt(b.threshold);
          var lit = Math.min(20, Math.round((n / b.threshold) * 20));
          $$(".slots i", li).forEach(function (i, k) { i.classList.toggle("lit", k < lit); });
        }
      }
      var row = $('[data-q="' + b.slug + '"] [data-q-count]');
      if (row) row.textContent = fmt(n);
      var path = bmap && $('.b[data-name="' + b.slug + '"]', bmap);
      if (path) path.setAttribute("aria-label", b.name + (b.threshold ? ": faltam " + missing(b) + " inscritos" : ": abre com o primeiro bairro"));
    });
    var l = $("[data-live]");
    if (l) l.textContent = total ? fmt(total) + " " + plural(total, "inscrito confirmado", "inscritos confirmados") : "sem inscritos ainda";
    if (current) select(current, { roll: false, url: false });
  }
  function loadCounts() {
    if (!live) { paintCounts(); return; }
    fetch(CFG.supabaseUrl.replace(/\/$/, "") + "/rest/v1/fila_por_bairro?select=bairro,confirmados", {
      headers: { apikey: CFG.supabaseAnonKey, Authorization: "Bearer " + CFG.supabaseAnonKey }
    }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (rows) {
        rows.forEach(function (r) { counts[r.bairro] = r.confirmados | 0; });
        var chip = $("[data-live-chip]"); if (chip) chip.hidden = false;
        paintCounts();
      })
      .catch(paintCounts);
  }

  /* ---------- Scoreboard tabs ---------- */
  var tabs = $$('[role="tab"]');
  function activate(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      $("#" + t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { activate(t); });
    t.addEventListener("keydown", function (e) {
      var k = e.key, n = null;
      if (k === "ArrowRight") n = tabs[(i + 1) % tabs.length];
      if (k === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (k === "Home") n = tabs[0];
      if (k === "End") n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); activate(n, true); }
    });
  });

  /* ---------- Reveal and counters ---------- */
  if ("IntersectionObserver" in window) {
    var vh = window.innerHeight;
    var rise = $$("[data-rise]").filter(function (el) { return el.getBoundingClientRect().top > vh * 0.92; });
    var bars = $$(".hbars .track i");
    if (!reduce) {
      rise.forEach(function (el) { el.classList.add("pre"); });
      bars.forEach(function (el) { el.classList.add("pre"); });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.remove("pre");
        $$(".hbars .track i", el).forEach(function (i, k) { setTimeout(function () { i.classList.remove("pre"); }, 120 + k * 90); });
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    rise.concat($$(".chart")).forEach(function (el) { io.observe(el); });

    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        roll(el, +el.getAttribute("data-count-to"), 1400);
        cio.unobserve(el);
      });
    }, { threshold: 0.6 });
    $$("[data-count-to]").forEach(function (el) { if (!reduce) { el.textContent = "0"; cio.observe(el); } });
  }

  /* ---------- Join form ---------- */
  var form = $("#join"), done = $("#done");
  var contact = $("#f-contato"), lContact = $("#l-contato"), hContact = $("#h-contato");
  var eContact = $("#e-contato"), eBairro = $("#e-bairro"), eConsent = $("#e-consent"), eForm = $("#e-form");

  function channel() { var c = $('input[name="canal"]:checked', form); return c ? c.value : "whatsapp"; }
  function setChannel(v) {
    var r = $('input[name="canal"][value="' + v + '"]', form);
    if (r) { r.checked = true; applyChannel(); }
  }
  function applyChannel() {
    var wa = channel() === "whatsapp";
    contact.value = "";
    contact.type = wa ? "tel" : "email";
    contact.inputMode = wa ? "tel" : "email";
    contact.autocomplete = wa ? "tel-national" : "email";
    contact.placeholder = wa ? "(51) 99999-9999" : "voce@exemplo.com";
    lContact.textContent = wa ? "Seu WhatsApp, com DDD" : "Seu e-mail";
    hContact.textContent = wa ? "Você confirma com uma mensagem que já vem escrita." : "Você confirma por um link que chega no e-mail.";
    clearErr(contact, eContact);
  }
  $$('input[name="canal"]', form).forEach(function (r) { r.addEventListener("change", applyChannel); });

  function maskPhone(v) {
    var d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.length ? "(" + d : "";
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  }
  contact.addEventListener("input", function () {
    if (channel() === "whatsapp") contact.value = maskPhone(contact.value);
    if (!eContact.hidden) validateContact();
  });

  function showErr(input, el, msg) {
    el.textContent = msg || el.textContent; el.hidden = false;
    if (input) { input.setAttribute("aria-invalid", "true"); input.closest(".field") && input.closest(".field").classList.add("has-error"); }
  }
  function clearErr(input, el) {
    el.hidden = true;
    if (input) { input.removeAttribute("aria-invalid"); input.closest(".field") && input.closest(".field").classList.remove("has-error"); }
  }
  function validateContact() {
    var v = contact.value.trim();
    if (channel() === "whatsapp") {
      var d = v.replace(/\D/g, "");
      if (d.length < 10) { showErr(contact, eContact, d.length ? "Esse número parece incompleto. Use o DDD e o número, como (51) 99999-9999." : "Digite seu WhatsApp com DDD."); return false; }
      if (d.length === 11 && d.charAt(2) !== "9") { showErr(contact, eContact, "Celulares têm 9 dígitos depois do DDD. Confira o número."); return false; }
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      showErr(contact, eContact, v ? "Esse e-mail parece ter um erro. Confira o que vem depois do @." : "Digite seu e-mail.");
      return false;
    }
    clearErr(contact, eContact);
    return true;
  }

  function code() {
    var a = "ACDEFHJKMNPRTUVWXY3479", s = "";
    var r = new Uint32Array(4); (window.crypto || window.msCrypto).getRandomValues(r);
    for (var i = 0; i < 4; i++) s += a.charAt(r[i] % a.length);
    return s;
  }

  function shareUrl(b) { return (CFG.siteUrl || location.origin + location.pathname) + "?b=" + b.slug; }
  function shareMessage(b) {
    var tail = b.threshold ? "Quando " + fmt(b.threshold) + " vizinhos entrarem, o mapa abre aqui" : "O mapa abre aqui junto com o primeiro bairro que encher a fila";
    return "Entrei na fila do Fala, Canoas para " + b.name + ". " + tail + " e cada problema da rua passa a ser contado em dias, em público. Entra também: " + shareUrl(b);
  }

  function showDone(b, ch, contactValue, c) {
    var title = $("[data-done-title]", done), text = $("[data-done-text]", done), cbox = $("[data-done-code]", done), cta = $("[data-done-cta]", done);
    if (ch === "whatsapp") {
      title.textContent = "Falta um passo: confirmar no WhatsApp.";
      text.textContent = "Toque no botão e envie a mensagem que já vem escrita. É assim que sabemos que o número é seu. Só depois disso você passa a contar na fila de " + b.name + ".";
      cbox.hidden = false; cbox.textContent = "CONFIRMAR " + c;
      cta.hidden = false;
      if (CFG.whatsappNumber) { cta.href = "https://wa.me/" + CFG.whatsappNumber + "?text=" + encodeURIComponent("CONFIRMAR " + c); cta.removeAttribute("aria-disabled"); }
      else { cta.removeAttribute("href"); cta.setAttribute("aria-disabled", "true"); }
    } else {
      title.textContent = "Falta um passo: abrir o e-mail.";
      text.textContent = "Mandamos um link de confirmação para " + contactValue + ". Se não chegar em alguns minutos, olhe a caixa de spam. Só depois disso você passa a contar na fila de " + b.name + ".";
      cbox.hidden = true; cta.hidden = true;
    }
    $("[data-demo]", done).hidden = live;
    var m = missing(b);
    $("[data-share-text]", done).textContent = b.threshold
      ? "Faltam " + fmt(m) + " " + plural(m, "inscrito", "inscritos") + " para " + b.name + " abrir. Quem chega pelo seu link já cai no bairro certo."
      : "Quem chega pelo seu link já cai no bairro certo.";
    $("[data-share-wa]", done).href = "https://wa.me/?text=" + encodeURIComponent(shareMessage(b));
    var copy = $("[data-copy]", done);
    copy.onclick = function () {
      var url = shareUrl(b), lab = $(".label", copy);
      function ok() { lab.textContent = "Link copiado"; setTimeout(function () { lab.textContent = "Copiar link"; }, 2400); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { window.prompt("Copie o link:", url); });
      else window.prompt("Copie o link:", url);
    };
    form.hidden = true; done.hidden = false;
    done.focus({ preventScroll: true });
    done.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    eForm.hidden = true;
    var sel = $("#f-bairro"), b = BY[sel.value], ok = true;
    if (!b) { showErr(null, eBairro); sel.setAttribute("aria-invalid", "true"); ok = false; } else { eBairro.hidden = true; sel.removeAttribute("aria-invalid"); }
    if (!validateContact()) ok = false;
    var consent = $("#f-consent");
    if (!consent.checked) { eConsent.hidden = false; ok = false; } else eConsent.hidden = true;
    if (!ok) { var first = form.querySelector('[aria-invalid="true"]') || (!consent.checked ? consent : null); if (first) first.focus(); return; }

    var ch = channel(), raw = contact.value.trim();
    var payload = {
      bairro: b.slug,
      canal: ch,
      contato: ch === "whatsapp" ? "55" + raw.replace(/\D/g, "") : raw.toLowerCase(),
      ajuda: $$('input[name="ajuda"]:checked', form).map(function (i) { return i.value; }),
      codigo: code()
    };
    var btn = $('button[type="submit"]', form);
    if (!live) { showDone(b, ch, raw, payload.codigo); return; }

    btn.classList.add("is-loading"); btn.disabled = true;
    fetch(CFG.supabaseUrl.replace(/\/$/, "") + "/rest/v1/inscricoes", {
      method: "POST",
      headers: { apikey: CFG.supabaseAnonKey, Authorization: "Bearer " + CFG.supabaseAnonKey, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(payload)
    }).then(function (r) {
      btn.classList.remove("is-loading"); btn.disabled = false;
      if (r.ok || r.status === 409) showDone(b, ch, raw, payload.codigo);
      else throw new Error(r.status);
    }).catch(function () {
      btn.classList.remove("is-loading"); btn.disabled = false;
      eForm.textContent = "Não deu para salvar agora. Sua conexão pode ter caído; tente de novo em instantes.";
      eForm.hidden = false;
    });
  });

  /* ---------- Hero shortcut ---------- */
  function goJoin(ch) {
    setChannel(ch);
    var target = $("#entrar");
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    setTimeout(function () { (current ? contact : $("#f-bairro")).focus({ preventScroll: true }); }, reduce ? 0 : 650);
  }
  $("#quick").addEventListener("submit", function (e) {
    e.preventDefault();
    var s = $("#q-bairro");
    if (!s.value) {
      $$("[data-meter]")[0].textContent = "Primeiro, escolha seu bairro.";
      s.focus();
      return;
    }
    goJoin("whatsapp");
  });
  $$("[data-channel-link]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); goJoin(a.getAttribute("data-channel-link")); });
  });

  /* ---------- Privacy link ---------- */
  $$("[data-open-privacy]").forEach(function (a) {
    a.addEventListener("click", function () { var d = $("#privacidade"); if (d) d.open = true; });
  });

  /* ---------- Start ---------- */
  var params = new URLSearchParams(window.location.search);
  if (params.get("canal") === "email") setChannel("email");
  loadCounts();
  if (params.get("b") && BY[params.get("b")]) select(params.get("b"), { url: false });
})();
