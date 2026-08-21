# Alô Serralheiro — Mapeamento da API (atualizado)

Base: `https://sistema.aloserralheiro.com.br` (versão `v3.53.8`)

## Autenticação

O login possui **verificação de dispositivo** (não retorna token direto):

1. `POST /api/v2/auth/login` → `{error_code: "device_verification_required", device_challenge_nonce: "..."}`
2. `GET /api/v2/auth/device-trust?nonce=<nonce>` → info do dispositivo
3. `POST /api/v2/auth/device-trust` com `{nonce, trust_long}` → retorna `access_token.accessToken`, `device_token`, `user`

**Importante:** todas as requisições autenticadas precisam dos headers:
- `Authorization: Bearer <accessToken>`
- `X-Device: <device_token>`
- `User-Agent`, `Origin` e `Referer` de navegador (sem eles retorna 403)

A versão do servidor vem no header de resposta `alo-serralheiro-version`.

## Endpoints de Dados

| Recurso | Endpoint | Método | Notas |
|---|---|---|---|
| Obras | `/api/v2/works` | GET | `list`, `data` (dashboard), `form.users` |
| Obra (detalhe) | `/api/v2/works/{uuid}` | GET | `metadata` (has_work_*), `model` |
| Tipologias da obra | `/api/v2/works/{uuid}/typologies` | GET | `list`, `form` |
| Params de tipologia | `/api/v2/works/{uuid}/typologies/fill/{slug}` | GET | `model` (inputs), `form.typology` (+ lines) |
| Lista de compras (custo) | `/api/v2/works/{uuid}/costs` | GET | `list` (52+ itens: productionable/colorable/barsizable) |
| Lista de materiais (itens) | `/api/v2/works/{uuid}/items` | GET | `list.work_material_lists.{work_components, work_glasses, work_profiles}` |
| Orçamentos | `/api/v2/works/{uuid}/budgets` | GET | `list` (com budget_components/glasses/profiles/etc.) |
| Criar orçamento | `/api/v2/works/{uuid}/budgets` | POST | payload `{work_budget: {...}}` |
| Atualizar orçamento | `/api/v2/works/{uuid}/budgets/{budget_uuid}` | PUT | payload `{work_budget: {...}}` |
| Gerar venda | `/api/v2/works/{uuid}/budgets/{budget_uuid}/orders` | POST | payload `{order: {...}}` |
| Remover venda | `/api/v2/works/{uuid}/budgets/{budget_uuid}/orders?action=delete` | POST | |
| Otimização de corte | `/api/v2/works/{uuid}/optimizations` | GET | |
| Revisões | `/api/v2/works/{uuid}/reviews` | GET | |
| Pedidos de venda | `/api/v2/work-orders` | GET | `list` (code, total, work, user, account_client) |
| Clientes | `/api/v2/clients` | GET | `list` |
| Novo cliente | `/api/v2/clients/create` | — | dados do form |
| Nova obra | `/api/v2/works/create` | — | dados do form |
| Dependências de tipologia | `/api/v2/works/typologies/form-dependencies` | GET | `materials` (components 2530, glasses 243, profiles 3252), `specs`, `meta`, `version` |
| Busca de tipologias | `/api/v2/works/typologies/search` | GET | |

## Catálogos de Preços (essenciais para replicar cálculos)

| Recurso | Endpoint | Método | Tamanho | Campos principais |
|---|---|---|---|---|
| Componentes | `/api/v2/account/costs/components` | GET | 4006 | `component_id/code/name`, `component_color_*`, `suggested_pieces`, `suggested_price`, `component_line_id`, `measurement_*`, `cost` |
| Vidros | `/api/v2/account/costs/glasses` | GET | 243 | `glass_id/code/name`, `glass_type_id`, `glass_thick_id`, `suggested_price`, `cost` |
| Perfis | `/api/v2/account/costs/profiles?type=normal&profile-color=<id>` | GET | 162+/cor | `profile_id/code/name`, `profile_specific_weight`, `profile_color_*`, `profile_bar_size_*`, `suggested_price`, `is_weight_measured`, `is_size_measured` |
| Categorias de perfil | `/api/v2/account/costs/profile-categories` | GET | | |

## Configurações da Conta

| Recurso | Endpoint | Campos |
|---|---|---|
| Config. orçamento | `/api/v2/account/options/budgets` | show_unit_value, show_area, show_weight, show_measurements, etc. |
| Config. geral | `/api/v2/account/settings` | `form` (glass_types, profile_colors, frames, tailpieces, component_colors), `list` (pinned_*, profile_measurement, slack) |
| Dados de orçamento | `/api/v2/account/budgets-data` | |
| Tipologias da conta | `/api/v2/account/typologies` | `items`, `meta` |
| Novos recursos (form) | `/api/v2/works/create` e `/api/v2/clients/create` | retornam os campos do formulário |

## Estrutura de uma Tipologia de Obra

```
work_typologies: {
  id, uuid, work_id, typology_id, line_id, reinforcement,
  width, height, profile_color, component_color, frame, frame_cut,
  tailpiece, slack_width, slack_height, glass_type, glass_thick,
  observation, local, quantity, order,
  work_glasses: ["Temperado Incolor 6mm"],
  typology: {code, name, slug, category, ...},
  typology_line, line, shortcuts, work_typology_glasses
}
```

## Estrutura de um Orçamento

```
budget: {
  code, production_cost, production_cost_type, installation_cost,
  installation_cost_type, gain_percentage, tax_percentage,
  components_own_cost, glasses_own_cost, profiles_own_cost,
  shipping_cost, global_discount_in_money, global_discount_in_percent,
  is_payment_conditions_to_define, delivery_date, date,
  summary (HTML), total,
  budget_components[49], budget_glasses[5], budget_profiles[31],
  budget_payment_conditions, budget_work_typologies[6]
}
```

## Estrutura da Lista de Compras (items)

```
list.work_material_lists: {
  work_components[49]: {uuid, purchase_quantity, required_quantity, pieces, quantity, component_id, component_color_id, component},
  work_glasses[5],
  work_profiles[31]
}
form: {components, component_colors, glasses, profiles, profile_colors, default_*}
```

## Formas de Pagamento (para orçamento/venda)

`work_order_payment_methods`: A Vista (`avista`), Boleto (`boleto`), Pix (`pix`), Cartão de Crédito (`cartao_credito`), Cheque (`cheque`).

## Endpoints Auxiliares de Auth/Conta (menos críticos)

`/api/v2/auth/{activate,password-recovery,2fa/challenge/...}`, `/api/v2/account/{billing,business-data,credits,fin,plans,subscriptions,employees,roles,referrals,plannings,slices,maintenances,coupon-code}`, `/api/v2/user/{profile,security,...}`, `/api/v2/account/plannings/{uuid}/works`.

---

## Observações para o sistema interno

- Os catálogos de preço (`costs/components`, `costs/glasses`, `costs/profiles`) são os **dados essenciais** para replicar o cálculo de orçamento no Supabase.
- O `form-dependencies` traz o catálogo de materiais completo usado no formulário de tipologias.
- `items` já resolve a lista de compras com quantidades necessárias por obra (perfis, vidros e componentes).
- Existe um endpoint de otimização de corte (`optimizations`) que influencia os valores finais.
