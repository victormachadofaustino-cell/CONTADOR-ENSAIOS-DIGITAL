import React from "react";
import AtaComponent from "../features/event-ata/ui/AtaPage";

// Página "invólucro" para a feature de gerenciamento da Ata.
const AtaPage = (props) => {
  return <AtaComponent {...props} />;
};

export default AtaPage;
