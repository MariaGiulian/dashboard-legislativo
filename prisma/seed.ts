/**
 * Seed do banco de dados
 * Popula com keywords e dados de exemplo para demonstração
 *
 * Execute: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Populando banco com dados de exemplo...");

  // Keywords de demonstração
  const keywords = [
    "inteligência artificial",
    "proteção de dados",
    "tecnologia",
    "advocacia",
  ];

  for (const text of keywords) {
    await prisma.keyword.upsert({
      where: { text },
      update: {},
      create: { text },
    });
    console.log(`  ✓ Keyword: "${text}"`);
  }

  // Proposição de exemplo (federal)
  await prisma.proposicao.upsert({
    where: { id: "exemplo-federal-1" },
    update: {},
    create: {
      id: "exemplo-federal-1",
      numero: 2630,
      ano: 2020,
      siglaTipo: "PL",
      ementa:
        "Institui a Lei Brasileira de Liberdade, Responsabilidade e Transparência na Internet, regulamentando a moderação de conteúdo e uso de algoritmos pelas plataformas digitais.",
      ementaDetalhada:
        "Regulamenta o uso responsável de algoritmos e a moderação de conteúdo por plataformas digitais de grande escala no Brasil, estabelecendo obrigações de transparência e prestação de contas.",
      dataApresentacao: new Date("2020-06-24"),
      autor: "Comissão Especial",
      casa: "federal",
      urlOriginal:
        "https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2256983",
      status: "Aguardando Votação em Plenário",
      orgaoStatus: "PLEN",
      keywords: {
        create: [
          { keyword: { connect: { text: "tecnologia" } } },
          { keyword: { connect: { text: "inteligência artificial" } } },
        ],
      },
      tramitacoes: {
        create: [
          {
            sequencia: 1,
            descricao: "Apresentação do PL na Câmara dos Deputados",
            orgao: "MESA",
            data: new Date("2020-06-24"),
          },
          {
            sequencia: 2,
            descricao: "Criação de Comissão Especial para análise",
            orgao: "PRES",
            data: new Date("2020-09-01"),
          },
          {
            sequencia: 3,
            descricao: "Votação do substitutivo aprovada na Comissão",
            orgao: "CE",
            data: new Date("2022-06-28"),
          },
        ],
      },
    },
  });

  console.log("  ✓ Proposição de exemplo criada");

  // Notificação de exemplo
  await prisma.notification.create({
    data: {
      tipo: "nova_proposicao",
      titulo: "📋 Nova proposição sobre tecnologia foi encontrada",
      mensagem:
        "PL 2630/2020: Institui a Lei Brasileira de Liberdade, Responsabilidade e Transparência na Internet...",
      proposicaoId: "exemplo-federal-1",
    },
  });

  console.log("  ✓ Notificação de exemplo criada");
  console.log("\n✅ Seed concluído! Acesse http://localhost:3000");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
