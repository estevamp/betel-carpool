
# Plano: Remover FAQs Duplicadas

## Problema Identificado
Existem 6 perguntas duplicadas na tabela `faq`. Cada pergunta foi inserida duas vezes em datas diferentes:
- Primeira inserção: 29/01/2026 às 00:40
- Segunda inserção: 29/01/2026 às 14:40

As versões mais recentes possuem respostas mais completas e detalhadas.

## Ação
Remover as 6 FAQs mais antigas, mantendo as versões mais recentes com respostas mais completas.

## FAQs a Remover

| Pergunta | ID |
|----------|-----|
| Como as transferências são calculadas? | b965d7b9-7a8a-4329-a429-7cc5b28b4be2 |
| Como o aplicativo considera as esposas nos cálculos? | da3ffb6c-7b8b-4c7a-81ee-8d38ddc927e6 |
| Como preencho meu perfil após fazer login? | 87117284-4f6c-4676-abe3-dd4caca6eae6 |
| Como vejo as viagens disponíveis? | 9069e0fb-2afc-4f92-92df-d84c40bc1cbe |
| O que faço se eu mudar de motorista ou passageiro na última hora? | 07b7dd69-10d3-42c0-a034-0f6c18655a88 |
| Por que preciso fazer login no aplicativo? | a15f2c4e-a725-42d8-b354-d22b03bf6504 |

## SQL a Executar

```sql
DELETE FROM faq WHERE id IN (
  'b965d7b9-7a8a-4329-a429-7cc5b28b4be2',
  'da3ffb6c-7b8b-4c7a-81ee-8d38ddc927e6',
  '87117284-4f6c-4676-abe3-dd4caca6eae6',
  '9069e0fb-2afc-4f92-92df-d84c40bc1cbe',
  '07b7dd69-10d3-42c0-a034-0f6c18655a88',
  'a15f2c4e-a725-42d8-b354-d22b03bf6504'
);
```

## Resultado Esperado
Após a remoção, restarão 6 FAQs únicas com as respostas mais detalhadas.
