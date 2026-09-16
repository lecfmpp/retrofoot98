/* ===== WHATSAPP NO CADASTRO (16/09/2026) =====
   Campo obrigatorio nos dois formularios de conta (Solo: rfOb1; Resenha: scConta em
   net/local-transport.js). Serve para validar a pessoa e coloca-la no grupo de jogadores
   que ajudam a construir o jogo.

   O QUE VAI PARA O BANCO: o numero em formato internacional, so digitos com "+"
   (ex.: +5511987654321), em auth.users.raw_user_meta_data.whatsapp — junto de
   whatsapp_pais (ISO, ex.: 'BR'). O painel le daqui (admin_rf98.usuarios).

   BRASIL E' SEMPRE O PADRAO: e' onde o jogo esta lancado.

   O ESTADO FICA NUM OBJETO QUALQUER (CL.auth no Solo, CL.net na Resenha): o componente so'
   recebe o caminho dele em texto ('CL.auth') para montar os handlers inline, como o resto
   das telas faz. Nada de cdraw() por tecla (ver a nota do cdraw por tecla em ui/rf26.js):
   a mascara e' aplicada no proprio campo, devolvendo o cursor ao mesmo digito. */

/* mascaras: '#' = digito; varias por pais quando o tamanho muda a forma (a escolhida e' a
   primeira com tantos '#' quanto os digitos, ou a mais curta que ainda os comporta) */
const RF_WA_PAISES = [
  ['BR','🇧🇷','Brasil','55',['(##) ####-####','(##) #####-####']],
  ['PT','🇵🇹','Portugal','351',['### ### ###']],
  ['AR','🇦🇷','Argentina','54',['## ####-####','### ###-####','9 ## ####-####']],
  ['UY','🇺🇾','Uruguai','598',['## ### ###']],
  ['PY','🇵🇾','Paraguai','595',['### ### ###']],
  ['CL','🇨🇱','Chile','56',['# #### ####']],
  ['BO','🇧🇴','Bolívia','591',['#### ####']],
  ['PE','🇵🇪','Peru','51',['### ### ###']],
  ['CO','🇨🇴','Colômbia','57',['### ### ####']],
  ['VE','🇻🇪','Venezuela','58',['###-###-####']],
  ['EC','🇪🇨','Equador','593',['## ### ####']],
  ['MX','🇲🇽','México','52',['## #### ####']],
  ['US','🇺🇸','Estados Unidos','1',['(###) ###-####']],
  ['CA','🇨🇦','Canadá','1',['(###) ###-####']],
  ['ES','🇪🇸','Espanha','34',['### ## ## ##']],
  ['IT','🇮🇹','Itália','39',['### ### ####']],
  ['FR','🇫🇷','França','33',['# ## ## ## ##']],
  ['DE','🇩🇪','Alemanha','49',['### #######','### ########']],
  ['GB','🇬🇧','Reino Unido','44',['#### ######']],
  ['IE','🇮🇪','Irlanda','353',['## ### ####']],
  ['NL','🇳🇱','Holanda','31',['# ########']],
  ['BE','🇧🇪','Bélgica','32',['### ## ## ##']],
  ['CH','🇨🇭','Suíça','41',['## ### ## ##']],
  ['JP','🇯🇵','Japão','81',['##-####-####']],
  ['AU','🇦🇺','Austrália','61',['### ### ###']],
  ['AO','🇦🇴','Angola','244',['### ### ###']],
  ['MZ','🇲🇿','Moçambique','258',['## ### ####']],
  ['CV','🇨🇻','Cabo Verde','238',['### ## ##']],
];
function rfWaPais(iso){ return RF_WA_PAISES.find(p => p[0]===iso) || RF_WA_PAISES[0]; }
function rfWaDigitos(v){ return String(v||'').replace(/\D/g,''); }
function rfWaMax(p){ return Math.max(...p[4].map(m => (m.match(/#/g)||[]).length)); }
function rfWaFormatar(iso, v){
  const p = rfWaPais(iso), d = rfWaDigitos(v).slice(0, rfWaMax(p));
  if(!d) return '';
  const cabe = p[4].map(m => [m, (m.match(/#/g)||[]).length]).sort((a,b) => a[1]-b[1]);
  const m = (cabe.find(([,n]) => n === d.length) || cabe.find(([,n]) => n >= d.length) || cabe[cabe.length-1])[0];
  let out = '', i = 0;
  for(const ch of m){
    if(i >= d.length) break;
    if(ch === '#') out += d[i++]; else out += ch;
  }
  return out;
}
/* completo = o numero tem exatamente o tamanho de uma das mascaras do pais.
   No Brasil, 11 digitos exigem o 9 do celular na 3a posicao. */
function rfWaOk(iso, v){
  const p = rfWaPais(iso), d = rfWaDigitos(v);
  const ok = p[4].some(m => (m.match(/#/g)||[]).length === d.length);
  if(!ok) return false;
  if(p[0]==='BR') return d.length===10 || d[2]==='9';
  return true;
}
/* +<ddi><numero>, pronto para o banco; '' se incompleto */
function rfWaE164(iso, v){
  if(!rfWaOk(iso, v)) return '';
  const d = rfWaDigitos(v);
  return '+' + rfWaPais(iso)[3] + d;
}
/* o campo inteiro. `alvo` e' o caminho do estado em texto ('CL.auth'); `aoMudar` e' o nome da
   funcao que religa o botao sem redesenhar. Guarda em alvo.waPais e alvo.whatsapp. */
function rfWhatsCampoHTML(alvo, estado, aoMudar){
  const iso = (estado && estado.waPais) || 'BR';
  const p = rfWaPais(iso);
  const opcoes = RF_WA_PAISES.map(x =>
    `<option value="${x[0]}" ${x[0]===iso?'selected':''}>${x[1]} ${escC(x[2])} (+${x[3]})</option>`).join('');
  let k = 0;
  const exemplo = iso==='BR' ? '(11) 91234-5678' : p[4][p[4].length-1].replace(/#/g, () => String((++k)%10));
  return `<div class="rf-campo">
    <span class="rf-campo-l">WhatsApp</span>
    <div class="rf-wa">
      <label class="rf-wa-pais" title="País do número">
        <span class="rf-wa-flag">${p[1]}</span><span class="rf-wa-ddi">+${p[3]}</span><span class="rf-wa-seta">▾</span>
        <select aria-label="País do WhatsApp"
          onchange="${alvo}.waPais=this.value;${alvo}.whatsapp='';cdraw()">${opcoes}</select>
      </label>
      <input class="rf-campo-c rf-wa-num" type="tel" inputmode="tel" autocomplete="tel-national"
        placeholder="${escC(exemplo)}" value="${escC(rfWaFormatar(iso, estado && estado.whatsapp))}"
        oninput="rfWaDigitar(this,'${iso}');${alvo}.whatsapp=this.value;this.classList.remove('rf-wa-bad');${aoMudar}()"
        onblur="this.classList.toggle('rf-wa-bad', !!this.value && !rfWaOk('${iso}', this.value))">
    </div>
    <span class="rf-wa-nota">📲 Para validar sua conta e te incluir no grupo de jogadores que ajudam a construir o
      RetroFoot: contato direto com os devs e benefícios exclusivos. Sem spam.</span>
  </div>`;
}
/* mascara ao digitar sem perder o cursor: conta os digitos antes do cursor e o devolve
   depois do mesmo numero de digitos no texto formatado */
function rfWaDigitar(inp, iso){
  const pos = inp.selectionStart == null ? inp.value.length : inp.selectionStart;
  const antes = rfWaDigitos(inp.value.slice(0, pos)).length;
  const novo = rfWaFormatar(iso, inp.value);
  if(novo === inp.value) return;
  inp.value = novo;
  let c = 0, i = 0;
  while(i < novo.length && c < antes){ if(/\d/.test(novo[i])) c++; i++; }
  try{ inp.setSelectionRange(i, i); }catch(e){}
}
/* os dados extras que vao para o signUp */
function rfWaMeta(estado){
  const iso = (estado && estado.waPais) || 'BR';
  const num = rfWaE164(iso, estado && estado.whatsapp);
  return num ? { whatsapp: num, whatsapp_pais: iso } : {};
}
