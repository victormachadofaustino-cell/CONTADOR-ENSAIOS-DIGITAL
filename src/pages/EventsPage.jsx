import React from "react";
import EventsFeature from "../features/events/ui/EventsPage";

// A página agora é apenas um "invólucro" que renderiza a feature.
// Ela continua recebendo as mesmas props da sua navegação (como userData) e as repassa.
const EventsPage = (props) => {
  return <EventsFeature {...props} />;
};

export default EventsPage;
