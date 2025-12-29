# BiteBoard Backend API

Backend do BiteBoard construído com NestJS + Prisma. Este documento descreve todas as rotas HTTP expostas pelo serviço, payloads esperados e respostas retornadas.

## Sumário

- [Visão Geral](#visão-geral)
- [Ambiente e Execução](#ambiente-e-execução)
- [Autenticação](#autenticação)
- [Conversas e Webhook](#conversas-e-webhook)
- [Clientes](#clientes)
- [Menu](#menu)
- [Pedidos](#pedidos)
- [Promoções](#promoções)
- [Dashboard](#dashboard)
- [Financeiro](#financeiro)
- [Eventos em Tempo Real](#eventos-em-tempo-real)

---

## Visão Geral

- **Base URL (dev):** `http://localhost:3000`
- **Banco:** PostgreSQL (via Prisma)
- **Autenticação:** JWT (bearer token)  
  - O token inclui `sub` e `restaurantId` com o `id` do restaurante.

## Ambiente e Execução

1. Instale dependências:
   ```bash
   npm install
   ```
2. Variáveis de ambiente obrigatórias:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN` (opcional, padrão `1d`)
   - `EVOLUTION_API_URL`
   - `EVOLUTION_API_KEY`
   - `EVOLUTION_INSTANCE_NAME` (opcional, mas recomendável)
3. Migrações Prisma:
   ```bash
   npx prisma migrate deploy
   ```
4. Executar em desenvolvimento:
   ```bash
   npm run start:dev
   ```

---

## Autenticação

### POST `/auth/register`
Cria um restaurante e retorna um JWT.

**Body**
```json
{
  "name": "Restaurante Exemplo",
  "email": "contato@exemplo.com",
  "password": "segredo123",
  "phone": "31999998888"
}
```

**Resposta 201**
```json
{
  "accessToken": "jwt-token",
  "tokenType": "Bearer",
  "expiresIn": "1d",
  "restaurant": {
    "id": "uuid",
    "name": "Restaurante Exemplo",
    "email": "contato@exemplo.com",
    "phone": "31999998888",
    "createdAt": "2025-11-13T12:00:00.000Z"
  }
}
```

### POST `/auth/login`
Autentica um restaurante existente.

**Body**
```json
{
  "email": "contato@exemplo.com",
  "password": "segredo123"
}
```

**Resposta 200** – mesmo formato de `/auth/register`.

---

## Conversas e Webhook

### GET `/conversations`
Lista conversas ordenadas pela última mensagem.

| Query        | Tipo   | Descrição                                |
|--------------|--------|-------------------------------------------|
| `status`     | enum `active` \| `closed` | Filtra por status      |
| `page`       | número (string) | Default `1`                      |
| `limit`      | número (string) | Default `20`                     |

**Resposta 200**
```json
{
  "conversations": [
    {
      "id": "+5531999998888",
      "customerName": "Maria",
      "customerPhone": "+5531999998888",
      "lastMessage": "Olá, tudo bem?",
      "lastMessageTime": "2025-11-13T12:30:45.000Z",
      "unreadCount": 2,
      "status": "active"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### GET `/conversations/:phone/messages`
Retorna o histórico de mensagens de um telefone (ID é o número com DDI/DDD, ex. `+5531999998888`).

| Query   | Tipo            | Descrição                                            |
|---------|-----------------|------------------------------------------------------|
| `limit` | número (string) | Default `50`                                         |
| `before`| ISO datetime    | Mensagens anteriores à data/hora fornecida           |
| `after` | ISO datetime    | Mensagens posteriores à data/hora fornecida          |

**Resposta 200**
```json
{
  "conversation": {
    "id": "+5531999998888",
    "customerName": "Maria",
    "customerPhone": "+5531999998888"
  },
  "messages": [
    {
      "id": "uuid",
      "conversationId": "+5531999998888",
      "text": "Olá!",
      "sender": "customer",
      "status": "received",
      "messageType": "text",
      "timestamp": "2025-11-13T12:30:45.000Z",
      "whatsappMessageId": "wamid.HBgMM..."
    }
  ],
  "hasMore": false
}
```

### POST `/webhook/evolution`
Endpoint para receber webhooks do Evolution API.  
**Body:** payload bruto fornecido pelo Evolution (qualquer formato).  
**Resposta 200**
```json
{ "success": true, "processed": 1 }
```

- Mensagens duplicadas (mesmo `whatsappMessageId`) são ignoradas.
- Telefones são normalizados para `+<código><número>`.

---

## Clientes

### POST `/customers`
```json
{
  "name": "João",
  "phone": "31999998888"
}
```
**Resposta 201:** cliente criado.

### GET `/customers`
Retorna todos os clientes cadastrados.

### GET `/customers/:id`
Retorna dados do cliente (`id` UUID).

---

## Menu

### POST `/menu`
Cria um novo item do cardápio. O sistema automaticamente copia o `priceReal` para `priceCurrent`.

```json
{
  "name": "Pizza Margherita",
  "description": "Mussarela, tomate e manjericão",
  "priceReal": 39.9,
  "category": "Pizzas",
  "image": "https://cdn/pizza.jpg",
  "available": true
}
```

**Resposta 201**
```json
{
  "id": "uuid",
  "name": "Pizza Margherita",
  "description": "Mussarela, tomate e manjericão",
  "priceReal": 39.9,
  "priceCurrent": 39.9,
  "category": "Pizzas",
  "image": "https://cdn/pizza.jpg",
  "available": true
}
```

### GET `/menu`
Retorna todos os itens com seus preços atuais (que podem estar reduzidos por promoção).

**Resposta 200**
```json
[
  {
    "id": "uuid",
    "name": "Pizza Margherita",
    "priceReal": 39.9,
    "priceCurrent": 35.9,
    "category": "Pizzas",
    "description": "...",
    "image": "...",
    "available": true
  }
]
```

### GET `/menu/categories`
Retorna lista de categorias únicas.

**Resposta 200**
```json
{
  "categories": ["Bebidas", "Pizzas", "Sobremesas"]
}
```

### GET `/menu/:id`
Retorna item específico com preços atualizados.

### PATCH `/menu/:id`
Atualiza campos do item. Campos opcionais: `name`, `description`, `priceReal`, `category`, `image`, `available`.

**Body**
```json
{
  "priceReal": 45.0,
  "available": true
}
```

### DELETE `/menu/:id`
Remove item do cardápio.

---

## Pedidos

### POST `/orders`
Cria um novo pedido. O preço é capturado automaticamente do item do cardápio no momento da criação (respeitando descontos/promoções ativas).

**Body**
```json
{
  "customerName": "Marina",
  "customerPhone": "31988887777",
  "items": [
    {
      "menuItemId": "uuid-do-item",
      "quantity": 2,
      "notes": "Sem cebola"
    },
    {
      "menuItemId": "uuid-outro-item",
      "quantity": 1
    }
  ]
}
```

**Resposta 201**
```json
{
  "id": "uuid",
  "customerName": "Marina",
  "customerPhone": "31988887777",
  "total": 71.8,
  "status": "NEW",
  "items": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "menuItemId": "uuid-do-item",
      "name": "Pizza Margherita",
      "quantity": 2,
      "price": 35.9,
      "notes": "Sem cebola",
      "menuItem": {
        "id": "uuid",
        "name": "Pizza Margherita",
        "priceReal": 39.9,
        "priceCurrent": 35.9,
        "category": "Pizzas",
        "available": true
      }
    }
  ],
  "createdAt": "2025-12-29T...",
  "updatedAt": "2025-12-29T..."
}
```

**Observações:**
- Se `menuItemId` for informado, o sistema busca o item e usa seu `priceCurrent` (preço com desconto se houver promoção)
- O `total` é calculado automaticamente como a soma de `quantity × price` de todos os itens
- Status padrão é `NEW`

### GET `/orders`
Lista todos os pedidos com filtros opcionais.

| Query           | Tipo                                           | Descrição                        |
|-----------------|------------------------------------------------|----------------------------------|
| `status`        | enum: `NEW`, `PREPARING`, `READY`, `DELIVERED` | Filtrar por status               |
| `dateFrom`      | ISO datetime                                   | Pedidos a partir desta data      |
| `dateTo`        | ISO datetime                                   | Pedidos até esta data            |
| `customerPhone` | string                                         | Busca parcial no telefone        |

**Resposta 200:** array de pedidos completos (com itens e menuItem relacionado).

### GET `/orders/stats`
Retorna estatísticas dos pedidos no período.

| Query      | Tipo         | Descrição                   |
|------------|--------------|-----------------------------|
| `dateFrom` | ISO datetime | Início do período           |
| `dateTo`   | ISO datetime | Fim do período              |

**Resposta 200**
```json
{
  "totalOrders": 25,
  "totalRevenue": 1250.5,
  "byStatus": [
    { "status": "NEW", "count": 5 },
    { "status": "READY", "count": 3 }
  ]
}
```

### GET `/orders/:id`
Retorna um pedido específico com todos os seus itens e dados do item do cardápio.

**Resposta 200**
```json
{
  "id": "uuid",
  "customerName": "Marina",
  "customerPhone": "31988887777",
  "total": 71.8,
  "status": "PREPARING",
  "items": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "menuItemId": "uuid",
      "name": "Pizza Margherita",
      "quantity": 2,
      "price": 35.9,
      "notes": "Sem cebola",
      "menuItem": { ... }
    }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

### PATCH `/orders/:id/status`
Atualiza o status de um pedido.

**Body**
```json
{
  "status": "READY"
}
```

**Status válidos:** `NEW`, `PREPARING`, `READY`, `DELIVERED`

**Resposta 200:** pedido atualizado.

### DELETE `/orders/:id`
Remove um pedido do sistema.

**Resposta 200**
```json
{ "message": "Pedido #uuid removido com sucesso" }
```

---

## Promoções

Promoções agora aplicam um desconto direto ao item do cardápio. Quando uma promoção é criada, o item tem seu preço reduzido automaticamente. O sistema mantém tanto o `priceReal` (preço original) quanto o `priceCurrent` (preço com desconto).

### POST `/promotions`
Cria uma promoção para um item do cardápio. O item deve existir antes.

**Body**
```json
{
  "menuItemId": "uuid-do-item",
  "priceCurrent": 35.90,
  "validFrom": "2025-12-01T00:00:00.000Z",
  "validUntil": "2025-12-31T23:59:59.000Z"
}
```

**Resposta 201**
```json
{
  "id": "uuid",
  "menuItemId": "uuid-do-item",
  "priceCurrent": 35.90,
  "validFrom": "2025-12-01T00:00:00.000Z",
  "validUntil": "2025-12-31T23:59:59.000Z",
  "active": true,
  "createdAt": "2025-12-29T...",
  "updatedAt": "2025-12-29T...",
  "menuItem": {
    "id": "uuid-do-item",
    "name": "Pizza Margherita",
    "priceReal": 45.90,
    "priceCurrent": 35.90,
    "category": "Pizzas",
    "description": "...",
    "image": "...",
    "available": true
  }
}
```

### GET `/promotions`
Lista todas as promoções.

**Resposta 200:** array de promoções com seus itens relacionados.

### GET `/promotions/active`
Retorna apenas promoções ativas e dentro da validade.

**Resposta 200:** array de promoções válidas no momento.

### GET `/promotions/menu-item/:menuItemId`
Busca a promoção ativa para um item específico.

**Resposta 200:** promoção do item ou `null` se não houver.

### GET `/promotions/:id`
Retorna uma promoção específica.

### PATCH `/promotions/:id`
Atualiza uma promoção (preço, datas, etc.). Se o preço for alterado, o item do cardápio é atualizado também.

**Body** (campos opcionais)
```json
{
  "priceCurrent": 29.90,
  "validUntil": "2026-01-31T23:59:59.000Z"
}
```

### DELETE `/promotions/:id`
Remove a promoção e restaura o preço original do item (`priceReal`).

**Resposta 200**
```json
{ "message": "Promoção #uuid removida com sucesso" }
```

**Observações:**
- Cada item pode ter apenas **uma promoção ativa** por vez
- Ao criar uma promoção, o `priceCurrent` do item é atualizado automaticamente
- Ao remover uma promoção, o preço do item volta para `priceReal`
- O novo preço (desconto) deve ser menor que o preço real do item

---
```

---

## Dashboard

### GET `/dashboard/stats`
Retorna as estatísticas principais do dashboard para o dia atual.

**Query Parameters:** Nenhum

**Resposta 200**
```json
{
  "data": {
    "todayOrders": 15,
    "todayRevenue": 425.50,
    "activeOrders": 5,
    "activeConversations": 8,
    "ordersInProgress": 3,
    "ordersReady": 2
  }
}
```

**Descrição dos campos:**
- `todayOrders`: Total de pedidos realizados hoje
- `todayRevenue`: Faturamento total do dia em reais
- `activeOrders`: Pedidos ativos (NEW + PREPARING + READY)
- `activeConversations`: Conversas abertas no WhatsApp
- `ordersInProgress`: Pedidos em status PREPARING
- `ordersReady`: Pedidos em status READY

---

### GET `/dashboard/metrics`
Retorna as métricas calculadas para exibição no dashboard.

**Query Parameters:** Nenhum

**Resposta 200**
```json
{
  "data": {
    "completionRate": 87,
    "averageTicket": 28.37,
    "ordersInProgress": 3,
    "orderSLA": 12
  }
}
```

**Descrição dos campos:**
- `completionRate`: Percentual de pedidos prontos em relação aos ativos (0-100)
  - Cálculo: `(ordersReady / (activeOrders + ordersReady + ordersInProgress)) * 100`
  - Arredondado para inteiro
- `averageTicket`: Valor médio por pedido do dia em reais
  - Cálculo: `todayRevenue / todayOrders`
  - Arredondado para 2 casas decimais
  - Valor padrão 0 se `todayOrders === 0`
- `ordersInProgress`: Número de pedidos em preparo
- `orderSLA`: Tempo médio em minutos para um pedido ir do status PREPARING para READY
  - Calcula a média dos pedidos entregues no mês atual
  - Retorna 0 se nenhum pedido foi completado

---

### GET `/dashboard/revenue`
Retorna dados de receita agregados por período.

| Query       | Tipo / valores                   | Descrição                        |
|-------------|-----------------------------------|----------------------------------|
| `period`    | `daily` \| `weekly` \| `monthly`  | Período de agregação             |
| `startDate` | ISO datetime (opcional)           | Data de início                   |
| `endDate`   | ISO datetime (opcional)           | Data de fim                      |

**Resposta 200**
```json
{
  "data": [
    { "date": "2025-12-29", "revenue": 320.5 },
    { "date": "2025-12-28", "revenue": 250.0 }
  ]
}
```

---

### GET `/dashboard/top-items`
Lista itens mais vendidos.

| Query   | Tipo           | Descrição                   |
|---------|----------------|-----------------------------|
| `limit` | número (opcional) | Quantidade de itens. Default: 10 |

**Resposta 200**
```json
[
  {
    "name": "Pizza Margherita",
    "menuItemId": "uuid",
    "totalQuantity": 120,
    "timesOrdered": 45
  }
]
```

---

### GET `/dashboard/peak-hours`
Retorna horários com maior volume de pedidos nos últimos 30 dias.

**Resposta 200**
```json
[
  {
    "hour": "19:00",
    "orderCount": 25
  },
  {
    "hour": "20:00",
    "orderCount": 22
  }
]
```

---

### GET `/dashboard/summary`
Resumo combinado com estatísticas, top 5 itens e top 5 horários de pico.

**Resposta 200**
```json
{
  "stats": {
    "todayOrders": 15,
    "todayRevenue": 425.50,
    "activeOrders": 5,
    "activeConversations": 8,
    "ordersInProgress": 3,
    "ordersReady": 2
  },
  "topItems": [
    {
      "name": "Pizza Margherita",
      "menuItemId": "uuid",
      "totalQuantity": 120,
      "timesOrdered": 45
    }
  ],
  "peakHours": [
    {
      "hour": "19:00",
      "orderCount": 25
    }
  ]
}
```

---

## Financeiro

O módulo financeiro fornece analytics e resumos de vendas, com suporte a diferentes períodos de análise.

### GET `/financial/summary`
Retorna um resumo das métricas financeiras de um período.

| Query       | Tipo / valores                              | Descrição                          |
|-------------|---------------------------------------------|------------------------------------|
| `period`    | `daily` \| `weekly` \| `monthly` (opcional) | Período para análise. Default: `daily` |
| `startDate` | ISO datetime (opcional)                     | Data de início. Se não informado, usa padrão do período |
| `endDate`   | ISO datetime (opcional)                     | Data de fim. Default: agora         |

**Resposta 200**
```json
{
  "totalRevenue": 12345.67,
  "totalOrders": 320,
  "averageTicket": 38.58,
  "topSellingItems": [
    {
      "itemName": "Pizza Margherita",
      "menuItemId": "uuid",
      "quantity": 120,
      "revenue": 4200
    }
  ]
}
```

**Padrões de período:**
- `daily`: últimas 24 horas
- `weekly`: últimos 7 dias
- `monthly`: últimos 30 dias

**Exemplo de chamada:**
```
GET /financial/summary?period=monthly
GET /financial/summary?period=daily&startDate=2025-12-01T00:00:00Z&endDate=2025-12-29T23:59:59Z
```

### GET `/financial/by-period`
Retorna dados agregados por período (dia, semana ou mês dependendo do `period`).

| Query       | Tipo / valores                              |
|-------------|---------------------------------------------|
| `period`    | `daily` \| `weekly` \| `monthly` (opcional) |
| `startDate` | ISO datetime (opcional)                     |
| `endDate`   | ISO datetime (opcional)                     |

**Resposta 200**
```json
[
  {
    "period": "2025-12-29",
    "revenue": 5000,
    "orders": 120,
    "averageTicket": 41.67
  },
  {
    "period": "2025-12-28",
    "revenue": 4800,
    "orders": 110,
    "averageTicket": 43.64
  }
]
```

### GET `/financial/today`
Resumo do dia atual (últimas 24 horas).

**Resposta 200:** mesmo formato de `/financial/summary`.

### GET `/financial/monthly-comparison`
Compara o mês atual com o mês anterior.

| Query     | Tipo         |
|-----------|--------------|
| `year`    | número (opcional) | Ano para comparação. Default: ano atual |
| `month`   | número (opcional) | Mês para comparação (1-12). Default: mês atual |

**Resposta 200**
```json
{
  "currentMonth": {
    "revenue": 7500,
    "orders": 210,
    "averageTicket": 35.71
  },
  "lastMonth": {
    "revenue": 6800,
    "orders": 190,
    "averageTicket": 35.79
  },
  "growth": {
    "percentage": 10.29,
    "absolute": 700
  }
}
```

---

## Eventos em Tempo Real

O gateway Socket.IO publica eventos globais:

| Evento         | Payload                                                |
|----------------|--------------------------------------------------------|
| `message:new`  | Mensagem recém-recebida (`id`, `text`, `sender`, `timestamp`, `conversation` com telefone e nome) |
| `new_order`    | Pedido recém-criado (mesma estrutura retornada por `POST /orders`) |
| `order_updated`| Pedido atualizado (`order` completo)                   |
| `order_status_changed` | `{ orderId, oldStatus, newStatus }`            |

Conecte o cliente ao mesmo host/porta (`ws://localhost:3000/socket.io`) e escute pelos eventos acima.

---

## Observações Gerais

- Todas as rotas retornam erros padronizados do NestJS em caso de validação inválida (`400`), recursos inexistentes (`404`) ou falhas de autenticação (`401`).
- Datas devem ser fornecidas em formato ISO-8601.
- Valores monetários são retornados em reais (float) sem formatação. Considere tratar para exibição.
- Os IDs persistidos são UUIDs gerados pelo Prisma.

---

Qualquer dúvida ou ajuste adicional, consulte os serviços correspondentes em `src/modules/**`.
