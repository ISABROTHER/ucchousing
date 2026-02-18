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
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY") || "";

    if (signature && paystackKey) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(paystackKey);
      const msgData = encoder.encode(body);
      const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
      const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
      const computedSig = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
      if (computedSig !== signature) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const event = JSON.parse(body);
    if (event.event !== "charge.success") {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = event.data;
    const invoiceId = data.metadata?.invoice_id;
    const studentId = data.metadata?.student_id;

    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "Missing invoice_id in metadata" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: invoice } = await supabase
      .from("rent_invoices")
      .select("id, student_id, agreement_id, amount, status")
      .eq("id", invoiceId)
      .maybeSingle();

    if (!invoice || invoice.status === "paid") {
      return new Response(JSON.stringify({ received: true, note: "Already processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("rent_invoices").update({
      status: "paid",
      paystack_reference: data.reference,
      paid_at: new Date().toISOString(),
    }).eq("id", invoiceId);

    await supabase.from("receipts").insert({
      invoice_id: invoiceId,
      student_id: invoice.student_id,
      amount_paid: data.amount / 100,
      payment_method: "paystack",
      paystack_reference: data.reference,
      payment_channel: data.channel,
      paid_at: new Date().toISOString(),
    });

    await supabase.from("audit_logs").insert({
      entity_type: "rent_invoice",
      entity_id: invoiceId,
      action: "payment_confirmed",
      actor_id: invoice.student_id,
      metadata: {
        reference: data.reference,
        amount: data.amount / 100,
        channel: data.channel,
        customer_email: data.customer?.email,
      },
    });

    await supabase.from("notifications").insert({
      user_id: invoice.student_id,
      title: "Payment Confirmed",
      message: `Your rent payment of GHS ${(data.amount / 100).toFixed(2)} has been confirmed. Reference: ${data.reference}`,
      type: "payment",
      is_read: false,
    });

    return new Response(JSON.stringify({ received: true, status: "processed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
