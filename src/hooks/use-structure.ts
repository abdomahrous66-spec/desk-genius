import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Company = { id: string; name: string; parent_id: string | null; sort_order: number; logo_url?: string | null };
export type Position = {
  id: string;
  company_id: string;
  position_title: string;
  manager_position: string | null;
  sector: string | null;
  department: string | null;
  section: string | null;
  subsection: string | null;
  job_code: string | null;
};

// Tree: company -> sector -> department -> section -> subsection -> positions[]
export type Tree = Record<string, Record<string, Record<string, Record<string, Record<string, Position[]>>>>>;

const NA = "-";
const norm = (v: string | null | undefined) => (v && v.trim() ? v.trim() : NA);

export function buildTree(positions: Position[]): Tree {
  const t: Tree = {};
  for (const p of positions) {
    const c = p.company_id;
    const se = norm(p.sector);
    const d = norm(p.department);
    const s = norm(p.section);
    const ss = norm(p.subsection);
    (((((t[c] ??= {})[se] ??= {})[d] ??= {})[s] ??= {})[ss] ??= []).push(p);
  }
  return t;
}

export function useStructure() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tree, setTree] = useState<Tree>({});
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from("companies").select("*").order("sort_order"),
        (supabase as unknown as { from: (t: string) => { select: (c: string) => { order: (k: string) => Promise<{ data: Position[] | null }> } } })
          .from("positions").select("*").order("sector"),
      ]);
      if (!active) return;
      const comps = (c as Company[] | null) ?? [];
      const poss = (p as Position[] | null) ?? [];
      setCompanies(comps);
      setPositions(poss);
      setTree(buildTree(poss));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [reloadKey]);

  return { companies, positions, tree, loading, reload: () => setReloadKey(k => k + 1) };
}

export const NA_KEY = NA;
