// =========================================================
// CONFIGURAÇÃO DO SUPABASE
// =========================================================
// 1. Vá em Supabase > Project Settings > API
// 2. Copie "Project URL" e cole em SUPABASE_URL
// 3. Copie "anon public" key e cole em SUPABASE_ANON_KEY
//    (NUNCA use a "service_role" key aqui — ela é secreta
//    e não pode ficar em código front-end público)
// =========================================================

const SUPABASE_URL = "https://soplizhasxiyzolgwjmy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvcGxpemhhc3hpeXpvbGd3am15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTM0MTEsImV4cCI6MjEwMjcyOTQxMX0.3SydJMhCE-eOX-hYI7CnBPktoYGRNa6zgAA72IqMvgY";

// Não precisa mexer daqui pra baixo
window.APP_CONFIG = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
};
