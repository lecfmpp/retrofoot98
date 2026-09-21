/* ============================================================================
   /.well-known/ — o que um agente encontra sozinho
   ----------------------------------------------------------------------------
   Dois ficheiros, os dois GERADOS no build e nunca escritos à mão:

     · /.well-known/ai-catalog.json      (ARD — agenticresourcediscovery.org)
     · /.well-known/agent-skills/index.json  (Agent Skills Discovery RFC v0.2.0)

   POR QUE GERADOS: o catálogo lista as páginas, e o índice de skills leva o
   sha256 do SKILL.md. Escritos à mão, os dois começam certos e envelhecem em
   silêncio — página nova não entra no catálogo, e uma vírgula no SKILL.md
   invalida um digest que ninguém vai reconferir. Gerados, é impossível divergir.

   O QUE NÃO ESTÁ AQUI, E POR QUÊ. A lista de "agent ready" que circula pede
   também api-catalog (RFC 9727), openid-configuration, oauth-protected-resource,
   auth.md e mcp/server-card.json. Todos descrevem UMA API PARA AGENTES — e o
   RetroFoot não tem nenhuma: o Supabase autentica PESSOAS a jogar. Publicar
   esses ficheiros aqui seria anunciar uma porta que não existe: o agente
   encontra, tenta usar e falha. Um checklist dá nota por ter o ficheiro; um
   agente de verdade dá erro. Se um dia o ranking ou o catálogo de clubes virar
   API pública, os cinco entram juntos e com conteúdo verdadeiro.
   ============================================================================ */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const sha256 = txt => createHash('sha256').update(txt).digest('hex');

/* ===== ARD · /.well-known/ai-catalog.json =====
   Cada entrada é `urn:air:<domínio>:<namespace>:<nome>`, com UM de url ou data,
   um media type da IANA, e 2-5 `representativeQueries` — que é o que permite a
   um registo construir embedding e achar o recurso por semelhança. As perguntas
   são as que a página realmente responde; inventar pergunta que o texto não
   responde é o jeito mais rápido de o recurso ser encontrado e decepcionar. */
export function aiCatalog({ site, host, paginas }){
  const urn = (ns, nome) => `urn:air:${host}:${ns}:${nome}`;
  const entries = [
    { identifier: urn('content','indice-do-site'),
      displayName: 'Índice do site em texto (llms.txt)',
      description: 'Visão geral do RetroFoot e de todas as páginas de conteúdo, em texto corrido.',
      type: 'text/markdown', url: `${site}/llms.txt`,
      representativeQueries: ['o que é o RetroFoot','que conteúdo o site do RetroFoot tem','resumo do RetroFoot'] },
    { identifier: urn('content','sitemap'),
      displayName: 'Mapa do site',
      description: 'Todos os endereços públicos do RetroFoot, com data de última atualização.',
      type: 'application/xml', url: `${site}/sitemap.xml`,
      representativeQueries: ['páginas do retrofoot.com.br','endereços do site do RetroFoot'] },
    { identifier: urn('skills','markdown'),
      displayName: 'Skill: ler o conteúdo do RetroFoot em Markdown',
      description: 'Como obter cada página do site em Markdown, e os dois cuidados ao responder sobre o jogo.',
      type: 'text/markdown', url: `${site}/.well-known/agent-skills/markdown/SKILL.md`,
      representativeQueries: ['conteúdo do RetroFoot em markdown','como ler as páginas do RetroFoot por agente'] },
  ];
  for(const p of paginas){
    entries.push({
      identifier: urn('content', p.slug),
      displayName: p.h1,
      description: p.description,
      type: 'text/markdown',
      url: `${site}/${p.slug}/index.md`,
      representativeQueries: (p.queries && p.queries.length ? p.queries : [p.h1]).slice(0,5),
      alternates: [{ type:'text/html', url:`${site}/${p.slug}/` }],
    });
  }
  return {
    specVersion: '0.1',
    host: {
      name: 'RetroFoot',
      domain: host,
      description: 'Jogo de treinador de futebol brasileiro que roda no navegador, de graça. Quatro divisões, Copa do Brasil e continentais, no Modo Solo ou no Modo Resenha (multiplayer online).',
      url: site,
      contact: `${site}/media-kit/`,
    },
    entries,
  };
}

/* ===== Agent Skills Discovery RFC v0.2.0 · /.well-known/agent-skills/index.json =====
   UMA skill só, e de propósito. Um índice com skill inventada para encher a
   lista é pior do que um índice curto: o agente carrega, não serve para nada, e
   o site perde a confiança na primeira tentativa. */
export function agentSkillsIndex({ site, skillPath }){
  const corpo = readFileSync(skillPath, 'utf8');
  return {
    $schema: 'https://agentskills.io/schemas/v0.2.0/index.json',
    version: '0.2.0',
    skills: [
      { name: 'retrofoot-conteudo-markdown',
        type: 'skill',
        description: 'Ler o conteúdo do site do RetroFoot em Markdown — guia do jogo, ranking, comparativos com Elifoot e Brasfoot, e o FAQ de cada página.',
        url: `${site}/.well-known/agent-skills/markdown/SKILL.md`,
        sha256: sha256(corpo) },
    ],
  };
}
