// ============================================================
// ALÔ SERRALHEIRO - SISTEMA INTERNO
// Aplicação Vue 3 + Vuetify 3 + Supabase
// ============================================================

const { createApp } = Vue;

const app = createApp({
  data() {
    return {
      // ---------- Auth ----------
      supabase: null,
      user: null,
      login: { email: "", password: "" },
      showPass: false,
      resetMode: false,
      loginError: "",
      loading: false,

      // ---------- Navegação ----------
      currentView: "dashboard",
      workTab: "typologies",
      menuItems: [
        { view: "dashboard", label: "Início", icon: "mdi-view-dashboard-outline" },
        { view: "clients", label: "Clientes", icon: "mdi-account-group-outline" },
        { view: "works", label: "Obras", icon: "mdi-office-building-marker-outline" },
      ],

      // ---------- Dados ----------
      clients: [],
      works: [],
      workTypologies: [],
      materials: [],
      budgets: [],
      orders: [],
      typologyCatalog: [],
      currentWork: null,

      // ---------- Buscas / filtros ----------
      clientSearch: "",
      worksClientFilter: null,

      // ---------- Diálogos ----------
      clientDialog: false,
      workDialog: false,
      typologyDialog: false,
      materialDialog: false,
      budgetDialog: false,

      clientForm: {},
      workForm: {},
      typologyForm: {},
      materialForm: {},
      budgetForm: {},

      // ---------- UI ----------
      snackbar: { show: false, message: "", color: "success" },

      rules: {
        required: (v) => !!v || "Campo obrigatório",
      },

      materialCategories: [
        "Perfis (marcos, folhas e arremates)",
        "Componentes e ferragens",
        "Vidros",
        "Vedantes e acessórios",
        "Outros",
      ],

      workStatusOptions: ["em_aberto", "em_andamento", "concluida", "cancelada"],
    };
  },

  computed: {
    isAuthenticated() {
      return !!this.user;
    },
    userEmail() {
      return this.user ? this.user.email : "";
    },
    userInitials() {
      if (!this.user || !this.user.email) return "?";
      const parts = this.user.email.split("@")[0].split(/[._-]/);
      return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?";
    },

    statsCards() {
      const budgetsCount = this.budgets.length;
      const ordersCount = this.orders.length;
      const revenue = this.orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      return [
        { label: "Clientes", value: this.clients.length, icon: "mdi-account-group", color: "primary" },
        { label: "Obras", value: this.works.length, icon: "mdi-office-building", color: "secondary" },
        { label: "Orçamentos", value: budgetsCount, icon: "mdi-file-document", color: "teal" },
        { label: "Vendas (R$)", value: this.money(revenue), icon: "mdi-sale", color: "green" },
      ];
    },

    recentWorks() {
      return [...this.works].slice(0, 8).map((w) => ({
        ...w,
        client_name: w.client ? w.client.name : "-",
      }));
    },

    filteredClients() {
      const q = this.clientSearch.toLowerCase();
      if (!q) return this.clients;
      return this.clients.filter((c) =>
        [c.name, c.phone, c.email].some((v) => v && String(v).toLowerCase().includes(q))
      );
    },

    filteredWorks() {
      if (!this.worksClientFilter) return this.works;
      return this.works.filter((w) => w.client_id === this.worksClientFilter);
    },

    materialsTotal() {
      return this.materials.reduce((s, m) => s + (Number(m.total_cost) || 0), 0);
    },

    budgetFormPreviewTotal() {
      const prod = Number(this.budgetForm.production_cost) || 0;
      const inst = Number(this.budgetForm.installation_cost) || 0;
      const gain = (Number(this.budgetForm.gain_percentage) || 0) / 100;
      return (prod + inst) * (1 + gain);
    },

    selectedCatalogTypology() {
      return this.typologyCatalog.find((t) => t.id === this.typologyForm.typology_id);
    },

    clientHeaders() {
      return [
        { title: "Nome", key: "name" },
        { title: "Telefone", key: "phone" },
        { title: "E-mail", key: "email" },
        { title: "Obras", key: "works_counter" },
        { title: "", key: "actions", sortable: false, align: "end" },
      ];
    },

    workHeaders() {
      return [
        { title: "Código", key: "code" },
        { title: "Obra", key: "name" },
        { title: "Cliente", key: "client_name" },
        { title: "Status", key: "status" },
        { title: "Valor", key: "budget_price" },
        { title: "", key: "actions", sortable: false, align: "end" },
      ];
    },

    typologyHeaders() {
      return [
        { title: "Tipologia", key: "typology_name" },
        { title: "Dimensões (L x A)", key: "dimensions" },
        { title: "Cor do Perfil", key: "profile_color" },
        { title: "Vidro", key: "glass_type" },
        { title: "", key: "actions", sortable: false, align: "end" },
      ];
    },

    materialHeaders() {
      return [
        { title: "Categoria", key: "category" },
        { title: "Material", key: "name" },
        { title: "Cor", key: "color" },
        { title: "Quantidade", key: "quantity" },
        { title: "Custo Unit.", key: "unit_cost" },
        { title: "Total", key: "total_cost" },
        { title: "", key: "actions", sortable: false, align: "end" },
      ];
    },

    budgetHeaders() {
      return [
        { title: "Código", key: "code" },
        { title: "Produção", key: "production_cost" },
        { title: "Instalação", key: "installation_cost" },
        { title: "Ganho", key: "gain_percentage" },
        { title: "Total", key: "total" },
        { title: "", key: "actions", sortable: false, align: "end" },
      ];
    },

    orderHeaders() {
      return [
        { title: "Código", key: "code" },
        { title: "Componentes", key: "components_own_cost" },
        { title: "Vidros", key: "glasses_own_cost" },
        { title: "Perfis", key: "profiles_own_cost" },
        { title: "Total", key: "total" },
        { title: "", key: "actions", sortable: false, align: "end" },
      ];
    },

    recentHeaders() {
      return [
        { title: "Código", key: "code" },
        { title: "Obra", key: "name" },
        { title: "Cliente", key: "client_name" },
        { title: "Valor", key: "budget_price" },
      ];
    },
  },

  methods: {
    // ---------- Utilidades ----------
    money(v) {
      const n = Number(v) || 0;
      return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    },

    statusLabel(status) {
      return {
        em_aberto: "Em aberto",
        em_andamento: "Em andamento",
        concluida: "Concluída",
        cancelada: "Cancelada",
      }[status] || status || "-";
    },

    statusColor(status) {
      return {
        em_aberto: "info",
        em_andamento: "warning",
        concluida: "success",
        cancelada: "error",
      }[status] || "default";
    },

    notify(message, color = "success") {
      this.snackbar = { show: true, message, color };
    },

    // ---------- Auth ----------
    async initSupabase() {
      if (!SUPABASE_CONFIG.url.startsWith("http")) {
        this.loginError =
          "Configure as credenciais do Supabase no arquivo config.js";
        return;
      }
      if (!window.supabase) {
        this.loginError =
          "A biblioteca do Supabase não carregou (verifique sua conexão/bloqueador de scripts).";
        return;
      }
      this.supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

      const { data } = await this.supabase.auth.getSession();
      if (data.session) {
        this.user = data.session.user;
        await this.loadAll();
      } else {
        this.supabase.auth.onAuthStateChange((_event, session) => {
          this.user = session ? session.user : null;
          if (this.user) this.loadAll();
        });
      }
    },

    async doLogin() {
      this.loading = true;
      this.loginError = "";
      try {
        if (!this.supabase) {
          throw new Error(
            "Supabase não inicializado. Verifique o config.js e sua conexão."
          );
        }
        const { error } = await this.supabase.auth.signInWithPassword({
          email: this.login.email,
          password: this.login.password,
        });
        if (error) throw error;
      } catch (e) {
        this.loginError = e.message || "Falha no login. Verifique e-mail e senha.";
      } finally {
        this.loading = false;
      }
    },

    async doResetPassword() {
      this.loading = true;
      this.loginError = "";
      try {
        const { error } = await this.supabase.auth.resetPasswordForEmail(this.login.email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        this.notify("Link de redefinição enviado para o seu e-mail.", "info");
        this.resetMode = false;
      } catch (e) {
        this.loginError = e.message || "Não foi possível enviar o link.";
      } finally {
        this.loading = false;
      }
    },

    async doLogout() {
      await this.supabase.auth.signOut();
      this.user = null;
      this.currentView = "dashboard";
    },

    navigate(view) {
      if (view === "works") this.loadWorks();
      if (view === "clients") this.loadClients();
      this.currentView = view;
    },

    // ---------- Carga de dados ----------
    async loadAll() {
      await Promise.all([this.loadClients(), this.loadWorks(), this.loadCatalog()]);
    },

    async loadClients() {
      const { data, error } = await this.supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return this.notify(error.message, "error");
      this.clients = data || [];
    },

    async loadWorks() {
      const { data, error } = await this.supabase
        .from("works")
        .select("*, client:clients(*)")
        .order("created_at", { ascending: false });
      if (error) return this.notify(error.message, "error");
      this.works = (data || []).map((w) => ({ ...w, client_name: w.client ? w.client.name : "-" }));
    },

    async loadCatalog() {
      const { data: typologies, error } = await this.supabase
        .from("typologies")
        .select("*, lines:typology_lines(*)");
      if (error) return;
      if (typologies && typologies.length) {
        this.typologyCatalog = typologies;
      } else {
        this.typologyCatalog = (window.TYPOLOGY_CATALOG || []).map((t, i) => ({
          id: `local-${i}`,
          ...t,
          lines: (t.lines || []).map((n, j) => ({ id: `local-line-${i}-${j}`, name: n })),
        }));
      }
    },

    async loadWorkDetail(work) {
      this.currentWork = work;
      this.workTab = "typologies";
      await Promise.all([
        this.loadTypologies(),
        this.loadMaterials(),
        this.loadBudgets(),
        this.loadOrders(),
      ]);
    },

    async loadTypologies() {
      const { data, error } = await this.supabase
        .from("work_typologies")
        .select("*, typology:typologies(*), line:typology_lines(*)")
        .eq("work_id", this.currentWork.id);
      if (error) return this.notify(error.message, "error");
      this.workTypologies = (data || []).map((t) => ({
        ...t,
        typology_name: t.typology ? t.typology.name : (t.params && t.params.name) || "-",
        line_name: t.line ? t.line.name : "-",
      }));
    },

    async loadMaterials() {
      const { data, error } = await this.supabase
        .from("materials")
        .select("*")
        .eq("work_id", this.currentWork.id);
      if (error) return this.notify(error.message, "error");
      this.materials = data || [];
    },

    async loadBudgets() {
      const { data, error } = await this.supabase
        .from("budgets")
        .select("*")
        .eq("work_id", this.currentWork.id)
        .order("created_at", { ascending: false });
      if (error) return this.notify(error.message, "error");
      this.budgets = data || [];
    },

    async loadOrders() {
      const { data, error } = await this.supabase
        .from("orders")
        .select("*")
        .eq("work_id", this.currentWork.id)
        .order("created_at", { ascending: false });
      if (error) return this.notify(error.message, "error");
      this.orders = data || [];
    },

    // ---------- Clientes ----------
    openClientDialog(item) {
      this.clientForm = item ? { ...item } : { name: "", phone: "", email: "", address: "", notes: "" };
      this.clientDialog = true;
    },

    async saveClient() {
      this.loading = true;
      try {
        if (this.clientForm.id) {
          const { id, works_counter, transactions_counter, created_at, updated_at, ...payload } = this.clientForm;
          const { error } = await this.supabase.from("clients").update(payload).eq("id", id);
          if (error) throw error;
          this.notify("Cliente atualizado!");
        } else {
          const { error } = await this.supabase.from("clients").insert(this.clientForm);
          if (error) throw error;
          this.notify("Cliente criado!");
        }
        this.clientDialog = false;
        await this.loadClients();
      } catch (e) {
        this.notify(e.message, "error");
      } finally {
        this.loading = false;
      }
    },

    async deleteClient(item) {
      if (!confirm(`Excluir o cliente "${item.name}"?`)) return;
      const { error } = await this.supabase.from("clients").delete().eq("id", item.id);
      if (error) return this.notify(error.message, "error");
      this.notify("Cliente excluído.", "info");
      this.loadClients();
    },

    selectClient(_event, { item }) {
      this.worksClientFilter = item.id;
      this.navigate("works");
    },

    // ---------- Obras ----------
    openWorkDialog(item) {
      this.workForm = item
        ? { ...item, client_id: item.client_id || null }
        : { client_id: null, name: "", code: "", status: "em_aberto", budget_price: 0, notes: "" };
      this.workDialog = true;
    },

    async saveWork() {
      this.loading = true;
      try {
        if (this.workForm.id) {
          const { id, client, client_name, created_at, updated_at, ...payload } = this.workForm;
          const { error } = await this.supabase.from("works").update(payload).eq("id", id);
          if (error) throw error;
          this.notify("Obra atualizada!");
        } else {
          if (!this.workForm.code) this.workForm.code = await this.nextWorkCode();
          const { error } = await this.supabase.from("works").insert(this.workForm);
          if (error) throw error;
          this.notify("Obra criada!");
        }
        this.workDialog = false;
        await this.loadWorks();
      } catch (e) {
        this.notify(e.message, "error");
      } finally {
        this.loading = false;
      }
    },

    async nextWorkCode() {
      const today = new Date();
      const y = String(today.getFullYear()).slice(2);
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");
      const { data, error } = await this.supabase
        .from("works")
        .select("code")
        .like("code", `${y}${m}${d}-%`)
        .order("code", { ascending: false })
        .limit(1);
      if (error) return `${y}${m}${d}-001`;
      const last = data && data.length ? data[0].code : null;
      const num = last ? parseInt(last.split("-")[1], 10) + 1 : 1;
      return `${y}${m}${d}-${String(num).padStart(3, "0")}`;
    },

    async deleteWork(item) {
      if (!confirm(`Excluir a obra "${item.name}"?`)) return;
      const { error } = await this.supabase.from("works").delete().eq("id", item.id);
      if (error) return this.notify(error.message, "error");
      this.notify("Obra excluída.", "info");
      this.loadWorks();
    },

    async openWork(_event, { item }) {
      await this.loadWorkDetail(item);
      this.currentView = "workDetail";
    },

    backToWorks() {
      this.currentView = "works";
      this.currentWork = null;
      this.workTypologies = [];
      this.materials = [];
      this.budgets = [];
      this.orders = [];
    },

    // ---------- Tipologias ----------
    openTypologyDialog(item) {
      this.typologyForm = item
        ? {
            ...item,
            typology_id: item.typology_id,
            line_id: item.line_id || null,
          }
        : { work_id: this.currentWork.id, quantity: 1, width: null, height: null, profile_color: "", glass_type: "", notes: "" };
      this.typologyDialog = true;
    },

    async saveTypology() {
      this.loading = true;
      try {
        const payload = { ...this.typologyForm };
        if (payload.id) {
          const { id, typology, line, typology_name, line_name, created_at, ...rest } = payload;
          const { error } = await this.supabase.from("work_typologies").update(rest).eq("id", id);
          if (error) throw error;
        } else {
          const { error } = await this.supabase.from("work_typologies").insert(payload);
          if (error) throw error;
        }
        this.typologyDialog = false;
        await this.loadTypologies();
        this.notify("Tipologia salva!");
      } catch (e) {
        this.notify(e.message, "error");
      } finally {
        this.loading = false;
      }
    },

    async removeTypology(item) {
      if (!confirm("Remover esta tipologia da obra?")) return;
      const { error } = await this.supabase.from("work_typologies").delete().eq("id", item.id);
      if (error) return this.notify(error.message, "error");
      this.notify("Tipologia removida.", "info");
      this.loadTypologies();
    },

    // ---------- Materiais ----------
    openMaterialDialog(item) {
      this.materialForm = item
        ? { ...item }
        : { work_id: this.currentWork.id, category: this.materialCategories[0], name: "", color: "", quantity: 1, unit: "un", unit_cost: 0, notes: "" };
      this.materialDialog = true;
    },

    async saveMaterial() {
      this.loading = true;
      try {
        const payload = { ...this.materialForm };
        payload.unit_cost = Number(payload.unit_cost) || 0;
        payload.quantity = Number(payload.quantity) || 0;
        payload.total_cost = payload.unit_cost * payload.quantity;
        if (payload.id) {
          const { id, created_at, ...rest } = payload;
          const { error } = await this.supabase.from("materials").update(rest).eq("id", id);
          if (error) throw error;
        } else {
          const { error } = await this.supabase.from("materials").insert(payload);
          if (error) throw error;
        }
        this.materialDialog = false;
        await this.loadMaterials();
        this.notify("Material salvo!");
      } catch (e) {
        this.notify(e.message, "error");
      } finally {
        this.loading = false;
      }
    },

    async deleteMaterial(item) {
      if (!confirm("Excluir este material?")) return;
      const { error } = await this.supabase.from("materials").delete().eq("id", item.id);
      if (error) return this.notify(error.message, "error");
      this.notify("Material excluído.", "info");
      this.loadMaterials();
    },

    // Cálculo simplificado da lista de compras a partir das tipologias.
    // Aqui você pode substituir pela sua fórmula real (ou chamar um backend/GAS).
    async calcMaterials() {
      if (!this.workTypologies.length) {
        return this.notify("Adicione tipologias antes de calcular.", "warning");
      }
      this.loading = true;
      try {
        await this.supabase.from("materials").delete().eq("work_id", this.currentWork.id);
        const rows = [];
        for (const t of this.workTypologies) {
          const w = Number(t.width) || 1000;
          const h = Number(t.height) || 1000;
          const qty = Number(t.quantity) || 1;
          const perimeter = 2 * (w + h) / 1000; // metros lineares
          const area = (w * h) / 1000000; // m²

          if ((t.params && t.params.name) || (t.typology && t.typology.name)) {
            const name = (t.typology && t.typology.name) || (t.params && t.params.name) || "Perfil";
            rows.push({
              work_id: this.currentWork.id,
              category: "Perfis (marcos, folhas e arremates)",
              name: `Perfis - ${name}`,
              color: t.profile_color || "Branco Brilhante RAL9003",
              unit: "m",
              quantity: Math.round(perimeter * qty * 100) / 100,
              unit_cost: 0,
              total_cost: 0,
            });
            rows.push({
              work_id: this.currentWork.id,
              category: "Vidros",
              name: `Vidro - ${name}`,
              color: t.glass_type || "Temperado 8mm",
              unit: "m²",
              quantity: Math.round(area * qty * 100) / 100,
              unit_cost: 0,
              total_cost: 0,
            });
            rows.push({
              work_id: this.currentWork.id,
              category: "Componentes e ferragens",
              name: `Kit de ferragens - ${name}`,
              color: "",
              unit: "un",
              quantity: qty,
              unit_cost: 0,
              total_cost: 0,
            });
          }
        }
        if (rows.length) {
          const { error } = await this.supabase.from("materials").insert(rows);
          if (error) throw error;
        }
        await this.loadMaterials();
        this.notify("Lista de compras calculada! Preencha os custos unitários.");
      } catch (e) {
        this.notify(e.message, "error");
      } finally {
        this.loading = false;
      }
    },

    // ---------- Orçamentos ----------
    openBudgetDialog() {
      const total = this.materialsTotal;
      this.budgetForm = {
        work_id: this.currentWork.id,
        production_cost: Math.round(total * 100) / 100,
        installation_cost: 0,
        gain_percentage: 0,
      };
      this.budgetDialog = true;
    },

    budgetTotal(b) {
      const prod = Number(b.production_cost) || 0;
      const inst = Number(b.installation_cost) || 0;
      const gain = (Number(b.gain_percentage) || 0) / 100;
      return (prod + inst) * (1 + gain);
    },

    async saveBudget() {
      this.loading = true;
      try {
        const code = await this.nextWorkCode();
        const summary = {
          materials_count: this.materials.length,
          materials_total: this.materialsTotal,
        };
        const payload = {
          work_id: this.currentWork.id,
          code,
          production_cost: Number(this.budgetForm.production_cost) || 0,
          installation_cost: Number(this.budgetForm.installation_cost) || 0,
          gain_percentage: Number(this.budgetForm.gain_percentage) || 0,
          summary,
          components: this.materials,
          status: "rascunho",
        };
        const { data, error } = await this.supabase.from("budgets").insert(payload).select().single();
        if (error) throw error;

        await this.supabase.from("works").update({ budget_price: this.budgetTotal(payload) }).eq("id", this.currentWork.id);
        this.currentWork.budget_price = this.budgetTotal(payload);

        this.budgetDialog = false;
        await Promise.all([this.loadBudgets(), this.loadWorks()]);
        this.notify(`Orçamento ${code} gerado!`);
      } catch (e) {
        this.notify(e.message, "error");
      } finally {
        this.loading = false;
      }
    },

    async deleteBudget(item) {
      if (!confirm(`Excluir o orçamento "${item.code}"?`)) return;
      const { error } = await this.supabase.from("budgets").delete().eq("id", item.id);
      if (error) return this.notify(error.message, "error");
      this.notify("Orçamento excluído.", "info");
      this.loadBudgets();
    },

    // ---------- Vendas ----------
    async generateOrderFromBudget(budget) {
      if (!confirm(`Gerar venda a partir do orçamento "${budget.code}"?`)) return;
      this.loading = true;
      try {
        const components = Array.isArray(budget.components) ? budget.components : [];
        const profiles = components.filter((c) => c.category && c.category.includes("Perfis"));
        const glasses = components.filter((c) => c.category && c.category.includes("Vidro"));
        const others = components.filter(
          (c) => !(c.category && (c.category.includes("Perfis") || c.category.includes("Vidro")))
        );
        const sum = (arr) => arr.reduce((s, c) => s + (Number(c.total_cost) || 0), 0);

        const payload = {
          work_id: this.currentWork.id,
          budget_id: budget.id,
          code: await this.nextWorkCode(),
          profiles_own_cost: sum(profiles),
          glasses_own_cost: sum(glasses),
          components_own_cost: sum(others),
          total: this.budgetTotal(budget),
          status: "gerado",
          items: components,
        };
        const { error } = await this.supabase.from("orders").insert(payload);
        if (error) throw error;
        await this.loadOrders();
        await this.supabase.from("budgets").update({ status: "aprovado" }).eq("id", budget.id);
        await this.loadBudgets();
        this.notify(`Venda ${payload.code} gerada!`);
      } catch (e) {
        this.notify(e.message, "error");
      } finally {
        this.loading = false;
      }
    },

    async deleteOrder(item) {
      if (!confirm(`Excluir a venda "${item.code}"?`)) return;
      const { error } = await this.supabase.from("orders").delete().eq("id", item.id);
      if (error) return this.notify(error.message, "error");
      this.notify("Venda excluída.", "info");
      this.loadOrders();
    },
  },

  async mounted() {
    await this.initSupabase();
  },
});

const vuetify = Vuetify.createVuetify({
  theme: {
    defaultTheme: "light",
    themes: {
      light: {
        colors: {
          primary: "#1565c0",
          secondary: "#7b1fa2",
          background: "#f5f7fa",
        },
      },
    },
  },
});

app.use(vuetify);
app.mount("#app");
