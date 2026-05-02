// Edge function pentru a crea conturile de test (utilizator@avyron.ro și staff@avyron.ro)
// Apelată manual o singură dată din UI sau cu curl. Idempotentă.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const accounts = [
      { email: "utilizator@avyron.ro", password: "retuvo0818", role: "user" as const, display_name: "Utilizator Demo" },
      { email: "staff@avyron.ro", password: "retuvo0818", role: "staff" as const, display_name: "Staff Avyron" },
    ];

    const results: Array<{ email: string; status: string; user_id?: string }> = [];

    for (const acc of accounts) {
      // Caută user existent
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list.users.find((u) => u.email === acc.email);

      let userId: string;
      if (existing) {
        userId = existing.id;
        // Resetează parola pentru a fi sigur că e cea convenită
        await admin.auth.admin.updateUserById(userId, { password: acc.password, email_confirm: true });
        results.push({ email: acc.email, status: "updated", user_id: userId });
      } else {
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email: acc.email,
          password: acc.password,
          email_confirm: true,
          user_metadata: { display_name: acc.display_name },
        });
        if (cErr || !created.user) {
          results.push({ email: acc.email, status: `error: ${cErr?.message}` });
          continue;
        }
        userId = created.user.id;
        results.push({ email: acc.email, status: "created", user_id: userId });
      }

      // Asigură rolul corect (șterge celelalte roluri și inserează cel dorit)
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.from("user_roles").insert({ user_id: userId, role: acc.role });

      // Asigură display_name
      await admin.from("profiles").update({ display_name: acc.display_name }).eq("id", userId);
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
