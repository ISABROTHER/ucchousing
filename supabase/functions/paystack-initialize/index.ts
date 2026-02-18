import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invoice_id, email, callback_url } = await req.json();

    if (!invoice_id || !email) {
      return new Response(JSON.stringify({ error: "invoice_id and email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: invoice, error: invErr } = await supabase
      .from("rent_invoices")
      .select("id, amount, student_id, agreement_id")
      .eq("id", invoice_id)
      .eq("student_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found or already paid" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackKey) {
      return new Response(JSON.stringify({ error: "Paystack not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = `INV-${invoice_id.slice(0, 8)}-${Date.now()}`;
    const amountKobo = Math.round(Number(invoice.amount) * 100);

    const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        reference,
        callback_url: callback_url || `${Deno.env.get("SUPABASE_URL")}/functions/v1/paystack-webhook`,
        metadata: {
          invoice_id,
          student_id: user.id,
          custom_fields: [
            { display_name: "Invoice ID", variable_name: "invoice_id", value: invoice_id },
          ],
        },
        channels: ["card", "mobile_money", "bank"],
        currency: "GHS",
      }),
    });

    const psData = await psRes.json();

    if (!psData.status) {
      return new Response(JSON.stringify({ error: psData.message || "Paystack error" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("audit_logs").insert({
      entity_type: "rent_invoice",
      entity_id: invoice_id,
      action: "payment_initialized",
      actor_id: user.id,
      metadata: { reference, amount: invoice.amount, email },
    });

    return new Response(
      JSON.stringify({
        authorization_url: psData.data.authorization_url,
        access_code: psData.data.access_code,
        reference: psData.data.reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
