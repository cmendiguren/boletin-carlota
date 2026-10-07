(function () {
  "use strict";

  var SECCIONES = {
    sanidad: "Sanidad",
    ganadero: "Ganadero",
    agrario: "Agrario",
    geopolitica: "Geopolítica",
    rentabilidad: "Rentabilidad"
  };

  var estado = {
    modo: leerPreferencia("modo", "corto"),
    indice: [],
    fecha: null,
    boletin: null,
    filtro: "todo",
    busqueda: ""
  };

  var $ = function (id) { return document.getElementById(id); };
  var elBoletin = $("boletin");
  var elEstado = $("estado");
  var elSelector = $("selector-fecha");

  // ---------- utilidades ----------
  function leerPreferencia(clave, porDefecto) {
    try { return localStorage.getItem("boletin." + clave) || porDefecto; } catch (e) { return porDefecto; }
  }
  function guardarPreferencia(clave, valor) {
    try { localStorage.setItem("boletin." + clave, valor); } catch (e) { /* sin almacenamiento */ }
  }
  function h(tag, attrs, hijos) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? "" : v);
      });
    }
    (hijos || []).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return el;
  }
  function normalizar(t) {
    return (t || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function fechaLarga(iso) {
    var p = iso.split("-").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    try {
      return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    } catch (e) { return iso; }
  }
  function fechaCorta(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    var p = iso.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }
  function parrafos(texto) {
    return (texto || "").split(/\n\s*\n/).filter(Boolean).map(function (t) { return h("p", { text: t.trim() }); });
  }
  function enlaceFuente(item) {
    if (!item.fuente) return null;
    if (item.url) return h("a", { href: item.url, target: "_blank", rel: "noopener", text: item.fuente });
    return document.createTextNode(item.fuente);
  }
  async function cargarJSON(ruta) {
    var r = await fetch(ruta, { cache: "no-cache" });
    if (!r.ok) throw new Error("No se pudo cargar " + ruta + " (" + r.status + ")");
    return r.json();
  }

  // ---------- modo corto / largo ----------
  function pintarModo() {
    $("modo-corto").setAttribute("aria-pressed", String(estado.modo === "corto"));
    $("modo-largo").setAttribute("aria-pressed", String(estado.modo === "largo"));
  }
  function cambiarModo(modo) {
    estado.modo = modo;
    guardarPreferencia("modo", modo);
    pintarModo();
    pintarContenido();
  }
  $("modo-corto").addEventListener("click", function () { cambiarModo("corto"); });
  $("modo-largo").addEventListener("click", function () { cambiarModo("largo"); });

  // ---------- navegación por fechas ----------
  function pintarSelector() {
    elSelector.innerHTML = "";
    estado.indice.forEach(function (b) {
      elSelector.appendChild(h("option", { value: b.fecha, text: fechaCorta(b.fecha) + (b.ejemplo ? " · ejemplo" : "") }));
    });
    elSelector.value = estado.fecha;
    var i = estado.indice.findIndex(function (b) { return b.fecha === estado.fecha; });
    $("anterior").disabled = i < 0 || i >= estado.indice.length - 1;
    $("siguiente").disabled = i <= 0;
  }
  function irA(fecha) {
    if (!fecha || fecha === estado.fecha) return;
    if (history.replaceState) history.replaceState(null, "", "#" + fecha);
    abrirBoletin(fecha);
  }
  elSelector.addEventListener("change", function () { irA(elSelector.value); });
  $("anterior").addEventListener("click", function () {
    var i = estado.indice.findIndex(function (b) { return b.fecha === estado.fecha; });
    if (i < estado.indice.length - 1) irA(estado.indice[i + 1].fecha);
  });
  $("siguiente").addEventListener("click", function () {
    var i = estado.indice.findIndex(function (b) { return b.fecha === estado.fecha; });
    if (i > 0) irA(estado.indice[i - 1].fecha);
  });

  // ---------- render ----------
  function pintarBoletin() {
    var b = estado.boletin;
    elBoletin.innerHTML = "";

    if (b.ejemplo) {
      elBoletin.appendChild(h("div", { class: "aviso-ejemplo" }, [
        h("strong", { text: "Boletín de ejemplo. " }),
        "Sirve para ver el diseño. Las noticias enlazadas son reales, pero no es el boletín completo del día."
      ]));
    }

    var sem = b.semaforo || {};
    var margen = b.margen || {};
    var etiquetasSem = { verde: "Sin cambios", amarillo: "A vigilar", rojo: "Alerta en la zona" };

    elBoletin.appendChild(h("header", { class: "cabecera" }, [
      h("div", { class: "fecha-larga", text: fechaLarga(b.fecha) }),
      h("h1", { class: "titulo", text: b.titulo }),
      h("div", { class: "estado-dia" }, [
        h("div", { class: "indicador nivel-" + sem.nivel }, [
          h("span", { class: "indicador-etiqueta", text: "Semáforo sanitario" }),
          h("span", { class: "indicador-valor" }, [h("span", { class: "punto", "aria-hidden": "true" }), etiquetasSem[sem.nivel] || sem.nivel]),
          h("span", { class: "indicador-texto", text: sem.motivo })
        ]),
        h("div", { class: "indicador tend-" + (margen.tendencia || "").replace(/\s+/g, "-") }, [
          h("span", { class: "indicador-etiqueta", text: "Margen de la granja" }),
          h("span", { class: "indicador-valor", text: { mejora: "↗ Mejora", "se mantiene": "→ Se mantiene", empeora: "↘ Empeora" }[margen.tendencia] || margen.tendencia }),
          h("span", { class: "indicador-texto", text: margen.texto })
        ])
      ]),
      h("ul", { class: "destacados", "aria-label": "Lo más importante hoy" },
        (b.destacados || []).map(function (d) { return h("li", { text: d }); }))
    ]));

    // filtros
    var idsPresentes = (b.secciones || []).map(function (s) { return s.id; });
    var chips = [["todo", "Todo"]].concat(idsPresentes.map(function (id) { return [id, SECCIONES[id] || id]; }));
    chips.push(["precios", "Precios"]);
    if (idsPresentes.indexOf(estado.filtro) < 0 && estado.filtro !== "precios") estado.filtro = "todo";

    var filaChips = h("div", { class: "chips", role: "group", "aria-label": "Filtrar por sección" },
      chips.map(function (c) {
        return h("button", {
          type: "button", class: "chip", "data-filtro": c[0], "aria-pressed": String(estado.filtro === c[0]), text: c[1],
          onclick: function () {
            estado.filtro = c[0];
            filaChips.querySelectorAll(".chip").forEach(function (el) {
              el.setAttribute("aria-pressed", String(el.getAttribute("data-filtro") === estado.filtro));
            });
            pintarContenido();
          }
        });
      }));
    var buscador = h("input", {
      id: "buscar", type: "search", placeholder: "Buscar en el boletín (ej. lengua azul, maíz)", autocomplete: "off",
      oninput: function (e) { estado.busqueda = e.target.value; pintarContenido(); }
    });
    buscador.value = estado.busqueda;
    elBoletin.appendChild(h("div", { class: "filtros" }, [filaChips, h("label", { class: "buscador" }, [h("span", { class: "sr", text: "Buscar" }), buscador])]));

    elBoletin.appendChild(h("div", { id: "contenido" }));
    pintarContenido();

    if (b.generado) {
      var g = new Date(b.generado);
      elBoletin.appendChild(h("p", { class: "generado", text: "Generado el " + (isNaN(g) ? b.generado : g.toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" })) }));
    }
    elBoletin.hidden = false;
    elEstado.hidden = true;
  }

  function coincide(item, q) {
    if (!q) return true;
    return normalizar([item.titular, item.resumen, item.detalle, item.fuente].join(" ")).indexOf(q) >= 0;
  }

  function pintarContenido() {
    var cont = $("contenido");
    if (!cont || !estado.boletin) return;
    cont.innerHTML = "";
    var b = estado.boletin;
    var largo = estado.modo === "largo";
    var q = normalizar(estado.busqueda.trim());
    var hayAlgo = false;

    if (estado.filtro !== "precios") {
      (b.secciones || []).forEach(function (s) {
        if (estado.filtro !== "todo" && estado.filtro !== s.id) return;
        var items = (s.items || []).filter(function (it) {
          return (largo || !it.soloLargo) && coincide(it, q);
        });
        if (!items.length) return;
        hayAlgo = true;
        var ocultos = largo ? 0 : (s.items || []).filter(function (it) { return it.soloLargo && coincide(it, q); }).length;
        cont.appendChild(h("section", { class: "seccion", "aria-labelledby": "sec-" + s.id }, [
          h("h2", { class: "seccion-titulo", id: "sec-" + s.id }, [
            s.titulo,
            h("span", { class: "seccion-cuenta", text: items.length + (items.length === 1 ? " noticia" : " noticias") + (ocultos ? " · +" + ocultos + " en Largo" : "") })
          ]),
          h("div", { class: "items" }, items.map(function (it) { return pintarItem(it, largo); }))
        ]));
      });
    }

    if ((estado.filtro === "todo" || estado.filtro === "precios") && !q && (b.precios || []).length) {
      hayAlgo = true;
      cont.appendChild(h("section", { class: "seccion", "aria-labelledby": "sec-precios" }, [
        h("h2", { class: "seccion-titulo", id: "sec-precios" }, ["Precios", h("span", { class: "seccion-cuenta", text: "referencias del día" })]),
        h("div", { class: "tabla-envoltura" }, [h("table", null, [
          h("thead", null, [h("tr", null, [h("th", { text: "Producto" }), h("th", { text: "Precio" }), largo ? h("th", { text: "Variación" }) : null, h("th", { text: "Fecha" }), largo ? h("th", { text: "Fuente" }) : null])]),
          h("tbody", null, b.precios.map(function (p) {
            var sinDato = /sin (actualizaci|dato)/i.test(p.valor);
            return h("tr", null, [
              h("td", { text: p.producto }),
              h("td", { class: "num" + (sinDato ? " sin-dato" : ""), text: p.valor }),
              largo ? h("td", { text: p.variacion || "—" }) : null,
              h("td", { text: p.fecha }),
              largo ? h("td", null, [p.url ? h("a", { href: p.url, target: "_blank", rel: "noopener", text: p.fuente }) : (p.fuente || "—")]) : null
            ]);
          }))
        ])])
      ]));
    }

    if (estado.filtro === "todo" && !q && (b.anguloComercial || []).length) {
      hayAlgo = true;
      cont.appendChild(h("section", { class: "comercial", "aria-labelledby": "sec-comercial" }, [
        h("h2", { id: "sec-comercial", text: "Para las visitas de hoy" }),
        h("ul", null, b.anguloComercial.map(function (t) { return h("li", { text: t }); }))
      ]));
    }

    if (largo && estado.filtro === "todo" && !q) {
      hayAlgo = true;
      var agenda = b.agenda || [];
      cont.appendChild(h("section", { class: "seccion", "aria-labelledby": "sec-agenda" }, [
        h("h2", { class: "seccion-titulo", id: "sec-agenda", text: "Agenda" }),
        agenda.length
          ? h("ul", { class: "agenda" }, agenda.map(function (a) {
              return h("li", null, [
                h("span", { class: "cuando", text: fechaCorta(a.fecha) }),
                h("span", null, [a.url ? h("a", { href: a.url, target: "_blank", rel: "noopener", text: a.evento }) : a.evento, a.lugar ? " · " + a.lugar : ""])
              ]);
            }))
          : h("p", { class: "vacio", text: "Sin eventos en los próximos días." })
      ]));
    }

    if (!hayAlgo) {
      cont.appendChild(h("p", { class: "vacio", text: q ? "No hay resultados para «" + estado.busqueda.trim() + "»." : "No hay noticias en esta sección." }));
    }
  }

  function pintarItem(it, largo) {
    var meta = [];
    if (it.ambito) meta.push(h("span", { class: "etiqueta", text: it.ambito }));
    if (it.afectaMiZona) meta.push(h("span", { class: "etiqueta zona", text: "Tu zona" }));
    if (it.fecha) meta.push(h("span", { text: fechaCorta(it.fecha) }));
    if (it.fuente && !largo) meta.push(h("span", null, [enlaceFuente(it)]));
    var cuerpo = largo
      ? h("div", { class: "detalle" }, parrafos(it.detalle || it.resumen))
      : h("p", { class: "resumen", text: it.resumen });
    return h("article", { class: "item" }, [
      h("div", { class: "meta" }, meta),
      h("h3", { text: it.titular }),
      cuerpo,
      largo && it.fuente ? h("div", { class: "fuente" }, ["Fuente: ", enlaceFuente(it)]) : null
    ]);
  }

  // ---------- carga ----------
  async function abrirBoletin(fecha) {
    estado.fecha = fecha;
    pintarSelector();
    try {
      estado.boletin = await cargarJSON("boletines/" + fecha + ".json");
      pintarBoletin();
      window.scrollTo(0, 0);
    } catch (e) {
      elBoletin.hidden = true;
      elEstado.hidden = false;
      elEstado.textContent = "No se ha podido abrir el boletín del " + fechaCorta(fecha) + ". Si estás sin conexión, solo se pueden ver los boletines que ya abriste antes.";
    }
  }

  async function iniciar() {
    pintarModo();
    try {
      var idx = await cargarJSON("boletines/index.json");
      estado.indice = idx.boletines || [];
    } catch (e) {
      elEstado.textContent = "No se ha podido cargar la lista de boletines. Comprueba la conexión y vuelve a abrir la app.";
      return;
    }
    if (!estado.indice.length) {
      elEstado.textContent = "Todavía no hay ningún boletín publicado.";
      return;
    }
    var desdeEnlace = location.hash.replace("#", "");
    var existe = estado.indice.some(function (b) { return b.fecha === desdeEnlace; });
    abrirBoletin(existe ? desdeEnlace : estado.indice[0].fecha);
  }

  // ---------- app instalable ----------
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () { /* sin modo sin conexión */ });
    });
  }
  var avisoInstalar = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    avisoInstalar = e;
    $("instalar").hidden = false;
  });
  $("instalar").addEventListener("click", async function () {
    if (!avisoInstalar) return;
    avisoInstalar.prompt();
    await avisoInstalar.userChoice;
    avisoInstalar = null;
    $("instalar").hidden = true;
  });

  iniciar();
})();
