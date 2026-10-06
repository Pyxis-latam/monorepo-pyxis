"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ContactContextValue = {
  isOpen: boolean;
  /** True only inside a ContactProvider; buttons use it to decide whether to intercept the mailto click. */
  available: boolean;
  openContact: () => void;
  closeContact: () => void;
};

const noop = () => {};

const ContactContext = createContext<ContactContextValue>({
  isOpen: false,
  available: false,
  openContact: noop,
  closeContact: noop,
});

export function ContactProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openContact = useCallback(() => setIsOpen(true), []);
  const closeContact = useCallback(() => setIsOpen(false), []);
  const value = useMemo(
    () => ({ isOpen, available: true, openContact, closeContact }),
    [isOpen, openContact, closeContact]
  );
  return <ContactContext.Provider value={value}>{children}</ContactContext.Provider>;
}

export function useContact() {
  return useContext(ContactContext);
}
