"use client";

import { usePathname } from "next/navigation";

import { LoadingBook } from "@/components/loading-book";
import { LoadingSeal } from "@/components/loading-seal";

export default function Loading() {
  const pathname = usePathname();

  if (pathname === "/") {
    return <LoadingBook />;
  }

  return <LoadingSeal />;
}
