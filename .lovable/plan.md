

# Plano: Vincular Cônjuges no Formulário de Edição

## Resumo

Adicionar um campo de seleção de cônjuge no diálogo de edição de Betelita, permitindo que o administrador vincule dois membros casados. O sistema também sincronizará automaticamente o vínculo no perfil do cônjuge selecionado.

## Mudanças Principais

### 1. Atualizar o Diálogo de Edição
Adicionar dois novos campos no `EditBetelitaDialog.tsx`:
- **Switch "Casado(a)"**: Controla o campo `is_married`
- **Select "Cônjuge"**: Lista os membros disponíveis para seleção (só aparece quando `is_married` está ativo)

### 2. Lógica de Seleção de Cônjuge
A lista de cônjuges disponíveis será filtrada para mostrar apenas:
- Membros do sexo oposto
- Membros que não estão casados OU que já são o cônjuge atual da pessoa sendo editada
- Excluir a própria pessoa da lista

### 3. Sincronização Bidirecional
Quando um cônjuge for selecionado:
- Atualizar o `spouse_id` da pessoa sendo editada
- Atualizar também o `spouse_id` do cônjuge selecionado para apontar de volta
- Marcar ambos como `is_married = true`

Quando o vínculo for removido:
- Limpar o `spouse_id` da pessoa sendo editada
- Limpar também o `spouse_id` do ex-cônjuge
- Marcar ambos como `is_married = false`

### 4. Exibição na Visualização
O `ViewBetelitaDialog` já exibe corretamente o nome do cônjuge quando existe.

---

## Detalhes Técnicos

### Arquivo: `src/components/betelitas/EditBetelitaDialog.tsx`

**Mudanças:**
1. Receber a lista de betelitas como prop (`allBetelitas`)
2. Adicionar campos `is_married` e `spouse_id` ao `formData`
3. Criar lista filtrada de cônjuges disponíveis
4. Adicionar Switch para "Casado(a)" 
5. Adicionar Select para "Cônjuge" (visível quando casado)
6. Atualizar a mutation para:
   - Salvar `is_married` e `spouse_id`
   - Fazer update no perfil do cônjuge quando necessário

```text
Novos campos no formData:
+--------------------+
| is_married: false  |
| spouse_id: ""      |
+--------------------+

Lógica de filtragem:
+--------------------------------+
| Sexo oposto ao membro editado  |
| Solteiro OU cônjuge atual      |
| Não é a própria pessoa         |
+--------------------------------+
```

### Arquivo: `src/pages/BetelitasPage.tsx`

**Mudanças:**
- Passar `allBetelitas={betelitas}` para o `EditBetelitaDialog`

### Validação de Negócio
- Quando `is_married` for desativado, `spouse_id` será automaticamente limpo
- A sincronização bidirecional garante consistência nos dados

