import { useEffect, useState } from "react";

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

const LEGACY_EXAMPLES_URL = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const LEGACY_EXAMPLES_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();
const legacyExamplesEnabled =
  /^https:\/\//i.test(LEGACY_EXAMPLES_URL) && LEGACY_EXAMPLES_KEY.length > 0;

/**
 * The Cloudflare deployment uses the curated, local examples below the fold.
 * Keep the former provider as an opt-in compatibility adapter only: importing
 * its SDK eagerly would add ~220 kB to this public section and attempt a
 * request even when the Cloudflare build has no legacy credentials.
 */
const legacyExamplesClient = async () => {
  if (!legacyExamplesEnabled) return null;
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
};

export const publicImageUrl = (path: string | null) =>
  path && legacyExamplesEnabled
    ? `${LEGACY_EXAMPLES_URL}/storage/v1/object/public/examples/${path}`
    : null;

export const useExamples = () => {
  const [data, setData] = useState<ExampleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const client = await legacyExamplesClient();
        if (!client) return;
        const { data: rows } = await client
          .from("examples")
          .select("id,slug,name,category,title,description,image_path,external_url,has_internal_demo,internal_demo_path,display_url,sort_order")
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (mounted && rows) setData(rows as ExampleRow[]);
      } catch (error) {
        console.warn("Legacy examples source is unavailable; using curated fallback.", error);
      } finally {
        if (mounted) setLoading(false);
      }
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
      try {
        const client = await legacyExamplesClient();
        if (!client) return;
        const { data: row } = await client
          .from("examples")
          .select("id,slug,name,category,title,description,image_path,external_url,has_internal_demo,internal_demo_path,display_url,sort_order")
          .eq("slug", slug)
          .eq("active", true)
          .maybeSingle();
        if (mounted) setData((row as ExampleRow) ?? null);
      } catch (error) {
        console.warn("Legacy example source is unavailable; using curated fallback.", error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  return { data, loading };
};
