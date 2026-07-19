import type { Database } from './types';

type ApiError = { message: string; code?: string; details?: string } | null;
type ApiResult<T = any> = { data: T | null; error: ApiError; count?: number | null };
type AuthListener = (event: string, session: any | null) => void;

// В превью Lovable нет PHP — обращаемся к прод-бэку на Beget напрямую.
// В проде (когда фронт залит рядом с api.php) используем относительный путь.
const PROD_API_FALLBACK = 'https://gavrilyuks.beget.tech/api.php';
const isLovablePreview = typeof window !== 'undefined' && /lovable\.(app|dev)$/.test(window.location.hostname);
const API_URL =
  import.meta.env.VITE_BEGET_API_URL ||
  (isLovablePreview ? PROD_API_FALLBACK : '/api.php');
const SESSION_KEY = 'beget_crm_session';

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(session: any | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

function authHeaders() {
  const session = readSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function apiRequest<T = any>(action: string, payload: Record<string, any> = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    const json = text ? JSON.parse(text) : {};

    if (!response.ok || json.error) {
      return { data: null, error: { message: json.error?.message || json.error || `HTTP ${response.status}` } };
    }

    return { data: json.data ?? null, error: null, count: json.count ?? null };
  } catch (error: any) {
    return { data: null, error: { message: error?.message || 'Ошибка соединения с сервером' } };
  }
}

class QueryBuilder<T = any> implements PromiseLike<ApiResult<T>> {
  private payload: Record<string, any>;

  constructor(table: string) {
    this.payload = {
      table,
      operation: 'select',
      select: '*',
      filters: [],
      order: [],
      limit: null,
      single: false,
      maybeSingle: false,
      returning: false,
    };
  }

  select(columns = '*') {
    this.payload.select = columns;
    this.payload.returning = this.payload.operation !== 'select';
    return this;
  }

  insert(values: any) {
    this.payload.operation = 'insert';
    this.payload.values = values;
    return this;
  }

  update(values: any) {
    this.payload.operation = 'update';
    this.payload.values = values;
    return this;
  }

  upsert(values: any, options?: any) {
    this.payload.operation = 'upsert';
    this.payload.values = values;
    this.payload.options = options || {};
    return this;
  }

  delete() {
    this.payload.operation = 'delete';
    return this;
  }

  eq(column: string, value: any) { return this.filter(column, 'eq', value); }
  gte(column: string, value: any) { return this.filter(column, 'gte', value); }
  lt(column: string, value: any) { return this.filter(column, 'lt', value); }
  in(column: string, value: any[]) { return this.filter(column, 'in', value); }
  contains(column: string, value: any) { return this.filter(column, 'contains', value); }
  is(column: string, value: any) { return this.filter(column, 'is', value); }
  not(column: string, operator: string, value: any) { return this.filter(column, `not.${operator}`, value); }
  or(expression: string) { this.payload.or = expression; return this; }

  filter(column: string, operator: string, value: any) {
    this.payload.filters.push({ column, operator, value });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    this.payload.order.push({ column, ascending: options.ascending !== false });
    return this;
  }

  limit(count: number) {
    this.payload.limit = count;
    return this;
  }

  single() {
    this.payload.single = true;
    return this;
  }

  maybeSingle() {
    this.payload.maybeSingle = true;
    return this;
  }

  private async execute(): Promise<ApiResult<T>> {
    return apiRequest<T>('query', this.payload);
  }

  then<TResult1 = ApiResult<T>, TResult2 = never>(
    onfulfilled?: ((value: ApiResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

const listeners = new Set<AuthListener>();

function notifyAuth(event: string, session: any | null) {
  listeners.forEach((listener) => listener(event, session));
}

export const supabase = {
  from: <T = any>(table: keyof Database['public']['Tables'] | string) => new QueryBuilder<T>(String(table)),

  auth: {
    onAuthStateChange(callback: AuthListener) {
      listeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              listeners.delete(callback);
            },
          },
        },
      };
    },

    async getSession() {
      const session = readSession();
      if (!session?.access_token) return { data: { session: null }, error: null };

      const { data, error } = await apiRequest<any>('auth.me');
      if (error) {
        writeSession(null);
        return { data: { session: null }, error };
      }

      const freshSession = { ...session, user: data.user };
      writeSession(freshSession);
      return { data: { session: freshSession }, error: null };
    },

    async getUser() {
      const { data, error } = await this.getSession();
      return { data: { user: data.session?.user ?? null }, error };
    },

    async signInWithPassword(credentials: { email: string; password: string }) {
      const { data, error } = await apiRequest<any>('auth.login', credentials);
      if (error) return { data: { user: null, session: null }, error };

      writeSession(data.session);
      notifyAuth('SIGNED_IN', data.session);
      return { data: { user: data.user, session: data.session }, error: null };
    },

    async signOut() {
      await apiRequest('auth.logout');
      writeSession(null);
      notifyAuth('SIGNED_OUT', null);
      return { error: null };
    },

    async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
      return apiRequest('auth.resetPasswordForEmail', { email, redirectTo: options?.redirectTo });
    },

    async updateUser(attributes: { password?: string; [key: string]: any }) {
      const { data, error } = await apiRequest<any>('auth.updateUser', attributes);
      if (!error && data?.session) {
        writeSession(data.session);
        notifyAuth('USER_UPDATED', data.session);
      }
      return { data: data || {}, error };
    },
  },

  functions: {
    async invoke<T = any>(name: string, options: { body?: any } = {}) {
      return apiRequest<T>('function', { name, body: options.body || {} });
    },
  },

  rpc(name: string, args: Record<string, any> = {}) {
    return apiRequest('rpc', { name, args });
  },

  channel(_name: string) {
    const channelApi = {
      on: (_event: string, _filter?: any, _callback?: any) => channelApi,
      subscribe: (_callback?: any) => channelApi,
    };
    return channelApi;
  },

  removeChannel(_channel: any) {
    return Promise.resolve('ok');
  },

  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, file: Blob, options: Record<string, any> = {}) {
          const form = new FormData();
          form.append('bucket', bucket);
          form.append('path', path);
          form.append('file', file);
          form.append('options', JSON.stringify(options));

          try {
            const response = await fetch(`${API_URL}?action=upload`, {
              method: 'POST',
              headers: authHeaders(),
              credentials: 'include',
              body: form,
            });
            const json = await response.json();
            if (!response.ok || json.error) return { data: null, error: { message: json.error?.message || json.error || 'Ошибка загрузки файла' } };
            return { data: json.data, error: null };
          } catch (error: any) {
            return { data: null, error: { message: error?.message || 'Ошибка загрузки файла' } };
          }
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: `/uploads/${bucket}/${path}` } };
        },
      };
    },
  },
};