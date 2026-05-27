// =============================================================================
// Tipos compartilhados em toda a aplicação
// =============================================================================

/** Casa legislativa monitorada */
export type Casa = "federal" | "poa";

/** Tipos de notificação geradas pelo monitor */
export type TipoNotificacao =
  | "nova_proposicao"
  | "tramitacao"
  | "votacao"
  | "resumo_semanal";

// ─── Proposições ──────────────────────────────────────────────────────────────

/** Proposição legislativa normalizada (federal ou municipal) */
export interface Proposicao {
  id: string;
  numero: number;
  ano: number;
  siglaTipo: string;
  descricaoTipo?: string | null;
  ementa: string;
  ementaDetalhada?: string | null;
  keywordsApi?: string | null;        // Keywords oficiais da Câmara Federal
  dataApresentacao: string;           // ISO string
  autor: string;
  autorUri?: string | null;
  casa: Casa;
  urlOriginal: string;
  status: string;
  orgaoStatus?: string | null;
  regime?: string | null;
  apreciacao?: string | null;
  codSituacao?: number | null;
  aiSummary?: string | null;
  createdAt: string;
  updatedAt: string;
  keywords?: KeywordSimples[];
  tramitacoes?: Tramitacao[];
}

/** Etapa de tramitação de um PL — campos completos da API da Câmara Federal */
export interface Tramitacao {
  id: string;
  proposicaoId: string;
  sequencia: number;
  descricaoTramitacao: string;  // A ação que ocorreu
  descricaoSituacao: string;    // O status resultante
  despacho?: string | null;     // Texto completo do despacho
  orgao: string;
  regime?: string | null;
  urlDocumento?: string | null;
  data: string;                 // ISO string
}

// ─── Câmara Federal — Tipos da API ───────────────────────────────────────────

/** Item retornado pela listagem /proposicoes (campos reduzidos) */
export interface CamaraFederalProposicaoItem {
  id: number;
  uri: string;
  siglaTipo: string;
  codTipo: number;
  numero: number;
  ano: number;
  ementa: string;
  dataApresentacao: string;
  // Nota: statusProposicao e autores NÃO são retornados na listagem.
  // Precisam ser buscados via /proposicoes/{id} e /proposicoes/{id}/autores
}

/** Dados completos de /proposicoes/{id} */
export interface CamaraFederalProposicaoDetalhes {
  id: number;
  uri: string;
  siglaTipo: string;
  codTipo: number;
  numero: number;
  ano: number;
  ementa: string;
  ementaDetalhada: string;
  descricaoTipo: string;
  keywords: string;             // Keywords registradas na Câmara, separadas por vírgula
  dataApresentacao: string;
  urlInteiroTeor?: string;
  uriAutores: string;           // URL para buscar os autores
  statusProposicao: {
    dataHora: string;
    sequencia: number;
    siglaOrgao: string;
    uriOrgao?: string;
    uriUltimoRelator?: string;
    regime: string;
    descricaoTramitacao: string;
    codTipoTramitacao: string;
    descricaoSituacao: string;
    codSituacao: number;
    despacho?: string;
    url?: string | null;
    ambito: string;
    apreciacao: string;
  } | null;
}

/** Autor retornado por /proposicoes/{id}/autores */
export interface CamaraFederalAutor {
  uri: string;
  nome: string;
  codTipo: number;
  tipo: string;               // "Deputado(a)", "Comissão", etc.
  ordemAssinatura: number;
  proponente: number;
}

/** Item de tramitação retornado por /proposicoes/{id}/tramitacoes */
export interface CamaraFederalTramitacaoItem {
  dataHora: string;
  sequencia: number;
  siglaOrgao: string;
  uriOrgao: string;
  uriUltimoRelator?: string | null;
  regime: string;
  descricaoTramitacao: string;  // Nome da ação: "Apresentação de Proposição"
  codTipoTramitacao: string;
  descricaoSituacao: string;    // Status resultante: "Aguardando Designação de Relator"
  codSituacao: number;
  despacho?: string;            // Texto completo — pode conter informações ricas
  url?: string | null;          // Link para o documento
  ambito: string;
  apreciacao: string;
}

/** Votação retornada por /votacoes */
export interface CamaraFederalVotacaoItem {
  id: string;
  uri: string;
  data: string;
  dataHoraRegistro: string;
  siglaOrgao: string;
  uriOrgao: string;
  uriEvento?: string | null;
  proposicaoObjeto?: string | null;
  uriProposicaoObjeto?: string | null;
  descricao: string;
  aprovacao: number;            // 1 = aprovada, 0 = rejeitada, -1 = sem resultado
}

/** Tema oficial da Câmara Federal (de /referencias/proposicoes/codTema) */
export interface CamaraFederalTema {
  cod: string;
  sigla: string;
  nome: string;
  descricao: string;
}

// ─── Câmara Municipal POA (Scraping) ──────────────────────────────────────────

/** Proposição extraída via scraping da Câmara Municipal de Porto Alegre */
export interface CamaraPOAProposicao {
  id: string;
  numero: number;
  ano: number;
  siglaTipo: string;
  ementa: string;
  autor: string;
  status: string;
  dataApresentacao: string;
  urlOriginal: string;
}

// ─── Keywords ─────────────────────────────────────────────────────────────────

/** Palavra-chave monitorada pelo usuário */
export interface Keyword {
  id: string;
  text: string;
  createdAt: string;
  active: boolean;
  _count?: { proposicoes: number };
}

/** Versão simplificada usada em relações */
export interface KeywordSimples {
  keyword: { id: string; text: string };
}

// ─── Notificações ─────────────────────────────────────────────────────────────

/** Notificação no feed do usuário */
export interface Notification {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  proposicaoId?: string | null;
  proposicao?: Pick<Proposicao, "id" | "siglaTipo" | "numero" | "ano"> | null;
  read: boolean;
  createdAt: string;
}

// ─── Votações ─────────────────────────────────────────────────────────────────

/** Votação agendada ou realizada */
export interface Votacao {
  id: string;
  proposicaoId?: string | null;
  descricao: string;
  orgao: string;
  dataHora: string;
  resultado?: string | null;
  uri?: string | null;
}

// ─── Respostas de API ──────────────────────────────────────────────────────────

/** Envelope padrão da API da Câmara Federal */
export interface CamaraFederalEnvelope<T> {
  dados: T;
  links: Array<{ rel: string; href: string }>;
}

/** Formato padrão de resposta de sucesso */
export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

/** Formato padrão de resposta de erro */
export interface ApiError {
  error: string;
  details?: string;
}

/** Estatísticas do dashboard */
export interface DashboardStats {
  totalProposicoes: number;
  novasHoje: number;
  notificacoesNaoLidas: number;
  votacoesProximas: number;
  keywordsAtivas: number;
  proposicoesFederal: number;
  proposicoesPOA: number;
}
