#!/usr/bin/env bash
# =============================================================================
# build.sh — monta as páginas HTML a partir dos parciais partilhados
# (tools/partials) e do conteúdo de cada página (tools/content/<slug>.html).
# Gera ficheiros estáticos completos: o resultado NÃO depende deste script.
# Executar a partir da raiz do projecto:  bash tools/build.sh
# =============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HEADER="$(cat tools/partials/header.html)"
FOOTER="$(cat tools/partials/footer.html)"

# slug|título|descrição|migalha (vazio = sem migalhas, só a home)
PAGES=$(cat <<'LIST'
index|Câmara Municipal do Maio — serviços, município e ilha|Sítio oficial da Câmara Municipal do Maio, Cabo Verde. Certidões, licenciamento, água, taxas, notícias e informação sobre a ilha.|
municipio|O Município do Maio — história, geografia e localidades|História, geografia, símbolos e as doze localidades do concelho do Maio, na ilha do Maio, Cabo Verde.|O Município
governacao|Governação Municipal — executivo, assembleia e organigrama|Presidência, vereações, Assembleia Municipal, competências, organigrama e actas das reuniões da Câmara Municipal do Maio.|Governação
servicos|Serviços ao Munícipe — certidões, licenças, água e taxas|Como pedir certidões, licenças comerciais, obras particulares, ligação de água, recolha de resíduos, mercados, cemitérios e consultar as taxas municipais.|Serviços ao Munícipe
noticias|Notícias e Eventos do Município do Maio|Notícias, deliberações, obras e agenda de eventos da Câmara Municipal do Maio.|Notícias e Eventos
noticia|Notícia — Câmara Municipal do Maio|Artigo do serviço de comunicação da Câmara Municipal do Maio.|Notícia
turismo|Visitar o Maio — praias, natureza, tartarugas e sabores|Praias, acácias do Barreiro, tartarugas, pesca artesanal, queijo de cabra, onde ficar e como chegar à ilha do Maio.|Visitar o Maio
transparencia|Transparência — orçamento, contas, contratação e regulamentos|Orçamento e contas, plano de actividades, contratação pública, regulamentos e posturas municipais do Maio, em documentos descarregáveis.|Transparência
contactos|Contactos e Atendimento — Câmara Municipal do Maio|Moradas, telefones, emails por pavilhão e serviço, horário de atendimento, mapa e formulário de contacto da Câmara Municipal do Maio.|Contactos
LIST
)

crumb_ld () { # $1 slug  $2 nome
  if [ -z "$2" ]; then
    printf '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Início","item":"https://[[SITE_DOMAIN]]/"}]}'
  else
    printf '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Início","item":"https://[[SITE_DOMAIN]]/"},{"@type":"ListItem","position":2,"name":"%s","item":"https://[[SITE_DOMAIN]]/%s.html"}]}' "$2" "$1"
  fi
}

while IFS='|' read -r SLUG TITLE DESC CRUMB; do
  [ -z "$SLUG" ] && continue
  OUT="$SLUG.html"
  CONTENT="tools/content/$SLUG.html"
  EXTRA="tools/content/$SLUG.head.html"
  [ -f "$CONTENT" ] || { echo "  ! falta $CONTENT"; continue; }

  # aria-current="page" apenas na entrada correspondente do menu
  NAVHEADER="$HEADER"
  for s in index municipio governacao servicos noticias turismo transparencia contactos; do
    if [ "$s" = "$SLUG" ] || { [ "$SLUG" = "noticia" ] && [ "$s" = "noticias" ]; }; then
      NAVHEADER="${NAVHEADER//\{\{AC_$s\}\}/ aria-current=\"page\"}"
    else
      NAVHEADER="${NAVHEADER//\{\{AC_$s\}\}/}"
    fi
  done

  {
    cat tools/partials/head.html
    printf '\n'
  } > "$OUT.tmp"

  # substituições do <head>
  python3 - "$OUT.tmp" "$SLUG" "$TITLE" "$DESC" "$(crumb_ld "$SLUG" "$CRUMB")" "$EXTRA" <<'PY'
import sys, io, os
path, slug, title, desc, crumb, extra = sys.argv[1:7]
html = io.open(path, encoding="utf-8").read()
extra_html = io.open(extra, encoding="utf-8").read() if os.path.exists(extra) else ""
html = (html.replace("{{TITLE}}", title)
            .replace("{{DESC}}", desc)
            .replace("{{SLUG}}", slug)
            .replace("{{CRUMB_LD}}", crumb)
            .replace("{{EXTRA_HEAD}}", extra_html))
io.open(path, "w", encoding="utf-8").write(html)
PY

  {
    cat "$OUT.tmp"
    printf '%s\n' "$NAVHEADER"
    cat "$CONTENT"
    printf '%s\n' "$FOOTER"
    printf '</body>\n</html>\n'
  } > "$OUT"
  rm -f "$OUT.tmp"
  echo "  ✓ $OUT"
done <<< "$PAGES"

# Regenera os dados embutidos (permite abrir o site em file://)
node tools/build-inline-data.js
echo "Concluído."
