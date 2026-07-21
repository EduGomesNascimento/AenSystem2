# Guia de Conversão — `EXPR_WEB_LEITOR_MOVIMENTOS_PRODUCAO`

## Objetivo

Deixar a **procedure Oracle** (`expr_web_leitor_movimentos_producao_4.prc`,
última compilação **17/06/2026**) fazendo **exatamente a mesma coisa** que a
**procedure SQL Server** (`EXPR_WEB_LEITOR_MOVIMENTOS_PRODUCAO_6.sql`, última
compilação **21/07/2026**).

A versão **SQL Server é a mais recente** e contém as últimas correções/mudanças,
por isso ela é tratada aqui como **referência (master)**. Este guia lista o que
muda de uma para a outra e mostra, passo a passo, como aplicar cada mudança no
Oracle.

---

## 1. Como ler este guia

As diferenças foram separadas em dois grupos:

- **Parte A — Diferenças de dialeto** (T-SQL × PL/SQL). São esperadas, já estão
  corretas na versão Oracle e **não alteram o comportamento**. Estão aqui só para
  você saber que não precisa "consertar".
- **Parte B — Diferenças de COMPORTAMENTO.** São as que realmente fazem as duas
  procedures se comportarem de forma diferente. **Estas precisam ser aplicadas no
  Oracle.** Cada item vira um passo na seção 4.

> As linhas citadas (`.prc` = Oracle, `.sql` = SQL Server) são aproximadas e
> servem para você localizar o trecho rapidamente.

---

## 2. Parte A — Diferenças de dialeto (NÃO mexer, já estão corretas)

| Assunto | SQL Server | Oracle (equivalente correto) |
|---|---|---|
| Declaração | `CREATE OR ALTER ... with encryption` | `CREATE OR REPLACE PROCEDURE ... IS` |
| Variáveis | `@nome tipo` | `nome tipo` |
| Cursores | `cursor static for ... open/fetch/while @@fetch_status=0` | `CURSOR c IS ...` + `FOR r IN c LOOP` |
| Próx. demanda | `exec ultdem @v_nova_demanda output,' '` | `seq_demandag.nextval` |
| Próx. movimento | `exec cg_pr_ultmov '',@v_mov output` | `seq_movimento.nextval` |
| Data/hora | `getdate()`, `dbo.cgfc_dataatual()` | `SYSDATE`, `trunc(SYSDATE)` |
| Condicional inline | `iif(cond, a, b)` | `CASE WHEN cond THEN a ELSE b END` / `decode` |
| Concatenar | `concat(a,b,c)` | `a || b || c` |
| `right(x,1)` / `try_cast` | `right(@c,1)` / `try_cast(... as int)` | `substr(c,-1)` / `CAST(... AS PLS_INTEGER DEFAULT NULL ON conversion error)` |
| `top 1` | `select top 1 ...` | `... WHERE rownum = 1` |
| `lpad` | `dbo.cgfc_lpad(...)` | `lpad(...)` |
| `print` | `print concat(...)` | `dbms_output.put_line(...)` |
| `isnull(x,'')` | `isnull(x,'')` | `nvl(x,' ')` |
| Sair da procedure | `return` | `RETURN;` |
| Fim | `end` | `END;` + `/` |

Nada acima precisa ser alterado — o Oracle já traduz esses pontos corretamente.

---

## 3. Parte B — Diferenças de COMPORTAMENTO (precisam ser aplicadas)

Resumo do que está diferente e que **muda o resultado**:

| # | Onde | SQL Server (novo/correto) | Oracle (atual) | Efeito da diferença |
|---|------|---------------------------|----------------|---------------------|
| 1 | INSERT `pcmoprod` → `campo26` | `dbo.cgfc_busca_total_horas(dt_ini,hr_ini,dt_fim,hr_fim,1)` | grava `0` | Oracle não grava o total de horas do apontamento |
| 2 | UPDATE `pcmoprod` (movimento já existe) | atualiza também `quantidade = quantidade + qtd` **e** `campo26 = cgfc_busca_total_horas(...)` | não atualiza `quantidade` nem `campo26` | Ao reapontar, Oracle não soma a quantidade nem recalcula horas |
| 3 | Função `cgfc_busca_total_horas` | usada nos itens 1 e 2 | precisa existir no Oracle | Sem a função, itens 1 e 2 não compilam |
| 4 | Cursor de nº de série da **última etapa** (entrada) | cursor próprio filtrando só `op, talao, tipo_movimento, cd_material` | reaproveita `c_numero_serie_op` passando `data_fim = NULL, hora_fim = NULL` | No Oracle `web.data_fim = NULL` nunca é verdadeiro → **o laço nunca executa** (nº de série da entrada não é gerado) |
| 5 | Condição do LOTE na **última etapa** | `if @fcr_mp_usa_grade != ''` | `IF mp.usa_grade = 'L'` | Oracle só gera grade quando o material é `'L'`; SQL gera para qualquer valor preenchido |
| 6 | JOIN `peengenh` no cursor de demandas | `eng.cd_pai = @fcr_mp_material` (material do movimento) | `eng.cd_pai = dop.cd_codigo` | Busca a validade/engenharia por chave diferente → `val_final` pode vir diferente |
| 7 | JOIN `getopera` no cursor "demanda sem estoque" | `iif(web.quantidade > 0, cfg 397, cfg 398)` | `decode(web.quantidade, 0, cfg 398, cfg 397)` | Para quantidade **negativa**: SQL usa 398 (fabricado), Oracle usa 397 (saída) |
| 8 | `esmovime` (saída) → `ncm` | `@fcr_mp_ncm` (NCM do movimento) | `de.ncm` (NCM da demanda) | NCM gravado no movimento de saída pode divergir — **confirmar qual é o correto** |
| 9 | `esmovime` (saída) → `descricao` | `... ' cfme. OP ' + @p_op` | `... ' cfme. OP ' || p_op || ' - '` | Oracle acrescenta um `' - '` no fim da descrição |
| 10 | `HAVING` do cursor "demanda sem estoque" | `@v_data_atual` | `SYSDATE` | Data usada na posição de estoque difere (com/sem hora) |
| 11 | UPDATE `teopxnumserie` (`/*CUSTOMIZADO*/`) | **ativo** | **comentado** | Customização de cliente — ver seção 5 (decisão) |
| 12 | `esnserie` → `num_de_serie_alt` | `convert(binary(10),'')` | `' '` | Diferença de valor binário vazio — baixíssimo impacto |

---

## 4. Passo a passo de aplicação no Oracle

> Faça as alterações em uma cópia do `.prc`, recompile em ambiente de
> homologação e valide com o roteiro da seção 6 antes de subir em produção.

### Passo 1 — `pcmoprod` INSERT: gravar total de horas em `campo26`

**Local:** INSERT em `pcmoprod`, coluna `campo26` (`.prc` ~linha 1137; `.sql` ~1356).

**Antes (Oracle):**
```sql
             0, --<Campo26, float>
```

**Depois (Oracle):**
```sql
             cgfc_busca_total_horas(mp.data_inicio, mp.hora_inicio, mp.data_fim, mp.hora_fim, 1), --<Campo26, float>
```

---

### Passo 2 — `pcmoprod` UPDATE: somar quantidade e recalcular `campo26`

**Local:** ramo `ELSE` (movimento já existe), UPDATE em `pcmoprod`
(`.prc` ~linhas 1221-1237; `.sql` ~1433-1449).

**Antes (Oracle):**
```sql
         UPDATE pcmoprod
         SET dt_final = mp.data_fim,
             hora_final = mp.hora_fim,
             campo50 = c426_ocorrenciafabricado,
             campo64 = CASE
                          WHEN mp.data_fim IS NULL THEN 'I'
                          ELSE 'C'
                       END,
             dt_modificacao = v_data_atual,
             usuario_modific = p_usuario,
             sessao = v_hora_atual
         WHERE liberacao = mp.liberacao
         AND sequencia = mp.sequencia
         AND op = p_op
         AND talao = p_talao
         AND dt_inicio = mp.data_inicio
         AND hora_inicio = mp.hora_inicio;
```

**Depois (Oracle)** — adicionadas as linhas `quantidade` e `campo26`:
```sql
         UPDATE pcmoprod
         SET dt_final = mp.data_fim,
             quantidade = quantidade + mp.quantidade,
             hora_final = mp.hora_fim,
             campo50 = c426_ocorrenciafabricado,
             campo64 = CASE
                          WHEN mp.data_fim IS NULL THEN 'I'
                          ELSE 'C'
                       END,
             campo26 = cgfc_busca_total_horas(mp.data_inicio, mp.hora_inicio, mp.data_fim, mp.hora_fim, 1),
             dt_modificacao = v_data_atual,
             usuario_modific = p_usuario,
             sessao = v_hora_atual
         WHERE liberacao = mp.liberacao
         AND sequencia = mp.sequencia
         AND op = p_op
         AND talao = p_talao
         AND dt_inicio = mp.data_inicio
         AND hora_inicio = mp.hora_inicio;
```

---

### Passo 3 — Garantir a função `cgfc_busca_total_horas` no Oracle

Os passos 1 e 2 usam `cgfc_busca_total_horas(data_inicio, hora_inicio, data_fim, hora_fim, 1)`
(no SQL Server é `dbo.cgfc_busca_total_horas`). Antes de recompilar, verifique se
ela já existe no schema Oracle:

```sql
SELECT object_name, object_type, status
FROM   user_objects
WHERE  object_name = 'CGFC_BUSCA_TOTAL_HORAS';
```

- Se **existir e estiver `VALID`** → nada a fazer.
- Se **não existir** → é preciso portar a função do SQL Server para o Oracle
  (mesma assinatura: recebe data e hora de início/fim + um flag, devolve o total
  de horas). Solicite o fonte da `dbo.cgfc_busca_total_horas` e crie o
  equivalente em PL/SQL. Sem essa função, os passos 1 e 2 **não compilam**.

---

### Passo 4 — Cursor de número de série da ÚLTIMA ETAPA (movimento de entrada)

No SQL Server, o bloco da última etapa usa um cursor **próprio**, sem filtrar
`data_fim`/`hora_fim` (`.sql` ~3081-3088). No Oracle, o mesmo bloco reaproveita
`c_numero_serie_op` passando `NULL, NULL` para data/hora fim (`.prc` ~linha 2741).
Como em Oracle `web.data_fim = NULL` **nunca é verdadeiro**, o laço **não roda** e
os números de série da entrada **deixam de ser gerados**.

**4a. Criar um cursor dedicado** junto às demais declarações de cursor
(por exemplo, logo após `c_numero_serie_op`, `.prc` ~linha 218):

```sql
   CURSOR c_numero_serie_op_ult(p_tipo_movimento VARCHAR2,
                                p_item VARCHAR2) IS
      SELECT web.id_registro,
             web.numero_serie
      FROM te_web_numero_serie_op web
      WHERE web.data_processamento IS NULL
      AND web.op = p_op
      AND web.talao = p_talao
      AND web.tipo_movimento = p_tipo_movimento
      AND web.cd_material = p_item;
```

**4b. Trocar a chamada** no bloco da última etapa (`.prc` ~linha 2741):

**Antes (Oracle):**
```sql
         IF mp.controla_ns = 1 THEN
            FOR ns IN c_numero_serie_op(mp.tipo_movimento, mp.material, NULL, NULL) LOOP
```

**Depois (Oracle):**
```sql
         IF mp.controla_ns = 1 THEN
            FOR ns IN c_numero_serie_op_ult(mp.tipo_movimento, mp.material) LOOP
```

> O restante do laço (INSERT em `esnserop`, `esnserie`, `esmnseri` e UPDATE em
> `te_web_numero_serie_op`) permanece igual — continua usando `ns.numero_serie`
> e `ns.id_registro`.

---

### Passo 5 — Condição do LOTE na última etapa

**Local:** bloco `--LOTE` da última etapa (`.prc` ~linha 3036; `.sql` ~3399).

**Antes (Oracle):**
```sql
         IF mp.usa_grade = 'L' THEN
```

**Depois (Oracle)** — equivalente ao `!= ''` do SQL Server:
```sql
         IF nvl(mp.usa_grade, ' ') != ' ' THEN
```

> Atenção: **não** altere a condição do LOTE dentro do laço de demandas
> (`.prc` ~linha 1919, `IF de.usa_grade = 'L'`). Lá as duas procedures já usam
> `= 'L'` e estão iguais. A mudança é **somente** na última etapa.

---

### Passo 6 — JOIN `peengenh` no cursor de demandas (`c_demandas_op`)

No SQL o JOIN usa o **material do movimento** (`@fcr_mp_material`); no Oracle usa
`dop.cd_codigo`. Para igualar, adicione um parâmetro de material ao cursor.

**6a. Cabeçalho do cursor** (`.prc` ~linhas 139-141):

**Antes:**
```sql
   CURSOR c_demandas_op(p_tipo_movimento VARCHAR2,
                        p_data_fim DATE,
                        p_hora_fim VARCHAR2) IS
```

**Depois:**
```sql
   CURSOR c_demandas_op(p_tipo_movimento VARCHAR2,
                        p_data_fim DATE,
                        p_hora_fim VARCHAR2,
                        p_material VARCHAR2) IS
```

**6b. JOIN da engenharia** (`.prc` ~linha 193):

**Antes:**
```sql
      LEFT JOIN peengenh eng ON eng.cd_pai = dop.cd_codigo
```

**Depois:**
```sql
      LEFT JOIN peengenh eng ON eng.cd_pai = p_material
```

**6c. Chamada do cursor** dentro do laço de movimentos (`.prc` ~linha 1262):

**Antes:**
```sql
      FOR de IN c_demandas_op(mp.tipo_movimento,
                              mp.data_fim,
                              mp.hora_fim) LOOP
```

**Depois:**
```sql
      FOR de IN c_demandas_op(mp.tipo_movimento,
                              mp.data_fim,
                              mp.hora_fim,
                              mp.material) LOOP
```

---

### Passo 7 — JOIN `getopera` no cursor "demanda sem estoque"

**Local:** `c_demanda_sem_estoque`, JOIN `getopera` (`.prc` ~linha 257; `.sql` ~600).

O `decode(web.quantidade, 0, 398, 397)` do Oracle trata **negativos como 397**,
enquanto o SQL trata **negativos como 398**. Para igualar:

**Antes (Oracle):**
```sql
      INNER JOIN getopera tp ON tp.cd_tipo_operaca = decode(web.quantidade, 0, cgfc_busca_configuracao(398, v_codigo_usuario), cgfc_busca_configuracao(397, v_codigo_usuario))
```

**Depois (Oracle)** — mesma regra do `iif(web.quantidade > 0, 397, 398)`:
```sql
      INNER JOIN getopera tp ON tp.cd_tipo_operaca = CASE
                                                        WHEN web.quantidade > 0 THEN cgfc_busca_configuracao(397, v_codigo_usuario)
                                                        ELSE cgfc_busca_configuracao(398, v_codigo_usuario)
                                                     END
```

---

### Passo 8 — NCM no `esmovime` (movimento de saída) — **CONFIRMAR**

**Local:** INSERT em `esmovime` do laço de demandas, coluna `ncm`
(`.prc` ~linha 1549; `.sql` ~1836).

O SQL grava o NCM **do movimento** (`@fcr_mp_ncm`); o Oracle grava o NCM
**da demanda** (`de.ncm`).

**Antes (Oracle):**
```sql
                de.ncm, --<Ncm, float>
```

**Depois (Oracle)** — para ficar igual ao SQL Server:
```sql
                mp.ncm, --<Ncm, float>
```

> ⚠️ **Decisão de negócio:** confirme com o responsável qual NCM é o correto
> para o movimento de saída do insumo (o do insumo/demanda ou o do produto do
> movimento). Aplique este passo somente após a confirmação. Se o correto for o
> da demanda, então quem precisa mudar é o SQL Server, não o Oracle.

---

### Passo 9 — Descrição do `esmovime` (saída): remover o `' - '` final

**Local:** INSERT em `esmovime` do laço de demandas, coluna `descricao`
(`.prc` ~linhas 1522-1526; `.sql` ~1812-1816).

**Antes (Oracle):**
```sql
                CASE mp.tipo_movimento 
                   WHEN 'F' THEN 'Fabricado' 
                   WHEN 'D' THEN 'Defeito' 
                   WHEN 'P' THEN 'Perdido' 
                END || ' cfme. OP ' || to_char(p_op) || ' - ', --<Descricao, char(201)>
```

**Depois (Oracle)** — sem o `|| ' - '`:
```sql
                CASE mp.tipo_movimento 
                   WHEN 'F' THEN 'Fabricado' 
                   WHEN 'D' THEN 'Defeito' 
                   WHEN 'P' THEN 'Perdido' 
                END || ' cfme. OP ' || to_char(p_op), --<Descricao, char(201)>
```

---

### Passo 10 — Data do `HAVING` no cursor "demanda sem estoque"

**Local:** `HAVING` do `c_demanda_sem_estoque`, parâmetro de data da
`cgfc_est_posicao_estoque` (`.prc` ~linha 278; `.sql` ~631).

**Antes (Oracle):**
```sql
      HAVING cgfc_est_posicao_estoque('1', 'Q', op.uni_neg, web.cd_centro_armazenagem, dop.item, dop.especif1, dop.especif2, dop.especif3, dop.numeracao, lot.lote, SYSDATE, 0, ' ') < SUM(web.quantidade);
```

**Depois (Oracle)** — usar `v_data_atual`, como o `@v_data_atual` do SQL:
```sql
      HAVING cgfc_est_posicao_estoque('1', 'Q', op.uni_neg, web.cd_centro_armazenagem, dop.item, dop.especif1, dop.especif2, dop.especif3, dop.numeracao, lot.lote, v_data_atual, 0, ' ') < SUM(web.quantidade);
```

> Observação: `v_data_atual` no Oracle é `trunc(SYSDATE)` (sem hora), enquanto no
> SQL `@v_data_atual = dbo.cgfc_dataatual()`. Se `cgfc_dataatual()` puder devolver
> uma data diferente da data do sistema, avalie criar/uso de equivalente Oracle
> (ver seção 5, item opcional).

---

## 5. Itens que exigem DECISÃO (não aplicar "no automático")

### 5.1 UPDATE `teopxnumserie` (`/*CUSTOMIZADO*/`)

No SQL Server esse UPDATE está **ativo** (`.sql` ~3373-3378); no Oracle está
**comentado** (`.prc` ~3019-3025):

```sql
   -- Versão SQL Server (ativa):
   update teopxnumserie
   set produzido = 1,
       movimento = @v_movimento_entrada
   where op = @p_op
   and numero_serie = @fcr_ns_numero_serie
```

Está marcado como **CUSTOMIZADO** (customização de um cliente específico).
**Só ative no Oracle** se a base Oracle em questão também deve conter essa
customização e se a tabela `teopxnumserie` existir nesse ambiente. Se for para
igualar ao SQL, o equivalente Oracle é (dentro do laço da última etapa, junto ao
UPDATE de `te_web_numero_serie_op`):

```sql
               /*CUSTOMIZADO*/
               UPDATE teopxnumserie
               SET produzido = 1,
                   movimento = v_movimento_entrada
               WHERE op = p_op
               AND numero_serie = ns.numero_serie;
```

### 5.2 `cgfc_dataatual()` × `trunc(SYSDATE)` (opcional)

O SQL usa a data de negócio `dbo.cgfc_dataatual()`; o Oracle usa
`trunc(SYSDATE)`. Se existir uma função de "data atual do sistema" no Oracle e o
negócio exigir essa data (e não a do servidor), padronize `v_data_atual` para
usá-la. Caso contrário, mantenha `trunc(SYSDATE)`.

### 5.3 `num_de_serie_alt` (baixíssimo impacto)

SQL grava `convert(binary(10),'')`; Oracle grava `' '` (`.prc` ~1804 / `.sql` ~2112).
Ambos representam um binário vazio. Só ajuste se houver validação estrita de tipo
`RAW`/`binary` nessa coluna.

---

## 6. Checklist de validação (homologação)

Após aplicar os passos 1-10 (e decidir os itens da seção 5):

1. **Compilação**
   - [ ] A procedure compila sem erros (`SHOW ERRORS` limpo).
   - [ ] A função `cgfc_busca_total_horas` existe e está `VALID` (Passo 3).

2. **Apontamento simples (fabricado, sem última etapa)**
   - [ ] `pcmoprod.campo26` recebe o total de horas (não `0`) — Passo 1.

3. **Reapontamento (movimento já existente)**
   - [ ] `pcmoprod.quantidade` acumula e `campo26` é recalculado — Passo 2.

4. **Apontamento com número de série na última etapa**
   - [ ] São gerados `esnserop`, `esnserie`, `esmnseri` da entrada — Passo 4.

5. **Material com controle de lote/grade na última etapa**
   - [ ] A grade (`esgmovim`) da entrada é gerada para material com `campo85`
     preenchido (não só `'L'`) — Passo 5.

6. **Demanda com engenharia (`peengenh`)**
   - [ ] `val_final` (e a observação de engenharia) confere com a versão SQL — Passo 6.

7. **Bloqueio por estoque insuficiente (config. ES GE 38 = "B") com quantidade negativa**
   - [ ] O tipo de operação escolhido é o mesmo do SQL (398 para negativos) — Passo 7.

8. **Movimento de saída**
   - [ ] `esmovime.ncm` conforme decidido no Passo 8.
   - [ ] `esmovime.descricao` sem o `' - '` no final — Passo 9.

9. **Comparação final**
   - [ ] Rodar a mesma OP/talão nos dois bancos e comparar linha a linha as
     tabelas afetadas: `pcmoprod`, `pcmvtoop`, `esmovime`, `esgmovim`,
     `esnserop`, `esnserie`, `esmnseri`, `pcdemop`, `esdemand`, `pctaop`,
     `pcorprod`, `esordens`, `pcoengop`, `geacomp`.

---

## 7. Resumo executivo

- As procedures são **funcionalmente equivalentes** na maior parte; a maioria das
  diferenças é só **dialeto** (Parte A) e não precisa de ação.
- Existem **12 diferenças de comportamento** (Parte B). Destas:
  - **10 devem ser aplicadas no Oracle** (Passos 1-10) para igualar ao SQL Server.
  - **2 exigem decisão** (`teopxnumserie` customizado e a origem do `ncm`).
- Os pontos de **maior impacto** são o **Passo 4** (número de série da última etapa
  que hoje **não é gerado** no Oracle) e o **Passo 2** (quantidade/horas não
  atualizadas no reapontamento).
