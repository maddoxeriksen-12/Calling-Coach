import Vapi from '@vapi-ai/web';

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY || '';

let vapiInstance = null;

export function getVapi() {
  if (!vapiInstance) {
    vapiInstance = new Vapi(VAPI_PUBLIC_KEY);
  }
  return vapiInstance;
}

export async function startCall(assistantConfig) {
  const vapi = getVapi();
  const call = await vapi.start(assistantConfig);
  return call;
}

export function stopCall() {
  const vapi = getVapi();
  vapi.stop();
}

export function setMuted(muted) {
  const vapi = getVapi();
  vapi.setMuted(muted);
}
