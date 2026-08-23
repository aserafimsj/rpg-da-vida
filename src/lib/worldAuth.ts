import crypto from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Pareamento e sessão do QuesTAH World — tudo do lado do servidor.
 *
 * Princípios (veja ARQUITETURA-QUESTAH-WORLD.md §4):
 *  - O QR carrega APENAS um código efêmero. Nunca credencial.
 *  - O código sozinho não vale nada: é preciso confirmar no celular.
 *  - Só o PC que iniciou consegue retirar o token, porque só ele conhece
 *    o segredo cujo hash foi registrado na criação.
 *  - O token do World é opaco, curto, somente-leitura e revogável.
 *  - Nunca guardamos o token cru, só o hash.
 */

export const PAREAMENTO_VALIDADE_MS = 2 * 60 * 1000;      // 2 minutos para confirmar
export const TOKEN_VALIDADE_MS = 8 * 60 * 60 * 1000;      // 8 horas de sessão
export const MAX_TENTATIVAS = 10;                          // por código

/** Sem caracteres ambíguos (0/O, 1/I/L): o código pode ser lido em voz alta. */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function gerarCodigo(tamanho = 8): string {
  const bytes = crypto.randomBytes(tamanho);
  let saida = "";
  for (let i = 0; i < tamanho; i++) saida += ALFABETO[bytes[i] % ALFABETO.length];
  return saida;
}

/** Os 4 dígitos que aparecem na tela do PC e o celular confirma. */
export function gerarNumero(): string {
  return String(crypto.randomInt(0, 10000)).padStart(4, "0");
}

export function gerarSegredo(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hash(valor: string): string {
  return crypto.createHash("sha256").update(valor).digest("hex");
}

/** Comparação em tempo constante, para não vazar informação pelo relógio. */
export function iguais(a: string, b: string): boolean {
  const ba = Buffer.from(a || "", "utf8");
  const bb = Buffer.from(b || "", "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * `fetch` sem cache.
 *
 * O Next guarda respostas de `fetch` por padrão. Como o PC consulta a MESMA
 * URL de pareamento a cada 2 segundos, sem isto ele receberia para sempre a
 * primeira resposta ("aguardando") e nunca enxergaria a confirmação.
 */
const semCache: typeof fetch = (entrada: any, init: any = {}) =>
  fetch(entrada, { ...init, cache: "no-store" });

/** Cliente com a chave de serviço. NUNCA use isto fora de rota de servidor. */
export function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("world: faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, chave, {
    auth: { persistSession: false },
    global: { fetch: semCache },
  });
}

/**
 * Valida o JWT que o celular enviou e devolve o dono dele.
 * Funciona igual para conta com e-mail e para conta anônima — é o que
 * garante que quem entrou pelo "▶ Jogar agora" use o portal do mesmo jeito.
 */
export async function usuarioDoToken(authorization: string | null) {
  const jwt = (authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` }, fetch: semCache },
  });
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

/** Resolve o token do World para um user_id, ou null se inválido/expirado/revogado. */
export async function usuarioDaSessaoWorld(authorization: string | null) {
  const token = (authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const sb = admin();
  const { data, error } = await sb
    .from("world_pareamentos")
    .select("user_id, token_expira_em, revogado_em")
    .eq("token_hash", hash(token))
    .maybeSingle();
  if (error || !data || !data.user_id) return null;
  if (data.revogado_em) return null;
  if (!data.token_expira_em || new Date(data.token_expira_em).getTime() < Date.now()) return null;
  return data.user_id as string;
}

/** Descrição legível do computador, só para a tela de confirmação. */
export function descreverPc(userAgent: string | null): string {
  const ua = userAgent || "";
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  const so = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux" : /CrOS/.test(ua) ? "ChromeOS" : "computador";
  return `${nav} no ${so}`;
}
