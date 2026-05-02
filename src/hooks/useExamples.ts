import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ExampleRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  title: string;
  description: string;
  image_path: string | null;
  external_url: string | null;
  has_internal_demo: boolean;
  internal_demo_path: string | null;
  display_url: string | null;
  sort_order: number;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export const publicImageUrl = (path: string | null) =>
  path ? `${SUPABASE_URL}/storage/v1/object/public/examples/${path}` : null;

export const useExamples = () => {
  const [data, setData] = useState<ExampleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: rows } = await supabase
        .from("examples")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (mounted && rows) setData(rows as ExampleRow[]);
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading };
};

export const useExampleBySlug = (slug: string) => {
  const [data, setData] = useState<ExampleRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: row } = await supabase
        .from("examples")
        .select("*")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (mounted) {
        setData((row as ExampleRow) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  return { data, loading };
};
