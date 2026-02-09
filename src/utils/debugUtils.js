/**
 * Script de Extração Profunda de Documentos Firestore
 * Gera um arquivo .txt com a estrutura real do banco
 */
export const extrairEstruturaDocumento = (nomeDocumento, dados) => {
  const formatarValor = (valor, recuo = 0) => {
    const espaço = "  ".repeat(recuo);
    if (Array.isArray(valor)) {
      return `[\n${valor.map(v => espaço + "  " + formatarValor(v, recuo + 1)).join(",\n")}\n${espaço}]`;
    } else if (typeof valor === 'object' && valor !== null) {
      return `{\n${Object.entries(valor)
        .map(([k, v]) => `${espaço}  ${k}: ${formatarValor(v, recuo + 1)}`)
        .join(",\n")}\n${espaço}}`;
    }
    return typeof valor === 'string' ? `"${valor}"` : valor;
  };

  const conteudo = `==========================================
EXTRAÇÃO DE DADOS: ${nomeDocumento.toUpperCase()}
GERADO EM: ${new Date().toLocaleString()}
==========================================\n\n` + formatarValor(dados);

  const blob = new Blob([conteudo], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `debug_${nomeDocumento}_${Date.now()}.txt`;
  link.click();
};