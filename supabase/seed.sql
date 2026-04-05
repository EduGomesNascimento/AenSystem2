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
  gerente_projetos,
  consultor,
  titulo,
  descricao,
  documento_lrc_email,
  os_item_ticket,
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
    'Marina AEN',
    'Rafael AEN',
    'Ajuste de integração fiscal',
    'Adequar a integração para o novo layout recebido do ERP.',
    'LRC-2026-INTA-001',
    'OS-4101 / ITEM-03 / TK-9001',
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
    'Marina AEN',
    'Luciana AEN',
    'Validação de orçamento',
    'Aguardando aprovação para início do desenvolvimento.',
    'orcamento.intelecta-b@cliente.com',
    'OS-4102 / ITEM-01 / TK-9002',
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
    'Carlos AEN',
    'Fernanda AEN',
    'Nova rotina de importação',
    'Estruturar a rotina e validar cenários de exceção.',
    'LRC-2026-PROD-001',
    'OS-5101 / ITEM-04 / TK-9101',
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
    'Carlos AEN',
    'Fernanda AEN',
    'Refino de dashboard operacional',
    'Entregar melhoria visual e ajustes de consulta no painel atual.',
    'suporte.prodaly-b@cliente.com',
    'OS-5102 / ITEM-06 / TK-9102',
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
    'Carlos AEN',
    'Fernanda AEN',
    'Entrega já concluída',
    'Exemplo de item que não deve aparecer na Área das GPs.',
    'arquivo.prodaly@cliente.com',
    'OS-5999 / ITEM-99 / TK-9999',
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
  gerente_projetos = excluded.gerente_projetos,
  consultor = excluded.consultor,
  titulo = excluded.titulo,
  descricao = excluded.descricao,
  documento_lrc_email = excluded.documento_lrc_email,
  os_item_ticket = excluded.os_item_ticket,
  status = excluded.status,
  responsavel = excluded.responsavel,
  prioridade = excluded.prioridade,
  horas_previstas = excluded.horas_previstas,
  horas_gastas = excluded.horas_gastas,
  data_atualizacao = excluded.data_atualizacao;
