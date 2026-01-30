

# Plano: Criar Dados de Teste para Dezembro 2025

## Objetivo
Inserir 10 viagens com passageiros variados para testar os cálculos financeiros do sistema.

## Perfis Disponíveis

| Nome | ID | Motorista | Isento |
|------|-----|-----------|--------|
| Estevam | 65df814d-... | Sim | Não |
| Jonatã Bessa | 05d6495f-... | Sim | Não |
| Teste 2 | 5e3d35e2-... | Sim | Não |
| Aline Palombi | f78b43e5-... | Não | Não |
| Teste | eba2553a-... | Não | Não |
| Teste Betelita | 19a9ecf3-... | Não | Não |

## Cenários de Teste

### Viagens a Criar

| # | Motorista | Data | Passageiros | Tipo | Carro Betel |
|---|-----------|------|-------------|------|-------------|
| 1 | Estevam | 01/12 | Aline, Teste | Ida e Volta | Não |
| 2 | Jonatã | 03/12 | Teste 2, Teste Betelita | Ida e Volta | Não |
| 3 | Teste 2 | 05/12 | Estevam, Aline | Ida e Volta | **Sim** (isento) |
| 4 | Estevam | 07/12 | Jonatã, Teste | Ida e Volta | Não |
| 5 | Jonatã | 10/12 | Aline | Apenas Ida | Não |
| 6 | Teste 2 | 12/12 | Teste Betelita, Teste | Ida e Volta | Não |
| 7 | Estevam | 14/12 | Aline, Teste Betelita | Ida e Volta | Não |
| 8 | Jonatã | 17/12 | Estevam, Teste | Apenas Volta | Não |
| 9 | Estevam | 21/12 | Aline, Jonatã, Teste 2 | Ida e Volta | Não |
| 10 | Jonatã | 24/12 | Aline, Teste | Ida e Volta | Não |

### Cálculo Esperado (Regras: R$15 ida+volta, R$7.50 só ida ou só volta)

**Viagem 3 é isenta (Carro de Betel)**

| Passageiro | Viagens Pagas | Valor Total a Pagar |
|------------|---------------|---------------------|
| Aline | 1,5,7,9,10 (4 I+V, 1 Ida) | R$ 60 + R$ 7.50 = **R$ 67.50** |
| Teste | 1,4,6,8,10 (4 I+V, 1 Volta) | R$ 60 + R$ 7.50 = **R$ 67.50** |
| Teste 2 | 2,9 (2 I+V) | **R$ 30.00** |
| Teste Betelita | 2,6,7 (3 I+V) | **R$ 45.00** |
| Jonatã | 4,9 (2 I+V) | **R$ 30.00** |
| Estevam | 8 (1 Volta) | **R$ 7.50** |

**Créditos dos Motoristas (soma dos passageiros pagantes por viagem):**

| Motorista | Viagens | Valor Total a Receber |
|-----------|---------|----------------------|
| Estevam | 1,4,7,9 | (2×15)+(2×15)+(2×15)+(3×15) = **R$ 135.00** |
| Jonatã | 2,5,8,10 | (2×15)+(1×7.50)+(2×7.50)+(2×15) = **R$ 82.50** |
| Teste 2 | 3,6 | (0 isento)+(2×15) = **R$ 30.00** |

---

## Implementação Técnica

### SQL para Inserir Viagens

```sql
INSERT INTO trips (id, driver_id, departure_at, return_at, max_passengers, is_betel_car, is_urgent, is_active, notes) VALUES
('a1111111-1111-1111-1111-111111111111', '65df814d-0249-45a0-8542-d3acee887c2e', '2025-12-01T19:00:00Z', '2025-12-01T22:00:00Z', 4, false, false, false, 'Viagem 1'),
('a2222222-2222-2222-2222-222222222222', '05d6495f-ee82-4191-ae73-41a4b9ad0898', '2025-12-03T19:00:00Z', '2025-12-03T22:00:00Z', 4, false, false, false, 'Viagem 2'),
('a3333333-3333-3333-3333-333333333333', '5e3d35e2-04ed-4e7a-8902-d0fd1eaa9222', '2025-12-05T19:00:00Z', '2025-12-05T22:00:00Z', 4, true, false, false, 'Viagem 3 - Carro Betel'),
('a4444444-4444-4444-4444-444444444444', '65df814d-0249-45a0-8542-d3acee887c2e', '2025-12-07T09:00:00Z', '2025-12-07T12:00:00Z', 4, false, false, false, 'Viagem 4'),
('a5555555-5555-5555-5555-555555555555', '05d6495f-ee82-4191-ae73-41a4b9ad0898', '2025-12-10T19:00:00Z', '2025-12-10T22:00:00Z', 4, false, false, false, 'Viagem 5'),
('a6666666-6666-6666-6666-666666666666', '5e3d35e2-04ed-4e7a-8902-d0fd1eaa9222', '2025-12-12T19:00:00Z', '2025-12-12T22:00:00Z', 4, false, false, false, 'Viagem 6'),
('a7777777-7777-7777-7777-777777777777', '65df814d-0249-45a0-8542-d3acee887c2e', '2025-12-14T09:00:00Z', '2025-12-14T12:00:00Z', 4, false, false, false, 'Viagem 7'),
('a8888888-8888-8888-8888-888888888888', '05d6495f-ee82-4191-ae73-41a4b9ad0898', '2025-12-17T19:00:00Z', '2025-12-17T22:00:00Z', 4, false, false, false, 'Viagem 8'),
('a9999999-9999-9999-9999-999999999999', '65df814d-0249-45a0-8542-d3acee887c2e', '2025-12-21T09:00:00Z', '2025-12-21T12:00:00Z', 4, false, false, false, 'Viagem 9'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '05d6495f-ee82-4191-ae73-41a4b9ad0898', '2025-12-24T19:00:00Z', '2025-12-24T22:00:00Z', 4, false, false, false, 'Viagem 10');
```

### SQL para Inserir Passageiros

```sql
INSERT INTO trip_passengers (trip_id, passenger_id, trip_type) VALUES
-- Viagem 1: Aline e Teste (Ida e Volta)
('a1111111-1111-1111-1111-111111111111', 'f78b43e5-351e-4a39-8929-5d70ec111752', 'Ida e Volta'),
('a1111111-1111-1111-1111-111111111111', 'eba2553a-b085-4888-bac1-a505a1f339e5', 'Ida e Volta'),
-- Viagem 2: Teste 2 e Teste Betelita (Ida e Volta)
('a2222222-2222-2222-2222-222222222222', '5e3d35e2-04ed-4e7a-8902-d0fd1eaa9222', 'Ida e Volta'),
('a2222222-2222-2222-2222-222222222222', '19a9ecf3-9d10-4798-a53e-42789bc0c026', 'Ida e Volta'),
-- Viagem 3: Estevam e Aline (Carro Betel - isento)
('a3333333-3333-3333-3333-333333333333', '65df814d-0249-45a0-8542-d3acee887c2e', 'Ida e Volta'),
('a3333333-3333-3333-3333-333333333333', 'f78b43e5-351e-4a39-8929-5d70ec111752', 'Ida e Volta'),
-- Viagem 4: Jonatã e Teste (Ida e Volta)
('a4444444-4444-4444-4444-444444444444', '05d6495f-ee82-4191-ae73-41a4b9ad0898', 'Ida e Volta'),
('a4444444-4444-4444-4444-444444444444', 'eba2553a-b085-4888-bac1-a505a1f339e5', 'Ida e Volta'),
-- Viagem 5: Aline (Apenas Ida)
('a5555555-5555-5555-5555-555555555555', 'f78b43e5-351e-4a39-8929-5d70ec111752', 'Apenas Ida'),
-- Viagem 6: Teste Betelita e Teste (Ida e Volta)
('a6666666-6666-6666-6666-666666666666', '19a9ecf3-9d10-4798-a53e-42789bc0c026', 'Ida e Volta'),
('a6666666-6666-6666-6666-666666666666', 'eba2553a-b085-4888-bac1-a505a1f339e5', 'Ida e Volta'),
-- Viagem 7: Aline e Teste Betelita (Ida e Volta)
('a7777777-7777-7777-7777-777777777777', 'f78b43e5-351e-4a39-8929-5d70ec111752', 'Ida e Volta'),
('a7777777-7777-7777-7777-777777777777', '19a9ecf3-9d10-4798-a53e-42789bc0c026', 'Ida e Volta'),
-- Viagem 8: Estevam e Teste (Apenas Volta)
('a8888888-8888-8888-8888-888888888888', '65df814d-0249-45a0-8542-d3acee887c2e', 'Apenas Volta'),
('a8888888-8888-8888-8888-888888888888', 'eba2553a-b085-4888-bac1-a505a1f339e5', 'Apenas Volta'),
-- Viagem 9: Aline, Jonatã e Teste 2 (Ida e Volta)
('a9999999-9999-9999-9999-999999999999', 'f78b43e5-351e-4a39-8929-5d70ec111752', 'Ida e Volta'),
('a9999999-9999-9999-9999-999999999999', '05d6495f-ee82-4191-ae73-41a4b9ad0898', 'Ida e Volta'),
('a9999999-9999-9999-9999-999999999999', '5e3d35e2-04ed-4e7a-8902-d0fd1eaa9222', 'Ida e Volta'),
-- Viagem 10: Aline e Teste (Ida e Volta)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f78b43e5-351e-4a39-8929-5d70ec111752', 'Ida e Volta'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'eba2553a-b085-4888-bac1-a505a1f339e5', 'Ida e Volta');
```

## Valores Esperados para Validação

### Resumo por Pessoa

| Pessoa | Débito (pagar) | Crédito (receber) | Saldo |
|--------|----------------|-------------------|-------|
| Aline Palombi | R$ 67.50 | R$ 0 | -R$ 67.50 |
| Teste | R$ 67.50 | R$ 0 | -R$ 67.50 |
| Teste 2 | R$ 30.00 | R$ 30.00 | R$ 0 |
| Teste Betelita | R$ 45.00 | R$ 0 | -R$ 45.00 |
| Jonatã Bessa | R$ 30.00 | R$ 82.50 | +R$ 52.50 |
| Estevam | R$ 7.50 | R$ 135.00 | +R$ 127.50 |

### Totais
- **Total a Pagar:** R$ 247.50
- **Total a Receber:** R$ 247.50 (deve bater!)

