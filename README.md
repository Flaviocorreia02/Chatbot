# Câmara Municipal do Maio — sítio institucional

Sítio institucional completo em **HTML5 + CSS3 + JavaScript (ES6+)**, sem frameworks e sem
passo de compilação, com **assistente flutuante "Nha Câmara"** ligada a um webhook do
[n8n.io](https://n8n.io).

Nove páginas, português (predefinido) e inglês, estrutura pronta para kriolu, conformidade
WCAG 2.1 AA e dados estruturados em todas as páginas.

---

## 1. Arrancar

### Com servidor local (recomendado)

Os ficheiros `data/*.json` são lidos por `fetch`, que o protocolo `file://` bloqueia. Para a
experiência completa (incluindo edição dos JSON sem recompilar nada):

```bash
npx serve .
# ou:  python3 -m http.server 8000
```

Abrir <http://localhost:3000> (ou `:8000`).

### Com duplo clique (`file://`)

Também funciona. `data/inline-data.js` é um espelho de todos os JSON, gerado por script, que
entra em acção quando o `fetch` falha: notícias, documentos, pesquisa e tradução para inglês
continuam a funcionar sem servidor.

> **Sempre que editar um ficheiro em `data/*.json`, correr:**
> ```bash
> node tools/build-inline-data.js
> ```
> Sem isso, quem abrir o sítio por `file://` vê a versão anterior dos dados.

### Publicar

Alojamento estático simples (Netlify, Vercel, GitHub Pages, Apache, Nginx). Copiar a raiz do
projecto — excepto a pasta `tools/`, que só serve para gerar o sítio.

---

## 2. Estrutura de ficheiros

```
/
├── index.html            Início: herói, serviços rápidos, notícias, agenda, dados, ocorrências
├── municipio.html        História, geografia, símbolos, 12 localidades, estatística
├── governacao.html       Executivo, competências, Assembleia, organigrama, actas
├── servicos.html         Certidões, licenças, obras, água, resíduos, mercados, cemitérios, taxas, FAQ
├── noticias.html         Listagem com filtro por categoria, pesquisa e paginação
├── noticia.html          Modelo de artigo (lê ?id= de data/noticias.json)
├── turismo.html          Praias, natureza, tartarugas, sabores, chegar e ficar
├── transparencia.html    Orçamento, contas, contratação, regulamentos (tabela filtrável)
├── contactos.html        Formulário, mapa, horários, contactos por serviço, políticas
├── assets/
│   ├── css/styles.css        Sistema visual completo (tokens, componentes, páginas)
│   ├── css/chatbot.css       Widget "Nha Câmara"
│   ├── js/main.js            Navegação, acessibilidade, listagens, toasts
│   ├── js/i18n.js            PT/EN com data-i18n; pronto para kriolu
│   ├── js/chatbot.js         Front-end do assistente (webhook n8n)
│   ├── js/forms.js           Validação e submissão de formulários
│   ├── js/search.js          Pesquisa do lado do cliente
│   ├── img/                  Imagens de marcador de posição (substituir por fotografias)
│   └── icons/                (ícones são SVG inline nas páginas)
├── data/
│   ├── pt.json               Dicionário PT — gerado a partir do HTML
│   ├── en.json               Dicionário EN — traduzido à mão
│   ├── noticias.json         Notícias e eventos (PT + EN)
│   ├── documentos.json       Documentos de transparência
│   ├── search-index.json     Índice de pesquisa
│   └── inline-data.js        Espelho gerado dos JSON (para file://) — não editar
├── tools/                    Scripts de manutenção e parciais (não publicar)
├── n8n-workflow.json         Fluxo do assistente, pronto a importar
├── sitemap.xml
├── robots.txt
└── README.md
```

### Scripts de manutenção (`tools/`)

| Comando | O que faz |
|---|---|
| `bash tools/build.sh` | Reconstrói as 9 páginas a partir de `tools/partials/` (cabeçalho, rodapé, `<head>`) e `tools/content/`. Use-o depois de alterar o menu, o rodapé ou as meta tags. |
| `node tools/build-inline-data.js` | Regenera `data/inline-data.js` a partir dos JSON. |
| `node tools/extract-i18n.js` | Regenera `data/pt.json` a partir do HTML e diz que chaves faltam em `en.json`. |
| `node tools/make-images.js` | Regenera as imagens de marcador de posição (JPEG + WebP). |

> As páginas HTML geradas são **ficheiros estáticos completos**: o sítio publicado não depende
> destes scripts. Editar o HTML directamente também funciona — mas nesse caso repita a edição
> em `tools/content/` ou deixe de usar `build.sh`.

---

## 3. O que a Câmara tem de preencher (marcadores de posição)

Todos os valores por preencher aparecem no formato `[[NOME]]`, visíveis no sítio com um
sublinhado ponteado. Para os encontrar todos:

```bash
grep -rn "\[\[" --include="*.html" --include="*.js" --include="*.json" --include="*.xml" .
```

### Identidade e contactos gerais

| Marcador | O que é | Onde aparece |
|---|---|---|
| `[[SITE_DOMAIN]]` | Domínio final, sem `https://` (ex.: `cmmaio.cv`) | canonical, hreflang, Open Graph, JSON-LD, sitemap, robots, CORS do n8n |
| `[[MAIN_PHONE]]` | Telefone geral do atendimento | barra de topo, rodapé, chatbot, formulários |
| `[[MAIN_EMAIL]]` | Email geral | barra de topo, rodapé, acessibilidade |
| `[[TAX_ID]]` | NIF do município | rodapé, JSON-LD |
| `[[POSTAL_CODE]]` | Código postal dos Paços do Concelho | JSON-LD |
| `[[MAP_EMBED_URL]]` | URL de incorporação do mapa (OpenStreetMap ou Google Maps) | `contactos.html` |
| `[[FACEBOOK_URL]]` `[[YOUTUBE_URL]]` `[[INSTAGRAM_URL]]` | Redes oficiais | rodapé, JSON-LD |

### Contactos por serviço (`contactos.html`)

`[[DESK_PHONE]]`, `[[DESK_EMAIL]]` (Balcão do Munícipe) · `[[WATER_PHONE]]`, `[[WATER_EMAIL]]`
(Serviços de Água) · `[[URBAN_PHONE]]`, `[[URBAN_EMAIL]]` (Urbanismo) · `[[ENV_PHONE]]`,
`[[ENV_EMAIL]]` (Ambiente) · `[[TREASURY_PHONE]]` (Tesouraria) · `[[PRESS_EMAIL]]`
(Comunicação) · `[[CIVIL_PROTECTION_PHONE]]` (Protecção Civil) · `[[DPO_EMAIL]]` (protecção
de dados).

`[[SENDER_EMAIL]]` não aparece no sítio: é o *From Email* do nó de email dos fluxos n8n — a
caixa de onde sai o aviso ao Balcão, que tem de pertencer às credenciais SMTP ligadas.

### Eleitos e órgãos (`governacao.html`)

`[[MAYOR_NAME]]`, `[[MAYOR_EMAIL]]`, `[[DEPUTY_MAYOR_NAME]]`, `[[COUNCILLOR_1_NAME]]`,
`[[COUNCILLOR_2_NAME]]`, `[[ASSEMBLY_PRESIDENT_NAME]]`, `[[ASSEMBLY_SECRETARY_1]]`,
`[[ASSEMBLY_SECRETARY_2]]`, `[[ASSEMBLY_SEATS]]`.

> As vereações listadas (Urbanismo e Habitação; Cultura, Desporto e Juventude) são exemplos
> plausíveis: confirmar os pelouros reais antes de publicar.

### Estatística do concelho (`index.html`, `municipio.html`)

`[[POPULATION]]`, `[[CENSUS_YEAR]]`, `[[AREA_KM2]]`, `[[COASTLINE_KM]]`,
`[[HIGHEST_POINT_M]]`, `[[RAINFALL_MM]]`, `[[HOUSEHOLDS]]`, `[[WATER_CONNECTIONS]]`,
`[[BUSINESSES]]`.

### Símbolos (`municipio.html`)

`[[FLAG_DESCRIPTION]]`, `[[COAT_OF_ARMS_DESCRIPTION]]` — e substituir os SVG de marcador de
posição pelos ficheiros oficiais da bandeira e do brasão.

### Taxas (`servicos.html`)

`[[FEE_CERTIDAO]]`, `[[FEE_CERTIDAO_ARQUIVO]]`, `[[FEE_OBRAS_M2]]`,
`[[FEE_LICENCA_COMERCIAL]]`, `[[FEE_LIGACAO_AGUA]]`, `[[FEE_CARTAO_VENDEDOR]]`.

> **Nenhum valor de taxa, prazo legal ou artigo de regulamento foi inventado.** Os prazos
> indicados no texto (5, 10, 15 e 30 dias úteis) são hipóteses de trabalho: confirmar com o
> Regulamento de Taxas e Licenças em vigor antes de publicar.

### Transparência (`transparencia.html`)

`[[BUDGET_TOTAL]]`, `[[BUDGET_YEAR]]`, `[[BUDGET_INVESTMENT]]`, `[[BUDGET_EXECUTION]]`,
`[[CONTRACTS_COUNT]]`.

### Integrações

| Marcador | Ficheiro | O que é |
|---|---|---|
| `[[YOUR_N8N]]` | `assets/js/chatbot.js` | Domínio da instância n8n (ver secção 5) |
| `[[FORM_ENDPOINT_OCORRENCIAS]]` | `assets/js/forms.js` | Endpoint que recebe as ocorrências |
| `[[FORM_ENDPOINT_CONTACTO]]` | `assets/js/forms.js` | Endpoint do formulário de contacto |
| `[[FORM_ENDPOINT_NEWSLETTER]]` | `assets/js/forms.js` | Endpoint da subscrição do boletim |

Enquanto os endpoints não estiverem definidos, os formulários validam normalmente e mostram
uma mensagem explícita a dizer que ainda não estão ligados (o conteúdo que *seria* enviado é
registado na consola do navegador, para testes).

### Conteúdo por substituir

- `assets/img/*.jpg` e `*.webp` — imagens abstractas geradas por script. Substituir por
  fotografias reais **mantendo os mesmos nomes de ficheiro** (o HTML e o JSON já apontam para
  eles) ou actualizar os caminhos em `data/noticias.json` e `turismo.html`.
- `documentos/*.pdf` — a pasta não existe ainda. Criar e colocar lá os PDF referidos em
  `data/documentos.json` (campo `ficheiro`).
- `assets/img/brasao.svg` e `assets/img/icon-180.png` — brasão oficial e ícone iOS.
- `assets/img/og-*.jpg` — imagens de partilha social por página.

---

## 4. Idiomas

O **português vive no HTML**: é a fonte de verdade e é o que se vê sem JavaScript. O inglês
vive em `data/en.json` e é aplicado sem recarregar a página.

- `data-i18n="chave"` → substitui o texto do elemento
- `data-i18n-html="chave"` → substitui HTML (filtrado por lista branca)
- `data-i18n-attr="aria-label:chave, placeholder:outra"` → substitui atributos

A escolha fica em `localStorage` (`cm-maio:lang`) e o endereço `?lang=en` também força inglês
— é o que o `hreflang` aponta.

### Alterar um texto

1. Editar o texto português directamente na página (ou em `tools/content/` e correr `build.sh`).
2. `node tools/extract-i18n.js` — actualiza `data/pt.json` e avisa que chaves ficaram sem
   tradução.
3. Traduzir essas chaves em `data/en.json`.
4. `node tools/build-inline-data.js`.

### Acrescentar kriolu (kea)

1. Copiar `data/en.json` para `data/kea.json` e traduzir.
2. Em `assets/js/i18n.js`, mudar `const SUPPORTED = ["pt", "en"]` para
   `["pt", "en", "kea"]`.
3. Acrescentar o botão `<button data-lang-btn="kea">KEA</button>` em
   `tools/partials/header.html` e correr `bash tools/build.sh`.
4. Acrescentar `kea: "kea.json"` em `tools/build-inline-data.js` e correr o script.

O sistema de idiomas recorre sempre ao português quando falta uma chave — nunca fica um
espaço vazio.

O assistente "Nha Câmara" tem um circuito de idioma próprio (interface **e** idioma da resposta
do agente): ver **5.8-C**.

---

## 5. Assistente "Nha Câmara" (n8n)

### 5.1 Ligar o front-end

Em `assets/js/chatbot.js`, primeira linha de configuração:

```js
const N8N_WEBHOOK_URL = "https://[[YOUR_N8N]]/webhook/camara-maio-chat"; // ← substituir
```

Enquanto lá estiver `[[YOUR_N8N]]`, o widget abre e funciona, mas responde com uma mensagem
clara a dizer que ainda não está ligado ao serviço — não finge estar operacional.

Outras constantes no topo do mesmo ficheiro: `FALLBACK_PHONE` (telefone mostrado nos erros),
`REQUEST_TIMEOUT` (30 s) e `MAX_HISTORY` (50 mensagens guardadas).

### 5.2 Importar o fluxo

1. No n8n: **Workflows → Import from File →** `n8n-workflow.json`.
2. Abrir o nó **Modelo de chat** e escolher as credenciais do fornecedor de modelo.
   O fluxo vem com um nó de modelo de chat genérico; substitua-o pelo fornecedor que a Câmara
   usar, se for outro.
3. Abrir **Avisar o Balcão do Munícipe** e ligar as credenciais SMTP (ou trocar por um nó
   de WhatsApp, Telegram ou Slack). Substituir `[[SENDER_EMAIL]]` (*From Email* — a caixa que
   envia, tem de pertencer ao SMTP ligado) e `[[DESK_EMAIL]]` (*To Email* — o Balcão) pelos
   endereços reais. Se o nó estiver **desactivado**, activá-lo (botão direito → *Activate*):
   desactivado, o fluxo responde na mesma na conversa e o email nunca sai.
4. Substituir `[[SITE_DOMAIN]]` nos cabeçalhos CORS dos dois nós de resposta e
   `[[MAIN_PHONE]]` no prompt do agente e na resposta de encaminhamento.
5. *(Opcional)* Ligar o nó **Vector Store** a uma base com os regulamentos e as FAQ do
   município. Sem ele o agente responde apenas com o que está no prompt de sistema.
6. **Guardar** e **Activar** o fluxo (interruptor *Active*, canto superior direito).

### 5.3 Cadeia do fluxo

```
Webhook POST /camara-maio-chat
   └─ Code: normaliza e valida (sessionId, message, lang, page), detecta "falar com
        funcionário" e lê nome/email/telefone/assunto do bloco etiquetado
        └─ Switch
             ├─ inválido            → resposta fixa "não recebi nenhuma pergunta"
             ├─ atendimento humano  → email ao Balcão + resposta de encaminhamento
             └─ resto               → AI Agent (Window Buffer Memory por sessionId,
                                       Vector Store opcional) → formata { reply }
                  └─ Respond to Webhook (200, JSON, cabeçalhos CORS)

Webhook OPTIONS /camara-maio-chat → Respond 204 com os mesmos cabeçalhos CORS
```

### 5.4 URL de produção (não o de teste)

No nó **Webhook (POST)**, o painel mostra dois endereços:

- **Test URL** — `https://…/webhook-test/camara-maio-chat`. Só funciona enquanto carregar em
  *Listen for test event* e apenas para **uma** chamada. Não usar no sítio.
- **Production URL** — `https://…/webhook/camara-maio-chat`. É este que vai para
  `N8N_WEBHOOK_URL`, e só responde com o fluxo **activo**.

### 5.5 Testar com `curl`

```bash
curl -i -X POST "https://SEU-N8N/webhook/camara-maio-chat" \
  -H "Content-Type: application/json" \
  -d '{
        "sessionId": "teste-001",
        "message": "Que documentos preciso para uma certidão de residência?",
        "lang": "pt",
        "page": "/servicos.html",
        "timestamp": "2026-08-23T10:00:00.000Z"
      }'
```

Resposta esperada:

```json
{ "reply": "Para pedir uma certidão de residência precisa de..." }
```

Testar o *preflight*:

```bash
curl -i -X OPTIONS "https://SEU-N8N/webhook/camara-maio-chat" \
  -H "Origin: https://SEU-DOMINIO" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

Deve devolver `204` e os três cabeçalhos `Access-Control-Allow-*`.

### 5.6 Se o preflight falhar na sua instalação

Algumas instalações de n8n não deixam dois webhooks partilhar o mesmo caminho com métodos
diferentes. Alternativas, por ordem de preferência:

1. **Um só webhook com método `ALL`** e um `IF` no início: se
   `{{$json.headers['access-control-request-method']}}` existir, responder 204; caso contrário,
   seguir para o agente.
2. **CORS no proxy inverso** (Nginx, Caddy, Traefik) à frente do n8n — responder ao `OPTIONS`
   aí e deixar o n8n tratar só do `POST`.
3. **Variável de ambiente** `N8N_CORS_ALLOW_ORIGIN=https://SEU-DOMINIO` nas versões que a
   suportam.

O front-end envia `Content-Type: application/json`, o que torna o pedido não-simples e obriga
sempre a *preflight*: o `OPTIONS` tem mesmo de responder.

### 5.7 Diagnóstico: o widget mostra uma mensagem de erro

Cada tipo de falha tem agora uma mensagem própria, e o erro exacto (estado HTTP e corpo da
resposta) fica sempre na **consola do navegador** — abra as ferramentas de programador e
procure `[Nha Câmara] pedido falhou:`.

| Mensagem no widget | O que aconteceu | Onde procurar |
|---|---|---|
| "Não consegui chegar ao serviço" | O pedido nem chegou a completar: sem rede, DNS falhado ou **CORS bloqueado** | Separador *Network* do navegador; testar o `OPTIONS` com `curl` (secção 5.5) |
| "O endereço do serviço não foi encontrado" (404) | URL errado, ou está a usar o **Test URL**, ou o fluxo **não está activo** | Nó Webhook no n8n: copiar o *Production URL* e activar o fluxo |
| "O serviço respondeu com um erro interno" (5xx) | O fluxo chegou a arrancar mas **rebentou dentro do n8n** | **n8n → Executions →** abrir a execução a vermelho e ver o nó que falhou |
| "O serviço demorou demasiado a responder" | Passaram 30 s sem resposta | Modelo lento ou fluxo bloqueado; subir `REQUEST_TIMEOUT` ou simplificar o fluxo |
| "Recebi uma resposta vazia" | Respondeu 200 mas sem `reply`/`output`/`text` | Nó *Respond to Webhook*: confirmar que devolve `{ "reply": "..." }` |

Um `500 {"message":"Error in workflow"}` significa **sempre** que o problema está no n8n, não
no sítio: o pedido chegou, o n8n aceitou-o e um nó falhou a meio. A causa mais frequente é
**credenciais do modelo em falta ou inválidas** no nó de chat; a seguir vêm nós sem
configuração obrigatória e ausência de um nó *Respond to Webhook* no caminho percorrido.

### 5.8 Formato do pedido: Webhook ou Chat Trigger

O n8n tem dois nós de entrada possíveis e **esperam campos diferentes**:

| Nó de entrada | URL | Campo do texto | `PAYLOAD_FORMAT` |
|---|---|---|---|
| **Webhook** (o do `n8n-workflow.json`) | `…/webhook/camara-maio-chat` | `message` | `"webhook"` |
| **Chat Trigger** | `…/webhook/<uuid>/chat` | `chatInput` | `"chatTrigger"` |

Se o seu URL termina em `/chat`, está a usar um **Chat Trigger**: mude a constante no topo de
`assets/js/chatbot.js` para

```js
const PAYLOAD_FORMAT = "chatTrigger";
```

Nesse caso o widget passa a enviar `{ action: "sendMessage", sessionId, chatInput }` e lê a
resposta de `output`. No Chat Trigger é ainda preciso ligar a opção **Allowed Origins (CORS)**
com o domínio do sítio, e a resposta tem de vir do próprio agente ou de um
*Respond to Webhook*.

### 5.8-A Fluxo alternativo pronto: `n8n-workflow-chat-trigger.json`

Para quem já usa um nó **Chat Trigger** (URL `…/webhook/<uuid>/chat`). Oito nós:

```
Chat Trigger
  └─ AI Agent — Nha Câmara            (modelo + memória por sessionId → responde em TEXTO)
       └─ IF "Pediu atendimento humano?"   (bloco [PEDIDO…] ou regex sobre a pergunta)
            ├─ verdadeiro → Extrair dados de contacto (name, email, phone, inquiry, department)
            │                  └─ Avisar o Balcão do Munícipe  ← vem DESACTIVADO
            │                       └─ Resposta ao site
            └─ falso ────────────────────────────────────────→ Resposta ao site
```

Dois pontos de desenho que interessam:

- **O último nó dos dois ramos é o mesmo `Set`**, que devolve `output` com o texto do agente.
  É isto que impede o widget de voltar a receber JSON: a extracção nunca está no fim da cadeia.
- **A extracção só corre quando alguém pede atendimento humano.** Nas perguntas normais o
  fluxo é apenas trigger → agente → resposta, que é mais rápido e não gasta chamadas ao modelo.
- O nó de email vem **desactivado de propósito**: um nó sem credenciais faz o fluxo rebentar
  com 500. Ligue as credenciais primeiro, só depois o active.
  **É esta a causa nº 1 de «preenchi o formulário e não chegou email»:** com o nó desactivado
  o n8n salta-o em silêncio, o ramo segue para *Resposta ao site* e o munícipe vê a confirmação
  na conversa como se tudo tivesse corrido bem. Confirme, na *Execution* do pedido, se o nó
  aparece a cinzento (saltado) ou a verde (executado).

**Importar:**

1. n8n → **Workflows → Import from File** → `n8n-workflow-chat-trigger.json`.
2. Abrir **Modelo de chat** e ligar as credenciais do modelo.
3. Substituir `[[MAIN_PHONE]]` no prompt do agente e, no nó de email, `[[SENDER_EMAIL]]`
   (*From Email*) e `[[DESK_EMAIL]]` (*To Email*). Ligar as credenciais SMTP e **activar o
   nó** (vem desactivado — ver abaixo).
4. **Guardar** e **Activar**.
5. Abrir o nó **Chat Trigger** e copiar o novo **Chat URL** — o n8n gera um `<uuid>` novo no
   import, por isso **o endereço muda**. Colar em `N8N_WEBHOOK_URL`, em `assets/js/chatbot.js`.
6. **Desactivar o fluxo antigo**, para os dois não competirem pelo mesmo atendimento.
7. `PAYLOAD_FORMAT` continua em `"chatTrigger"` — não é preciso mexer.

### 5.8-B Modos de resposta: streaming e "Last Node"

O nó **Chat Trigger** tem dois modos de resposta, e o widget suporta **os dois sem
configuração**:

- **Streaming** — o n8n devolve NDJSON, uma linha por pedaço
  (`{"type":"item","content":"Bom"}`). O widget lê o corpo com `ReadableStream`, junta os
  pedaços e faz crescer a bolha ao vivo, com a formatação a ser reprocessada uma vez por
  *frame*. Se o fluxo falhar a meio (`{"type":"error"}`) mas já tiver chegado texto, o texto
  parcial **fica** — vale mais do que deitar a resposta fora.
- **Last Node** — devolve um único objecto JSON. O widget lê `reply`, `output`, `text` ou
  `message`, e aceita também a forma `[{...}]`.

O tempo-limite é de **inactividade**, não de duração total: enquanto chegarem pedaços, não
expira. Só corta ao fim de 45 s sem qualquer sinal do servidor (`REQUEST_TIMEOUT`).

**Markdown suportado nas respostas:** negrito, itálico, código, listas com marca e numeradas,
ligações, títulos `###`, citações `>`, separadores `---` e **tabelas**. As tabelas rolam na
horizontal dentro da bolha, em vez de esticarem o painel. Tudo continua a passar pelo
sanitizador: a lista branca inclui agora `table/thead/tbody/tr/th/td`, e nada mais.

### 5.8-C Idioma das respostas (PT e EN)

O assistente responde em **português europeu e em inglês**. A escolha é feita em dois sítios,
e ambos têm de estar certos:

**1. Interface do widget** — `assets/js/chatbot.js`, dicionário `T` no topo: `T.pt` e `T.en`
cobrem o rótulo do botão, a saudação, as sugestões rápidas, o texto de ajuda e todas as
mensagens de erro. Seguem `document.documentElement.lang`, que o `i18n.js` actualiza, e mudam
sem recarregar a página — incluindo a saudação já visível na conversa. O histórico já enviado
**não** é retraduzido: fica no idioma em que a conversa decorreu.

**2. Resposta do agente** — o widget envia o idioma activo em cada pedido, ao primeiro nível
e dentro de `metadata`:

```json
{ "action": "sendMessage", "sessionId": "…", "chatInput": "Opening hours",
  "lang": "en", "metadata": { "lang": "en", "page": "/index.html" } }
```

O prompt de sistema do agente é **bilingue** e tem uma regra de idioma acima de todas as
outras: responde no idioma da pergunta; se a mensagem for curta ou ambígua (`ok`, `hours?`),
usa o `lang` do sítio como desempate; se a pessoa mudar de idioma a meio, muda com ela; nunca
mistura os dois na mesma resposta. A base de conhecimento no prompt está escrita nas duas
línguas — é isso que impede a resposta de derivar para português quando a pergunta é em inglês.

A expressão que lê o idioma no nó **AI Agent** é:

```
{{ $('Chat Trigger').item.json.lang || $('Chat Trigger').item.json.metadata?.lang || 'pt' }}
```

No fluxo de webhook (`n8n-workflow.json`) é `{{ $json.lang || 'pt' }}`, já normalizado pelo
nó *Normalizar e validar*. Aí a base de conhecimento vem do Vector Store em português, e o
prompt manda traduzir o conteúdo na resposta em vez de o citar em português.

**Pedido de atendimento humano** — detectado por expressão regular em PT, EN e kriolu, no
widget e nos dois fluxos: apanha «falar com um funcionário», «falar com alguém», «fala ku
algen», *talk to a member of staff*, *speak with a human*, *live agent*, *customer support*.
O widget responde com o cartão de recolha de dados (secção 5.8-F) — os rótulos seguem o idioma
do sítio, o bloco que segue para o n8n é sempre em português. O email interno para o Balcão
indica o idioma do munícipe, para saberem em que língua devolver a chamada.

**Botões da página que abrem o chat com uma pergunta escrita** usam dois atributos:

```html
<button data-open-chat="Que documentos preciso para uma certidão?"
        data-open-chat-en="What documents do I need for a certificate?">
```

Sem `data-open-chat-en`, é enviada a versão portuguesa em qualquer idioma.

**Testar as duas línguas:**

```bash
curl -s -X POST "https://SEU-N8N/webhook/<uuid>/chat" -H "Content-Type: application/json"   -d '{"action":"sendMessage","sessionId":"t-en","chatInput":"What are the opening hours?","lang":"en"}'

curl -s -X POST "https://SEU-N8N/webhook/<uuid>/chat" -H "Content-Type: application/json"   -d '{"action":"sendMessage","sessionId":"t-pt","chatInput":"Qual é o horário?","lang":"pt"}'
```

Depois de mexer no prompt, **reimportar o fluxo no n8n e guardar** — o ficheiro JSON do
repositório não altera nada por si só.

### 5.8-E Reforço de idioma no pedido (correcção do lado do sítio)

Medido contra o fluxo em produção, sem tocar no n8n: de cinco perguntas inequivocamente
inglesas, **três voltaram em português** — uma delas até em português do Brasil («sua
solicitação»). O campo `lang` no corpo do pedido não chega ao modelo se o prompt de sistema
não o ler, e o prompt em produção não o lê.

Por isso o widget anexa uma nota de idioma **ao texto enviado**, em `LANG_HINT`
(`assets/js/chatbot.js`):

```
Where is the town hall?

[System note: this visitor is using the English version of the site. Reply only in English.]
```

A nota vai **só no pedido**. A bolha do munícipe e o histórico guardam a frase original — o
`addMessage` e o `pushHistory` recebem `message`, e só o `buildPayload` acrescenta o sufixo.

Medições depois da alteração: **6/6 respostas em inglês**, **0** ocorrências da nota visíveis
na resposta; em português, 4/4 mantiveram-se em português. Continua a escapar um traço de
pt-BR de vez em quando — isso já só se resolve no prompt de sistema.

Isto é um remendo do lado do cliente. **A correcção certa é o prompt bilingue de 5.8-C, no
n8n.** Quando esse prompt estiver em produção, o `LANG_HINT` passa a ser redundante e pode
ser reduzido a `{ en: "", pt: "" }` sem mais nenhuma alteração.

### 5.8-D Se o assistente falhar de forma intermitente

Sintoma típico: responde a umas mensagens e a outras não, sem padrão claro — e é fácil
confundir isso com «não responde em inglês», porque o widget mostra o erro na língua activa.

Como distinguir, sem adivinhar. O nó **Chat Trigger** em modo *Streaming* devolve NDJSON; uma
falha do agente é um `{"type":"begin"}` seguido de `{"type":"error"}` **sem nenhum**
`{"type":"item"}`:

```bash
curl -s -X POST "https://SEU-N8N/webhook/<uuid>/chat" -H "Content-Type: application/json" \
  -d '{"action":"sendMessage","sessionId":"diag","chatInput":"What are the opening hours?","lang":"en"}'
```

Se sair `{"type":"error"}` em perguntas **das duas línguas**, o problema não é o idioma: é o nó
de modelo do agente a rebentar. Repita o mesmo pedido espaçado de 10–15 s — se aí passar, é
limitação de débito ou de quota do fornecedor do modelo. A causa real só aparece em
**n8n → Executions**, abrindo uma execução falhada e lendo o erro do nó do modelo.

O widget já absorve estas falhas: perante um erro do agente, de rede ou HTTP 5xx **sem texto
recebido**, repete o pedido automaticamente **uma vez**, ao fim de 1,2 s, em silêncio. Só se a
segunda tentativa também falhar é que mostra a mensagem de erro com o botão *Tentar de novo*.
Respostas parciais nunca são deitadas fora nem repetidas — se já chegou texto, fica o texto.

### 5.8-F Encaminhamento: o cartão de dados antes do email

O email para o Balcão do Munícipe só sai depois de o munícipe preencher **nome, email,
telefone e uma breve descrição do assunto**. Antes disto o email chegava com «não indicado»
em todos os campos — o pedido `falar com um funcionário` não contém dados nenhuns, e o nó de
extracção só lê a mensagem que dispara o encaminhamento.

**Como funciona.** O widget reconhece o pedido de atendimento humano *antes* de ir à rede
(`RE_HANDOVER`, em `assets/js/chatbot.js` — espelha a condição do nó IF do fluxo) e, em vez de
enviar o pedido cru, mostra um cartão dentro da conversa com os quatro campos. Cada um é
validado no browser: nome com pelo menos duas letras, email com `@` e domínio, telefone com
sete dígitos ou mais, descrição com pelo menos dez caracteres. Só quando os quatro passam é
que o pedido segue para o n8n.

**O que segue para o n8n** é um bloco etiquetado, com rótulos fixos em português seja qual for
o idioma do sítio, um campo por linha:

```
[PEDIDO DE ATENDIMENTO HUMANO]
Nome: João Silva
Email: joao.silva@exemplo.cv
Telefone: +238 991 23 45
Assunto: Preciso de uma certidão de residência e vivo fora da ilha.
Página: /servicos.html
```

Na conversa o munícipe vê a versão legível, no idioma do sítio; o bloco etiquetado vai só no
pedido. As quebras de linha da descrição são colapsadas antes do envio — um campo por linha é
o que torna a leitura determinística do lado do n8n.

**Do lado do n8n**, nos dois fluxos:

- O nó que decide o encaminhamento reconhece `[PEDIDO DE ATENDIMENTO HUMANO]` explicitamente,
  além da expressão regular de sempre.
- O email lê cada campo pela linha etiquetada (`/^Nome:[ \t]*(.+)$/m` e as suas irmãs). No
  fluxo *Chat Trigger* o nó de extracção continua lá como recurso, para os pedidos que cheguem
  por conversa; no fluxo *Webhook* a leitura é feita no nó *Normalizar e validar* e o email
  avisa em cabeçalho quando o pedido **não** passou pelo formulário.
- O assunto do email passa a trazer o nome de quem pediu.

**Quem chega sem passar pelo formulário** — por exemplo pelo chat alojado do próprio n8n — cai
na regra B do prompt do agente: pedir os quatro elementos numa só mensagem e não confirmar o
encaminhamento enquanto não estiverem todos.

O cartão sobrevive a um recarregar da página (a entrada de histórico fica marcada e o cartão é
reposto), segue a troca de idioma sem perder o que já foi escrito, e o botão **Cancelar**
fecha-o com uma resposta da assistente. Para o abrir a partir de um botão da página:
`window.CMChat.handover()`.

### 5.9 O que o assistente guarda

`localStorage`, no dispositivo de quem visita, e mais nada:

| Chave | Conteúdo |
|---|---|
| `cm-maio:chat-session` | Identificador de sessão (`crypto.randomUUID()`) |
| `cm-maio:chat-history` | Últimas 50 mensagens da conversa |
| `cm-maio:lang` | Idioma escolhido |
| `cm-maio:contrast` | Preferência de alto contraste |

O botão do caixote na janela da conversa apaga o histórico. Está descrito na política de
cookies, em `contactos.html`.

### 5.10 Segurança das respostas

As respostas do agente passam por um conversor de Markdown próprio que **escapa todo o HTML
antes** de converter e depois filtra o resultado por lista branca
(`p, br, strong, em, code, ul, ol, li, a`), com validação do `href`. Conteúdo do utilizador
nunca é interpretado como Markdown. Verificado: `<img onerror=…>` aparece como texto e
`javascript:` não produz ligação.

---

## 6. Sistema visual

**Elemento-assinatura: a grelha das salinas.** Os tanques de evaporação do Porto Inglês —
rectângulos separados por muros de sal estreitos — são o sistema de layout dos cartões de
serviço e das faixas de dados: `gap` de 2 px sobre fundo claro, e cada "tanque" com uma fase
de evaporação (`data-fase="1"` a `"6"`) que lhe dá o tom.

| Token | Valor | Papel |
|---|---|---|
| `--color-abismo` | `#07272E` | Mar profundo — fundos escuros, cabeçalhos |
| `--color-mare` | `#0F4C5C` | Água sobre o tanque — ligações, ícones |
| `--color-sal` | `#FAFCFB` | Crosta de sal — fundo geral |
| `--color-areia` | `#E3D2AE` | Areia ocre — realces sobre escuro |
| `--color-acacia` | `#7C8F5C` | Acácia seca — etiquetas |
| `--color-salmoura` | `#C2566B` | Salmoura rosada — acento e acção |

Para texto usam-se as variantes escurecidas `--color-salmoura-ink` (5,98:1) e
`--color-acacia-ink`; as versões claras ficam para fundos e traços.

**Tipografia:** *Bricolage Grotesque* (títulos), *Instrument Sans* (texto), *IBM Plex Mono*
(números, datas, etiquetas e tabelas). Escala com `clamp()`. As fontes vêm do Google Fonts com
`preconnect` e `font-display: swap`; sem rede, as pilhas de substituição do sistema mantêm a
página legível.

**Movimento:** uma sequência de entrada na página inicial e revelações discretas com
`IntersectionObserver`. Tudo desligado em `prefers-reduced-motion: reduce`.

**Alto contraste:** o botão na barra de topo activa `data-contrast="high"` no `<html>`, que
redefine os tokens para preto sobre branco com contornos de 2 px.

---

## 7. Acessibilidade e SEO

- Marcação semântica, um `<h1>` por página, hierarquia de títulos correcta.
- Ligação "Saltar para o conteúdo principal", `:focus-visible` sempre visível, menu móvel com
  foco preso e fecho com `Esc`.
- Formulários com `<label>` associada, `aria-describedby` a ligar cada erro ao campo,
  `aria-invalid` e foco no primeiro campo por corrigir.
- Conversa com `role="log"` e `aria-live="polite"`; alterações de listagens anunciadas por
  `role="status"`.
- Tabelas com `<caption>`, `<th scope="col">` e transformação em cartões abaixo de 768 px.
- Meta tags completas por página (title, description, Open Graph, Twitter, canonical,
  hreflang PT/EN/x-default).
- JSON-LD: `GovernmentOrganization` e `BreadcrumbList` em todas as páginas; `WebSite` e
  `Event` na inicial; `FAQPage` e `GovernmentService` nos serviços; `NewsArticle` gerado no
  artigo.
- FAQ e blocos de serviço escritos como **pergunta → resposta directa na primeira frase**,
  para poderem ser citados por motores generativos. `robots.txt` autoriza explicitamente
  GPTBot, ClaudeBot e PerplexityBot.
- CSS crítico embutido no `<head>`, restantes folhas e todo o JavaScript com `defer`,
  imagens com `width`/`height`, `loading="lazy"` e `<picture>` com WebP.

Antes de publicar: correr o Lighthouse com o domínio real já preenchido — os marcadores
`[[SITE_DOMAIN]]` nos `canonical` fazem baixar a pontuação de SEO enquanto lá estiverem.

---

## 8. Verificado neste projecto

- As 9 páginas ligam-se entre si; nenhum link interno partido; nenhum marcador de construção
  por substituir; todos os blocos JSON-LD são JSON válido.
- 628 chaves de tradução, 628 traduzidas — sem chaves órfãs em nenhum dos lados.
- Sem excesso horizontal a 320, 360, 390, 768 e 1920 px.
- Interruptor PT/EN troca cabeçalho, corpo, notícias, agenda e rodapé sem recarregar, e
  persiste entre visitas.
- Com `fetch` desligado (equivalente a `file://`), notícias, documentos, pesquisa e tradução
  continuam a funcionar a partir de `inline-data.js`.
- Chatbot: abre, envia, mostra o indicador de escrita, guarda histórico entre recargas,
  distingue erro de rede de tempo esgotado e oferece "Tentar de novo".
- Formulários: validação campo a campo com mensagens ligadas por `aria-describedby`.
- Filtros, pesquisa, paginação e estados vazios das notícias e dos documentos.

Fica por confirmar em ambiente real, por depender de dados que a Câmara tem de fornecer: a
ligação ao n8n em produção, os endpoints dos formulários e o mapa incorporado.
