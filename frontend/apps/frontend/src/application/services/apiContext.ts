import type { SessionPort, ZentricApiPort } from '../../domain';

let globalApi: ZentricApiPort | null = null;
let globalSession: SessionPort | null = null;

export function setDefaultApi(api: ZentricApiPort): void {
  globalApi = api;
}

export function getDefaultApi(): ZentricApiPort | null {
  return globalApi;
}

export function setDefaultSession(session: SessionPort): void {
  globalSession = session;
}

export function getDefaultSession(): SessionPort | null {
  return globalSession;
}

export function resolveApi(api?: ZentricApiPort): ZentricApiPort {
  if (api) return api;
  if (globalApi) return globalApi;
  throw new Error('ZentricApiPort no configurado. Pase api al hook o invoque setDefaultApi.');
}

export function resolveSession(session?: SessionPort): SessionPort {
  if (session) return session;
  if (globalSession) return globalSession;
  throw new Error('SessionPort no configurado. Pase session al hook o invoque setDefaultSession.');
}
