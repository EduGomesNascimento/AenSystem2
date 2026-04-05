update public.profiles
set nome = 'GP INTELECTA',
    empresa = 'INTELECTA',
    role = 'gp',
    ativo = true,
    mfa_required = false
where email = 'gp.intelecta@exemplo.com';

update public.profiles
set nome = 'Consultor INTELECTA',
    empresa = 'INTELECTA',
    role = 'consultor',
    ativo = true,
    mfa_required = true
where email = 'consultor.intelecta@exemplo.com';

update public.profiles
set nome = 'GP PRODALY',
    empresa = 'PRODALY',
    role = 'gp',
    ativo = true,
    mfa_required = false
where email = 'gp.prodaly@exemplo.com';

update public.profiles
set nome = 'Consultor PRODALY',
    empresa = 'PRODALY',
    role = 'consultor',
    ativo = true,
    mfa_required = true
where email = 'consultor.prodaly@exemplo.com';

update public.profiles
set nome = 'Administrador AEN SYSTEMS',
    empresa = null,
    role = 'admin',
    ativo = true,
    mfa_required = true
where email = 'aensistemas@gmail.com';

insert into public.demandas (
  referencia_externa,
  empresa,
  cliente,
  titulo,
  descricao,
  status,
  responsavel,
  prioridade,
  horas_previstas,
  horas_gastas,
  data_criacao,
  data_atualizacao
)
values
  (
    'INTA-001',
    'INTELECTA',
    'Cliente INTELECTA A',
    'Ajuste de integração fiscal',
    'Adequar a integração para o novo layout recebido do ERP.',
    'Desenvolvimento',
    'Equipe AEN',
    'Alta',
    24,
    11.5,
    timezone('utc', now()) - interval '6 days',
    timezone('utc', now()) - interval '2 hours'
  ),
  (
    'INTA-002',
    'INTELECTA',
    'Cliente INTELECTA B',
    'Validação de orçamento',
    'Aguardando aprovação para início do desenvolvimento.',
    'Aprovar',
    'Equipe AEN',
    'Media',
    8,
    0,
    timezone('utc', now()) - interval '3 days',
    timezone('utc', now()) - interval '1 day'
  ),
  (
    'PROD-001',
    'PRODALY',
    'Cliente PRODALY A',
    'Nova rotina de importação',
    'Estruturar a rotina e validar cenários de exceção.',
    'Iniciar',
    'Equipe AEN',
    'Alta',
    16,
    2,
    timezone('utc', now()) - interval '4 days',
    timezone('utc', now()) - interval '5 hours'
  ),
  (
    'PROD-002',
    'PRODALY',
    'Cliente PRODALY B',
    'Refino de dashboard operacional',
    'Entregar melhoria visual e ajustes de consulta no painel atual.',
    'Desenvolvimento',
    'Equipe AEN',
    'Critica',
    30,
    19.5,
    timezone('utc', now()) - interval '2 days',
    timezone('utc', now()) - interval '3 hours'
  ),
  (
    'PROD-999',
    'PRODALY',
    'Cliente PRODALY Arquivado',
    'Entrega já concluída',
    'Exemplo de item que não deve aparecer na Área das GPs.',
    'Finalizado',
    'Equipe AEN',
    'Baixa',
    12,
    12,
    timezone('utc', now()) - interval '20 days',
    timezone('utc', now()) - interval '15 days'
  )
on conflict (empresa, referencia_externa)
do update set
  cliente = excluded.cliente,
  titulo = excluded.titulo,
  descricao = excluded.descricao,
  status = excluded.status,
  responsavel = excluded.responsavel,
  prioridade = excluded.prioridade,
  horas_previstas = excluded.horas_previstas,
  horas_gastas = excluded.horas_gastas,
  data_atualizacao = excluded.data_atualizacao;
