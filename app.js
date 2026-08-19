// =========================================================
// RV VIDROS E ACABAMENTOS — app.js
// =========================================================

const { createClient } = supabase;
const db = createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_ANON_KEY);

let currentWorkId = null;
let clientsCache = [];

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------
const $ = (id) => document.getElementById(id);
const fmtMoney = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function showToast(msg, isError = false) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('error', isError);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

function openModal(id) { $(id).classList.add('active'); }
function closeModal(id) { $(id).classList.remove('active'); }

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

function todayCode() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

// ---------------------------------------------------------
// AUTENTICAÇÃO
// ---------------------------------------------------------
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('loginError').textContent = '';
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;

  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    $('loginError').textContent = 'E-mail ou senha inválidos.';
    return;
  }
  await enterApp(data.session.user);
});

$('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  location.reload();
});

async function enterApp(user) {
  $('loginScreen').style.display = 'none';
  $('appShell').classList.add('active');
  $('userChip').textContent = user.email;
  await loadClients();
  await loadWorks();
  await loadAllBudgets();
  await loadAllOrders();
}

// Restaura sessão ao recarregar a página
(async function initSession() {
  const { data } = await db.auth.getSession();
  if (data.session) {
    await enterApp(data.session.user);
  }
})();

// ---------------------------------------------------------
// NAVEGAÇÃO PRINCIPAL
// ---------------------------------------------------------
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    goToPage(btn.dataset.page);
  });
});

function goToPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $(pageId).classList.add('active');
}

$('backToWorks').addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-page="pageWorks"]').classList.add('active');
  goToPage('pageWorks');
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.subview').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.sub).classList.add('active');
  });
});

// ---------------------------------------------------------
// CLIENTES
// ---------------------------------------------------------
$('btnNewClient').addEventListener('click', () => openModal('modalClient'));

$('saveClientBtn').addEventListener('click', async () => {
  const name = $('clientName').value.trim();
  if (!name) { showToast('Informe o nome do cliente.', true); return; }

  const { error } = await db.from('clients').insert({
    name,
    phone: $('clientPhone').value.trim() || null,
    email: $('clientEmail').value.trim() || null,
    address: $('clientAddress').value.trim() || null,
  });

  if (error) { showToast('Erro ao salvar cliente: ' + error.message, true); return; }

  ['clientName','clientPhone','clientEmail','clientAddress'].forEach(id => $(id).value = '');
  closeModal('modalClient');
  showToast('Cliente cadastrado.');
  await loadClients();
});

async function loadClients() {
  const { data, error } = await db
    .from('clients')
    .select('*, works(id)')
    .order('created_at', { ascending: false });

  if (error) { showToast('Erro ao carregar clientes: ' + error.message, true); return; }

  clientsCache = data || [];
  renderClients(clientsCache);
  populateWorkClientSelect(clientsCache);
}

function renderClients(clients) {
  const tbody = $('clientsTableBody');
  tbody.innerHTML = '';
  $('clientsEmpty').style.display = clients.length ? 'none' : 'block';

  clients.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(c.name)}</td>
      <td class="muted">${escapeHtml(c.phone || '—')}</td>
      <td class="muted">${escapeHtml(c.email || '—')}</td>
      <td>${(c.works || []).length}</td>
      <td><button class="icon-btn" data-id="${c.id}" title="Excluir">✕</button></td>
    `;
    tr.querySelector('.icon-btn').addEventListener('click', () => deleteClient(c.id));
    tbody.appendChild(tr);
  });
}

async function deleteClient(id) {
  if (!confirm('Excluir este cliente? As obras vinculadas continuarão existindo sem cliente associado.')) return;
  const { error } = await db.from('clients').delete().eq('id', id);
  if (error) { showToast('Erro ao excluir: ' + error.message, true); return; }
  showToast('Cliente excluído.');
  await loadClients();
}

function populateWorkClientSelect(clients) {
  const sel = $('workClientSelect');
  sel.innerHTML = '<option value="">Sem cliente vinculado</option>' +
    clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
}

// ---------------------------------------------------------
// OBRAS
// ---------------------------------------------------------
$('btnNewWork').addEventListener('click', () => openModal('modalWork'));

$('saveWorkBtn').addEventListener('click', async () => {
  const name = $('workName').value.trim();
  if (!name) { showToast('Informe o nome da obra.', true); return; }

  const clientId = $('workClientSelect').value || null;
  const code = `${todayCode()}-${String(Math.floor(Math.random() * 900) + 100)}`;

  const { error } = await db.from('works').insert({
    name, client_id: clientId, code, status: 'orcamento', budget_price: 0,
  });

  if (error) { showToast('Erro ao criar obra: ' + error.message, true); return; }

  $('workName').value = '';
  closeModal('modalWork');
  showToast('Obra criada.');
  await loadWorks();
});

async function loadWorks() {
  const { data, error } = await db
    .from('works')
    .select('*, clients(name)')
    .order('created_at', { ascending: false });

  if (error) { showToast('Erro ao carregar obras: ' + error.message, true); return; }

  renderWorks(data || []);
}

function renderWorks(works) {
  const tbody = $('worksTableBody');
  tbody.innerHTML = '';
  $('worksEmpty').style.display = works.length ? 'none' : 'block';

  works.forEach(w => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono">${escapeHtml(w.code || '—')}</td>
      <td class="clickable">${escapeHtml(w.name)}</td>
      <td class="muted">${escapeHtml(w.clients?.name || '—')}</td>
      <td><span class="tag tag-status status-${w.status}">${statusLabel(w.status)}</span></td>
      <td class="num">${fmtMoney(w.budget_price)}</td>
      <td><button class="icon-btn" data-id="${w.id}" title="Excluir">✕</button></td>
    `;
    tr.querySelector('td.clickable').addEventListener('click', () => openWorkDetail(w.id));
    tr.querySelector('.icon-btn').addEventListener('click', (e) => { e.stopPropagation(); deleteWork(w.id); });
    tbody.appendChild(tr);
  });
}

function statusLabel(s) {
  return {
    orcamento: 'Orçamento', aprovado: 'Aprovado', producao: 'Produção',
    instalado: 'Instalado', cancelado: 'Cancelado',
    rascunho: 'Rascunho', enviado: 'Enviado', recusado: 'Recusado',
    aberto: 'Aberto', entregue: 'Entregue',
  }[s] || s;
}

async function deleteWork(id) {
  if (!confirm('Excluir esta obra e todos os dados vinculados (tipologias, materiais, orçamentos, pedidos)?')) return;
  const { error } = await db.from('works').delete().eq('id', id);
  if (error) { showToast('Erro ao excluir: ' + error.message, true); return; }
  showToast('Obra excluída.');
  await loadWorks();
  await loadAllBudgets();
  await loadAllOrders();
}

// ---------------------------------------------------------
// DETALHE DA OBRA
// ---------------------------------------------------------
async function openWorkDetail(workId) {
  currentWorkId = workId;

  const { data: work, error } = await db
    .from('works')
    .select('*, clients(name)')
    .eq('id', workId)
    .single();

  if (error) { showToast('Erro ao abrir obra: ' + error.message, true); return; }

  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  goToPage('pageWorkDetail');

  $('workDetailTitle').textContent = work.name;
  $('workDetailSub').textContent = `${work.code || ''} · ${work.clients?.name || 'Sem cliente'}`;
  $('workStatusSelect').value = work.status;

  await loadTypologies(workId);
  await loadMaterials(workId);
  await loadBudgetsForWork(workId);
  await loadOrdersForWork(workId);
  await refreshWorkStats(workId, work.budget_price);
}

$('workStatusSelect').addEventListener('change', async () => {
  if (!currentWorkId) return;
  const { error } = await db.from('works').update({ status: $('workStatusSelect').value }).eq('id', currentWorkId);
  if (error) { showToast('Erro ao atualizar status: ' + error.message, true); return; }
  showToast('Status atualizado.');
  await loadWorks();
});

async function refreshWorkStats(workId, budgetPrice) {
  const { data: typos } = await db.from('work_typologies').select('total_price').eq('work_id', workId);
  const { data: mats } = await db.from('materials').select('total_cost').eq('work_id', workId);

  const typoTotal = (typos || []).reduce((s, t) => s + Number(t.total_price || 0), 0);
  const matTotal = (mats || []).reduce((s, m) => s + Number(m.total_cost || 0), 0);

  $('statTypologiesTotal').textContent = fmtMoney(typoTotal);
  $('statMaterialsTotal').textContent = fmtMoney(matTotal);
  $('statWorkPrice').textContent = fmtMoney(budgetPrice);
}

// ---------- Tipologias ----------
$('btnNewTypology').addEventListener('click', () => openModal('modalTypology'));

$('typoLine').addEventListener('change', () => {
  const isSuprema = $('typoLine').value === 'Suprema';
  $('fieldProfileColor').style.display = isSuprema ? 'block' : 'none';
  $('fieldGlassType').style.display = isSuprema ? 'none' : 'block';
});

$('saveTypologyBtn').addEventListener('click', async () => {
  if (!currentWorkId) return;
  const name = $('typoName').value.trim();
  const width = parseFloat($('typoWidth').value);
  const height = parseFloat($('typoHeight').value);

  if (!name || !width || !height) { showToast('Preencha nome, largura e altura.', true); return; }

  const { error } = await db.from('work_typologies').insert({
    work_id: currentWorkId,
    line: $('typoLine').value,
    typology_name: name,
    width_mm: width,
    height_mm: height,
    profile_color: $('typoProfileColor').value.trim() || null,
    glass_type: $('typoGlassType').value.trim() || null,
    quantity: parseInt($('typoQty').value) || 1,
    unit_price: parseFloat($('typoUnitPrice').value) || 0,
  });

  if (error) { showToast('Erro ao adicionar tipologia: ' + error.message, true); return; }

  ['typoName','typoWidth','typoHeight','typoProfileColor','typoGlassType','typoUnitPrice'].forEach(id => $(id).value = '');
  $('typoQty').value = 1;
  closeModal('modalTypology');
  showToast('Tipologia adicionada.');
  await loadTypologies(currentWorkId);
  await refreshStatsAfterEdit();
});

async function loadTypologies(workId) {
  const { data, error } = await db
    .from('work_typologies')
    .select('*')
    .eq('work_id', workId)
    .order('created_at', { ascending: false });

  if (error) { showToast('Erro ao carregar tipologias: ' + error.message, true); return; }

  const tbody = $('typologiesTableBody');
  tbody.innerHTML = '';
  $('typologiesEmpty').style.display = (data || []).length ? 'none' : 'block';

  (data || []).forEach(t => {
    const tagClass = t.line === 'Suprema' ? 'tag-suprema' : 'tag-temperado';
    const detail = t.line === 'Suprema' ? (t.profile_color || '—') : (t.glass_type || '—');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="tag ${tagClass}">${t.line}</span></td>
      <td>${escapeHtml(t.typology_name)}</td>
      <td class="mono muted">${t.width_mm} × ${t.height_mm} mm</td>
      <td class="muted">${escapeHtml(detail)}</td>
      <td class="num">${t.quantity}</td>
      <td class="num">${fmtMoney(t.unit_price)}</td>
      <td class="num">${fmtMoney(t.total_price)}</td>
      <td><button class="icon-btn" data-id="${t.id}">✕</button></td>
    `;
    tr.querySelector('.icon-btn').addEventListener('click', () => deleteTypology(t.id));
    tbody.appendChild(tr);
  });
}

async function deleteTypology(id) {
  const { error } = await db.from('work_typologies').delete().eq('id', id);
  if (error) { showToast('Erro ao excluir: ' + error.message, true); return; }
  await loadTypologies(currentWorkId);
  await refreshStatsAfterEdit();
}

// ---------- Materiais ----------
$('btnNewMaterial').addEventListener('click', () => openModal('modalMaterial'));

$('saveMaterialBtn').addEventListener('click', async () => {
  if (!currentWorkId) return;
  const description = $('matDescription').value.trim();
  if (!description) { showToast('Informe a descrição do material.', true); return; }

  const { error } = await db.from('materials').insert({
    work_id: currentWorkId,
    category: $('matCategory').value,
    description,
    color: $('matColor').value.trim() || null,
    unit: $('matUnit').value.trim() || 'un',
    quantity: parseFloat($('matQty').value) || 0,
    unit_cost: parseFloat($('matUnitCost').value) || 0,
  });

  if (error) { showToast('Erro ao adicionar material: ' + error.message, true); return; }

  ['matDescription','matColor','matQty','matUnitCost'].forEach(id => $(id).value = '');
  $('matUnit').value = 'un';
  closeModal('modalMaterial');
  showToast('Material adicionado.');
  await loadMaterials(currentWorkId);
  await refreshStatsAfterEdit();
});

async function loadMaterials(workId) {
  const { data, error } = await db
    .from('materials')
    .select('*')
    .eq('work_id', workId)
    .order('created_at', { ascending: false });

  if (error) { showToast('Erro ao carregar materiais: ' + error.message, true); return; }

  const tbody = $('materialsTableBody');
  tbody.innerHTML = '';
  $('materialsEmpty').style.display = (data || []).length ? 'none' : 'block';

  (data || []).forEach(m => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="muted">${m.category}</td>
      <td>${escapeHtml(m.description)}</td>
      <td class="muted">${escapeHtml(m.color || '—')}</td>
      <td class="num">${m.quantity}</td>
      <td class="muted">${m.unit}</td>
      <td class="num">${fmtMoney(m.unit_cost)}</td>
      <td class="num">${fmtMoney(m.total_cost)}</td>
      <td><button class="icon-btn" data-id="${m.id}">✕</button></td>
    `;
    tr.querySelector('.icon-btn').addEventListener('click', () => deleteMaterial(m.id));
    tbody.appendChild(tr);
  });
}

async function deleteMaterial(id) {
  const { error } = await db.from('materials').delete().eq('id', id);
  if (error) { showToast('Erro ao excluir: ' + error.message, true); return; }
  await loadMaterials(currentWorkId);
  await refreshStatsAfterEdit();
}

async function refreshStatsAfterEdit() {
  const { data: work } = await db.from('works').select('budget_price').eq('id', currentWorkId).single();
  await refreshWorkStats(currentWorkId, work?.budget_price || 0);
}

// ---------- Orçamento ----------
$('btnGenerateBudget').addEventListener('click', async () => {
  if (!currentWorkId) return;

  const production = parseFloat($('budgetProductionCost').value) || 0;
  const installation = parseFloat($('budgetInstallationCost').value) || 0;
  const gainPct = parseFloat($('budgetGainPct').value) || 0;
  const base = production + installation;
  const total = base * (1 + gainPct / 100);

  const { data: budget, error } = await db.from('budgets').insert({
    work_id: currentWorkId,
    production_cost: production,
    installation_cost: installation,
    gain_percentage: gainPct,
    total,
    summary: $('budgetSummary').value.trim() || null,
    status: 'rascunho',
  }).select().single();

  if (error) { showToast('Erro ao gerar orçamento: ' + error.message, true); return; }

  // Atualiza o valor da obra com o orçamento mais recente
  await db.from('works').update({ budget_price: total }).eq('id', currentWorkId);

  showToast('Orçamento gerado.');
  await loadBudgetsForWork(currentWorkId);
  await refreshStatsAfterEdit();
  await loadWorks();
  await loadAllBudgets();
});

async function loadBudgetsForWork(workId) {
  const { data, error } = await db
    .from('budgets')
    .select('*')
    .eq('work_id', workId)
    .order('created_at', { ascending: false });

  if (error) { showToast('Erro ao carregar orçamentos: ' + error.message, true); return; }

  const tbody = $('budgetsTableBody');
  tbody.innerHTML = '';
  $('budgetsEmpty').style.display = (data || []).length ? 'none' : 'block';

  (data || []).forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="muted">${new Date(b.created_at).toLocaleDateString('pt-BR')}</td>
      <td class="num">${fmtMoney(b.production_cost)}</td>
      <td class="num">${fmtMoney(b.installation_cost)}</td>
      <td class="num">${b.gain_percentage}%</td>
      <td class="num">${fmtMoney(b.total)}</td>
      <td><span class="tag tag-status status-${b.status}">${statusLabel(b.status)}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------- Pedido ----------
$('btnGenerateOrder').addEventListener('click', async () => {
  if (!currentWorkId) return;

  const { data: lastBudget, error: budgetErr } = await db
    .from('budgets')
    .select('*')
    .eq('work_id', currentWorkId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (budgetErr) { showToast('Erro ao buscar orçamento: ' + budgetErr.message, true); return; }
  if (!lastBudget) { showToast('Gere um orçamento antes de criar o pedido.', true); return; }

  const { data: mats } = await db.from('materials').select('category, total_cost').eq('work_id', currentWorkId);
  const sumCat = (cat) => (mats || []).filter(m => m.category === cat).reduce((s, m) => s + Number(m.total_cost || 0), 0);

  const profilesCost = sumCat('Perfis');
  const glassesCost = sumCat('Vidros');
  const componentsCost = sumCat('Componentes');

  const { count } = await db.from('orders').select('id', { count: 'exact', head: true }).eq('work_id', currentWorkId);
  const seq = String((count || 0) + 1).padStart(2, '0');

  const { data: work } = await db.from('works').select('code').eq('id', currentWorkId).single();
  const orderCode = `${work?.code || todayCode()}/${seq}`;

  const { error } = await db.from('orders').insert({
    work_id: currentWorkId,
    budget_id: lastBudget.id,
    code: orderCode,
    profiles_own_cost: profilesCost,
    glasses_own_cost: glassesCost,
    components_own_cost: componentsCost,
    total: lastBudget.total,
    status: 'aberto',
  });

  if (error) { showToast('Erro ao gerar pedido: ' + error.message, true); return; }

  showToast('Pedido gerado: ' + orderCode);
  await loadOrdersForWork(currentWorkId);
  await loadAllOrders();
});

async function loadOrdersForWork(workId) {
  const { data, error } = await db
    .from('orders')
    .select('*')
    .eq('work_id', workId)
    .order('created_at', { ascending: false });

  if (error) { showToast('Erro ao carregar pedidos: ' + error.message, true); return; }

  const tbody = $('ordersTableBodyDetail');
  tbody.innerHTML = '';
  $('ordersDetailEmpty').style.display = (data || []).length ? 'none' : 'block';

  (data || []).forEach(o => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono">${o.code}</td>
      <td class="num">${fmtMoney(o.profiles_own_cost)}</td>
      <td class="num">${fmtMoney(o.glasses_own_cost)}</td>
      <td class="num">${fmtMoney(o.components_own_cost)}</td>
      <td class="num">${fmtMoney(o.total)}</td>
      <td><span class="tag tag-status status-${o.status}">${statusLabel(o.status)}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------------------------------------------------------
// VISÕES GERAIS — Orçamentos e Pedidos (todas as obras)
// ---------------------------------------------------------
async function loadAllBudgets() {
  const { data, error } = await db
    .from('budgets')
    .select('*, works(name, code)')
    .order('created_at', { ascending: false });

  if (error) return;

  const tbody = $('allBudgetsTableBody');
  tbody.innerHTML = '';
  $('allBudgetsEmpty').style.display = (data || []).length ? 'none' : 'block';

  (data || []).forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(b.works?.name || '—')} <span class="muted mono">${b.works?.code || ''}</span></td>
      <td class="muted">${new Date(b.created_at).toLocaleDateString('pt-BR')}</td>
      <td class="num">${fmtMoney(b.total)}</td>
      <td><span class="tag tag-status status-${b.status}">${statusLabel(b.status)}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadAllOrders() {
  const { data, error } = await db
    .from('orders')
    .select('*, works(name, code)')
    .order('created_at', { ascending: false });

  if (error) return;

  const tbody = $('allOrdersTableBody');
  tbody.innerHTML = '';
  $('allOrdersEmpty').style.display = (data || []).length ? 'none' : 'block';

  (data || []).forEach(o => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono">${o.code}</td>
      <td>${escapeHtml(o.works?.name || '—')}</td>
      <td class="num">${fmtMoney(o.total)}</td>
      <td><span class="tag tag-status status-${o.status}">${statusLabel(o.status)}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------------------------------------------------------
// UTIL
// ---------------------------------------------------------
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
