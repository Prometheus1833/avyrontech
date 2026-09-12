import { Hono, type Context } from "hono";
import type { AppBindings } from "./types";
import { hasCapability, platformRoleForUser } from "./authorization";
import { checkRateLimit } from "./antispam";
import { now, sha256 } from "./security";
import { maskPaymentMethod, projectionFromRecurring, validateExpenseWrite } from "./financePolicy";
import { reserveAiCost } from "./aiCostGuard";

const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
type Permission = "finance.read" | "finance.write" | "finance.accounts.read" | "finance.documents.read" | "finance.settings" | "finance.budget.approve" | "finance.integrations.manage" | "finance.audit.read";

async function allowed(c: Context<AppBindings>, permission: Permission) {
  const platformRole = await platformRoleForUser(c.env.DB, c.get("userId"));
  if (platformRole === "platform_owner") return true;
  if (["finance.read", "finance.accounts.read", "finance.documents.read", "finance.audit.read"].includes(permission) && (platformRole === "superadmin" || c.get("roles").includes("admin"))) return true;
  return hasCapability(c.env.DB, c.get("userId"), permission);
}

async function audit(c: Context<AppBindings>, action: string, type: string, resourceId: string | null, before: unknown, after: unknown, source = "manual") {
  await c.env.DB.prepare(
    `INSERT INTO financial_audit_events
      (id,actor_user_id,action,resource_type,resource_id,before_json,after_json,source,request_id,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  ).bind(id("faud"), c.get("userId"), action, type, resourceId,
    before == null ? null : JSON.stringify(before), after == null ? null : JSON.stringify(after),
    source, c.get("requestId") || null, now()).run();
}

const deny = (c: Context<AppBindings>) => c.json({ error: { code: "forbidden" } }, 403);
const financeRouter = new Hono<AppBindings>();

async function idempotency(c: Context<AppBindings>, scope: string, request: unknown) {
  const key=(c.req.header("idempotency-key")||"").trim();
  if(!/^[A-Za-z0-9_.:-]{16,128}$/.test(key)) return {ok:false as const,response:c.json({error:{code:"idempotency_key_required"}},400)};
  const requestHash=await sha256(JSON.stringify(request));
  const previous=await c.env.DB.prepare("SELECT request_hash,response_status,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=? AND expires_at>?").bind(scope,key,now()).first<{request_hash:string;response_status:number|null;response_json:string|null}>();
  if(previous){
    if(previous.request_hash!==requestHash) return {ok:false as const,response:c.json({error:{code:"idempotency_key_reused"}},409)};
    if(previous.response_json) return {ok:false as const,response:new Response(previous.response_json,{status:previous.response_status||201,headers:{"content-type":"application/json; charset=UTF-8"}})};
  }
  return {ok:true as const,key,requestHash};
}

financeRouter.use("*", async (c, next) => {
  const rate = await checkRateLimit(c.env.DB, [{ key: `finance:${c.get("userId")}:h`, limit: 600, windowSec: 3600 }]);
  if (!rate.ok) return c.json({ error: { code: "rate_limited" } }, 429);
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && !c.get("mfaVerified")) return c.json({ error: { code: "mfa_required" } }, 403);
  await next();
});

financeRouter.get("/api/finance/overview", async (c) => {
  if (!(await allowed(c, "finance.read"))) return deny(c);
  const timestamp = now();
  const from = Math.max(0, Number(c.req.query("from")) || new Date(new Date(timestamp).getFullYear(), new Date(timestamp).getMonth(), 1).getTime());
  const to = Math.min(timestamp + 366 * 86_400_000, Number(c.req.query("to")) || timestamp);
  if (to <= from) return c.json({ error: { code: "invalid_period" } }, 400);
  const [expense, revenue, subscription, ai, advertising, invoicesPayable, invoicesReceivable, nextPayment, budgets, alerts, leads] = await Promise.all([
    c.env.DB.prepare(`SELECT COALESCE(SUM(COALESCE(amount_ron_minor,gross_amount_minor,0)),0) total FROM financial_expenses WHERE archived_at IS NULL AND COALESCE(paid_date,invoice_date,created_at) BETWEEN ? AND ?`).bind(from, to).first<{ total: number }>(),
    c.env.DB.prepare(`SELECT COALESCE(SUM(COALESCE(amount_ron_minor,gross_amount_minor,0)),0) total FROM financial_revenues WHERE archived_at IS NULL AND status IN ('paid','partially_paid') AND COALESCE(payment_date,invoice_date,created_at) BETWEEN ? AND ?`).bind(from, to).first<{ total: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) total FROM financial_expenses WHERE archived_at IS NULL AND billing_type = 'recurring' AND status = 'active'`).first<{ total: number }>(),
    c.env.DB.prepare(`SELECT COALESCE(SUM(COALESCE(amount_ron_minor,gross_amount_minor,0)),0) total FROM financial_expenses WHERE archived_at IS NULL AND category = 'ai' AND COALESCE(paid_date,invoice_date,created_at) BETWEEN ? AND ?`).bind(from, to).first<{ total: number }>(),
    c.env.DB.prepare(`SELECT COALESCE(SUM(COALESCE(amount_ron_minor,gross_amount_minor,0)),0) total FROM financial_expenses WHERE archived_at IS NULL AND category = 'advertising' AND COALESCE(paid_date,invoice_date,created_at) BETWEEN ? AND ?`).bind(from, to).first<{ total: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) total FROM financial_expenses WHERE archived_at IS NULL AND status IN ('payment_due','overdue')`).first<{ total: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) total FROM financial_revenues WHERE archived_at IS NULL AND status IN ('invoiced','sent','partially_paid','overdue')`).first<{ total: number }>(),
    c.env.DB.prepare(`SELECT vendor.name vendor, expense.next_billing_date date, expense.gross_amount_minor amount, expense.currency FROM financial_expenses expense JOIN financial_vendors vendor ON vendor.id=expense.vendor_id WHERE expense.archived_at IS NULL AND expense.next_billing_date >= ? ORDER BY expense.next_billing_date LIMIT 1`).bind(timestamp).first(),
    c.env.DB.prepare(`SELECT COALESCE(SUM(limit_minor),0) budget, COUNT(*) count FROM financial_budgets WHERE status='active' AND period_start <= ? AND period_end > ?`).bind(timestamp, timestamp).first<{ budget: number; count: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) total FROM financial_alerts WHERE status='open' AND severity='critical'`).first<{ total: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) total FROM leads WHERE created_at BETWEEN ? AND ?`).bind(from, to).first<{ total: number }>(),
  ]);
  const expenseMinor = expense?.total || 0, revenueMinor = revenue?.total || 0;
  return c.json({ period: { from, to }, kpis: {
    expensesMinor: expenseMinor, revenuesMinor: revenueMinor, operatingProfitEstimateMinor: revenueMinor - expenseMinor,
    activeSubscriptions: subscription?.total || 0, aiCostMinor: ai?.total || 0, advertisingMinor: advertising?.total || 0,
    costPerLeadMinor: leads?.total ? Math.round(expenseMinor / leads.total) : null,
    invoicesPayable: invoicesPayable?.total || 0, invoicesReceivable: invoicesReceivable?.total || 0,
    nextPayment, budgetLimitMinor: budgets?.budget || 0, budgetCount: budgets?.count || 0,
    freeTierSavingsMinor: null, criticalAlerts: alerts?.total || 0,
  }, notice: "Estimări de management, nu contabilitate fiscală." });
});

financeRouter.get("/api/finance/config", async (c) => {
  if (!(await allowed(c, "finance.read"))) return deny(c);
  const [vendors, projects, clients] = await Promise.all([
    c.env.DB.prepare("SELECT id,name,category,service_type,status FROM financial_vendors WHERE status<>'archived' ORDER BY name").all(),
    c.env.DB.prepare("SELECT id,name FROM projects WHERE status<>'archived' ORDER BY name LIMIT 250").all(),
    c.env.DB.prepare("SELECT id,company_name FROM clients WHERE status<>'archived' ORDER BY company_name LIMIT 250").all(),
  ]);
  return c.json({ vendors: vendors.results, projects: projects.results, clients: clients.results });
});

financeRouter.get("/api/finance/expenses", async (c) => {
  if (!(await allowed(c, "finance.read"))) return deny(c);
  const page = Math.max(1, Math.min(10_000, Number(c.req.query("page")) || 1));
  const limit = Math.max(1, Math.min(50, Number(c.req.query("limit")) || 20));
  const search = String(c.req.query("search") || "").trim().slice(0, 100);
  const category = String(c.req.query("category") || "").trim().slice(0, 80);
  const status = String(c.req.query("status") || "").trim().slice(0, 40);
  const where = ["expense.archived_at IS NULL"], values: unknown[] = [];
  if (search) { where.push("(vendor.name LIKE ? ESCAPE '\\' OR expense.service_name LIKE ? ESCAPE '\\')"); const q = `%${search.replace(/[\\%_]/g, "\\$&")}%`; values.push(q, q); }
  if (category) { where.push("expense.category = ?"); values.push(category); }
  if (status) { where.push("expense.status = ?"); values.push(status); }
  const sort = c.req.query("sort") === "highest" ? "COALESCE(expense.amount_ron_minor,expense.gross_amount_minor,-1) DESC" : c.req.query("sort") === "next_payment" ? "expense.next_billing_date IS NULL, expense.next_billing_date" : "expense.updated_at DESC";
  const result = await c.env.DB.prepare(`SELECT expense.*,vendor.name vendor_name,vendor.service_type FROM financial_expenses expense JOIN financial_vendors vendor ON vendor.id=expense.vendor_id WHERE ${where.join(" AND ")} ORDER BY ${sort} LIMIT ? OFFSET ?`).bind(...values, limit, (page - 1) * limit).all();
  const count = await c.env.DB.prepare(`SELECT COUNT(*) total FROM financial_expenses expense JOIN financial_vendors vendor ON vendor.id=expense.vendor_id WHERE ${where.join(" AND ")}`).bind(...values).first<{ total: number }>();
  return c.json({ data: result.results, page, limit, total: count?.total || 0 });
});

financeRouter.get("/api/finance/expenses/:expenseId", async (c) => {
  if (!(await allowed(c, "finance.read"))) return deny(c);
  const expense = await c.env.DB.prepare(`SELECT expense.*,vendor.name vendor_name,vendor.website_url FROM financial_expenses expense JOIN financial_vendors vendor ON vendor.id=expense.vendor_id WHERE expense.id=? AND expense.archived_at IS NULL`).bind(c.req.param("expenseId")).first();
  if (!expense) return c.json({ error: { code: "not_found" } }, 404);
  const [billing, allocations, prices, metrics, documents, history] = await Promise.all([
    c.env.DB.prepare("SELECT * FROM financial_billing_records WHERE expense_id=? ORDER BY invoice_date DESC LIMIT 50").bind(c.req.param("expenseId")).all(),
    c.env.DB.prepare("SELECT * FROM financial_expense_allocations WHERE expense_id=? ORDER BY created_at DESC").bind(c.req.param("expenseId")).all(),
    c.env.DB.prepare("SELECT * FROM financial_price_history WHERE expense_id=? ORDER BY effective_from DESC LIMIT 50").bind(c.req.param("expenseId")).all(),
    c.env.DB.prepare("SELECT * FROM financial_performance_metrics WHERE expense_id=? ORDER BY period_end DESC LIMIT 24").bind(c.req.param("expenseId")).all(),
    c.env.DB.prepare("SELECT id,document_type,file_name,content_type,size_bytes,version,status,created_at FROM financial_documents WHERE expense_id=? AND status <> 'deleted' ORDER BY created_at DESC").bind(c.req.param("expenseId")).all(),
    c.env.DB.prepare("SELECT action,source,created_at FROM financial_audit_events WHERE resource_type='expense' AND resource_id=? ORDER BY created_at DESC LIMIT 50").bind(c.req.param("expenseId")).all(),
  ]);
  return c.json({ expense, billing: billing.results, allocations: allocations.results, prices: prices.results, metrics: metrics.results, documents: documents.results, history: history.results });
});

financeRouter.post("/api/finance/expenses", async (c) => {
  if (!(await allowed(c, "finance.write"))) return deny(c);
  const parsed = validateExpenseWrite(await c.req.json<unknown>().catch(() => null));
  if (!parsed.ok) return c.json({ error: { code: parsed.code, field: parsed.field } }, 400);
  const value = parsed.value, expenseId = id("fexp"), timestamp = now();
  const once=await idempotency(c,`finance.expense.create:${c.get("userId")}`,value);
  if(!once.ok)return once.response;
  const duplicate = value.invoiceNumber ? await c.env.DB.prepare("SELECT id FROM financial_expenses WHERE vendor_id=? AND invoice_number=? AND archived_at IS NULL").bind(value.vendorId, value.invoiceNumber).first<{ id: string }>() : null;
  if (duplicate) return c.json({ error: { code: "duplicate_invoice", resourceId: duplicate.id } }, 409);
  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO financial_expenses (id,vendor_id,service_name,category,subcategory,description,status,billing_type,billing_cycle,currency,net_amount_minor,vat_amount_minor,gross_amount_minor,exchange_rate_micros,amount_ron_minor,future_amount_minor,invoice_number,invoice_date,due_date,paid_date,next_billing_date,trial_end,free_period_end,project_id,client_id,payment_account_id,payment_method_id,notes,source,created_by,updated_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(expenseId,value.vendorId,value.serviceName,value.category,value.subcategory,value.description,value.status,value.billingType,value.billingCycle,value.currency,value.netAmountMinor,value.vatAmountMinor,value.grossAmountMinor,value.exchangeRateMicros,value.amountRonMinor,value.futureAmountMinor,value.invoiceNumber,value.invoiceDate,value.dueDate,value.paidDate,value.nextBillingDate,value.trialEnd,value.freePeriodEnd,value.projectId,value.clientId,value.paymentAccountId,value.paymentMethodId,value.notes,value.source,c.get("userId"),c.get("userId"),timestamp,timestamp),
    c.env.DB.prepare(`INSERT INTO financial_audit_events (id,actor_user_id,action,resource_type,resource_id,after_json,source,request_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)`).bind(id("faud"),c.get("userId"),"finance.expense.create","expense",expenseId,JSON.stringify({ vendorId:value.vendorId,serviceName:value.serviceName,status:value.status,grossAmountMinor:value.grossAmountMinor,currency:value.currency }),value.source,c.get("requestId")||null,timestamp),
    c.env.DB.prepare(`INSERT INTO idempotency_keys (scope,idempotency_key,request_hash,response_status,response_json,resource_type,resource_id,created_at,expires_at) VALUES (?,?,?,?,?,'financial_expense',?,?,?)`).bind(`finance.expense.create:${c.get("userId")}`,once.key,once.requestHash,201,JSON.stringify({id:expenseId}),expenseId,timestamp,timestamp+86_400_000),
  ]);
  return c.json({ id: expenseId }, 201);
});

financeRouter.patch("/api/finance/expenses/:expenseId", async (c) => {
  if (!(await allowed(c, "finance.write"))) return deny(c);
  const before = await c.env.DB.prepare("SELECT * FROM financial_expenses WHERE id=? AND archived_at IS NULL").bind(c.req.param("expenseId")).first<Record<string, unknown>>();
  if (!before) return c.json({ error: { code: "not_found" } }, 404);
  const parsed = validateExpenseWrite(await c.req.json<unknown>().catch(() => null));
  if (!parsed.ok) return c.json({ error: { code: parsed.code, field: parsed.field } }, 400);
  const v=parsed.value, timestamp=now();
  await c.env.DB.prepare(`UPDATE financial_expenses SET vendor_id=?,service_name=?,category=?,subcategory=?,description=?,status=?,billing_type=?,billing_cycle=?,currency=?,net_amount_minor=?,vat_amount_minor=?,gross_amount_minor=?,exchange_rate_micros=?,amount_ron_minor=?,future_amount_minor=?,invoice_number=?,invoice_date=?,due_date=?,paid_date=?,next_billing_date=?,trial_end=?,free_period_end=?,project_id=?,client_id=?,payment_account_id=?,payment_method_id=?,notes=?,source=?,updated_by=?,updated_at=? WHERE id=?`).bind(v.vendorId,v.serviceName,v.category,v.subcategory,v.description,v.status,v.billingType,v.billingCycle,v.currency,v.netAmountMinor,v.vatAmountMinor,v.grossAmountMinor,v.exchangeRateMicros,v.amountRonMinor,v.futureAmountMinor,v.invoiceNumber,v.invoiceDate,v.dueDate,v.paidDate,v.nextBillingDate,v.trialEnd,v.freePeriodEnd,v.projectId,v.clientId,v.paymentAccountId,v.paymentMethodId,v.notes,v.source,c.get("userId"),timestamp,c.req.param("expenseId")).run();
  await audit(c,"finance.expense.update","expense",c.req.param("expenseId"),before,{...v,notes:v.notes?"[present]":""},v.source);
  return c.json({ ok:true });
});

financeRouter.delete("/api/finance/expenses/:expenseId", async (c) => {
  if (!(await allowed(c, "finance.write"))) return deny(c);
  const timestamp=now();
  const changed=await c.env.DB.prepare("UPDATE financial_expenses SET status='archived',archived_at=?,updated_by=?,updated_at=? WHERE id=? AND archived_at IS NULL").bind(timestamp,c.get("userId"),timestamp,c.req.param("expenseId")).run();
  if (!(changed.meta.changes??0)) return c.json({error:{code:"not_found"}},404);
  await audit(c,"finance.expense.archive","expense",c.req.param("expenseId"),null,{status:"archived"});
  return c.json({ok:true});
});

financeRouter.get("/api/finance/revenues", async (c) => {
  if (!(await allowed(c,"finance.read"))) return deny(c);
  const result=await c.env.DB.prepare("SELECT revenue.*,client.company_name,project.name project_name FROM financial_revenues revenue LEFT JOIN clients client ON client.id=revenue.client_id LEFT JOIN projects project ON project.id=revenue.project_id WHERE revenue.archived_at IS NULL ORDER BY revenue.updated_at DESC LIMIT 100").all();
  return c.json({data:result.results});
});

financeRouter.post("/api/finance/revenues", async (c) => {
  if (!(await allowed(c,"finance.write"))) return deny(c);
  const body=await c.req.json<Record<string,unknown>>().catch(()=>null);
  const serviceName=typeof body?.serviceName==="string"?body.serviceName.trim().slice(0,180):"";
  const status=String(body?.status||"draft"), type=String(body?.revenueType||"other"), currency=String(body?.currency||"RON").toUpperCase();
  const amount=body?.grossAmountMinor==null?null:Number(body.grossAmountMinor);
  if(!serviceName||!["draft","invoiced","sent","partially_paid","paid","overdue","cancelled","refunded"].includes(status)||!["website_development","digital_services","maintenance","hosting","subscriptions","ai_services","seo","marketing","digital_products","marketplace","other"].includes(type)||!/^[A-Z]{3,8}$/.test(currency)||!(amount===null||(Number.isSafeInteger(amount)&&amount>=0))) return c.json({error:{code:"invalid_revenue"}},400);
  const revenueId=id("frev"),timestamp=now(),invoice=typeof body?.invoiceNumber==="string"?body.invoiceNumber.trim().slice(0,120)||null:null;
  const once=await idempotency(c,`finance.revenue.create:${c.get("userId")}`,{serviceName,status,type,currency,amount,invoice,clientId:body?.clientId||null,projectId:body?.projectId||null});
  if(!once.ok)return once.response;
  if(invoice&&await c.env.DB.prepare("SELECT 1 FROM financial_revenues WHERE invoice_number=? AND archived_at IS NULL").bind(invoice).first()) return c.json({error:{code:"duplicate_invoice"}},409);
  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO financial_revenues (id,revenue_type,client_id,project_id,service_name,invoice_number,invoice_date,due_date,payment_date,status,currency,gross_amount_minor,amount_ron_minor,notes,source,created_by,updated_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(revenueId,type,body?.clientId||null,body?.projectId||null,serviceName,invoice,body?.invoiceDate||null,body?.dueDate||null,body?.paymentDate||null,status,currency,amount,body?.amountRonMinor??null,typeof body?.notes==="string"?body.notes.slice(0,8000):"","manual",c.get("userId"),c.get("userId"),timestamp,timestamp),
    c.env.DB.prepare(`INSERT INTO financial_audit_events (id,actor_user_id,action,resource_type,resource_id,after_json,source,request_id,created_at) VALUES (?,?,?,?,?,?,'manual',?,?)`).bind(id("faud"),c.get("userId"),"finance.revenue.create","revenue",revenueId,JSON.stringify({serviceName,status,currency,grossAmountMinor:amount}),c.get("requestId")||null,timestamp),
    c.env.DB.prepare(`INSERT INTO idempotency_keys (scope,idempotency_key,request_hash,response_status,response_json,resource_type,resource_id,created_at,expires_at) VALUES (?,?,?,?,?,'financial_revenue',?,?,?)`).bind(`finance.revenue.create:${c.get("userId")}`,once.key,once.requestHash,201,JSON.stringify({id:revenueId}),revenueId,timestamp,timestamp+86_400_000),
  ]);
  return c.json({id:revenueId},201);
});

financeRouter.patch("/api/finance/revenues/:revenueId", async (c) => {
  if (!(await allowed(c,"finance.write"))) return deny(c);
  const body=await c.req.json<Record<string,unknown>>().catch(()=>null),before=await c.env.DB.prepare("SELECT * FROM financial_revenues WHERE id=? AND archived_at IS NULL").bind(c.req.param("revenueId")).first<Record<string,unknown>>();
  if(!before)return c.json({error:{code:"not_found"}},404);
  if(!body)return c.json({error:{code:"invalid_revenue"}},400);
  const status=String(body.status??before.status),amount=body.grossAmountMinor===undefined?before.gross_amount_minor:Number(body.grossAmountMinor),timestamp=now();
  if(!["draft","invoiced","sent","partially_paid","paid","overdue","cancelled","refunded"].includes(status)||!(amount===null||(Number.isSafeInteger(amount)&&Number(amount)>=0)))return c.json({error:{code:"invalid_revenue"}},400);
  await c.env.DB.prepare("UPDATE financial_revenues SET status=?,gross_amount_minor=?,amount_ron_minor=?,invoice_date=?,due_date=?,payment_date=?,notes=?,updated_by=?,updated_at=? WHERE id=?").bind(status,amount,body.amountRonMinor??before.amount_ron_minor,body.invoiceDate??before.invoice_date,body.dueDate??before.due_date,body.paymentDate??before.payment_date,typeof body.notes==="string"?body.notes.slice(0,8000):before.notes,c.get("userId"),timestamp,c.req.param("revenueId")).run();
  await audit(c,"finance.revenue.update","revenue",c.req.param("revenueId"),before,{status,grossAmountMinor:amount});
  return c.json({ok:true});
});

financeRouter.delete("/api/finance/revenues/:revenueId", async (c) => {
  if (!(await allowed(c,"finance.write"))) return deny(c);
  const timestamp=now(),result=await c.env.DB.prepare("UPDATE financial_revenues SET status='archived',archived_at=?,updated_by=?,updated_at=? WHERE id=? AND archived_at IS NULL").bind(timestamp,c.get("userId"),timestamp,c.req.param("revenueId")).run();
  if(!(result.meta.changes??0))return c.json({error:{code:"not_found"}},404);
  await audit(c,"finance.revenue.archive","revenue",c.req.param("revenueId"),null,{status:"archived"});
  return c.json({ok:true});
});

financeRouter.get("/api/finance/accounts", async (c) => {
  if (!(await allowed(c,"finance.accounts.read"))) return deny(c);
  const [accounts,methods]=await Promise.all([c.env.DB.prepare("SELECT id,name,institution,currency,account_type,internal_alias,iban_last4,status,balance_minor,balance_as_of,purpose,source FROM financial_accounts WHERE archived_at IS NULL ORDER BY name").all(),c.env.DB.prepare("SELECT id,account_id,provider,alias,cardholder_name,last4,expiry_month,expiry_year,card_type,currency,purpose,status FROM financial_payment_methods WHERE archived_at IS NULL ORDER BY alias").all()]);
  return c.json({accounts:accounts.results,methods:methods.results.map((row)=>maskPaymentMethod(row as Parameters<typeof maskPaymentMethod>[0]))});
});

financeRouter.post("/api/finance/accounts", async (c) => {
  if (!(await allowed(c,"finance.settings"))) return deny(c);
  const body=await c.req.json<Record<string,unknown>>().catch(()=>null);
  if (!body) return c.json({error:{code:"invalid_account"}},400);
  const name=typeof body?.name==="string"?body.name.trim().slice(0,160):"",institution=typeof body?.institution==="string"?body.institution.trim().slice(0,120):"",alias=typeof body?.internalAlias==="string"?body.internalAlias.trim().slice(0,100):"",currency=String(body?.currency||"RON").toUpperCase(),last4=body?.ibanLast4==null?null:String(body.ibanLast4).toUpperCase();
  if(!name||!institution||!alias||!/^[A-Z]{3,8}$/.test(currency)||(last4!==null&&!/^[A-Z0-9]{2,4}$/.test(last4))) return c.json({error:{code:"invalid_account"}},400);
  const accountId=id("facct"),timestamp=now();
  await c.env.DB.prepare(`INSERT INTO financial_accounts (id,name,institution,currency,account_type,internal_alias,iban_last4,status,purpose,source,created_by,updated_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(accountId,name,institution,currency,["bank","wallet","processor","cash","other"].includes(String(body.accountType))?body.accountType:"other",alias,last4,body.status==="active"?"active":"needs_configuration",typeof body.purpose==="string"?body.purpose.slice(0,300):"","manual",c.get("userId"),c.get("userId"),timestamp,timestamp).run();
  await audit(c,"finance.account.create","account",accountId,null,{name,institution,currency,internalAlias:alias,ibanLast4:last4});
  return c.json({id:accountId},201);
});

financeRouter.post("/api/finance/payment-methods", async (c) => {
  if (!(await allowed(c,"finance.settings"))) return deny(c);
  const body=await c.req.json<Record<string,unknown>>().catch(()=>null);
  if(!body||["cardNumber","number","cvv","cvc","pin","password","token","secret"].some((key)=>key in body)) return c.json({error:{code:"sensitive_card_data_rejected"}},400);
  const alias=typeof body.alias==="string"?body.alias.trim().slice(0,100):"",provider=typeof body.provider==="string"?body.provider.trim().slice(0,100):"",last4=body.last4==null?null:String(body.last4);
  if(!alias||!provider||(last4!==null&&!/^\d{4}$/.test(last4))) return c.json({error:{code:"invalid_payment_method"}},400);
  const methodId=id("fpm"),timestamp=now();
  await c.env.DB.prepare(`INSERT INTO financial_payment_methods (id,account_id,provider,alias,cardholder_name,last4,expiry_month,expiry_year,card_type,currency,purpose,status,created_by,updated_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(methodId,body.accountId||null,provider,alias,typeof body.cardholderName==="string"?body.cardholderName.slice(0,120):null,last4,body.expiryMonth||null,body.expiryYear||null,typeof body.cardType==="string"?body.cardType.slice(0,50):null,body.currency||null,typeof body.purpose==="string"?body.purpose.slice(0,300):"",body.status==="active"?"active":"inactive",c.get("userId"),c.get("userId"),timestamp,timestamp).run();
  await audit(c,"finance.payment_method.create","payment_method",methodId,null,{provider,alias,last4});
  return c.json({id:methodId},201);
});

financeRouter.get("/api/finance/budgets", async (c) => {
  if (!(await allowed(c,"finance.read"))) return deny(c);
  const [budgets,quotas,policies]=await Promise.all([c.env.DB.prepare("SELECT * FROM financial_budgets WHERE status<>'archived' ORDER BY period_end,category").all(),c.env.DB.prepare("SELECT quota.*,vendor.name vendor_name FROM financial_provider_quotas quota JOIN financial_vendors vendor ON vendor.id=quota.vendor_id WHERE quota.status<>'archived' ORDER BY vendor.name,quota.quota_type").all(),c.env.DB.prepare("SELECT policy.*,agent.name agent_name,vendor.name vendor_name FROM financial_agent_provider_policies policy JOIN ai_agents agent ON agent.slug=policy.agent_slug JOIN financial_vendors vendor ON vendor.id=policy.vendor_id WHERE policy.status<>'archived' ORDER BY agent.name,vendor.name").all()]);
  return c.json({budgets:budgets.results,quotas:quotas.results,policies:policies.results});
});

financeRouter.post("/api/finance/budgets", async (c) => {
  if (!(await allowed(c,"finance.budget.approve"))) return deny(c);
  const body=await c.req.json<Record<string,unknown>>().catch(()=>null),timestamp=now();
  if (!body) return c.json({error:{code:"invalid_budget"}},400);
  const name=typeof body?.name==="string"?body.name.trim().slice(0,160):"",category=String(body?.category||"general"),limit=Number(body?.limitMinor),start=Number(body?.periodStart),end=Number(body?.periodEnd);
  if(!name||!["general","ai","saas","advertising","lead_generation","infrastructure","accounting","other"].includes(category)||!Number.isSafeInteger(limit)||limit<0||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||end<=start) return c.json({error:{code:"invalid_budget"}},400);
  const budgetId=id("fbud");
  await c.env.DB.prepare(`INSERT INTO financial_budgets (id,name,category,client_id,project_id,agent_slug,period,period_start,period_end,currency,limit_minor,warning_thresholds_json,hard_stop,status,approved_by,created_by,updated_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'active',?,?,?,?,?)`).bind(budgetId,name,category,body.clientId||null,body.projectId||null,body.agentSlug||null,["day","month","quarter","year","custom"].includes(String(body.period))?body.period:"month",start,end,String(body.currency||"RON").toUpperCase(),limit,JSON.stringify(Array.isArray(body.warningThresholds)?body.warningThresholds:[5000,7500,8500,9000,9500,10000]),body.hardStop?1:0,c.get("userId"),c.get("userId"),c.get("userId"),timestamp,timestamp).run();
  await audit(c,"finance.budget.create","budget",budgetId,null,{name,category,limitMinor:limit,periodStart:start,periodEnd:end});
  return c.json({id:budgetId},201);
});

financeRouter.patch("/api/finance/quotas/:quotaId", async (c) => {
  if (!(await allowed(c,"finance.settings"))) return deny(c);
  const body=await c.req.json<Record<string,unknown>>().catch(()=>null),before=await c.env.DB.prepare("SELECT * FROM financial_provider_quotas WHERE id=? AND status<>'archived'").bind(c.req.param("quotaId")).first<Record<string,unknown>>();
  if(!before)return c.json({error:{code:"not_found"}},404);
  if(!body)return c.json({error:{code:"invalid_quota"}},400);
  const total=body.quotaTotal===undefined?before.quota_total:body.quotaTotal===null?null:Number(body.quotaTotal),used=body.quotaUsed===undefined?Number(before.quota_used):Number(body.quotaUsed),threshold=body.warningThresholdBasisPoints===undefined?Number(before.warning_threshold_basis_points):Number(body.warningThresholdBasisPoints);
  if(!(total===null||(Number.isSafeInteger(total)&&Number(total)>=0))||!Number.isSafeInteger(used)||used<0||!Number.isSafeInteger(threshold)||threshold<1||threshold>10000)return c.json({error:{code:"invalid_quota"}},400);
  const timestamp=now(),status=["active","warning","exhausted","paused","needs_configuration"].includes(String(body.status))?String(body.status):String(before.status);
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE financial_provider_quotas SET plan=?,quota_total=?,quota_used=?,reset_frequency=?,reset_date=?,estimated_cost_after_limit_minor=?,warning_threshold_basis_points=?,hard_stop_before_paid=?,status=?,updated_by=?,updated_at=? WHERE id=?").bind(typeof body.plan==="string"?body.plan.slice(0,120):before.plan,total,used,body.resetFrequency??before.reset_frequency,body.resetDate??before.reset_date,body.estimatedCostAfterLimitMinor??before.estimated_cost_after_limit_minor,threshold,body.hardStopBeforePaid===undefined?before.hard_stop_before_paid:body.hardStopBeforePaid?1:0,status,c.get("userId"),timestamp,c.req.param("quotaId")),
    c.env.DB.prepare("UPDATE financial_vendors SET status=?,updated_at=? WHERE id=?").bind(["active","warning"].includes(status)?"active":"needs_configuration",timestamp,before.vendor_id),
  ]);
  await audit(c,"finance.quota.update","quota",c.req.param("quotaId"),before,{quotaTotal:total,quotaUsed:used,warningThresholdBasisPoints:threshold,hardStopBeforePaid:body.hardStopBeforePaid});
  return c.json({ok:true});
});

financeRouter.put("/api/finance/agent-policies/:agentSlug/:vendorId", async (c) => {
  if (!(await allowed(c,"finance.settings"))) return deny(c);
  const body=await c.req.json<Record<string,unknown>>().catch(()=>null),agentSlug=c.req.param("agentSlug"),vendorId=c.req.param("vendorId"),timestamp=now();
  if(!body||!agentSlug||!vendorId)return c.json({error:{code:"invalid_agent_provider_policy"}},400);
  const status=["active","paused","needs_configuration","archived"].includes(String(body.status))?String(body.status):"needs_configuration";
  const numeric=(value:unknown)=>value===null||value===undefined||value===""?null:Number(value);
  const daily=numeric(body.dailyBudgetMinor),monthly=numeric(body.monthlyBudgetMinor),maximum=numeric(body.maxRequestCostMinor),currency=String(body.currency||"RON").toUpperCase();
  if(![daily,monthly,maximum].every((value)=>value===null||(Number.isSafeInteger(value)&&value>=0))||!/^[A-Z]{3,8}$/.test(currency))return c.json({error:{code:"invalid_agent_provider_policy"}},400);
  const before=await c.env.DB.prepare("SELECT * FROM financial_agent_provider_policies WHERE agent_slug=? AND vendor_id=?").bind(agentSlug,vendorId).first();
  await c.env.DB.prepare(`INSERT INTO financial_agent_provider_policies (agent_slug,vendor_id,status,daily_budget_minor,monthly_budget_minor,max_request_cost_minor,currency,approved_by,created_by,updated_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(agent_slug,vendor_id) DO UPDATE SET status=excluded.status,daily_budget_minor=excluded.daily_budget_minor,monthly_budget_minor=excluded.monthly_budget_minor,max_request_cost_minor=excluded.max_request_cost_minor,currency=excluded.currency,approved_by=excluded.approved_by,updated_by=excluded.updated_by,updated_at=excluded.updated_at`).bind(agentSlug,vendorId,status,daily,monthly,maximum,currency,status==="active"?c.get("userId"):null,c.get("userId"),c.get("userId"),timestamp,timestamp).run();
  await audit(c,"finance.agent_provider_policy.update","agent_provider_policy",`${agentSlug}:${vendorId}`,before,{status,dailyBudgetMinor:daily,monthlyBudgetMinor:monthly,maxRequestCostMinor:maximum,currency});
  return c.json({ok:true});
});

financeRouter.get("/api/finance/analytics", async (c) => {
  if (!(await allowed(c,"finance.read"))) return deny(c);
  const timestamp=now(),threeMonthsAgo=timestamp-92*86_400_000;
  const [categories,recurring,variable,clients,projects]=await Promise.all([
    c.env.DB.prepare("SELECT category,COALESCE(SUM(COALESCE(amount_ron_minor,gross_amount_minor,0)),0) total_minor FROM financial_expenses WHERE archived_at IS NULL GROUP BY category ORDER BY total_minor DESC").all(),
    c.env.DB.prepare(`SELECT COALESCE(SUM(CASE billing_cycle WHEN 'yearly' THEN COALESCE(amount_ron_minor,gross_amount_minor,0)/12 WHEN 'quarterly' THEN COALESCE(amount_ron_minor,gross_amount_minor,0)/3 ELSE COALESCE(amount_ron_minor,gross_amount_minor,0) END),0) monthly_minor FROM financial_expenses WHERE archived_at IS NULL AND billing_type='recurring' AND status='active'`).first<{monthly_minor:number}>(),
    c.env.DB.prepare("SELECT COALESCE(SUM(COALESCE(amount_ron_minor,gross_amount_minor,0))/3,0) monthly_minor FROM financial_expenses WHERE archived_at IS NULL AND billing_type IN ('variable','usage_based') AND COALESCE(paid_date,invoice_date,created_at)>=?").bind(threeMonthsAgo).first<{monthly_minor:number}>(),
    c.env.DB.prepare(`SELECT client.id,client.company_name,COALESCE((SELECT SUM(COALESCE(revenue.amount_ron_minor,revenue.gross_amount_minor,0)) FROM financial_revenues revenue WHERE revenue.client_id=client.id AND revenue.status IN ('paid','partially_paid') AND revenue.archived_at IS NULL),0) revenue_minor,COALESCE((SELECT SUM(COALESCE(expense.amount_ron_minor,expense.gross_amount_minor,0)) FROM financial_expenses expense WHERE expense.client_id=client.id AND expense.archived_at IS NULL),0) direct_cost_minor FROM clients client ORDER BY revenue_minor DESC LIMIT 50`).all(),
    c.env.DB.prepare(`SELECT project.id,project.name,COALESCE((SELECT SUM(COALESCE(revenue.amount_ron_minor,revenue.gross_amount_minor,0)) FROM financial_revenues revenue WHERE revenue.project_id=project.id AND revenue.status IN ('paid','partially_paid') AND revenue.archived_at IS NULL),0) revenue_minor,COALESCE((SELECT SUM(COALESCE(expense.amount_ron_minor,expense.gross_amount_minor,0)) FROM financial_expenses expense WHERE expense.project_id=project.id AND expense.archived_at IS NULL),0) direct_cost_minor FROM projects project WHERE project.status<>'archived' ORDER BY revenue_minor DESC LIMIT 50`).all(),
  ]);
  const monthlyRecurring=Math.round(recurring?.monthly_minor||0),monthlyVariable=Math.round(variable?.monthly_minor||0);
  return c.json({categories:categories.results,monthlyRecurringMinor:monthlyRecurring,monthlyVariableAverageMinor:monthlyVariable,projections:[projectionFromRecurring(monthlyRecurring,monthlyVariable,3),projectionFromRecurring(monthlyRecurring,monthlyVariable,6),projectionFromRecurring(monthlyRecurring,monthlyVariable,12)],clients:clients.results.map((row)=>({...row,estimated_contribution_minor:Number((row as Record<string,unknown>).revenue_minor||0)-Number((row as Record<string,unknown>).direct_cost_minor||0)})),projects:projects.results.map((row)=>({...row,estimated_contribution_minor:Number((row as Record<string,unknown>).revenue_minor||0)-Number((row as Record<string,unknown>).direct_cost_minor||0)})),notice:"MANAGEMENT ESTIMATE"});
});

financeRouter.post("/api/finance/cost-guard/evaluate", async (c) => {
  if (!(await allowed(c,"finance.read"))) return deny(c);
  const body=await c.req.json<Record<string,unknown>>().catch(()=>null),key=(c.req.header("idempotency-key")||"").trim();
  if(!body||!/^[A-Za-z0-9_.:-]{16,128}$/.test(key)) return c.json({error:{code:"invalid_guard_request"}},400);
  const quotaId=String(body.quotaId||""),agentSlug=String(body.agentSlug||""),requestedUnits=Number(body.requestedUnits||0),estimatedCostMinor=Number(body.estimatedCostMinor||0);
  if(!quotaId||!agentSlug||!Number.isSafeInteger(requestedUnits)||requestedUnits<0||!Number.isSafeInteger(estimatedCostMinor)||estimatedCostMinor<0) return c.json({error:{code:"invalid_guard_request"}},400);
  const quota=await c.env.DB.prepare("SELECT vendor_id FROM financial_provider_quotas WHERE id=? AND status<>'archived'").bind(quotaId).first<{vendor_id:string}>();
  if(!quota) return c.json({error:{code:"quota_not_found"}},404);
  const decision=await reserveAiCost({db:c.env.DB,agentSlug,vendorId:quota.vendor_id,operation:String(body.operation||"unknown"),requestedUnits,estimatedCostMinor,idempotencyKey:key,requestId:c.get("requestId")||null,projectId:typeof body.projectId==="string"?body.projectId:null,clientId:typeof body.clientId==="string"?body.clientId:null});
  return c.json({decision});
});

financeRouter.get("/api/finance/alerts", async (c) => { if(!(await allowed(c,"finance.read"))) return deny(c); const result=await c.env.DB.prepare("SELECT * FROM financial_alerts WHERE status IN ('open','acknowledged') ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 WHEN 'notice' THEN 2 ELSE 3 END,detected_at DESC LIMIT 100").all(); return c.json({data:result.results}); });
financeRouter.post("/api/finance/alerts/scan", async (c) => {
  if (!(await allowed(c,"finance.write"))) return deny(c);
  const timestamp=now(),week=timestamp+7*86_400_000,fortnight=timestamp+14*86_400_000;
  const results=await c.env.DB.batch([
    c.env.DB.prepare(`INSERT OR IGNORE INTO financial_alerts (id,kind,severity,title,message,resource_type,resource_id,detected_at) SELECT 'falert_'||lower(hex(randomblob(16))),'invoice_overdue','critical','Cheltuială restantă',vendor.name||' are o scadență depășită.','expense',expense.id,? FROM financial_expenses expense JOIN financial_vendors vendor ON vendor.id=expense.vendor_id WHERE expense.archived_at IS NULL AND expense.due_date<? AND expense.paid_date IS NULL AND expense.status NOT IN ('cancelled','expired','archived')`).bind(timestamp,timestamp),
    c.env.DB.prepare(`INSERT OR IGNORE INTO financial_alerts (id,kind,severity,title,message,resource_type,resource_id,detected_at) SELECT 'falert_'||lower(hex(randomblob(16))),'upcoming_payment','notice','Plată în următoarele 7 zile',vendor.name||' are o plată apropiată.','expense',expense.id,? FROM financial_expenses expense JOIN financial_vendors vendor ON vendor.id=expense.vendor_id WHERE expense.archived_at IS NULL AND expense.next_billing_date BETWEEN ? AND ?`).bind(timestamp,timestamp,week),
    c.env.DB.prepare(`INSERT OR IGNORE INTO financial_alerts (id,kind,severity,title,message,resource_type,resource_id,detected_at) SELECT 'falert_'||lower(hex(randomblob(16))),'trial_ending','warning','Trial în curs de expirare',vendor.name||' necesită o decizie înainte de conversia la plan plătit.','expense',expense.id,? FROM financial_expenses expense JOIN financial_vendors vendor ON vendor.id=expense.vendor_id WHERE expense.archived_at IS NULL AND expense.status='trial' AND expense.trial_end BETWEEN ? AND ?`).bind(timestamp,timestamp,fortnight),
    c.env.DB.prepare(`INSERT OR IGNORE INTO financial_alerts (id,kind,severity,title,message,resource_type,resource_id,detected_at) SELECT 'falert_'||lower(hex(randomblob(16))),'quota_warning','warning','Prag de quota atins',vendor.name||' a depășit pragul configurat.','quota',quota.id,? FROM financial_provider_quotas quota JOIN financial_vendors vendor ON vendor.id=quota.vendor_id WHERE quota.status<>'archived' AND quota.quota_total>0 AND quota.quota_used*10000>=quota.quota_total*quota.warning_threshold_basis_points`).bind(timestamp),
    c.env.DB.prepare(`INSERT OR IGNORE INTO financial_alerts (id,kind,severity,title,message,resource_type,resource_id,detected_at) SELECT 'falert_'||lower(hex(randomblob(16))),'possible_duplicate','warning','Posibilă cheltuială duplicată',vendor.name||' are aceeași sumă și dată în mai multe înregistrări.','expense',MIN(expense.id),? FROM financial_expenses expense JOIN financial_vendors vendor ON vendor.id=expense.vendor_id WHERE expense.archived_at IS NULL AND expense.gross_amount_minor IS NOT NULL AND expense.invoice_date IS NOT NULL GROUP BY expense.vendor_id,expense.gross_amount_minor,expense.invoice_date HAVING COUNT(*)>1`).bind(timestamp),
  ]);
  await audit(c,"finance.alerts.scan","alert_scan",null,null,{detected:results.reduce((sum,result)=>sum+(result.meta.changes??0),0)},"system_generated");
  return c.json({ok:true,detected:results.reduce((sum,result)=>sum+(result.meta.changes??0),0)});
});
financeRouter.patch("/api/finance/alerts/:alertId", async (c) => { if(!(await allowed(c,"finance.write")))return deny(c);const body=await c.req.json<{status?:string}>().catch(()=>null),status=String(body?.status||"");if(!["acknowledged","resolved","dismissed"].includes(status))return c.json({error:{code:"invalid_alert_state"}},400);const timestamp=now(),result=await c.env.DB.prepare("UPDATE financial_alerts SET status=?,acknowledged_by=?,acknowledged_at=?,resolved_at=? WHERE id=? AND status IN ('open','acknowledged')").bind(status,c.get("userId"),timestamp,status==="resolved"?timestamp:null,c.req.param("alertId")).run();if(!(result.meta.changes??0))return c.json({error:{code:"not_found"}},404);await audit(c,`finance.alert.${status}`,"alert",c.req.param("alertId"),null,{status});return c.json({ok:true}); });
financeRouter.get("/api/finance/audit", async (c) => { if(!(await allowed(c,"finance.audit.read"))) return deny(c); const result=await c.env.DB.prepare("SELECT id,actor_user_id,action,resource_type,resource_id,source,request_id,created_at FROM financial_audit_events ORDER BY created_at DESC LIMIT 100").all(); return c.json({data:result.results}); });

financeRouter.post("/api/finance/documents", async (c) => {
  if (!(await allowed(c,"finance.write"))) return deny(c);
  const form=await c.req.formData().catch(()=>null),file=form?.get("file"),resourceType=String(form?.get("resourceType")||""),resourceId=String(form?.get("resourceId")||"");
  if(!(file instanceof File)||!['expense','revenue'].includes(resourceType)||!resourceId||file.size<1||file.size>10_000_000)return c.json({error:{code:"invalid_document"}},400);
  const bytes=new Uint8Array(await file.arrayBuffer()),pdf=bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46,png=bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47,jpeg=bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  if(!pdf&&!png&&!jpeg)return c.json({error:{code:"unsupported_document"}},415);
  const exists=await c.env.DB.prepare(`SELECT id FROM ${resourceType==='expense'?'financial_expenses':'financial_revenues'} WHERE id=? AND archived_at IS NULL`).bind(resourceId).first();
  if(!exists)return c.json({error:{code:"not_found"}},404);
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),(byte)=>byte.toString(16).padStart(2,"0")).join(""),documentId=id("fdoc"),safeName=file.name.replace(/[^A-Za-z0-9._-]/g,"_").slice(0,120)||"document",objectKey=`finance/${resourceType}/${resourceId}/${documentId}-${safeName}`,timestamp=now(),documentType=String(form?.get("documentType")||"supporting_document");
  if(!["invoice","contract","receipt","credit_note","supporting_document"].includes(documentType))return c.json({error:{code:"invalid_document_type"}},400);
  await c.env.FILES.put(objectKey,bytes,{httpMetadata:{contentType:pdf?"application/pdf":png?"image/png":"image/jpeg"},customMetadata:{schema:"finance-document:v1"}});
  try{await c.env.DB.batch([c.env.DB.prepare(`INSERT INTO financial_documents (id,expense_id,revenue_id,document_type,r2_object_key,file_name,content_type,size_bytes,sha256,uploaded_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(documentId,resourceType==='expense'?resourceId:null,resourceType==='revenue'?resourceId:null,documentType,objectKey,safeName,pdf?"application/pdf":png?"image/png":"image/jpeg",bytes.byteLength,digest,c.get("userId"),timestamp),c.env.DB.prepare(`INSERT INTO financial_audit_events (id,actor_user_id,action,resource_type,resource_id,after_json,source,request_id,created_at) VALUES (?,?,?,?,?,?,'manual',?,?)`).bind(id("faud"),c.get("userId"),"finance.document.upload","document",documentId,JSON.stringify({resourceType,resourceId,documentType,sizeBytes:bytes.byteLength,sha256:digest}),c.get("requestId")||null,timestamp)]);}catch(error){await c.env.FILES.delete(objectKey);throw error;}
  return c.json({id:documentId},201);
});

financeRouter.get("/api/finance/documents/:documentId/content", async (c) => {
  if (!(await allowed(c,"finance.documents.read"))) return deny(c);
  const row=await c.env.DB.prepare("SELECT r2_object_key,file_name,content_type FROM financial_documents WHERE id=? AND status='active'").bind(c.req.param("documentId")).first<{r2_object_key:string;file_name:string;content_type:string}>();
  if(!row)return c.json({error:{code:"not_found"}},404);
  const object=await c.env.FILES.get(row.r2_object_key);
  if(!object)return c.json({error:{code:"not_found"}},404);
  return new Response(object.body,{headers:{"content-type":"application/octet-stream","content-disposition":`attachment; filename="${row.file_name.replace(/["\\\r\n]/g,"_")}"`,"cache-control":"private, no-store","x-content-type-options":"nosniff"}});
});

financeRouter.delete("/api/finance/documents/:documentId", async (c) => {
  if (!(await allowed(c,"finance.write"))) return deny(c);
  const timestamp=now(),result=await c.env.DB.prepare("UPDATE financial_documents SET status='archived',archived_at=? WHERE id=? AND status='active'").bind(timestamp,c.req.param("documentId")).run();
  if(!(result.meta.changes??0))return c.json({error:{code:"not_found"}},404);
  await audit(c,"finance.document.archive","document",c.req.param("documentId"),null,{status:"archived"});
  return c.json({ok:true});
});

financeRouter.get("/api/finance/export", async (c) => {
  if(!c.get("mfaVerified")||!(await allowed(c,"finance.audit.read")))return deny(c);
  const resource=c.req.query("resource")==="revenues"?"revenues":"expenses",format=c.req.query("format")==="json"?"json":"csv";
  const result=resource==="expenses"?await c.env.DB.prepare(`SELECT vendor.name vendor,expense.service_name,expense.category,expense.status,expense.billing_type,expense.billing_cycle,expense.currency,expense.net_amount_minor,expense.vat_amount_minor,expense.gross_amount_minor,expense.amount_ron_minor,expense.invoice_number,expense.invoice_date,expense.due_date,expense.paid_date,expense.next_billing_date,expense.source FROM financial_expenses expense JOIN financial_vendors vendor ON vendor.id=expense.vendor_id WHERE expense.archived_at IS NULL ORDER BY expense.updated_at DESC LIMIT 10000`).all<Record<string,unknown>>():await c.env.DB.prepare(`SELECT service_name,revenue_type,status,currency,net_amount_minor,vat_amount_minor,gross_amount_minor,amount_ron_minor,invoice_number,invoice_date,due_date,payment_date,source FROM financial_revenues WHERE archived_at IS NULL ORDER BY updated_at DESC LIMIT 10000`).all<Record<string,unknown>>();
  await audit(c,"finance.export",resource,null,null,{format,rows:result.results.length});
  if(format==="json")return new Response(JSON.stringify({data:result.results}),{headers:{"content-type":"application/json; charset=UTF-8","content-disposition":`attachment; filename="avyron-${resource}.json"`}});
  const keys=Object.keys(result.results[0]||{}),safe=(value:unknown)=>{const raw=String(value??"");const protectedValue=/^[=+\-@]/.test(raw)?`'${raw}`:raw;return `"${protectedValue.replace(/"/g,'""')}"`;};
  const csv=[keys.map(safe).join(","),...result.results.map((row)=>keys.map((key)=>safe(row[key])).join(","))].join("\r\n");
  return new Response(csv,{headers:{"content-type":"text/csv; charset=UTF-8","content-disposition":`attachment; filename="avyron-${resource}.csv"`}});
});

export { financeRouter };
