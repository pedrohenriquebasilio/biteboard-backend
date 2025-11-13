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
```json
{
  "name": "Pizza Margherita",
  "description": "Mussarela, tomate e manjericão",
  "price": 39.9,
  "category": "Pizzas",
  "image": "https://cdn/pizza.jpg",
  "available": true
}
```
**Resposta 201:** item criado.

### GET `/menu`
Retorna todos os itens.

### GET `/menu/categories`
```json
{
  "categories": ["Bebidas", "Pizzas", "Sobremesas"]
}
```

### GET `/menu/:id`
Retorna item específico.

### PUT `/menu/:id`
Atualiza campos do item (payload parcial aceito).

### DELETE `/menu/:id`
Remove item do cardápio.

---

## Pedidos

### POST `/orders`
```json
{
  "customerName": "Marina",
  "customerPhone": "31988887777",
  "items": [
    {
      "menuItemId": "uuid-opcional",
      "name": "Pizza Margherita",
      "quantity": 2,
      "price": 39.9,
      "notes": "Sem cebola"
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
  "total": 79.8,
  "status": "NEW",
  "items": [
    {
      "id": "uuid",
      "menuItemId": "uuid-opcional",
      "name": "Pizza Margherita",
      "quantity": 2,
      "price": 39.9,
      "notes": "Sem cebola",
      "menuItem": { ... }
    }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

### GET `/orders`
Lista pedidos com filtros.

| Query          | Tipo           |
|----------------|----------------|
| `status`       | enum `NEW` \| `PREPARING` \| `READY` \| `DELIVERED` |
| `dateFrom`     | ISO datetime   |
| `dateTo`       | ISO datetime   |
| `customerPhone`| string (busca parcial) |

**Resposta 200:** array de pedidos completos (incluindo itens).

### GET `/orders/stats`
| Query      | Tipo         |
|------------|--------------|
| `dateFrom` | ISO datetime |
| `dateTo`   | ISO datetime |

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
Retorna um pedido com itens.

### PATCH `/orders/:id/status`
```json
{ "status": "READY" }
```
**Resposta 200:** pedido atualizado.

### DELETE `/orders/:id`
```json
{ "message": "Pedido #<id> removido com sucesso" }
```

---

## Promoções

### POST `/promotions`
```json
{
  "name": "Combo Segunda",
  "description": "10% off em pizzas",
  "discount": 10,
  "discountType": "PERCENTAGE",
  "validFrom": "2025-11-01T00:00:00.000Z",
  "validUntil": "2025-11-30T23:59:59.000Z"
}
```

### GET `/promotions`
| Query          | Tipo                         |
|----------------|------------------------------|
| `active`       | boolean (`true`/`false`)     |
| `discountType` | enum `PERCENTAGE` \| `FIXED` |
| `validNow`     | boolean                      |

### GET `/promotions/active`
Promoções ativas e válidas no momento.

### GET `/promotions/:id`
Promoção específica.

### PATCH `/promotions/:id`
Atualiza campos (datas são validadas).

### PATCH `/promotions/:id/toggle`
```json
{ "active": true }
```

### DELETE `/promotions/:id`
Remove promoção.

### GET `/promotions/:id/calculate?price=100`
Calcula desconto para um preço informado.

**Resposta 200**
```json
25.0
```
(valor do desconto aplicável)

### GET `/promotions/apply/best?price=100`
Retorna a melhor promoção para o preço.

**Resposta 200**
```json
{
  "finalPrice": 85,
  "promotion": { ... },
  "discount": 15
}
```

---

## Dashboard

### GET `/dashboard/stats`
KPIs do dia.

**Resposta 200**
```json
{
  "todayOrders": 12,
  "todayRevenue": 540.5,
  "activeOrders": 4,
  "ordersInProgress": 2,
  "ordersReady": 1
}
```

### GET `/dashboard/revenue`
| Query       | Tipo / valores                   | Padrão |
|-------------|-----------------------------------|--------|
| `period`    | `daily` \| `weekly` \| `monthly`  | obrigatório |
| `startDate` | ISO datetime                      | opcional   |
| `endDate`   | ISO datetime                      | opcional   |

**Resposta 200**
```json
{
  "data": [
    { "date": "2025-11-01", "revenue": 320.5 },
    { "date": "2025-11-02", "revenue": 250.0 }
  ]
}
```

### GET `/dashboard/top-items?limit=5`
Lista itens mais vendidos.

### GET `/dashboard/peak-hours`
Retorna horários com maior volume de pedidos nos últimos 30 dias.

### GET `/dashboard/summary`
Resumo combinado: `stats`, top itens (5) e top horários.

---

## Financeiro

### GET `/financial/summary`
| Query       | Tipo / valores                   |
|-------------|-----------------------------------|
| `period`    | `daily` \| `weekly` \| `monthly`  |
| `startDate` | ISO datetime (opcional)           |
| `endDate`   | ISO datetime (opcional)           |

**Resposta 200**
```json
{
  "totalRevenue": 12345.67,
  "totalOrders": 320,
  "averageTicket": 38.58,
  "topSellingItems": [
    {
      "itemName": "Burger",
      "menuItemId": "uuid",
      "quantity": 120,
      "revenue": 4200
    }
  ]
}
```

### GET `/financial/by-period`
Mesmo conjunto de parâmetros.  
**Resposta 200**
```json
[
  {
    "period": "2025-10-01",
    "revenue": 5000,
    "orders": 120,
    "averageTicket": 41.67
  }
]
```

### GET `/financial/today`
Resumo do dia atual.

### GET `/financial/monthly-comparison`
Compara mês atual x anterior.

**Resposta 200**
```json
{
  "currentMonth": { "revenue": 7500, "orders": 210 },
  "lastMonth": { "revenue": 6800, "orders": 190 },
  "growth": { "percentage": 10.29, "absolute": 700 }
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
