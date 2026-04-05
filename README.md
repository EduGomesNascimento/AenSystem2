# AENSYSTEMS no GitHub Pages

Este repositório publica o site da AENSYSTEMS em hospedagem estática e inclui a área privada `Área das GPs`, construída para funcionar com `Supabase Auth`, banco de dados online, MFA por TOTP e `Row Level Security`.

## O que mudou nesta revisão

- Correção dos nomes das empresas para `INTELECTA` e `PRODALY`.
- Inclusão de papéis de acesso: `gp`, `consultor`, `admin`.
- MFA obrigatório para contas `consultor`.
- Ampliação do schema com `ativo`, `mfa_required`, `prioridade` e `audit_logs`.
- Policies de RLS revisadas para empresa, papel, usuário ativo e nível MFA.
- UI da Área das GPs melhorada com inicialização segura, filtros extras, dashboard resumido, estados de erro e layout mobile mais forte.

## Arquitetura

### Frontend

- Site estático gerado por `Python + Jinja`.
- Build em [`build.py`](./build.py) para a pasta `docs/`.
- Área privada em `/area-gps/`.
- Principais arquivos:
  - [`templates/aen_area_gps.html`](./templates/aen_area_gps.html)
  - [`static/js/aen-area-gps.js`](./static/js/aen-area-gps.js)
  - [`static/js/aen-supabase-config.js`](./static/js/aen-supabase-config.js)
  - [`static/css/aensystems.css`](./static/css/aensystems.css)

### Backend no Supabase

- `Supabase Auth` para login por e-mail e senha.
- MFA por TOTP para consultores.
- `Postgres` como fonte oficial dos dados.
- `RLS` como mecanismo principal de autorização.
- Auditoria básica via tabela `audit_logs` e função `log_audit_event`.

### Princípio de segurança

O site no GitHub Pages entrega apenas arquivos estáticos. Por isso:

- o frontend usa somente `Project URL` e `anon public key`
- nenhum segredo administrativo fica no navegador
- a proteção real está no banco e nas regras do Auth

## Empresas suportadas

- `INTELECTA`
- `PRODALY`

## Perfis de usuário

- `gp`: visualiza somente demandas da própria empresa
- `consultor`: visualiza somente demandas da própria empresa e precisa concluir MFA
- `admin`: gerencia demandas e orçamentos dentro do próprio site, com escrita liberada apenas pelas policies de RLS

## Estrutura de banco

Scripts em:

- [`supabase/schema.sql`](./supabase/schema.sql)
- [`supabase/seed.sql`](./supabase/seed.sql)

### `profiles`

- `id uuid`
- `email text`
- `nome text`
- `empresa gp_company`
- `role gp_role`
- `ativo boolean`
- `mfa_required boolean`
- `created_at timestamptz`
- `updated_at timestamptz`

Regra importante:

- contas com `role = 'consultor'` precisam ter `mfa_required = true`

### `demandas`

- `id uuid`
- `referencia_externa text`
- `empresa gp_company`
- `cliente text`
- `titulo text`
- `descricao text`
- `status text`
- `responsavel text`
- `prioridade gp_priority`
- `horas_previstas numeric`
- `horas_gastas numeric`
- `data_criacao timestamptz`
- `data_atualizacao timestamptz`

### `audit_logs`

- `id bigint`
- `user_id uuid`
- `empresa gp_company`
- `role gp_role`
- `event_type text`
- `event_status text`
- `details jsonb`
- `created_at timestamptz`

## Autenticação

### Login principal

1. Usuário acessa `/area-gps/`.
2. Informa e-mail e senha.
3. O frontend valida a sessão com Supabase Auth.
4. O frontend consulta `profiles`.
5. Se o perfil for `consultor` com `mfa_required = true`, a sessão só prossegue após TOTP válido.

### MFA para consultores

Fluxo implementado:

1. senha validada
2. leitura do perfil
3. se `mfa_required = true`, o frontend verifica os fatores MFA
4. se não houver fator TOTP verificado, abre a etapa de cadastro com QR Code
5. se já houver fator verificado, pede o código do autenticador
6. somente após `aal2` a área privada é carregada

### Como marcar consultores com MFA obrigatório

```sql
update public.profiles
set nome = 'Consultor INTELECTA',
    empresa = 'INTELECTA',
    role = 'consultor',
    ativo = true,
    mfa_required = true
where email = 'consultor.intelecta@seudominio.com';

update public.profiles
set nome = 'Consultor PRODALY',
    empresa = 'PRODALY',
    role = 'consultor',
    ativo = true,
    mfa_required = true
where email = 'consultor.prodaly@seudominio.com';
```

## Autorização por empresa e papel

As policies em `demandas` consideram ao mesmo tempo:

- usuário autenticado
- perfil ativo
- papel do usuário
- empresa vinculada
- nível MFA da sessão quando `mfa_required = true`
- status permitido

Os únicos status liberados para a Área das GPs são:

- `Aprovar`
- `Iniciar`
- `Desenvolvimento`

Tudo fora disso fica bloqueado no banco, não apenas escondido no front-end.

Exceção administrativa:

- contas `admin` ativas e autorizadas podem consultar todos os registros para gestão interna no painel administrativo do site
- `insert`, `update` e `delete` em `demandas` são permitidos apenas para `admin`

## Configuração passo a passo

### 1. Criar o projeto no Supabase

1. Crie um projeto no Supabase.
2. Copie:
   - `Project URL`
   - `anon public key`
3. Nunca use `service_role key` no frontend.

### 2. Aplicar o schema

1. Abra `SQL Editor`.
2. Execute [`supabase/schema.sql`](./supabase/schema.sql).
3. Opcionalmente execute [`supabase/seed.sql`](./supabase/seed.sql).

### 3. Criar usuários manualmente

1. Vá em `Authentication > Users`.
2. Crie os usuários manualmente.
3. A trigger cria a linha em `profiles`.
4. Atualize empresa, papel e MFA conforme necessário.

Conta administrativa recomendada:

```sql
update public.profiles
set nome = 'Administrador AEN SYSTEMS',
    empresa = null,
    role = 'admin',
    ativo = true,
    mfa_required = true
where email = 'aensistemas@gmail.com';
```

Exemplo para contas `gp`:

```sql
update public.profiles
set nome = 'GP INTELECTA',
    empresa = 'INTELECTA',
    role = 'gp',
    ativo = true,
    mfa_required = false
where email = 'gp.intelecta@seudominio.com';

update public.profiles
set nome = 'GP PRODALY',
    empresa = 'PRODALY',
    role = 'gp',
    ativo = true,
    mfa_required = false
where email = 'gp.prodaly@seudominio.com';
```

### 4. Desabilitar cadastro público

No Supabase Auth, desabilite o cadastro público por e-mail se ele estiver ativo. Esta solução parte do princípio de provisionamento manual.

### 5. Habilitar MFA no projeto

No painel do Supabase Auth, mantenha o fluxo de MFA/TOTP disponível para o projeto. O frontend desta área privada já está preparado para:

- cadastrar fator TOTP
- validar fator verificado
- promover a sessão para `aal2`

### 6. Configurar variáveis públicas do frontend

Defina no build:

- `AEN_SUPABASE_URL`
- `AEN_SUPABASE_ANON_KEY`

Exemplo:

```powershell
$env:AEN_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
$env:AEN_SUPABASE_ANON_KEY="SUA_ANON_PUBLIC_KEY"
python build.py
```

O `build.py` gera automaticamente `docs/static/js/aen-supabase-config.js`.

### 7. Publicar no GitHub Pages

```powershell
python build.py
```

Depois:

1. revise `docs/`
2. faça commit
3. publique via GitHub Pages apontando para `docs/`
4. mantenha o domínio em `HTTPS`

## Experiência da Área das GPs

Funcionalidades implementadas:

- validação de sessão no carregamento
- bloqueio de rota sem autenticação
- tela de inicialização para evitar flash de conteúdo
- login com mensagens claras e loading state
- etapa separada para MFA
- dashboard com cards por status
- filtros por texto, status, responsável e prioridade
- contador de registros visíveis
- tabela responsiva
- cards para mobile
- estado vazio com botão de nova tentativa
- logout limpo

## Importação futura

A fonte oficial continua sendo o banco Supabase. A planilha local não é acessada pelo navegador.

Foi deixada uma base para importação manual:

- script: [`supabase/import_demandas_csv.py`](./supabase/import_demandas_csv.py)
- gera SQL de upsert
- mapeia empresa, prioridade, horas, datas e demais campos

Exemplo:

```powershell
python supabase/import_demandas_csv.py --input .\dados\demandas.csv --default-company INTELECTA
```

## Considerações de segurança

### GitHub Pages não guarda segredo

Qualquer valor embutido no frontend pode ser inspecionado. Portanto:

- não use `service_role`
- não coloque senha fixa no código
- não tente mascarar segredo no JavaScript

### A autorização está no banco

O frontend só consome dados já autorizados. Mesmo que alguém altere o navegador:

- `RLS` continua separando empresas
- status fora do escopo continuam bloqueados
- consultores sem `aal2` continuam sem acesso aos dados

### MFA reforça contas sensíveis

Para `consultor`, a senha isolada não basta. O banco também exige sessão com nível compatível quando `mfa_required = true`.

### Auditoria

Eventos autenticados como login bem-sucedido, conclusão de MFA, logout e acesso ao dashboard podem ser registrados via `audit_logs`.

Limitação atual:

- falhas de login antes da autenticação ainda não são gravadas no banco de forma confiável, porque isso exigiria um backend adicional ou função pública mais controlada

## Limitações atuais

- sem painel administrativo completo
- criação de usuários ainda manual
- sem redefinição de senha customizada no site
- importação CSV/XLSX ainda é manual
- auditoria de falha pré-login ainda não está persistida no banco

## Roadmap futuro

- painel admin
- cadastro de empresas adicionais
- importação automática de planilhas
- trilha de auditoria completa
- redefinição de senha
- convites por e-mail
- liberação de acesso por validade
- dashboard executivo

## Arquivos principais

- [`build.py`](./build.py)
- [`templates/aen_base.html`](./templates/aen_base.html)
- [`templates/aen_area_gps.html`](./templates/aen_area_gps.html)
- [`static/css/aensystems.css`](./static/css/aensystems.css)
- [`static/js/aen-area-gps.js`](./static/js/aen-area-gps.js)
- [`supabase/schema.sql`](./supabase/schema.sql)
- [`supabase/seed.sql`](./supabase/seed.sql)
- [`supabase/import_demandas_csv.py`](./supabase/import_demandas_csv.py)
