import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Trash2, Send, Package, Globe, Repeat, Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type CartType = "package" | "subscription" | "website" | "custom";

type CartItem = {
  id: string;
  type: CartType;
  name: string;
  period?: string;
  notes?: string;
  price_estimate?: number;
};

const STORAGE_KEY = "avyron_cart_v1";

const PRESET_PACKAGES = [
  { name: "Pachet Starter Website", price: 49000 },
  { name: "Pachet Business Website", price: 99000 },
  { name: "Pachet Premium + SEO", price: 149000 },
  { name: "Pachet Mentenanță Lunar", price: 9900 },
];

const PERIODS = ["1 lună", "3 luni", "6 luni", "12 luni", "Plată unică"];

export function CartTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [type, setType] = useState<CartType>("package");
  const [name, setName] = useState("");
  const [period, setPeriod] = useState(PERIODS[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = () => {
    if (!name.trim()) {
      toast.error("Adaugă o denumire pentru element.");
      return;
    }
    const preset = PRESET_PACKAGES.find((p) => p.name === name);
    const newItem: CartItem = {
      id: crypto.randomUUID(),
      type,
      name: name.trim(),
      period: type === "subscription" || type === "package" ? period : undefined,
      notes: notes.trim() || undefined,
      price_estimate: preset?.price,
    };
    setItems((prev) => [...prev, newItem]);
    setName("");
    setNotes("");
    toast.success("Adăugat în coș");
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const submitOrder = async () => {
    if (!user) return;
    if (items.length === 0) {
      toast.error("Coșul este gol.");
      return;
    }
    setSubmitting(true);
    const description = items
      .map(
        (i, idx) =>
          `${idx + 1}. [${i.type}] ${i.name}${i.period ? ` — ${i.period}` : ""}${
            i.price_estimate ? ` — ~${(i.price_estimate / 100).toFixed(0)} RON` : ""
          }${i.notes ? `\n   Note: ${i.notes}` : ""}`
      )
      .join("\n");

    const { error } = await supabase.from("tickets").insert({
      user_id: user.id,
      subject: `Comandă nouă din coș (${items.length} elemente)`,
      description,
      priority: "medium",
      status: "open",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Nu am putut trimite comanda: " + error.message);
      return;
    }
    setItems([]);
    toast.success("Comanda a fost trimisă echipei. Te contactăm în scurt timp!");
  };

  const totalEstimate = items.reduce((s, i) => s + (i.price_estimate ?? 0), 0);

  const typeIcon = (t: CartType) =>
    t === "package" ? <Package className="size-4" aria-hidden="true" /> : t === "website" ? <Globe className="size-4" aria-hidden="true" /> : t === "subscription" ? <Repeat className="size-4" aria-hidden="true" /> : <Wrench className="size-4" aria-hidden="true" />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-display font-bold flex items-center gap-2">
          <ShoppingCart className="size-6" /> Coșul meu
        </h2>
        <p className="text-sm text-muted-foreground">
          Adaugă pachete, abonamente sau comenzi de website. Trimite-le ca o comandă către echipă.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Adaugă în coș</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tip</Label>
            <Select value={type} onValueChange={(v) => setType(v as CartType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="package">Pachet predefinit</SelectItem>
                <SelectItem value="subscription">Abonament</SelectItem>
                <SelectItem value="website">Comandă website</SelectItem>
                <SelectItem value="custom">Personalizat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Denumire / Pachet</Label>
            {type === "package" ? (
              <Select value={name} onValueChange={setName}>
                <SelectTrigger><SelectValue placeholder="Alege un pachet" /></SelectTrigger>
                <SelectContent>
                  {PRESET_PACKAGES.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name} — {(p.price / 100).toFixed(0)} RON
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Magazin online beauty" />
            )}
          </div>

          {(type === "subscription" || type === "package") && (
            <div className="space-y-1.5">
              <Label>Perioadă</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Detalii / Cerințe (opțional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Funcționalități dorite, deadline, referințe..." />
          </div>

          <div className="sm:col-span-2">
            <Button onClick={addItem} className="gap-2"><Plus className="size-4" /> Adaugă în coș</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Conținutul coșului ({items.length})</CardTitle>
          {totalEstimate > 0 && (
            <Badge variant="secondary">Estimat: ~{(totalEstimate / 100).toFixed(0)} RON</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Coșul este gol.</p>
          ) : (
            <>
              <ul className="divide-y rounded-md border">
                {items.map((i) => (
                  <li key={i.id} className="flex items-start gap-3 p-3">
                    <div className="size-8 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
                      {typeIcon(i.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{i.name}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                        <span className="uppercase">{i.type}</span>
                        {i.period && <span>· {i.period}</span>}
                        {i.price_estimate && <span>· ~{(i.price_estimate / 100).toFixed(0)} RON</span>}
                      </div>
                      {i.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{i.notes}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(i.id)} aria-label="Șterge">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button onClick={submitOrder} disabled={submitting} className="w-full gap-2">
                <Send className="size-4" /> {submitting ? "Se trimite..." : "Trimite comanda către echipă"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
