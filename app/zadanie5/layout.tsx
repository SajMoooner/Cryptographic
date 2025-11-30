import type { Metadata } from "next";
import * as React from "react";

export const metadata: Metadata = {
  title: "Zadanie 5 - Lamanie hesiel",
  description: "MD5 + Base64 + sol: slovnikovy utok na shadow subory.",
};

export default function Zadanie5Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
