"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProviderRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hospital");
  }, [router]);

  return null;
}
