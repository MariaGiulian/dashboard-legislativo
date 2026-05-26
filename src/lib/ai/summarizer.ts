/**
 * Módulo de resumo de proposições legislativas com IA
 *
 * Usa o Claude (Anthropic) para gerar resumos acessíveis de PLs.
 * Se ANTHROPIC_API_KEY não estiver configurada, retorna null sem erro.
 *
 * Modelos disponíveis (escolha na constante MODEL abaixo):
 *   - claude-haiku-4-5-20251001  → mais rápido, menor custo
 *   - claude-sonnet-4-6          → melhor qualidade (recomendado)
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Proposicao } from "@/types";

const MODEL = "claude-haiku-4-5-20251001"; // rápido e barato para resumos curtos

// Lazy initialization — não instancia se a chave não estiver presente
let claudeClient: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!claudeClient) {
    claudeClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return claudeClient;
}

// ─── Interface pública ────────────────────────────────────────────────────────

/**
 * Gera um resumo acessível de uma proposição legislativa.
 *
 * O resumo é estruturado em tópicos claros para que cidadãos sem
 * conhecimento jurídico entendam o que o PL propõe e seus impactos.
 *
 * @param proposicao - Proposição a ser resumida
 * @returns Resumo em Markdown, ou null se a IA não estiver disponível
 */
export async function gerarResumoPL(proposicao: Proposicao): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const prompt = montarPrompt(proposicao);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") return null;
    return content.text.trim();
  } catch (error) {
    console.error("[AI] Erro ao gerar resumo:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Gera um resumo semanal de múltiplas proposições por tema.
 *
 * @param proposicoes - Lista de proposições da semana
 * @param keywords    - Temas monitorados
 * @returns Resumo em texto simples
 */
export async function gerarResumoSemanal(
  proposicoes: Proposicao[],
  keywords: string[]
): Promise<string | null> {
  const client = getClient();
  if (!client || proposicoes.length === 0) return null;

  const lista = proposicoes
    .slice(0, 15) // limita para não exceder tokens
    .map((p) => `- ${p.siglaTipo} ${p.numero}/${p.ano}: ${p.ementa.slice(0, 120)}`)
    .join("\n");

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Faça um resumo semanal das proposições legislativas abaixo.
Temas monitorados: ${keywords.join(", ")}.
Destaque as mais relevantes e organize por tema.

Proposições encontradas (${proposicoes.length} no total):
${lista}

Seja objetivo. Máximo 3 parágrafos.`,
        },
      ],
    });

    const content = response.content[0];
    return content.type === "text" ? content.text.trim() : null;
  } catch {
    return null;
  }
}

// ─── Internals ────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é um assistente especializado em legislação brasileira.
Seu objetivo é explicar proposições legislativas (PLs, PECs, etc.) de forma clara
e acessível para cidadãos que não têm formação jurídica.

Regras:
- Use linguagem simples e direta
- Evite jargões jurídicos (ou explique quando necessário)
- Seja neutro politicamente
- Foque nos impactos práticos para a população
- Responda sempre em português brasileiro`;

function montarPrompt(p: Proposicao): string {
  const tipo = `${p.siglaTipo} ${p.numero}/${p.ano}`;
  const casa = p.casa === "federal" ? "Câmara dos Deputados" : "Câmara Municipal de Porto Alegre";
  const detalhes = p.ementaDetalhada || p.ementa;

  return `Analise este projeto de lei e gere um resumo estruturado:

**${tipo}** — ${casa}
**Apresentado em:** ${new Date(p.dataApresentacao).toLocaleDateString("pt-BR")}
**Autor:** ${p.autor}
**Status atual:** ${p.status}

**Ementa completa:**
${detalhes}

---

Gere um resumo com EXATAMENTE esta estrutura em Markdown:

## O que propõe
[1-2 frases explicando o objetivo do PL em linguagem simples]

## Quem é afetado
[Quais pessoas, grupos ou setores seriam impactados]

## Por que é importante
[Contexto e relevância do tema]

## Status atual
[Em qual etapa está e o que falta para virar lei]`;
}
