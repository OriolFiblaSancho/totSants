const state = {
  centros: [],
  flores: [],
  pedidoActual: null,
  vista: "centros",
  cargando: true,
  error: ""
};

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const app = document.querySelector("#app");

function parseNumber(value, fallback = 0) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
function today() { return new Date().toISOString().slice(0, 10); }
function uid() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}
function componentFrom(data) {
  return { id: uid(), nombre: data.nombre, cantidad: parseNumber(data.cantidad, 1), precio: parseNumber(data.precio) };
}
function newOrder(centro) {
  const componentes = centro.componentes.map(componentFrom);
  const labour = componentes.find(item => ["mano de obra", "mà d'obra"].includes(item.nombre.toLowerCase()));
  if (labour) {
    labour.nombre = "Mà d'obra";
    labour.precio = 8;
  }
  return {
    id: uid(), centroId: centro.id, centroNombre: centro.nombre, foto: centro.foto,
    fecha: today(), cliente: "", direccion: "", telefono: "", jardinera: "",
    tipos: { jardinera: false, bucaro: false, flores: false, soporte: false },
    cantidades: { jardinera: 1, bucaro: 1 },
    formaMaceta: "",
    notas: "", componentes
  };
}
function currentOrder() { return state.pedidoActual; }
function orderTotal(order) { return order.componentes.reduce((sum, item) => sum + item.cantidad * item.precio, 0); }
function button(label, className, action, extra = "") {
  return `<button class="${className}" data-action="${action}" ${extra}>${label}</button>`;
}
function hasLabour(order) {
  return order.componentes.some(item => ["mano de obra", "mà d'obra"].includes(item.nombre.toLowerCase()));
}
function syncLabour(order) {
  const index = order.componentes.findIndex(item => ["mano de obra", "mà d'obra"].includes(item.nombre.toLowerCase()));
  if (order.tipos.flores && index >= 0) order.componentes.splice(index, 1);
  if (!order.tipos.flores && !hasLabour(order)) order.componentes.push(componentFrom({ nombre: "Mà d'obra", cantidad: 1, precio: 8 }));
}

function renderCentres() {
  return `<section class="page catalogue-page">
    <div class="catalogue-intro">
      <p class="eyebrow">Catàleg de Tots Sants</p>
      <h2>Tria un centre</h2>
    </div>
    <div class="centres-grid">${state.centros.map(centre => `<button class="centre-card" data-centre="${centre.id}">
      <img src="${escapeHtml(centre.foto)}" alt="${escapeHtml(centre.nombre)}" onerror="this.style.display='none'">
      <strong>${escapeHtml(centre.nombre)}</strong>
    </button>`).join("")}</div>
  </section>`;
}

function renderOrder(order) {
  const typeLabels = [["jardinera", "Jardinera"], ["bucaro", "Búcaro"], ["flores", "Flors"], ["soporte", "Suport"]];
  const shapes = [["semicercle", "Semicercle", "img/forma-semicercle.svg"], ["triangle", "Triangle", "img/forma-triangle.svg"], ["esquerra", "L esquerra", "img/forma-l-esquerra.svg"], ["dreta", "L dreta", "img/forma-l-dreta.svg"]];
  return `<section class="page"><div class="order-sheet">
    <div class="order-heading">
      <div><img class="print-photo" src="${escapeHtml(order.foto)}" alt=""><h2>${escapeHtml(order.centroNombre)}</h2></div>
      <div class="actions no-print">${button("← Centres", "secondary", "home")}${button("Genera el PDF", "primary", "print")}</div>
    </div>
    <div class="form-grid">
      ${field("Data", "date", "fecha", order.fecha)}
      ${field("Nom del client", "text", "cliente", order.cliente, "", true)}
      ${field("Adreça del client", "text", "direccion", order.direccion)}
      ${field("Telèfon del client", "tel", "telefono", order.telefono)}
      ${field("Número de jardinera", "text", "jardinera", order.jardinera)}
      <div class="checks">${typeLabels.map(([key, label]) => `<label class="check"><input type="checkbox" data-order-field="tipo:${key}" ${order.tipos[key] ? "checked" : ""}><span class="screen-check">${label}</span><span class="print-check">${order.tipos[key] ? "☑" : "☐"} ${label}</span></label>${["jardinera", "bucaro"].includes(key) && order.tipos[key] ? `<input class="type-quantity" type="text" inputmode="decimal" aria-label="Quantitat de ${label}" data-order-field="cantidad:${key}" value="${order.cantidades[key]}">` : ""}`).join("")}</div>
      <div class="shape-field full"><label>Forma del test</label><div class="shape-options">${shapes.map(([key, label, image]) => `<label class="shape-option"><input type="radio" name="forma-maceta" value="${key}" data-order-field="formaMaceta" ${order.formaMaceta === key ? "checked" : ""}><img src="${image}" alt="${label}"><span class="screen-check">${label}</span><span class="print-check">${order.formaMaceta === key ? "☑" : "☐"} ${label}</span></label>`).join("")}</div></div>
      <div class="field full"><label for="notas">Observacions o notes</label><textarea id="notas" data-order-field="notas">${escapeHtml(order.notas)}</textarea></div>
    </div>
    <div class="components-wrap"><table class="components"><thead><tr><th>Material floral</th><th>Quantitat</th><th>Preu unitari</th><th>Preu total</th><th class="no-print">Treure</th></tr></thead>
      <tbody>${order.componentes.map((item, index) => `<tr>
        <td><input class="name-input" data-component="${index}" data-key="nombre" value="${escapeHtml(item.nombre)}"></td>
        <td><input type="text" inputmode="decimal" data-component="${index}" data-key="cantidad" value="${item.cantidad}"></td>
        <td><input type="text" inputmode="decimal" data-component="${index}" data-key="precio" value="${item.precio}"></td>
        <td class="subtotal">${money.format(item.cantidad * item.precio)}</td>
        <td class="no-print">${button("Treure", "danger remove-component", `remove:${index}`)}</td>
      </tr>`).join("")}</tbody></table></div>
    <div class="actions no-print add-component" style="margin-top:1rem">
      <select id="flower-choice"><option value="">Afegir una flor del catàleg...</option>${state.flores.map(flower => `<option value="${flower.id}">${escapeHtml(flower.nombre)} · ${money.format(flower.precio)}</option>`).join("")}</select>
      ${button("Afegir flor", "secondary", "add-flower")}${button("Afegir línia lliure", "secondary", "add-free")}
    </div>
    <div class="total-row"><span>Total de la comanda:</span><span>${money.format(orderTotal(order))}</span></div>
  </div></section>`;
}
function field(label, type, key, value, placeholder = "", required = false) {
  return `<div class="field"><label for="${key}">${label}${required ? " *" : ""}</label><input id="${key}" type="${type}" data-order-field="${key}" value="${escapeHtml(value)}" placeholder="${placeholder}" ${required ? "required" : ""}></div>`;
}

function validateOrder() {
  const order = currentOrder();
  if (!order.cliente.trim()) {
    const clientInput = document.querySelector("#cliente");
    clientInput.reportValidity();
    clientInput.focus();
    return false;
  }
  return true;
}

function render() {
  if (state.cargando) { app.innerHTML = `<div class="page"><p>Carregant el catàleg...</p></div>`; return; }
  app.innerHTML = `<header class="topbar"><h1>Comandes · Tots Sants</h1></header>
    ${state.error ? `<div class="page error">${escapeHtml(state.error)}</div>` : ""}
    ${state.vista === "centros" ? renderCentres() : renderOrder(currentOrder())}`;
}

function updateOrderField(target) {
  const order = currentOrder();
  const fieldName = target.dataset.orderField;
  if (!order || !fieldName) return;
  if (fieldName.startsWith("tipo:")) {
    order.tipos[fieldName.slice(5)] = target.checked;
    syncLabour(order);
  } else if (fieldName.startsWith("cantidad:")) {
    order.cantidades[fieldName.slice(9)] = parseNumber(target.value, 1);
  } else if (fieldName === "formaMaceta") {
    order.formaMaceta = target.value;
  } else order[fieldName] = target.value;
}

function updateComponent(target) {
  const order = currentOrder();
  const item = order.componentes[Number(target.dataset.component)];
  if (!item) return;
  item[target.dataset.key] = target.dataset.key === "nombre" ? target.value : parseNumber(target.value);
  const row = target.closest("tr");
  row.querySelector(".subtotal").textContent = money.format(item.cantidad * item.precio);
  document.querySelector(".total-row span:last-child").textContent = money.format(orderTotal(order));
}

app.addEventListener("click", event => {
  const centre = event.target.closest("[data-centre]");
  if (centre) {
    const selected = state.centros.find(item => item.id === centre.dataset.centre);
    state.pedidoActual = newOrder(selected); state.vista = "pedido"; render(); return;
  }
  const actionElement = event.target.closest("[data-action]");
  if (!actionElement) return;
  const action = actionElement.dataset.action;
  if (action === "home") { state.vista = "centros"; render(); }
  else if (action === "print") { if (validateOrder()) window.print(); }
  else if (action.startsWith("remove:")) { currentOrder().componentes.splice(Number(action.slice(7)), 1); render(); }
  else if (action === "add-free") { currentOrder().componentes.push(componentFrom({ nombre: "Nuevo componente", cantidad: 1, precio: 0 })); render(); }
  else if (action === "add-flower") {
    const flower = state.flores.find(item => item.id === document.querySelector("#flower-choice").value);
    if (flower) { currentOrder().componentes.push(componentFrom({ nombre: flower.nombre, cantidad: 1, precio: flower.precio })); render(); }
  }
});
app.addEventListener("input", event => {
  const target = event.target;
  if (target.dataset.orderField) {
    updateOrderField(target);
    if (target.dataset.orderField?.startsWith("tipo:") || target.dataset.orderField === "formaMaceta") render();
  }
  if (target.dataset.component !== undefined) updateComponent(target);
});
app.addEventListener("change", event => {
  const target = event.target;
  if (target.dataset.orderField) {
    updateOrderField(target);
    if (target.dataset.orderField.startsWith("tipo:") || target.dataset.orderField === "formaMaceta") render();
  }
  if (target.dataset.component !== undefined) updateComponent(target);
});

Promise.all([fetch("data/centros.json"), fetch("data/flores.json")])
  .then(async ([centresResponse, flowersResponse]) => {
    if (!centresResponse.ok || !flowersResponse.ok) throw new Error("No se pudieron cargar los catálogos.");
    state.centros = await centresResponse.json(); state.flores = await flowersResponse.json();
    state.cargando = false; render();
  })
  .catch(error => { state.cargando = false; state.error = `${error.message} Obre l'aplicació amb un servidor estàtic (per exemple: python3 -m http.server).`; render(); });
