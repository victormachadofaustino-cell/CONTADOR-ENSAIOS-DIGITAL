import React from "react";
import AtaFeature from "../features/event-ata/ui/AtaPage";

// Página "invólucro" para a feature de gerenciamento da Ata.
const AtaPage = (props) => {
  return <AtaFeature {...props} />;
};

export default AtaPage;
