import { auth } from '../firebase';

async function postAi<T>(path: string, body: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Sign in to use AI intelligence features.');
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'AI service unavailable.');
  return payload as T;
}

export const aiApi = {
  chat: (message: string, history: Array<{ role: string; content: string }>) =>
    postAi<{ text: string }>('/api/ai/chat', { message, history }),
  strategy: (objective: string) => postAi<{ text: string }>('/api/ai/strategy', { objective }),
  recommendation: (simulation: unknown) => postAi<{ text: string }>('/api/ai/recommendation', { simulation }),
};
