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
  ementa: string;
  ementaDetalhada?: string | null;
  dataApresentacao: string; // ISO string
  autor: string;
  casa: Casa;
  urlOriginal: string;
  status: string;
  orgaoStatus?: string | null;
  aiSummary?: string | null;
  createdAt: string;
  updatedAt: string;
  keywords?: KeywordSimples[];
  tramitacoes?: Tramitacao[];
}

/** Etapa de tramitação de um PL */
export interface Tramitacao {
  id: string;
  proposicaoId: string;
  sequencia: number;
  descricao: string;
  orgao: string;
  data: string; // ISO string
}

// ─── Câmara Federal (API) ──────────────────────────────────────────────────────

/** Resposta bruta da API da Câmara Federal — lista de proposições */
export interface CamaraFederalProposicaoItem {
  id: number;
  siglaTipo: string;
  codTipo: number;
  numero: number;
  ano: number;
  ementa: string;
  dataApresentacao: string;
  statusProposicao?: {
    sequencia?: number;
    siglaOrgao?: string;
    descricaoSituacao?: string;
    dataHora?: string;
  };
  autores?: Array<{ nome: string }>;
  uri?: string;
}

/** Resposta detalhada de um PL específico */
export interface CamaraFederalProposicaoDetalhes {
  id: number;
  siglaTipo: string;
  numero: number;
  ano: number;
  ementa: string;
  ementaDetalhada?: string;
  dataApresentacao: string;
  urlInteiroTeor?: string;
  statusProposicao?: {
    siglaOrgao?: string;
    descricaoSituacao?: string;
    sequencia?: number;
  };
  autores?: Array<{ nome: string; uri?: string }>;
}

/** Item de tramitação da API da Câmara Federal */
export interface CamaraFederalTramitacao {
  sequencia: number;
  descricaoSituacao: string;
  siglaOrgao: string;
  dataHora: string;
  despacho?: string;
}

/** Votação da API da Câmara Federal */
export interface CamaraFederalVotacao {
  id: string;
  proposicaoObjeto?: string;
  uri?: string;
  descricao?: string;
  dataHoraRegistro?: string;
  siglaOrgao?: string;
  aprovacao?: number;
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
