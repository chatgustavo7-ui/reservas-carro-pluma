import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    console.log("Testing email function...");
    console.log("RESEND_API_KEY present:", !!Deno.env.get("RESEND_API_KEY"));

    const { to }: { to: string } = await req.json();

    if (!to) {
      return new Response(JSON.stringify({ error: "Email 'to' is required" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log(`Testing email send to ${to}`);

    const emailResponse = await resend.emails.send({
      from: "Teste <onboarding@resend.dev>",
      to: [to],
      subject: "Teste de Email - Sistema de Reservas",
      html: `
        <h2>Teste de Email</h2>
        <p>Este é um email de teste do sistema de reservas.</p>
        <p>Se você recebeu este email, a configuração está funcionando corretamente!</p>
        <p>Horário de envio: ${new Date().toLocaleString('pt-BR')}</p>
      `,
    });

    console.log("Test email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in test-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);