import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

import pdfplumber
import pandas as pd
from openpyxl import load_workbook
from tqdm import tqdm


PASTA_PDFS = Path(".")
ARQUIVO_SAIDA = "resumo_empresas_consolidado.xlsx"
ARQUIVO_EMPRESAS = "empresas.xlsx"
ARQUIVO_RESUMO_EMPRESAS = "resumo_empresas.xlsx"


def limpar_empresa(texto_empresa: str) -> str:
    if not texto_empresa:
        return ""

    marcadores = ["CNPJ:", "Página:", "Cálculo:", "Competência:", "Emissão:", "Horas:"]
    for marcador in marcadores:
        if marcador in texto_empresa:
            texto_empresa = texto_empresa.split(marcador)[0]

    return " ".join(texto_empresa.split()).strip()


def extrair_empresa(texto: str) -> str | None:
    linhas = texto.splitlines()

    for linha in linhas:
        if "Empresa:" in linha:
            parte = linha.split("Empresa:", 1)[1].strip()
            parte = limpar_empresa(parte)
            if parte:
                return parte

    match = re.search(
        r"Empresa:\s*(.*?)\s*(?:CNPJ:|Página:|Cálculo:|Competência:|Emissão:|Horas:)",
        texto,
        re.S
    )
    if match:
        empresa = limpar_empresa(match.group(1))
        if empresa:
            return empresa

    return None


def extrair_cnpj(texto: str) -> str | None:
    match = re.search(r"CNPJ:\s*([\d\.\-/]+)", texto)
    if match:
        return match.group(1).strip()
    return None


def extrair_competencia(texto: str) -> str | None:
    match = re.search(r"Competência:\s*([0-9]{2}/[0-9]{4})", texto)
    if match:
        return match.group(1).strip()
    return None


def extrair_quantidades(texto: str) -> tuple[int, int, int]:
    empregados = 0
    estagiarios = 0
    contribuintes = 0

    match_emp_est = re.search(
        r"Empregados:\s*(\d+)\s+Estagiários:\s*(\d+)",
        texto
    )
    if match_emp_est:
        empregados = int(match_emp_est.group(1))
        estagiarios = int(match_emp_est.group(2))

    match_contrib = re.search(r"Contribuintes:\s*(\d+)", texto)
    if match_contrib:
        contribuintes = int(match_contrib.group(1))

    return empregados, estagiarios, contribuintes


def processar_pdf(caminho_pdf: Path) -> list[dict]:
    dados = []

    with pdfplumber.open(caminho_pdf) as pdf:
        for pagina_num, pagina in enumerate(pdf.pages, start=1):
            texto = pagina.extract_text() or ""

            if not texto.strip():
                continue

            empresa = extrair_empresa(texto)
            cnpj = extrair_cnpj(texto)
            competencia = extrair_competencia(texto)
            empregados, estagiarios, contribuintes = extrair_quantidades(texto)

            if not empresa and not cnpj:
                continue

            total = empregados + estagiarios + contribuintes

            dados.append({
                "arquivo_pdf": caminho_pdf.name,
                "pagina": pagina_num,
                "empresa": empresa,
                "cnpj": cnpj,
                "competencia": competencia,
                "empregados": empregados,
                "estagiarios": estagiarios,
                "contribuintes": contribuintes,
                "total": total
            })

    return dados


def processar_pasta(pasta_pdfs: Path) -> pd.DataFrame:
    todos_dados = []

    pdfs = sorted(pasta_pdfs.glob("*.pdf"))
    if not pdfs:
        print("Nenhum PDF encontrado na pasta.")
        return pd.DataFrame()

    for pdf in tqdm(pdfs, desc="Processando PDFs", unit="pdf"):
        dados_pdf = processar_pdf(pdf)
        todos_dados.extend(dados_pdf)

    return pd.DataFrame(todos_dados)


def consolidar_por_cnpj_e_competencia(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    df_base = df.copy()
    df_base = df_base.sort_values(["cnpj", "competencia", "empresa"], na_position="last")

    consolidado = (
        df_base.groupby(["cnpj", "competencia"], dropna=False, as_index=False)
        .agg(
            empresa=("empresa", "first"),
            empregados=("empregados", "sum"),
            estagiarios=("estagiarios", "sum"),
            contribuintes=("contribuintes", "sum"),
            total=("total", "sum")
        )
        .sort_values(["competencia", "empresa"], na_position="last")
    )

    return consolidado


def normalizar_cnpj_valor(valor) -> str:
    if pd.isna(valor):
        return ""

    texto = str(valor).strip()
    if not texto:
        return ""

    texto = texto.replace(" ", "")

    texto_limpo = re.sub(r"\D", "", texto)
    if texto_limpo and ("E" not in texto.upper()):
        return texto_limpo.zfill(14)

    texto_decimal = texto.replace(",", ".")
    try:
        numero = Decimal(texto_decimal)
        inteiro = str(numero.quantize(Decimal("1")))
        inteiro = re.sub(r"\D", "", inteiro)
        return inteiro.zfill(14)
    except (InvalidOperation, ValueError):
        pass

    texto_limpo = re.sub(r"\D", "", texto)
    return texto_limpo.zfill(14)


def normalizar_cnpj(serie: pd.Series) -> pd.Series:
    return serie.apply(normalizar_cnpj_valor)


def encontrar_por_nome_aproximado(df_empresas: pd.DataFrame, empresa_pdf: str) -> pd.DataFrame:
    empresa_norm = str(empresa_pdf).strip().upper()

    return df_empresas[
        df_empresas["razao_norm"].apply(
            lambda x: (empresa_norm in x or x in empresa_norm) if isinstance(x, str) and empresa_norm else False
        )
    ]


def gerar_resumo_empresas(df_consolidado: pd.DataFrame, arquivo_empresas: str) -> pd.DataFrame:
    df_empresas = pd.read_excel(arquivo_empresas, dtype=str)
    df_empresas.columns = [col.strip().lower() for col in df_empresas.columns]

    colunas_necessarias = ["codigo", "razao", "cnpj"]
    for coluna in colunas_necessarias:
        if coluna not in df_empresas.columns:
            raise ValueError(f"Coluna '{coluna}' não encontrada em {arquivo_empresas}")

    df_empresas["cnpj_chave"] = normalizar_cnpj(df_empresas["cnpj"])

    df_consolidado_tmp = df_consolidado.copy()
    df_consolidado_tmp["cnpj_chave"] = normalizar_cnpj(df_consolidado_tmp["cnpj"])

    df_totais = (
        df_consolidado_tmp.groupby("cnpj_chave", as_index=False)
        .agg(
            empregados=("empregados", "sum"),
            contribuintes=("contribuintes", "sum"),
            estagiarios=("estagiarios", "sum"),
            total=("total", "sum")
        )
    )

    df_final = df_empresas.merge(df_totais, on="cnpj_chave", how="left")

    for col in ["empregados", "contribuintes", "estagiarios", "total"]:
        if col not in df_final.columns:
            df_final[col] = 0
        df_final[col] = df_final[col].fillna(0).astype(int)

    df_final = df_final[df_final["total"] > 0].copy()
    df_final["codigo"] = pd.to_numeric(df_final["codigo"], errors="coerce").fillna(0).astype(int)

    df_final = df_final[["codigo", "razao", "empregados", "contribuintes", "estagiarios", "total"]]
    df_final.columns = ["CODIGO", "RAZAO", "EMPREGADOS", "CONTRIBUINTES", "ESTAGIARIOS", "TOTAL"]

    df_final = df_final.sort_values("TOTAL", ascending=False)

    return df_final


def listar_nao_encontradas_no_resumo(df_consolidado: pd.DataFrame, arquivo_empresas: str) -> pd.DataFrame:
    df_empresas = pd.read_excel(arquivo_empresas, dtype=str)
    df_empresas.columns = [col.strip().lower() for col in df_empresas.columns]

    colunas_necessarias = ["codigo", "razao", "cnpj"]
    for coluna in colunas_necessarias:
        if coluna not in df_empresas.columns:
            raise ValueError(f"Coluna '{coluna}' não encontrada em {arquivo_empresas}")

    df_empresas["cnpj_chave"] = normalizar_cnpj(df_empresas["cnpj"])

    df_consolidado_chk = df_consolidado.copy()
    df_consolidado_chk["cnpj_chave"] = normalizar_cnpj(df_consolidado_chk["cnpj"])

    comparacao = df_consolidado_chk.merge(
        df_empresas[["codigo", "razao", "cnpj_chave"]],
        on="cnpj_chave",
        how="left",
        indicator=True
    )

    nao_encontradas = comparacao[comparacao["_merge"] == "left_only"].copy()

    if nao_encontradas.empty:
        return pd.DataFrame(columns=[
            "empresa", "cnpj", "competencia",
            "empregados", "contribuintes", "estagiarios", "total"
        ])

    return nao_encontradas[
        ["empresa", "cnpj", "competencia", "empregados", "contribuintes", "estagiarios", "total"]
    ].sort_values(["empresa", "competencia"], na_position="last")


def gerar_diagnostico_nao_encontradas(df_nao_encontradas: pd.DataFrame, arquivo_empresas: str) -> pd.DataFrame:
    df_empresas = pd.read_excel(arquivo_empresas, dtype=str)
    df_empresas.columns = [col.strip().lower() for col in df_empresas.columns]

    colunas_necessarias = ["codigo", "razao", "cnpj"]
    for coluna in colunas_necessarias:
        if coluna not in df_empresas.columns:
            raise ValueError(f"Coluna '{coluna}' não encontrada em {arquivo_empresas}")

    df_empresas["cnpj_chave"] = normalizar_cnpj(df_empresas["cnpj"])
    df_empresas["razao_norm"] = (
        df_empresas["razao"]
        .fillna("")
        .astype(str)
        .str.strip()
        .str.upper()
    )

    if df_nao_encontradas.empty:
        return pd.DataFrame(columns=[
            "empresa_pdf", "cnpj_pdf", "competencia", "total",
            "codigo_planilha", "razao_planilha", "cnpj_planilha", "motivo_provavel"
        ])

    diagnosticos = []

    for _, row in df_nao_encontradas.iterrows():
        empresa_pdf = str(row.get("empresa", "")).strip()
        cnpj_pdf = str(row.get("cnpj", "")).strip()
        competencia = row.get("competencia", "")
        total = row.get("total", 0)

        cnpj_chave = normalizar_cnpj(pd.Series([cnpj_pdf])).iloc[0]

        match_cnpj = df_empresas[df_empresas["cnpj_chave"] == cnpj_chave]
        match_nome = encontrar_por_nome_aproximado(df_empresas, empresa_pdf)

        if len(match_cnpj) > 0:
            motivo = "CNPJ existe na planilha; verificar divergencia no fluxo"
            codigo = match_cnpj.iloc[0]["codigo"]
            razao = match_cnpj.iloc[0]["razao"]
            cnpj_planilha = match_cnpj.iloc[0]["cnpj"]
        elif len(match_nome) > 0:
            motivo = "Razao social encontrada, mas CNPJ divergente"
            codigo = match_nome.iloc[0]["codigo"]
            razao = match_nome.iloc[0]["razao"]
            cnpj_planilha = match_nome.iloc[0]["cnpj"]
        else:
            motivo = "Empresa nao encontrada na planilha empresas"
            codigo = ""
            razao = ""
            cnpj_planilha = ""

        diagnosticos.append({
            "empresa_pdf": empresa_pdf,
            "cnpj_pdf": cnpj_pdf,
            "competencia": competencia,
            "total": total,
            "codigo_planilha": codigo,
            "razao_planilha": razao,
            "cnpj_planilha": cnpj_planilha,
            "motivo_provavel": motivo
        })

    return pd.DataFrame(diagnosticos)


def ajustar_largura_colunas(nome_arquivo: str) -> None:
    wb = load_workbook(nome_arquivo)

    for ws in wb.worksheets:
        for col in ws.columns:
            max_length = 0
            col_letter = col[0].column_letter

            for cell in col:
                valor = "" if cell.value is None else str(cell.value)
                if len(valor) > max_length:
                    max_length = len(valor)

            ws.column_dimensions[col_letter].width = max_length + 2

    wb.save(nome_arquivo)


def salvar_excel(
    df_bruto: pd.DataFrame,
    df_consolidado: pd.DataFrame,
    df_nao_encontradas: pd.DataFrame,
    df_diagnostico: pd.DataFrame,
    nome_saida: str
) -> None:
    with pd.ExcelWriter(nome_saida, engine="openpyxl") as writer:
        df_consolidado.to_excel(writer, sheet_name="consolidado", index=False)
        df_bruto.to_excel(writer, sheet_name="dados_brutos", index=False)
        df_nao_encontradas.to_excel(writer, sheet_name="nao_encontradas", index=False)
        df_diagnostico.to_excel(writer, sheet_name="diagnostico", index=False)

    ajustar_largura_colunas(nome_saida)
    print(f"Arquivo gerado: {nome_saida}")


def salvar_resumo_empresas(df_resumo_empresas: pd.DataFrame, nome_saida: str) -> None:
    with pd.ExcelWriter(nome_saida, engine="openpyxl") as writer:
        df_resumo_empresas.to_excel(writer, sheet_name="resumo_empresas", index=False)

    ajustar_largura_colunas(nome_saida)
    print(f"Arquivo gerado: {nome_saida}")


if __name__ == "__main__":
    df_bruto = processar_pasta(PASTA_PDFS)

    if df_bruto.empty:
        print("Nenhum dado foi extraído.")
    else:
        df_consolidado = consolidar_por_cnpj_e_competencia(df_bruto)
        df_resumo_empresas = gerar_resumo_empresas(df_consolidado, ARQUIVO_EMPRESAS)
        df_nao_encontradas = listar_nao_encontradas_no_resumo(df_consolidado, ARQUIVO_EMPRESAS)
        df_diagnostico = gerar_diagnostico_nao_encontradas(df_nao_encontradas, ARQUIVO_EMPRESAS)

        print("\nRESUMO_EMPRESAS:")
        print(df_resumo_empresas)

        print("\nCONSOLIDADO:")
        print(df_consolidado)

        print("\nDADOS BRUTOS:")
        print(df_bruto)

        print("\nNAO_ENCONTRADAS:")
        print(df_nao_encontradas)

        print("\nDIAGNOSTICO:")
        print(df_diagnostico)

        salvar_excel(df_bruto, df_consolidado, df_nao_encontradas, df_diagnostico, ARQUIVO_SAIDA)
        salvar_resumo_empresas(df_resumo_empresas, ARQUIVO_RESUMO_EMPRESAS)