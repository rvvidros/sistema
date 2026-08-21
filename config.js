// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// Preencha com os dados do SEU projeto no Supabase:
// 1. Acesse https://supabase.com -> seu projeto
// 2. Project Settings -> API
// 3. Copie a "Project URL" e a "anon public" key
// ============================================================

const SUPABASE_CONFIG = {
  // URL do projeto (ex: "https://abcd1234.supabase.co")
  url: "https://soplizhasxiyzolgwjmy.supabase.co",

  // Chave anon (pública) do projeto
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvcGxpemhhc3hpeXpvbGd3am15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTM0MTEsImV4cCI6MjEwMjcyOTQxMX0.3SydJMhCE-eOX-hYI7CnBPktoYGRNa6zgAA72IqMvgY",
};

// ============================================================
// CATÁLOGO DE TIPOLOGIAS (Suprema / Temperado / Gold)
// Você pode editar esta lista ou cadastrar as tipologias
// diretamente pelo Supabase (tabela typologies).
// ============================================================

const TYPOLOGY_CATALOG = [
  {
    name: "Janela de Correr 2 Folhas",
    slug: "janela-correr-2",
    category: "suprema",
    lines: ["Suprema", "Gold"],
  },
  {
    name: "Janela de Correr 4 Folhas",
    slug: "janela-correr-4",
    category: "suprema",
    lines: ["Suprema", "Gold"],
  },
  {
    name: "Janela Maxim-Ar",
    slug: "janela-maximar",
    category: "suprema",
    lines: ["Suprema", "Gold"],
  },
  {
    name: "Janela Basculante",
    slug: "janela-basculante",
    category: "suprema",
    lines: ["Suprema", "Gold"],
  },
  {
    name: "Porta de Correr 2 Folhas",
    slug: "porta-correr-2",
    category: "suprema",
    lines: ["Suprema", "Gold"],
  },
  {
    name: "Porta de Abrir 1 Folha",
    slug: "porta-abrir-1",
    category: "suprema",
    lines: ["Suprema", "Gold"],
  },
  {
    name: "Box de Vidro Temperado",
    slug: "box-temperado",
    category: "temperado",
    lines: ["Suprema", "Gold"],
  },
  {
    name: "Vidro Temperado (corte sob medida)",
    slug: "vidro-temperado-avulso",
    category: "temperado",
    lines: ["Suprema", "Gold"],
  },
  {
    name: "Guarda-Corpo de Vidro Temperado",
    slug: "guarda-corpo-temperado",
    category: "temperado",
    lines: ["Suprema", "Gold"],
  },
  {
    name: "Sacada / Envidraçamento",
    slug: "sacada",
    category: "suprema",
    lines: ["Suprema", "Gold"],
  },
];
