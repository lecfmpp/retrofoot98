// supabase/functions/send-password-reset/index.ts
// Envia o e-mail de "esqueci minha senha" via Resend, com o link de recuperação
// de verdade gerado pela Admin API do Supabase Auth (mesmo mecanismo/segurança
// do fluxo nativo — só troca QUEM manda o e-mail e QUAL o design).
//
// A chave do Resend fica no Supabase Vault (não como Edge Function secret) —
// lida em runtime via a function elifoot_v3.get_vault_secret(), que só o
// service_role pode chamar (ver migration correspondente).
//
// Endpoint PÚBLICO de propósito (verify_jwt=false): quem esqueceu a senha, por
// definição, não tem sessão. Por segurança contra enumeração de contas, a
// resposta é sempre genérica — nunca revela se aquele e-mail existe ou não.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// retrofoot98.com.br responde 301: o Gmail serve a imagem pelo proxy dele e
// redirecionamento é caminho de imagem quebrada. O domínio de verdade é este.
const LOGO_URL = Deno.env.get("BRAND_LOGO_URL") || "https://retrofoot.com.br/img/logo.webp";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

/* ===== PELE 2026 NO E-MAIL =====
   Os mesmos tokens do jogo (public/src/styles/tokens/colors.css), escritos à
   mão porque e-mail não tem CSS variable nem folha externa: cada regra é
   inline e a estrutura é de tabela, que é o que Outlook e Gmail entendem.
     fundo da página  #f1f4f1     cartão        #ffffff
     linha            #dde7db     título        #12201a
     texto            #3a473f     texto fraco   #78877c
     amarelo da marca #F2B90C     sobre amarelo #17458F  */
const C = {
  pagina: "#f1f4f1", cartao: "#ffffff", linha: "#dde7db",
  titulo: "#12201a", texto: "#3a473f", fraco: "#78877c",
  amarelo: "#F2B90C", sobreAmarelo: "#17458F", azul: "#17458F",
};
const FONTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function buildEmailShell(opts: { previewText: string; bodyHtml: string }): string {
  const { previewText, bodyHtml } = opts;
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>RetroFoot98</title></head>
<body style="margin:0;padding:0;background-color:${C.pagina};font-family:${FONTE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(previewText)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.pagina};padding:40px 16px;">
<tr><td align="center">
  <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

    <tr><td align="center" style="padding-bottom:22px;">
      <img src="${LOGO_URL}" width="56" height="56" alt="RetroFoot98" style="display:block;width:56px;height:56px;">
    </td></tr>

    <tr><td style="background-color:${C.cartao};border:1px solid ${C.linha};border-radius:14px;padding:36px 36px 32px;">
      ${bodyHtml}
    </td></tr>

    <tr><td align="center" style="padding-top:22px;">
      <div style="color:${C.fraco};font-size:11px;line-height:1.6;">
        RetroFoot98 — o clássico da sua infância, agora online.<br>
        Se você não pediu esta ação, pode ignorar este e-mail com segurança.
      </div>
    </td></tr>

  </table>
</td></tr>
</table>
</body></html>`;
}

/* botão amarelo da marca — table dentro de table porque o Outlook ignora
   padding em <a>; o preenchimento real vem da célula */
function ctaButton(label: string, url: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 6px;"><tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td align="center" bgcolor="${C.amarelo}" style="border-radius:10px;">
        <a href="${url}" target="_blank" style="display:inline-block;padding:16px 34px;color:${C.sobreAmarelo};font-family:${FONTE};font-size:15px;font-weight:700;line-height:1;text-decoration:none;border-radius:10px;">${esc(label)}</a>
      </td>
    </tr></table>
  </td></tr></table>`;
}

function resetPasswordHtml(actionLink: string): string {
  const body = `
    <div style="color:${C.fraco};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;">Acesso à conta</div>
    <h1 style="margin:10px 0 14px;color:${C.titulo};font-family:${FONTE};font-size:23px;line-height:1.3;font-weight:700;">Redefina sua senha</h1>
    <p style="margin:0;color:${C.texto};font-size:15px;line-height:1.65;">
      Recebemos um pedido para trocar a senha da sua conta. Clique no botão abaixo para escolher uma nova.
    </p>
    ${ctaButton("Criar nova senha", actionLink)}
    <p style="margin:22px 0 0;color:${C.fraco};font-size:12px;line-height:1.6;">
      O link vale por 30 minutos e é de uso único. Se não funcionar, copie e cole no navegador:<br>
      <a href="${actionLink}" style="color:${C.azul};word-break:break-all;">${actionLink}</a>
    </p>`;
  return buildEmailShell({
    previewText: "Clique para criar uma nova senha da sua conta RetroFoot98.",
    bodyHtml: body,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const GENERIC_OK = { success: true, message: "Se esse e-mail estiver cadastrado, o link de recuperação foi enviado." };

  try {
    const { email, redirectTo } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return json({ error: "Informe um e-mail válido." }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: "elifoot_v3" },
    });

    const { data: resendKey, error: keyErr } = await admin.rpc("get_vault_secret", {
      secret_name: "RESEND_API_KEY_RETROFOOT",
    });
    if (keyErr || !resendKey) {
      console.error("Vault erro:", keyErr);
      return json({ error: "E-mail não configurado no servidor (chave do Resend ausente)." }, 500);
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery", email, options: redirectTo ? { redirectTo } : undefined,
    });
    if (linkErr) { console.warn("generateLink erro (provável e-mail inexistente):", linkErr.message); return json(GENERIC_OK); }
    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) return json(GENERIC_OK);

    const fromEmail = Deno.env.get("RESET_FROM_EMAIL") || "RetroFoot98 <no-reply@retrofoot98.com.br>";
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "Redefina sua senha — RetroFoot98",
        html: resetPasswordHtml(actionLink),
      }),
    });
    if (!resendRes.ok) {
      const t = await resendRes.text();
      console.error("Resend erro:", t);
      return json({ error: "Falha ao enviar o e-mail. Tente de novo em instantes." }, 502);
    }

    return json(GENERIC_OK);
  } catch (e) {
    console.error("send-password-reset erro:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
