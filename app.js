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
  return {
    id: uid(), centroId: centro.id, centroNombre: centro.nombre, foto: centro.foto,
    fecha: today(), cliente: "", direccion: "", telefono: "", jardinera: "", bucaroDato: "",
    tipos: { circular: false, jardinera: false, bucaro: false, flores: false, artificial: false },
    notas: "", componentes: centro.componentes.map(componentFrom)
  };
}
function currentOrder() { return state.pedidoActual; }
function orderTotal(order) { return order.componentes.reduce((sum, item) => sum + item.cantidad * item.precio, 0); }
function button(label, className, action, extra = "") {
  return `<button class="${className}" data-action="${action}" ${extra}>${label}</button>`;
}

function renderCentres() {
  return `<section class="page catalogue-page">
    <div class="catalogue-intro">
      <p class="eyebrow">Catálogo de Todos los Santos</p>
      <h2>Elige un centro</h2>
    </div>
    <div class="centres-grid">${state.centros.map(centre => `<button class="centre-card" data-centre="${centre.id}">
      <img src="${escapeHtml(centre.foto)}" alt="${escapeHtml(centre.nombre)}" onerror="this.style.display='none'">
      <strong>${escapeHtml(centre.nombre)}</strong>
    </button>`).join("")}</div>
  </section>`;
}

function renderOrder(order) {
  const typeLabels = [["circular", "Ramo circular"], ["jardinera", "Jardinera"], ["bucaro", "Búcaro"], ["flores", "Flores"], ["artificial", "Artificial"]];
  return `<section class="page"><div class="order-sheet">
    <div class="order-heading">
      <div><img class="print-photo" src="${escapeHtml(order.foto)}" alt=""><h2>${escapeHtml(order.centroNombre)}</h2></div>
      <div class="actions no-print">${button("← Centros", "secondary", "home")}${button("Generar PDF", "primary", "print")}</div>
    </div>
    <div class="form-grid">
      ${field("Fecha", "date", "fecha", order.fecha)}
      ${field("Nombre de cliente", "text", "cliente", order.cliente, "", true)}
      ${field("Dirección del cliente", "text", "direccion", order.direccion)}
      ${field("Teléfono del cliente", "tel", "telefono", order.telefono)}
      ${field("Número de jardinera", "text", "jardinera", order.jardinera)}
      ${order.tipos.bucaro ? field("Dato del búcaro", "text", "bucaroDato", order.bucaroDato, "Si aplica") : ""}
      <div class="checks">${typeLabels.map(([key, label]) => `<label class="check"><input type="checkbox" data-order-field="tipo:${key}" ${order.tipos[key] ? "checked" : ""}><span class="screen-check">${label}</span><span class="print-check">${order.tipos[key] ? "☑" : "☐"} ${label}</span></label>`).join("")}</div>
      <div class="field full"><label for="notas">Observaciones o notas</label><textarea id="notas" data-order-field="notas">${escapeHtml(order.notas)}</textarea></div>
    </div>
    <div class="components-wrap"><table class="components"><thead><tr><th>Componente</th><th>Cantidad</th><th>Precio unitario</th><th>Precio total</th><th class="no-print">Quitar</th></tr></thead>
      <tbody>${order.componentes.map((item, index) => `<tr>
        <td><input class="name-input" data-component="${index}" data-key="nombre" value="${escapeHtml(item.nombre)}"></td>
        <td><input type="text" inputmode="decimal" data-component="${index}" data-key="cantidad" value="${item.cantidad}"></td>
        <td><input type="text" inputmode="decimal" data-component="${index}" data-key="precio" value="${item.precio}"></td>
        <td class="subtotal">${money.format(item.cantidad * item.precio)}</td>
        <td class="no-print">${button("Quitar", "danger remove-component", `remove:${index}`)}</td>
      </tr>`).join("")}</tbody></table></div>
    <div class="actions no-print add-component" style="margin-top:1rem">
      <select id="flower-choice"><option value="">Añadir flor del catálogo...</option>${state.flores.map(flower => `<option value="${flower.id}">${escapeHtml(flower.nombre)} · ${money.format(flower.precio)}</option>`).join("")}</select>
      ${button("Añadir flor", "secondary", "add-flower")}${button("Añadir línea libre", "secondary", "add-free")}
    </div>
    <div class="total-row"><span>Total del pedido:</span><span>${money.format(orderTotal(order))}</span></div>
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
  if (state.cargando) { app.innerHTML = `<div class="page"><p>Cargando catálogo...</p></div>`; return; }
  app.innerHTML = `<header class="topbar"><h1>Pedidos · Todos los Santos</h1></header>
    ${state.error ? `<div class="page error">${escapeHtml(state.error)}</div>` : ""}
    ${state.vista === "centros" ? renderCentres() : renderOrder(currentOrder())}`;
}

function updateOrderField(target) {
  const order = currentOrder();
  const fieldName = target.dataset.orderField;
  if (!order || !fieldName) return;
  if (fieldName.startsWith("tipo:")) order.tipos[fieldName.slice(5)] = target.checked;
  else order[fieldName] = target.value;
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
    if (target.dataset.orderField === "tipo:bucaro") render();
  }
  if (target.dataset.component !== undefined) updateComponent(target);
});
app.addEventListener("change", event => {
  const target = event.target;
  if (target.dataset.component !== undefined) updateComponent(target);
});

Promise.all([fetch("data/centros.json"), fetch("data/flores.json")])
  .then(async ([centresResponse, flowersResponse]) => {
    if (!centresResponse.ok || !flowersResponse.ok) throw new Error("No se pudieron cargar los catálogos.");
    state.centros = await centresResponse.json(); state.flores = await flowersResponse.json();
    state.cargando = false; render();
  })
  .catch(error => { state.cargando = false; state.error = `${error.message} Abre la app con un servidor estático (por ejemplo: python3 -m http.server).`; render(); });
