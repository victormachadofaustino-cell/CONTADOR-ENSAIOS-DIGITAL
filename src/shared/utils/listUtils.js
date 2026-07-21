export const pesosMinisterio = {
  // Explicação: Ordem de cargos da CCB.
  Ancião: 1,
  Diácono: 2,
  "Cooperador do Ofício": 3,
  "Cooperador RJM": 4,
  "Encarregado Regional": 5,
  Examinadora: 6,
  "Encarregado Local": 7,
  "Secretário da Música": 8,
  Instrutor: 9,
  Músico: 10,
};

export const ordenarLista = (lista, campoNome, campoRole) => {
  // Explicação: Organiza listas por cargo.
  return [...lista].sort((a, b) => {
    const pesoA = pesosMinisterio[a[campoRole]] || 99;
    const pesoB = pesosMinisterio[b[campoRole]] || 99;
    if (pesoA !== pesoB) return pesoA - pesoB;
    return (a[campoNome] || "").localeCompare(b[campoNome] || "");
  });
};
