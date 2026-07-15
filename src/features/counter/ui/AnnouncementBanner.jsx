import React, { useState, useEffect } from "react";
import {
  db,
  collection,
  onSnapshot,
  query,
  where,
} from "../../../shared/api/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, X } from "lucide-react";

const AnnouncementBanner = () => {
  const [announcement, setAnnouncement] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "config_avisos"),
      where("ativo", "==", true),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const activeAnnouncement = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
        };
        setAnnouncement(activeAnnouncement);
        const dismissed = localStorage.getItem(
          `dismissed_announcement_${activeAnnouncement.id}`,
        );
        if (!dismissed) {
          setIsVisible(true);
        }
      } else {
        setAnnouncement(null);
        setIsVisible(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDismiss = () => {
    if (announcement) {
      localStorage.setItem(`dismissed_announcement_${announcement.id}`, "true");
      setIsVisible(false);
    }
  };

  if (!announcement || !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute top-0 left-0 right-0 z-[60] bg-slate-950 text-white p-3 text-center shadow-lg flex items-center justify-center gap-4"
        >
          <Megaphone size={20} className="text-amber-400 shrink-0" />
          <div className="text-left flex-1">
            <p className="text-xs font-black uppercase tracking-wide">
              {announcement.titulo}
            </p>
            <p className="text-[10px] font-medium opacity-80">
              {announcement.mensagem}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 rounded-full hover:bg-white/10 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementBanner;
