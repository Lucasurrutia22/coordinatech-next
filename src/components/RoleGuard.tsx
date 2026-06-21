"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UserRole } from "@/types/domain";
import { useAppContext } from "@/context/AppContext";

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user && pathname !== "/login") {
      router.replace("/login");
      return;
    }

    if (user?.role === "tech" && pathname.startsWith("/technicians")) {
      router.replace("/");
    }
  }, [user, pathname, router, isReady]);

  if (!isReady) {
    return <div className="screen-center">Cargando Coordinatech...</div>;
  }

  return <>{children}</>;
}

export function RoleOnly({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const { user } = useAppContext();

  if (!user || !allow.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
