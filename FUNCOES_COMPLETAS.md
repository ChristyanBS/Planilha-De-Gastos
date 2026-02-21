# 📋 LISTAGEM COMPLETA DE FUNÇÕES - PLANILHA FINANCEIRA

## 📌 Sumário
1. [Funções de Core (Cálculos Principales)](#funcoes-de-core)
2. [Funções de UI (Interface)](#funcoes-de-ui)
3. [Funções de Calculadora](#funcoes-de-calculadora)
4. [Funções de Firestore (Banco de Dados)](#funcoes-de-firestore)
5. [Funções de Utilidades](#funcoes-de-utilidades)
6. [Funções de Main (Controlador Principal)](#funcoes-de-main)
7. [Funcionalidades por Módulo](#funcionalidades-por-modulo)

---

## 🔧 FUNÇÕES DE CORE

### 1. **calculateWorkHours(entry)**
- **Tipo:** Interna (Helper)
- **Descrição:** Calcula as horas trabalhadas e horas extras de um único registro de ponto
- **Parâmetros:**
  - `entry` (object): Objeto com { entry, exit, breakStart, breakEnd, isHoliday }
- **Retorno:** { workedMinutes, overtimeMinutes, is100Percent }
- **Uso:** Usada internamente para calcular os totais

### 2. **calculateTotals(state, periodRange, overtimeRange)**
- **Tipo:** Export (Principal)
- **Descrição:** Calcula TODOS os totais resumidos para o dashboard
- **Parâmetros:**
  - `state` (object): Estado global da aplicação
  - `periodRange` (object): { startDate, endDate } período financeiro
  - `overtimeRange` (object): { startDate, endDate } período de horas extras
- **Retorno:** Objeto com:
  - Totais de renda: `totalIncome`, `fixedIncome`, `variableIncome`, `extraIncome`
  - Totais de despesas: `totalExpenses`, `pendingExpenses`
  - Despesas por categoria: `homeExpenses`, `foodExpenses`, `transportExpenses`, `healthExpenses`, `educationExpenses`, `entertainmentExpenses`, `otherExpenses`
  - Investimentos: `totalInvestedThisMonth`, `totalInvested`, `expectedReturn`, `monthlyReturn`
  - Saldos: `availableBalance`, `monthSavings`
  - Horas: `totalWorkedMinutes`, `totalOvertime50`, `totalOvertime100`
- **Uso:** Atualiza as cards do dashboard com os totais

---

## 🎨 FUNÇÕES DE UI

### 1. **showAdvancedConfirmation(options)**
- **Tipo:** Export (Modal)
- **Descrição:** Mostra um pop-up de confirmação customizável com até 3 botões
- **Parâmetros:**
  - `options` (object):
    - `title` (string): Título do modal
    - `message` (string): Mensagem
    - `confirmText` (string): Texto do botão principal
    - `confirmClass` (string): Classes CSS para o botão principal
    - `secondaryText` (string): Texto do botão secundário (opcional)
    - `secondaryClass` (string): Classes CSS do botão secundário
- **Retorno:** Promise com 'confirm', 'secondary', ou 'cancel'
- **Uso:** Exclusões, operações sensíveis

### 2. **showToast(message, type, duration)**
- **Tipo:** Export (Notificação)
- **Descrição:** Mostra uma notificação flutuante temporária
- **Parâmetros:**
  - `message` (string): Mensagem a exibir
  - `type` (string): 'success', 'error' ou 'info'
  - `duration` (number): Tempo em ms (padrão 4000)
- **Retorno:** Void
- **Uso:** Feedback ao usuário após ações

### 3. **showConfirmation(title, message, confirmButtonClass)**
- **Tipo:** Export (Modal)
- **Descrição:** Simples confirmação com ok/cancelar
- **Parâmetros:**
  - `title` (string): Título
  - `message` (string): Mensagem
  - `confirmButtonClass` (string): Classes CSS do botão
- **Retorno:** Promise<boolean>
- **Uso:** Confirmações simples

### 4. **showContributionModal(goalId, goalName)**
- **Tipo:** Export (Modal)
- **Descrição:** Abre modal para adicionar contribuição a uma meta
- **Uso:** Tela de Metas

### 5. **openModal(modalId)** / **closeModal(modalId)**
- **Tipo:** Export (Utilidade)
- **Descrição:** Abre/fecha modais
- **Uso:** Gerenciamento de modais

### 6. **showEditModal(type, item, state)**
- **Tipo:** Export (Modal)
- **Descrição:** Abre modal de edição para qualquer tipo de item
- **Parâmetros:**
  - `type` (string): 'income', 'expense', 'goal', 'investment', etc.
  - `item` (object): Dados do item a editar (null para novo)
  - `state` (object): Estado global
- **Funcionalidades:**
  - Diferencia entre itens simples e recorrentes
  - Muda campos de data para dia do mês em itens recorrentes
  - Popula dropdown de categorias
  - Trata modo de edição vs novo

### 7. **toggleMobileMenu()** / **closeMobileMenu()**
- **Tipo:** Export (Mobile)
- **Descrição:** Abre/fecha menu mobile
- **Uso:** Navegação em dispositivos pequenos

### 8. **updatePrivacyButton(isPrivate)**
- **Tipo:** Export (UI)
- **Descrição:** Atualiza ícone botão "Privacidade"
- **Uso:** Modo privado (oculta valores)

### 9. **updateThemeButton(theme)**
- **Tipo:** Export (Tema)
- **Descrição:** Atualiza texto e ícone do botão de tema
- **Parâmetros:**
  - `theme` (string): 'dark' ou 'light'

### 10. **toggleTheme()**
- **Tipo:** Export (Tema)
- **Descrição:** Alterna entre modo claro e escuro
- **Salva:** localStorage 'theme'
- **Retorno:** String 'dark' ou 'light'

### 11. **populateYearDropdown()**
- **Tipo:** Export (UI)
- **Descrição:** Popula dropdown de anos (2024 até +10 anos)
- **Uso:** Seleção de ano

### 12. **populateCategoryDropdown(expenseCategories)**
- **Tipo:** Export (UI)
- **Descrição:** Popula dropdown de categorias de despesas
- **Parâmetros:**
  - `expenseCategories` (object): Mapa de categorias

### 13. **updateDashboardCards(totals)**
- **Tipo:** Export (Dashboard)
- **Descrição:** Atualiza todas as cards de totais no dashboard
- **Campos atualizados:**
  - Renda, despesas, saldo, economia
  - Investimentos, retorno esperado
  - Horas trabalhadas, horas extras

### 14. **updatePeriodDisplay(periodRange, overtimeRange)**
- **Tipo:** Export (UI)
- **Descrição:** Atualiza exibição dos períodos (financeiro e horas)

### 15. **renderCustomListResults(listArray, listElementId, currencyColorClass)**
- **Tipo:** Interna
- **Descrição:** Renderiza lista customizada de descontos/proventos

### 16. **updateIncomeTable(incomes, callbacks)**
- **Tipo:** Export (Tabelas)
- **Descrição:** Atualiza tabela de rendas
- **Callbacks:** onEdit, onDelete, onCalc

### 17. **updateExpensesTable(expenses, categories, callbacks)**
- **Tipo:** Export (Tabelas)
- **Descrição:** Atualiza tabela de despesas
- **Callbacks:** onEdit, onDelete, onStatusToggle

### 18. **updateGoalsTable(goals, callbacks)**
- **Tipo:** Export (Tabelas)
- **Descrição:** Atualiza tabela de metas

### 19. **updateInvestmentsTable(investments, callbacks)**
- **Tipo:** Export (Tabelas)
- **Descrição:** Atualiza tabela de investimentos

### 20. **updateHoursTable(entries, callbacks)**
- **Tipo:** Export (Tabelas)
- **Descrição:** Atualiza tabela de registros de horas

### 21. **updateRecurringItemsTable(recurringIncomes, recurringExpenses, categories, callbacks)**
- **Tipo:** Export (Tabelas)
- **Descrição:** Atualiza tabela de itens fixos (recorrentes)

---

## 🧮 FUNÇÕES DE CALCULADORA

### 1. **calculateINSS(grossSalary)**
- **Tipo:** Interna (Helper)
- **Descrição:** Calcula contribuição INSS de forma progressiva
- **Faixas:**
  - Até R$ 1.518,00: 7,5%
  - R$ 1.518,00 a R$ 2.793,88: 9%
  - R$ 2.793,88 a R$ 4.190,83: 12%
  - R$ 4.190,83 a R$ 8.157,41: 14%
  - Acima: Teto de R$ 951,63
- **Retorno:** Valor INSS em reais

### 2. **calculateIRRF(baseSalary, inss, dependents)**
- **Tipo:** Interna (Helper)
- **Descrição:** Calcula Imposto de Renda Retido na Fonte
- **Parâmetros:**
  - `baseSalary` (number): Salário bruto
  - `inss` (number): Valor INSS já calculado
  - `dependents` (number): Número de dependentes
- **Deduction:** R$ 189,59 por dependente
- **Faixas:** 7,5%, 15%, 22,5%, 27,5%
- **Retorno:** Valor IRRF em reais

### 3. **calculateNetSalary(totals, settings)** ⭐
- **Tipo:** Export (Principal)
- **Descrição:** Calcula salário líquido completo
- **Lê do DOM:**
  - `calc-base-salary`: Salário base
  - `calc-workload`: Carga horária mensal
  - `calc-dependents`: Número de dependentes
- **Parâmetros:**
  - `totals` (object): Totais de horas extras do período
  - `settings` (object): Descontos e proventos customizados
- **Retorno:** Objeto com:
  - `baseSalary`: Salário base
  - `totalOt50`: Total horas extras 50% (1,5x)
  - `totalOt100`: Total horas extras 100% (2x)
  - `dsr`: Descanso remunerado sobre horas extras
  - `totalGross`: Salário bruto total
  - `inss`: Contribuição INSS
  - `irrf`: Imposto de renda
  - `totalDiscounts`: Total descontos
  - `netSalary`: Salário líquido
  - `fgts`: FGTS (8% do bruto)
- **Uso:** Calculadora de salário

---

## 💾 FUNÇÕES DE FIRESTORE

### FUNÇÕES DE LEITURA (READ)

#### 1. **loadRecurringData(db, currentUser)**
- **Descrição:** Carrega itens fixos (recorrentes) do usuário
- **Retorno:** { recurringIncomes, recurringExpenses }

#### 2. **loadInitialData(db, currentUser)**
- **Descrição:** Carrega dados iniciais (metas, investimentos, contribuições)
- **Retorno:** { goals, investments, contributions, settings }

#### 3. **loadPeriodData(db, currentUser, startDate, endDate)**
- **Descrição:** Carrega rendas e despesas de um período específico
- **Retorno:** { incomes, expenses }

#### 4. **loadTimeEntriesForPeriod(db, currentUser, startDate, endDate)**
- **Descrição:** Carrega registros de ponto de um período
- **Retorno:** Array de timeEntries

### FUNÇÕES DE ESCRITA (CREATE / UPDATE)

#### 1. **saveItem(db, currentUser, type, itemData, id)**
- **Descrição:** Salva um item no banco de dados
- **Parâmetros:**
  - `type` (string): 'income', 'expense', 'goal', 'investment', 'timeEntry', 'contribution', etc.
  - `itemData` (object): Dados do item
  - `id` (string/null): ID para atualizar ou null para novo
- **Retorno:** boolean

#### 2. **saveExpense(db, currentUser, expenseData, id, installments)**
- **Descrição:** Salva despesa com suporte a parcelamento
- **Parâmetros:**
  - `installments` (number): Número de parcelas
- **Funcionalidade:** Cria múltiplas despesas se parcelada
- **Retorno:** boolean

#### 3. **toggleExpenseStatus(db, currentUser, expense)**
- **Descrição:** Marca despesa como paga/pendente
- **Retorno:** boolean

#### 4. **saveUserSettings(db, currentUser, settingsToSave)**
- **Descrição:** Salva configurações do usuário
- **Campos:** subtitle, payPeriodStartDay, expenseCategories, etc.
- **Retorno:** boolean

#### 5. **updateUserPassword(auth, newPassword)**
- **Descrição:** Atualiza ou cria senha de login
- **Retorno:** { success, message }
- **Tratamento:** Suporta usuários Google que adicionam senha

### FUNÇÕES DE EXCLUSÃO (DELETE)

#### 1. **handleDelete(db, currentUser, type, item, deleteOption)**
- **Descrição:** Deleta um item do banco
- **Parâmetros:**
  - `deleteOption` (string): 'one' (só essa parcela) ou 'all' (todas as parcelas futuras)
- **Especial para despesas parceladas:** Pode deletar só uma parcela ou todas as futuras
- **Retorno:** boolean

#### 2. **clearAllUserData(db, currentUser)**
- **Descrição:** APAGA TODOS OS DADOS do usuário (irreversível)
- **Colecções apagadas:** incomes, expenses, goals, investments, timeEntries
- **Retorno:** boolean

---

## 🔧 FUNÇÕES DE UTILIDADES

### 1. **togglePrivacyMode()**
- **Tipo:** Export
- **Descrição:** Alterna modo privado (oculta valores monetários)
- **Salva:** localStorage 'privacyMode'
- **Retorno:** boolean

### 2. **initPrivacyMode()**
- **Tipo:** Export
- **Descrição:** Inicializa modo privado do localStorage
- **Retorno:** boolean

### 3. **formatCurrency(value)**
- **Tipo:** Export
- **Descrição:** Formata número para moeda brasileira
- **Modo privado:** Retorna "R$ ●●●,●●"
- **Retorno:** "R$ 1.234,56" (exemplo)

### 4. **parseBrazilianNumber(stringValue)**
- **Tipo:** Export
- **Descrição:** Converte string de número brasileiro para float
- **Entrada:** "1.234,56"
- **Retorno:** 1234.56

### 5. **formatMinutesToHours(minutes)**
- **Tipo:** Export
- **Descrição:** Converte minutos para formato "XhYm"
- **Exemplo:** 125 minutos → "2h 5m"
- **Suporte:** Números negativos

### 6. **getPayPeriodRange(year, month, payPeriodStartDay)**
- **Tipo:** Export
- **Descrição:** Calcula período financeiro (salário/despesas)
- **Lógica:**
  - Se dia=1: período do calendário (1º ao último dia)
  - Se dia≠1: período anterior (ex: 25 a 24 do próximo mês)
- **Retorno:** { startDate, endDate }

### 7. **getOvertimePeriodRange(year, month, overtimeStartDay, overtimeEndDay)**
- **Tipo:** Export
- **Descrição:** Calcula período de horas extras
- **Parâmetros:**
  - `overtimeStartDay`: Dia do mês anterior para início (ex: 24)
  - `overtimeEndDay`: Dia do mês atual para fim (ex: 23)
- **Retorno:** { startDate, endDate }

### 8. **timeToMinutes(timeStr)**
- **Tipo:** Export
- **Descrição:** Converte hora string para minutos
- **Entrada:** "14:30"
- **Retorno:** 870 (minutos)

---

## 🎮 FUNÇÕES DE MAIN (Controlador Principal)

### 1. **updateDashboard()**
- **Tipo:** Principal
- **Descrição:** Carrega TODOS os dados do banco e atualiza a UI
- **Fluxo:**
  1. Carrega dados iniciais (metas, investimentos)
  2. Carrega dados recorrentes (itens fixos)
  3. Calcula períodos (financeiro e horas)
  4. Busca dados do período
  5. Gera itens recorrentes para o período
  6. Chama rerenderUI()

### 2. **rerenderUI()**
- **Tipo:** Principal
- **Descrição:** Re-renderiza toda a interface com dados atuais
- **Atualiza:**
  - Cards de totais
  - Tabelas (rendas, despesas, metas, investimentos, horas)
  - Metas com contribuições vinculadas
  - Relatórios (se ativo)

### 3. **handleEditItem(type, id)**
- **Tipo:** Event Handler
- **Descrição:** Abre modal de edição
- **Especial para timeEntry:** Preenche formulário em-page

### 4. **handleDeleteItem(type, id)**
- **Tipo:** Event Handler
- **Descrição:** Deleta item após confirmação

### 5. **handleSaveItem(type)**
- **Tipo:** Event Handler
- **Descrição:** Salva item do modal
- **Validações:**
  - Renda: fonte e valor > 0
  - Despesa: descrição, valor > 0, categoria
- **Suporte:** Despesas parceladas

### 6. **handleSaveContribution()**
- **Tipo:** Event Handler
- **Descrição:** Salva contribuição para uma meta

### 7. **handleSaveTimeEntry()**
- **Tipo:** Event Handler
- **Descrição:** Salva registro de ponto
- **Suporte:** Edição in-page
- **Campos:**
  - Data, entrada, intervalo (início/fim), saída
  - Feriado (checkbox)

### 8. **handleExpenseStatusToggle(id)**
- **Tipo:** Event Handler
- **Descrição:** Marca despesa como paga/pendente

### 9. **handleGenerateReport()**
- **Tipo:** Event Handler
- **Descrição:** Gera relatório com gráficos

---

## 📱 FUNCIONALIDADES POR MÓDULO

### 🏠 **ABA: RENDA (INCOME)**
**Funções relacionadas:**
- ✅ Adicionar renda (fixa, variável, extra)
- ✅ Editar renda
- ✅ Deletar renda
- ✅ Exibir total de cada tipo
- ✅ Suporte a renda recorrente (fixa)

**Campos:**
- Fonte, Valor, Tipo (fixed/variable/extra), Data

---

### 💰 **ABA: DESPESA (EXPENSES)**
**Funções relacionadas:**
- ✅ Adicionar despesa com categoria
- ✅ Editar despesa
- ✅ Deletar despesa
- ✅ Marcar como paga/pendente
- ✅ Parcelar em até 12x
- ✅ Despesas recorrentes (fixas)

**Campos:**
- Descrição, Valor, Categoria, Data, Parcelas, Status (pago/pendente)

**Categorias padrão:**
- Moradia, Alimentação, Transporte, Saúde, Educação, Lazer, Outros

---

### ⏰ **ABA: HORAS (EXTRA HOURS)**
**Funções relacionadas:**
- ✅ Registrar entrada/saída
- ✅ Registrar intervalo
- ✅ Marcar feriado (100% em vez de 50%)
- ✅ Editar registro de ponto
- ✅ Deletar registro
- ✅ Calcular horas extras automaticamente

**Campos:**
- Data, Entrada, Pausa-Início, Pausa-Fim, Saída, É Feriado (checkbox)

**Cálculos:**
- Horas trabalhadas (descontando pausa)
- Horas extras 50% (até 8h)
- Horas extras 100% (acima de 8h em feriado)
- DSR sobre horas extras

---

### 📌 **ABA: FIXOS (RECURRING ITEMS)**
**Funções relacionadas:**
- ✅ Adicionar renda fixa
- ✅ Adicionar despesa fixa
- ✅ Editar items fixos
- ✅ Deletar items fixos
- ✅ Gerar automaticamente todos os meses

**Campos especiais:**
- Dia do vencimento/pagamento (1-31)

---

### 🎯 **ABA: METAS (GOALS)**
**Funções relacionadas:**
- ✅ Criar meta personalizada
- ✅ Adicionar contribuição à meta
- ✅ Acompanhar progresso
- ✅ Meta automática "Economia Mensal"
- ✅ Editar meta
- ✅ Deletar meta

**Campos:**
- Nome, Valor alvo, Data alvo, Categoria

---

### 💎 **ABA: INVESTIMENTOS (INVESTMENTS)**
**Funções relacionadas:**
- ✅ Registrar investimento
- ✅ Rastrear rendimento esperado
- ✅ Editar investimento
- ✅ Deletar investimento

**Campos:**
- Descrição, Valor, Data, Rendimento anual (%), Tipo

---

### 🧮 **ABA: CALCULADORA (CALCULATOR)**
**Funções relacionadas:**
- ✅ Calcular salário líquido completo
- ✅ INSS (tabela progressiva)
- ✅ IRRF (5 faixas)
- ✅ Horas extras 50% e 100%
- ✅ DSR
- ✅ Dependentes
- ✅ Descontos customizados
- ✅ Proventos customizados
- ✅ FGTS (8%)

**Retorna:**
- Bruto total, descontos, líquido, FGTS

---

### 📊 **ABA: RELATÓRIOS (REPORTS)**
**Funções relacionadas:**
- ✅ Gerar relatório mensal
- ✅ Gráficos de gastos por categoria
- ✅ Comparação período a período
- ✅ Resumo de economia

---

### 👤 **ABA: MINHA CONTA (ACCOUNT)**
**Funções relacionadas:**
- ✅ Editar nome/subtitle
- ✅ Configurar período de pagamento
- ✅ Configurar período de horas
- ✅ Editar categorias de despesas
- ✅ Adicionar descontos customizados
- ✅ Adicionar proventos customizados
- ✅ Atualizar/criar senha
- ✅ Sair da conta
- ✅ Limpar todos os dados (irreversível!)

---

### 🌙 **MODO NOTURNO (DARK MODE)**
**Funções:**
- ✅ `toggleTheme()`: Alterna entre claro/escuro
- ✅ `updateThemeButton(theme)`: Atualiza botão
- ✅ Salva preferência em localStorage
- ✅ Usa Tailwind CSS dark mode
- ✅ Afeta todas as cores do app

**Cores escuras:**
- Fundo: #1F2937 (gray-900)
- Texto: #E5E7EB (gray-200)
- Cards: #111827 (gray-800)

---

### 🔒 **MODO PRIVADO (PRIVACY MODE)**
**Funções:**
- ✅ `togglePrivacyMode()`: Esconde/mostra valores
- ✅ `formatCurrency()`: Respeita modo privado
- ✅ Salva estado em localStorage
- ✅ Mostra "R$ ●●●,●●" em vez de valores

---

### 🔐 **AUTENTICAÇÃO (AUTH)**
**Funções:**
- ✅ Login com email/senha
- ✅ Login com Google
- ✅ Registro de novo usuário
- ✅ Reset de senha
- ✅ Atualizar senha
- ✅ Logout
- ✅ Persistência de sessão

---

### 💾 **SINCRONIZAÇÃO COM FIRESTORE**
**Funções:**
- ✅ Salvar dados em tempo real
- ✅ Sincronizar entre dispositivos
- ✅ Backup automático
- ✅ Suporte offline com Service Worker

---

## 📞 RESUMO DE TOTALIZAÇÕES

| Tipo | Fórmula |
|------|---------|
| Renda Total | Fixo + Variável + Extra |
| Despesas Total | Soma de todas as despesas |
| Saldo Disponível | Renda Total - Despesas |
| Economia Mensal | max(Saldo, 0) |
| Investido Período | Soma investimentos do período |
| Retorno Esperado | Soma(Investimento × Taxa / 100) |
| Horas Extras 50% | Minutos acima 8h (não feriado) × 1,5 |
| Horas Extras 100% | Minutos acima 8h (feriado) × 2,0 |
| DSR | (Total OT50 + OT100) / 6 |
| Salário Bruto | Base + OT50 + OT100 + DSR + Proventos |
| Salário Líquido | Bruto - INSS - IRRF - Outros Descontos |

---

## 🎯 ENDPOINTS/COLEÇÕES FIRESTORE

```
users/
├── {uid}/
│   ├── (document) settings, tags, etc
│   ├── incomes/
│   ├── expenses/
│   ├── goals/
│   ├── investments/
│   ├── timeEntries/
│   ├── contributions/
│   ├── recurringIncomes/
│   └── recurringExpenses/
```

---

**Versão:** 1.0  
**Data:** Fevereiro 2026  
**Status:** ✅ Completo

