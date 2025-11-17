import type { Metadata } from "next";
import * as React from "react";

export const metadata: Metadata = {
  title: "Zadanie 1 - Vigenereova sifra",
  description: "Automaticka analyza kluca a desifrovanie Vigenereovej sifry.",
};

export default function Zadanie1Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
