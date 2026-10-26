import { useEffect, useState } from "react";

/** Tiny hash router: returns the current path, e.g. "/", "/workout/3". */
export function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const path = hash.replace(/^#/, "");
  return path === "" ? "/" : path;
}

export function navigate(path: string) {
  window.location.hash = path;
}
