(function () {
  "use strict";

  function notify(message) {
    var notice = document.getElementById("notice");
    notice.textContent = message;
    notice.hidden = false;
  }
  var DATA = JSON.parse(document.getElementById("tpl-data").textContent);
  var TEMPLATES = DATA.templates;
  var PAPER_W = 794;   // A4 width at 96 dpi
  var PAPER_H = 1123;  // A4 height at 96 dpi

  // ── Sample values (shared across templates by key) ─────────
  var SAMPLE = {
    studentName: "محمد أحمد عبد الله",
    researcherName: "نور الدين حسن",
    doctorName: "أحمد سمير",
    collegeName: "الهندسة",
    thesisType: "الماجستير",
    thesisTitle: "تحسين كفاءة شبكات الاستشعار اللاسلكية باستخدام خوارزميات التعلم العميق",
    researchTitle: "أثر التحول الرقمي على جودة الخدمات المكتبية في الجامعات المصرية",
    researchCount: 5,
    totalSimilarityPercent: 18,
    highestSimilarityPercent: 4,
    citationLink: "https://example.com/ithenticate/report/2026/84213",
    rowNumber: 1,
    date: "2026-10-13",
    checkDate: "2026-10-11",
    checkerName: "سارة محمود",
    reviewerName: "خالد إبراهيم",
    employeeName: "مريم علي",
    directorName: "د. هالة عبد العزيز",
    vicePresidentName: "أ.د. مصطفى كمال"
  };

  // ── Image slots the templates reference ────────────────────
  var ASSETS = [
    { file: "header-logo-t.png", label: "شعار الوحدة", w: 80, h: 92 },
    { file: "university-logo-t.png", label: "شعار الجامعة", w: 107, h: 98 },
    { file: "watermark.png", label: "العلامة المائية", w: 220, h: 220, round: true }
  ];

  function placeholderSvg(a) {
    var shape = a.round
      ? '<circle cx="' + a.w / 2 + '" cy="' + a.h / 2 + '" r="' + (a.w / 2 - 4) + '" fill="#EEF2F6" stroke="#8C9AA8" stroke-width="3" stroke-dasharray="10 7"/>'
      : '<rect x="2" y="2" width="' + (a.w - 4) + '" height="' + (a.h - 4) + '" rx="12" fill="#F3F6F9" stroke="#9AA7B4" stroke-width="1.5" stroke-dasharray="5 4"/>';
    var fs = a.round ? 26 : 12;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + a.w + '" height="' + a.h + '" viewBox="0 0 ' + a.w + " " + a.h + '">' +
      shape +
      '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Tahoma, Arial, sans-serif" font-size="' + fs + '" fill="#6B7A89" direction="rtl">' + a.label + "</text></svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  // ── Per-viewer conveniences (the page works without them) ──
  function load(key, fallback) {
    try { var v = localStorage.getItem("tpv:" + key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem("tpv:" + key, JSON.stringify(value)); return true; }
    catch (e) { notify("تعذر حفظ التغييرات في هذا المتصفح. ستظل متاحة حتى إغلاق الصفحة؛ جرّب صورة أصغر أو امسح البيانات المحفوظة."); return false; }
  }

  // Persisted browser data is untrusted, including values from older versions.
  function savedValues() {
    var saved = load("values", {}), values = {};
    Object.keys(SAMPLE).forEach(function (key) {
      var value = saved && saved[key];
      if (typeof value === "string") values[key] = value.slice(0, 10000);
      else if (typeof value === "number" && Number.isFinite(value)) values[key] = value;
    });
    return values;
  }
  function savedAssets() {
    var saved = load("assets", {}), assets = {};
    ASSETS.forEach(function (asset) {
      var value = saved && saved[asset.file];
      if (typeof value === "string" && value.length < 1450000 && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)) assets[asset.file] = value;
    });
    return assets;
  }
  var state = {
    current: null,
    values: Object.assign({}, SAMPLE, savedValues()),
    mode: load("mode", "values") === "keys" ? "keys" : "values",
    marks: load("marks", true) !== false,
    zoom: ["page", "width", "100"].includes(load("zoom", "page")) ? load("zoom", "page") : "page",
    assets: savedAssets(),
    focusKey: null,
    docHeight: PAPER_H,
    overflow: 0
  };

  // ── Helpers ────────────────────────────────────────────────
  function byKey(k) { for (var i = 0; i < TEMPLATES.length; i++) if (TEMPLATES[i].key === k) return TEMPLATES[i]; return null; }
  function tplName(t) { return t.schema.nameAr || t.schema.name || t.key; }
  function tplNameEn(t) { return t.schema.nameEn || t.schema.name || ""; }
  function countFields(n) {
    if (n === 0) return "بدون حقول";
    if (n === 1) return "حقل واحد";
    if (n === 2) return "حقلان";
    if (n <= 10) return n + " حقول";
    return n + " حقلًا";
  }
  function varMeta(t, k) { var vs = t.schema.variables || []; for (var i = 0; i < vs.length; i++) if (vs[i].key === k) return vs[i]; return null; }
  function display(t, k) {
    var v = state.values[k];
    if (v === undefined || v === null) return "";
    var meta = varMeta(t, k);
    if (meta && meta.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      var p = v.split("-");
      return p[2] + "/" + p[1] + "/" + p[0];
    }
    return String(v);
  }
  function assetSrc(file) {
    if (state.assets[file]) return state.assets[file];
    for (var i = 0; i < ASSETS.length; i++) if (ASSETS[i].file === file) return placeholderSvg(ASSETS[i]);
    return "";
  }

  // ── Render a template into an isolated shadow root ─────────
  // The template CSS targets :root / html / body, so those selectors are
  // mapped onto wrapper elements inside the shadow tree.
  function scopeCss(css) {
    return css
      .replace(/:root\b/g, ":host")
      .replace(/(^|[\s,{}>+~(])html(?=[\s,{:.\[>+~)])/g, "$1.tpl-html")
      .replace(/(^|[\s,{}>+~(])body(?=[\s,{:.\[>+~)])/g, "$1.tpl-body");
  }
  var HOST_CSS = ":host{all:initial;display:block;}";
  var PREVIEW_CSS =
    ".tpl-html{position:relative;width:794px;min-height:1123px;display:flow-root;background:#fff;}" +
    ".tpl-body{background:#fff !important;}" +
    ".page{box-shadow:none !important;}" +
    ".tv{border-radius:2px;transition:background-color .15s,box-shadow .15s;}" +
    ".marks .tv{background:rgba(141,180,226,.42);box-shadow:0 0 0 1px rgba(44,90,134,.28);cursor:pointer;}" +
    ".marks .tv:hover{background:rgba(141,180,226,.7);}" +
    ".marks .tv.empty{display:inline-block;min-width:3em;height:1.1em;vertical-align:middle;}" +
    ".keys .tv{direction:ltr;unicode-bidi:isolate;font-family:Consolas,Menlo,monospace;font-size:.86em;font-weight:normal;}" +
    ".tv.focus{background:rgba(255,196,0,.55) !important;box-shadow:0 0 0 2px #D9A000 !important;}" +
    ".tpv-stamp{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;pointer-events:none;}" +
    ".tpv-stamp div{transform:rotate(-28deg);border:5px solid rgba(163,64,31,.2);border-radius:18px;padding:14px 36px 18px;text-align:center;color:rgba(163,64,31,.2);font-family:Tahoma,Arial,sans-serif;font-weight:bold;line-height:1.3;}" +
    ".tpv-stamp b{display:block;font-size:76px;}" +
    ".tpv-stamp span{display:block;font-size:26px;}";

  var docs = {}; // host id -> { root, wrap, spans, t }

  function renderDoc(host, t, opts) {
    var root = host.shadowRoot || host.attachShadow({ mode: "open" });
    while (root.firstChild) root.removeChild(root.firstChild);

    var parsed = new DOMParser().parseFromString(t.html, "text/html");
    parsed.body.querySelectorAll("script,iframe,object,embed,link,style,form,base,meta").forEach(function (el) { el.remove(); });
    parsed.body.querySelectorAll("*").forEach(function (el) {
      Array.from(el.attributes).forEach(function (attr) {
        if (/^on/i.test(attr.name) || /^(href|srcdoc|action|formaction)$/i.test(attr.name)) el.removeAttribute(attr.name);
      });
    });
    var style = document.createElement("style");
    style.textContent = HOST_CSS + scopeCss(t.css) + PREVIEW_CSS;
    root.appendChild(style);

    // Images: viewer's own uploads if provided, otherwise sized placeholders
    var imgs = parsed.body.querySelectorAll("img[src]");
    for (var j = 0; j < imgs.length; j++) {
      var file = (imgs[j].getAttribute("src") || "").split("/").pop();
      var s = assetSrc(file);
      if (s) imgs[j].setAttribute("src", s);
      else imgs[j].removeAttribute("src");
    }

    // {{placeholders}} → spans
    var walker = parsed.createTreeWalker(parsed.body, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) if (/\{\{\s*\w+\s*\}\}/.test(n.nodeValue)) nodes.push(n);
    nodes.forEach(function (node) {
      var parts = node.nodeValue.split(/(\{\{\s*\w+\s*\}\})/);
      var frag = parsed.createDocumentFragment();
      parts.forEach(function (part) {
        var m = part.match(/^\{\{\s*(\w+)\s*\}\}$/);
        if (!m) { if (part) frag.appendChild(parsed.createTextNode(part)); return; }
        var span = parsed.createElement("span");
        span.className = "tv";
        span.setAttribute("data-k", m[1]);
        frag.appendChild(span);
      });
      node.parentNode.replaceChild(frag, node);
    });

    var wrap = document.createElement("div");
    wrap.className = "tpl-html";
    var body = document.createElement("div");
    body.className = "tpl-body";
    body.setAttribute("dir", parsed.documentElement.getAttribute("dir") || "rtl");
    body.setAttribute("lang", parsed.documentElement.getAttribute("lang") || "ar");
    while (parsed.body.firstChild) body.appendChild(document.adoptNode(parsed.body.firstChild));
    wrap.appendChild(body);

    if (opts.stamp) {
      var stamp = document.createElement("div");
      stamp.className = "tpv-stamp";
      stamp.setAttribute("aria-hidden", "true");
      stamp.innerHTML = "<div><b>نموذج للمعاينة</b><span>غير صالح للاستخدام الرسمي</span></div>";
      wrap.appendChild(stamp);
    }
    root.appendChild(wrap);

    var rec = { root: root, wrap: wrap, spans: wrap.querySelectorAll(".tv"), t: t, opts: opts };
    docs[host.id] = rec;
    applyDoc(rec);
    return rec;
  }

  function applyDoc(rec) {
    var o = rec.opts;
    var keys = o.mode === "keys";
    rec.wrap.classList.toggle("keys", keys);
    rec.wrap.classList.toggle("marks", !!o.marks);
    for (var i = 0; i < rec.spans.length; i++) {
      var el = rec.spans[i], k = el.getAttribute("data-k");
      var v = keys ? "{{" + k + "}}" : display(rec.t, k);
      if (el.textContent !== v) el.textContent = v;
      el.classList.toggle("empty", !keys && v === "");
      el.classList.toggle("focus", !!o.interactive && state.focusKey === k);
    }
  }

  function measure(rec) {
    var page = rec.wrap.querySelector(".page");
    state.overflow = page ? Math.max(0, page.scrollHeight - page.clientHeight) : 0;
    state.docHeight = Math.max(PAPER_H, Math.ceil(rec.wrap.scrollHeight));
  }

  // ── DOM refs ───────────────────────────────────────────────
  var $ = function (id) { return document.getElementById(id); };
  var listEl = $("list"), mainHost = $("mainDoc"), sheet = $("sheet"), desk = $("desk");
  var fieldList = $("fieldList"), statusEl = $("status");

  // Clicking a coloured value in the page jumps to its input
  mainHost.attachShadow({ mode: "open" }).addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest(".tv") : null;
    if (!t) return;
    var f = fieldList.querySelector('.field[data-k="' + t.getAttribute("data-k") + '"]');
    if (!f) return;
    var inp = f.querySelector("input,textarea");
    if (isNarrow()) f.scrollIntoView({ block: "center", behavior: "smooth" });
    else {
      var panel = document.querySelector(".fields");
      var fr = f.getBoundingClientRect(), pr = panel.getBoundingClientRect();
      panel.scrollTo({ top: Math.max(0, panel.scrollTop + (fr.top - pr.top) - panel.clientHeight / 2 + fr.height / 2), behavior: "smooth" });
    }
    f.classList.remove("flash"); void f.offsetWidth; f.classList.add("flash");
    if (inp) inp.focus({ preventScroll: true });
  });

  // ── Template list ──────────────────────────────────────────
  $("navCount").textContent = TEMPLATES.length + " قوالب";
  var thumbHosts = {};
  TEMPLATES.forEach(function (t) {
    var li = document.createElement("li");
    li.className = "item";
    li.id = "opt-" + t.key;
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", "false");
    li.tabIndex = -1;
    li.dataset.key = t.key;

    var th = document.createElement("div");
    th.className = "thumb";
    th.setAttribute("aria-hidden", "true");
    var host = document.createElement("div");
    host.className = "doc-host";
    host.id = "thumb-" + t.key;
    host.style.transform = "scale(" + (62 / PAPER_W) + ")";
    th.appendChild(host);
    thumbHosts[t.key] = host;

    var tx = document.createElement("div");
    tx.className = "item-text";
    var nm = document.createElement("span");
    nm.className = "item-name";
    nm.textContent = tplName(t);
    var en = document.createElement("span");
    en.className = "item-en";
    en.textContent = tplNameEn(t);
    var meta = document.createElement("span");
    meta.className = "item-meta";
    meta.textContent = countFields((t.schema.variables || []).length);
    tx.appendChild(nm); tx.appendChild(en); tx.appendChild(meta);

    li.appendChild(th); li.appendChild(tx);
    li.addEventListener("click", function () { select(t.key, true); });
    listEl.appendChild(li);
  });

  function renderThumbs() {
    if (window.matchMedia("(max-width: 1180px)").matches) { thumbsStale = true; return; }
    thumbsStale = false;
    TEMPLATES.forEach(function (t) {
      renderDoc(thumbHosts[t.key], t, { mode: "values", marks: false, interactive: false, stamp: false });
    });
  }
  var thumbsStale = true, thumbTimer = null;
  function scheduleThumbs() { clearTimeout(thumbTimer); thumbTimer = setTimeout(renderThumbs, 900); }

  listEl.addEventListener("keydown", function (e) {
    var keys = TEMPLATES.map(function (t) { return t.key; });
    var i = keys.indexOf(state.current), next = null;
    if (e.key === "ArrowDown" || e.key === "ArrowLeft") next = keys[Math.min(keys.length - 1, i + 1)];
    else if (e.key === "ArrowUp" || e.key === "ArrowRight") next = keys[Math.max(0, i - 1)];
    else if (e.key === "Home") next = keys[0];
    else if (e.key === "End") next = keys[keys.length - 1];
    if (next) { e.preventDefault(); select(next, true); }
  });

  // ── Fields panel ───────────────────────────────────────────
  function renderFields(t) {
    fieldList.innerHTML = "";
    var vars = t.schema.variables || [];
    $("fieldCount").textContent = "(" + vars.length + ")";
    vars.forEach(function (v) {
      var wrap = document.createElement("div");
      wrap.className = "field";
      wrap.dataset.k = v.key;
      var id = "f-" + v.key;
      var label = document.createElement("label");
      label.setAttribute("for", id);
      var lt = document.createElement("span");
      lt.textContent = v.label || v.labelEn || v.key;
      if (v.labelEn) label.title = v.labelEn;
      var code = document.createElement("code");
      code.textContent = v.key;
      label.appendChild(lt); label.appendChild(code);

      var input;
      if (/title/i.test(v.key)) { input = document.createElement("textarea"); input.rows = 2; }
      else {
        input = document.createElement("input");
        input.type = v.type === "number" ? "number" : v.type === "date" ? "date" : "text";
        if (v.type === "number") input.step = "any";
        if (/link|url/i.test(v.key)) { input.type = "text"; input.dir = "ltr"; input.classList.add("ltr-input"); }
      }
      input.id = id;
      if (input.type === "text" || input.tagName === "TEXTAREA") input.maxLength = 10000;
      var cur = state.values[v.key];
      input.value = cur == null ? "" : cur;
      input.addEventListener("input", function () {
        state.values[v.key] = input.type === "number" && input.value !== "" ? Number(input.value) : input.value;
        save("values", state.values);
        refresh(false);
        scheduleThumbs();
      });
      input.addEventListener("focus", function () { state.focusKey = v.key; refresh(true); });
      input.addEventListener("blur", function () {
        if (state.focusKey === v.key) { state.focusKey = null; refresh(false); }
      });
      wrap.appendChild(label); wrap.appendChild(input);
      fieldList.appendChild(wrap);
    });
  }

  // ── Images panel ───────────────────────────────────────────
  function renderAssets() {
    var host = $("assetList");
    host.innerHTML = "";
    ASSETS.forEach(function (a) {
      var row = document.createElement("div");
      row.className = "asset";
      var img = document.createElement("div");
      img.className = "asset-img" + (state.assets[a.file] ? " has" : "");
      if (state.assets[a.file]) img.style.backgroundImage = 'url("' + state.assets[a.file] + '")';
      var nm = document.createElement("div");
      nm.className = "asset-name";
      nm.textContent = a.label;
      var code = document.createElement("code");
      code.textContent = a.file;
      nm.appendChild(code);
      var act = document.createElement("div");
      act.className = "asset-actions";
      var fileIn = document.createElement("input");
      fileIn.type = "file";
      fileIn.accept = "image/png,image/jpeg,image/webp";
      fileIn.setAttribute("aria-label", "اختيار " + a.label);
      fileIn.className = "sr-only";
      fileIn.id = "asset-" + a.file.replace(/\W/g, "");
      var pick = document.createElement("label");
      pick.className = "btn";
      pick.setAttribute("for", fileIn.id);
      pick.textContent = state.assets[a.file] ? "تغيير" : "اختيار";
      pick.tabIndex = 0;
      pick.setAttribute("role", "button");
      pick.setAttribute("aria-label", "اختيار " + a.label);
      pick.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileIn.click(); } });
      fileIn.addEventListener("change", function () {
        var f = fileIn.files && fileIn.files[0];
        if (!f) return;
        if (!["image/png", "image/jpeg", "image/webp"].includes(f.type) || f.size > 1024 * 1024) {
          notify("اختر صورة PNG أو JPEG أو WebP بحجم لا يتجاوز 1 ميجابايت.");
          fileIn.value = "";
          return;
        }
        var r = new FileReader();
        r.onerror = function () { notify("تعذرت قراءة الصورة. حاول اختيار ملف آخر."); };
        r.onload = function () {
          var image = new Image();
          image.onerror = function () { notify("ملف الصورة غير صالح. اختر صورة أخرى."); };
          image.onload = function () {
            if (image.naturalWidth > 4096 || image.naturalHeight > 4096) {
              notify("أبعاد الصورة كبيرة جدًا. الحد الأقصى هو 4096 × 4096 بكسل.");
              return;
            }
            state.assets[a.file] = r.result;
            save("assets", state.assets);
            renderAssets(); renderMain(); renderThumbs();
          };
          image.src = r.result;
        };
        r.readAsDataURL(f);
      });
      act.appendChild(fileIn); act.appendChild(pick);
      if (state.assets[a.file]) {
        var rm = document.createElement("button");
        rm.type = "button"; rm.className = "btn"; rm.textContent = "إزالة";
        rm.addEventListener("click", function () {
          delete state.assets[a.file]; save("assets", state.assets);
          renderAssets(); renderMain(); renderThumbs();
        });
        act.appendChild(rm);
      }
      row.appendChild(img); row.appendChild(nm); row.appendChild(act);
      host.appendChild(row);
    });
  }

  // ── Main sheet ─────────────────────────────────────────────
  function mainOpts() { return { mode: state.mode, marks: state.marks, interactive: true, stamp: true }; }

  function renderMain() {
    var t = byKey(state.current);
    if (!t) return;
    var rec = renderDoc(mainHost, t, mainOpts());
    after(rec, false);
    // re-measure once fonts and images settle
    var imgs = rec.wrap.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) if (!imgs[i].complete) imgs[i].addEventListener("load", function () { after(docs.mainDoc, false); });
  }

  function refresh(reveal) {
    var rec = docs.mainDoc;
    if (!rec) return;
    rec.opts = mainOpts();
    applyDoc(rec);
    after(rec, reveal);
  }

  function after(rec, reveal) {
    measure(rec);
    layout();
    updateStatus();
    if (reveal && state.focusKey) revealKey(rec, state.focusKey);
  }

  function isNarrow() { return window.matchMedia("(max-width: 900px)").matches; }

  function currentScale() {
    var cs = getComputedStyle(desk);
    var avail = desk.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (state.zoom === "100") return 1;
    avail = Math.max(1, avail);
    var sw = avail / PAPER_W;
    if (state.zoom === "width") return Math.min(sw, 1.4);
    if (isNarrow()) return Math.min(sw, 1);
    var availH = desk.clientHeight - 28 - 60;
    return Math.max(0.05, Math.min(sw, Math.max(1, availH) / PAPER_H, 1));
  }

  function layout() {
    var s = currentScale();
    mainHost.style.transform = "scale(" + s + ")";
    sheet.style.width = Math.round(PAPER_W * s) + "px";
    sheet.style.height = Math.round(state.docHeight * s) + "px";
    $("sheetFoot").textContent = "ورقة A4 بمقياس " + Math.round(s * 100) + "%";
  }

  function revealKey(rec, key) {
    if (isNarrow()) return; // on phones the whole page scrolls; keep the field in view
    var el = rec.wrap.querySelector('.tv[data-k="' + key + '"]');
    if (!el) return;
    var r = el.getBoundingClientRect(), d = desk.getBoundingClientRect();
    if (r.top < d.top + 20 || r.bottom > d.bottom - 20) {
      desk.scrollTo({ top: Math.max(0, desk.scrollTop + (r.top - d.top) - desk.clientHeight / 3), behavior: "smooth" });
    }
  }

  function updateStatus() {
    if (state.overflow > 1) {
      statusEl.className = "status over";
      statusEl.textContent = "المحتوى تجاوز إطار الصفحة بـ " + Math.round(state.overflow) + " px";
    } else {
      statusEl.className = "status";
      statusEl.textContent = "داخل حدود الصفحة";
    }
  }

  function updateHeader(t) {
    $("tplTitle").textContent = tplName(t);
    var sub = $("tplSub");
    sub.innerHTML = "";
    var en = document.createElement("span");
    en.dir = "ltr";
    en.textContent = tplNameEn(t);
    sub.appendChild(en);
    if (t.schema.templateVersion) {
      var ver = document.createElement("span");
      ver.textContent = "الإصدار " + t.schema.templateVersion;
      sub.appendChild(ver);
    }
    var code = document.createElement("code");
    code.textContent = "templates/" + t.key + "/";
    sub.appendChild(code);
  }

  function select(key, focusItem) {
    var t = byKey(key) || TEMPLATES[0];
    state.current = t.key;
    state.focusKey = null;
    Array.prototype.forEach.call(listEl.children, function (li) {
      var on = li.dataset.key === t.key;
      li.setAttribute("aria-selected", on ? "true" : "false");
      li.tabIndex = on ? 0 : -1;
      if (on) {
        listEl.setAttribute("aria-activedescendant", li.id);
        if (focusItem) { li.focus({ preventScroll: true }); li.scrollIntoView({ block: "nearest", inline: "nearest" }); }
      }
    });
    try { if (location.hash.slice(1) !== t.key) history.replaceState(null, "", "#" + t.key); } catch (e) {}
    updateHeader(t);
    renderFields(t);
    renderMain();
    desk.scrollTop = 0;
  }

  // ── Toolbar ────────────────────────────────────────────────
  function syncSeg() {
    document.querySelectorAll("[data-mode]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.mode === state.mode ? "true" : "false"); });
    document.querySelectorAll("[data-zoom]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.zoom === state.zoom ? "true" : "false"); });
    $("marks").checked = !!state.marks;
  }
  document.querySelectorAll("[data-mode]").forEach(function (b) {
    b.addEventListener("click", function () { state.mode = b.dataset.mode; save("mode", state.mode); syncSeg(); refresh(false); });
  });
  document.querySelectorAll("[data-zoom]").forEach(function (b) {
    b.addEventListener("click", function () { state.zoom = b.dataset.zoom; save("zoom", state.zoom); syncSeg(); layout(); });
  });
  $("marks").addEventListener("change", function (e) { state.marks = e.target.checked; save("marks", state.marks); refresh(false); });
  $("reset").addEventListener("click", function () {
    state.values = Object.assign({}, SAMPLE);
    save("values", state.values);
    renderFields(byKey(state.current));
    refresh(false);
    renderThumbs();
  });

  if (window.ResizeObserver) new ResizeObserver(function () { layout(); if (thumbsStale) renderThumbs(); }).observe(desk);
  window.addEventListener("hashchange", function () {
    var k = "";
    try { k = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; }
    if (k && k !== state.current && byKey(k)) select(k, false);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (docs.mainDoc) after(docs.mainDoc, false); });

  $("clear-data").addEventListener("click", function () {
    try { ["values", "assets", "mode", "marks", "zoom"].forEach(function (key) { localStorage.removeItem("tpv:" + key); }); }
    catch (e) { notify("تعذر مسح التخزين المحلي. استخدم إعدادات المتصفح لمسح بيانات الموقع."); return; }
    state.values = Object.assign({}, SAMPLE);
    state.assets = {};
    state.mode = "values"; state.marks = true; state.zoom = "page";
    syncSeg(); renderAssets(); renderFields(byKey(state.current)); renderMain(); renderThumbs();
    notify("تم مسح البيانات والصور المحفوظة وإعادة القيم التجريبية.");
  });
  function syncOrientation() { listEl.setAttribute("aria-orientation", isNarrow() ? "horizontal" : "vertical"); }
  window.addEventListener("resize", syncOrientation);
  syncOrientation();

  // ── Boot ───────────────────────────────────────────────────
  syncSeg();
  renderAssets();
  renderThumbs();
  var start = "";
  try { start = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
  select(byKey(start) ? start : TEMPLATES[0].key, false);
})();

