import type { Metadata } from "next";

import { PublicCalendar } from "@/components/public-calendar";

export const metadata: Metadata = {
  title: "Affichage",
};

export default function AffichagePage() {
  return <PublicCalendar />;
}
