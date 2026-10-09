import { DynamicForm, FormSubmissionPayload, FormSubmissionResult } from '../types/form.js';

export async function fetchForms(params?: {
  organizationId?: string;
  isPublic?: boolean;
  status?: string;
  category?: string;
  search?: string;
  type?: 'public' | 'organization' | 'all';
  token?: string | null;
}): Promise<DynamicForm[]> {
  const query = new URLSearchParams();
  if (params?.organizationId) query.set('organizationId', params.organizationId);
  if (params?.isPublic !== undefined) query.set('isPublic', String(params.isPublic));
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);
  if (params?.search) query.set('search', params.search);
  if (params?.type) query.set('type', params.type);

  const headers: Record<string, string> = {};
  if (params?.token) {
    headers['Authorization'] = `Bearer ${params.token}`;
  }

  const res = await fetch(`/api/v1/forms?${query.toString()}`, { headers });
  if (!res.ok) {
    throw new Error('Failed to load forms');
  }
  const json = await res.json();
  return json.data || [];
}

export async function fetchPublicForms(params?: {
  category?: string;
  search?: string;
  type?: 'public' | 'organization' | 'all';
}): Promise<DynamicForm[]> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.search) query.set('search', params.search);
  if (params?.type) query.set('type', params.type);

  const res = await fetch(`/api/v1/forms/public?${query.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to load public forms');
  }
  const json = await res.json();
  return json.data || [];
}

export async function fetchFormByIdOrSlug(idOrSlug: string, token?: string | null): Promise<DynamicForm> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`/api/v1/forms/${idOrSlug}`, { headers });
  if (!res.ok) {
    throw new Error('Form not found or unavailable');
  }
  const json = await res.json();
  return json.data;
}

export async function createForm(
  data: Partial<DynamicForm>,
  token: string
): Promise<DynamicForm> {
  const res = await fetch('/api/v1/forms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || 'Failed to create form');
  }
  const json = await res.json();
  return json.data;
}

export async function updateForm(
  id: string,
  data: Partial<DynamicForm>,
  token: string
): Promise<DynamicForm> {
  const res = await fetch(`/api/v1/forms/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || 'Failed to update form');
  }
  const json = await res.json();
  return json.data;
}

export async function deleteForm(id: string, token: string): Promise<void> {
  const res = await fetch(`/api/v1/forms/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error('Failed to delete form');
  }
}

export async function submitDynamicForm(
  idOrSlug: string,
  payload: FormSubmissionPayload,
  token?: string | null
): Promise<FormSubmissionResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api/v1/forms/${idOrSlug}/submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to submit form');
  }

  const json = await res.json();
  return json.data;
}

export async function fetchFormSubmissions(id: string, token: string): Promise<any[]> {
  const res = await fetch(`/api/v1/forms/${id}/submissions`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error('Failed to load form submissions');
  }
  const json = await res.json();
  return json.data || [];
}
