import argparse
import csv
from datetime import datetime
from pathlib import Path

ALIASES = {
    "referencia_externa": ["referencia_externa", "id", "codigo", "orcamento_id", "demanda_id"],
    "empresa": ["empresa", "company"],
    "cliente": ["cliente", "cliente_nome", "empresa_cliente"],
    "titulo": ["titulo", "assunto", "demanda", "orcamento"],
    "descricao": ["descricao", "detalhes", "observacoes"],
    "status": ["status", "etapa"],
    "responsavel": ["responsavel", "owner"],
    "prioridade": ["prioridade", "priority"],
    "horas_previstas": ["horas_previstas", "horas previstas", "estimativa_horas"],
    "horas_gastas": ["horas_gastas", "horas gastas", "realizado_horas"],
    "data_criacao": ["data_criacao", "criado_em"],
    "data_atualizacao": ["data_atualizacao", "atualizado_em"],
}

COMPANY_MAP = {
    "intelecta": "INTELECTA",
    "intelect": "INTELECTA",
    "prodaly": "PRODALY",
    "prodali": "PRODALY",
}

PRIORITY_MAP = {
    "baixa": "Baixa",
    "media": "Media",
    "média": "Media",
    "alta": "Alta",
    "critica": "Critica",
    "crítica": "Critica",
}


def normalize_header(value: str) -> str:
    return value.strip().lower()


def find_column(fieldnames, logical_name):
    lookup = {normalize_header(name): name for name in fieldnames}
    for alias in ALIASES[logical_name]:
        key = normalize_header(alias)
        if key in lookup:
            return lookup[key]
    return None


def parse_number(value: str | None) -> str:
    if value is None or not str(value).strip():
        return "0"
    normalized = str(value).strip().replace(" ", "")
    if "," in normalized and "." in normalized:
        normalized = normalized.replace(".", "").replace(",", ".") if normalized.rfind(",") > normalized.rfind(".") else normalized.replace(",", "")
    elif "," in normalized:
        normalized = normalized.replace(",", ".")
    return str(float(normalized))


def parse_datetime(value: str | None) -> str:
    if value is None or not str(value).strip():
        return "timezone('utc', now())"
    raw = str(value).strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M", "%d/%m/%Y"):
        try:
            return f"'{datetime.strptime(raw, fmt).isoformat()}'::timestamptz"
        except ValueError:
            pass
    return f"'{raw}'::timestamptz"


def escape_sql(value: str | None) -> str:
    if value is None or not str(value).strip():
        return "null"
    return "'" + str(value).strip().replace("'", "''") + "'"


def normalize_company(value: str | None) -> str:
    if not value:
        raise ValueError("Empresa ausente e nenhuma empresa padrão foi informada.")
    key = str(value).strip().lower()
    if key not in COMPANY_MAP:
        raise ValueError(f"Empresa inválida: {value!r}. Valores aceitos atualmente: INTELECTA, PRODALY.")
    return COMPANY_MAP[key]


def normalize_priority(value: str | None) -> str:
    if not value:
        return "Media"
    return PRIORITY_MAP.get(str(value).strip().lower(), str(value).strip())


def build_row(row, columns, default_company):
    reference = row.get(columns["referencia_externa"])
    if not reference or not str(reference).strip():
        raise ValueError("Cada linha precisa de uma referência externa estável para upsert.")

    company_value = row.get(columns["empresa"]) if columns["empresa"] else default_company
    company = normalize_company(company_value)
    cliente = row.get(columns["cliente"])
    titulo = row.get(columns["titulo"])
    status = row.get(columns["status"])

    if not cliente or not str(cliente).strip():
        raise ValueError(f"Linha {reference!r} sem cliente.")
    if not titulo or not str(titulo).strip():
        raise ValueError(f"Linha {reference!r} sem título.")
    if not status or not str(status).strip():
        raise ValueError(f"Linha {reference!r} sem status.")

    return """  (
    {referencia_externa},
    {empresa}::public.gp_company,
    {cliente},
    {titulo},
    {descricao},
    {status},
    {responsavel},
    {prioridade}::public.gp_priority,
    {horas_previstas},
    {horas_gastas},
    {data_criacao},
    {data_atualizacao}
  )""".format(
        referencia_externa=escape_sql(reference),
        empresa=escape_sql(company),
        cliente=escape_sql(cliente),
        titulo=escape_sql(titulo),
        descricao=escape_sql(row.get(columns["descricao"]) if columns["descricao"] else None),
        status=escape_sql(status),
        responsavel=escape_sql(row.get(columns["responsavel"]) if columns["responsavel"] else None),
        prioridade=escape_sql(normalize_priority(row.get(columns["prioridade"]) if columns["prioridade"] else None)),
        horas_previstas=parse_number(row.get(columns["horas_previstas"]) if columns["horas_previstas"] else "0"),
        horas_gastas=parse_number(row.get(columns["horas_gastas"]) if columns["horas_gastas"] else "0"),
        data_criacao=parse_datetime(row.get(columns["data_criacao"]) if columns["data_criacao"] else None),
        data_atualizacao=parse_datetime(row.get(columns["data_atualizacao"]) if columns["data_atualizacao"] else None),
    )


def main():
    parser = argparse.ArgumentParser(description="Converte um CSV de demandas em SQL de upsert para o Supabase.")
    parser.add_argument("--input", required=True, help="Caminho do CSV de origem.")
    parser.add_argument("--output", default="supabase/generated-demandas-upsert.sql", help="Arquivo SQL de saída.")
    parser.add_argument("--default-company", help="Empresa padrão quando o CSV não tiver a coluna empresa.")
    parser.add_argument("--delimiter", default=";", help="Delimitador do CSV. Padrão: ';'.")
    args = parser.parse_args()

    with Path(args.input).open("r", encoding="utf-8-sig", newline="") as handler:
        reader = csv.DictReader(handler, delimiter=args.delimiter)
        if not reader.fieldnames:
            raise ValueError("CSV sem cabeçalho.")
        columns = {name: find_column(reader.fieldnames, name) for name in ALIASES}
        required = ["referencia_externa", "cliente", "titulo", "status"]
        missing = [name for name in required if not columns[name]]
        if missing:
            raise ValueError("Colunas obrigatórias ausentes: " + ", ".join(sorted(missing)))
        if not columns["empresa"] and not args.default_company:
            raise ValueError("Informe a coluna empresa no CSV ou use --default-company.")
        values = [build_row(row, columns, args.default_company) for row in reader]

    sql = """insert into public.demandas (
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
{values}
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
""".format(values=",\n".join(values))

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(sql, encoding="utf-8")


if __name__ == "__main__":
    main()
