import { API_BASE_URL } from './api';

export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('username');
  window.location.href = '/auth/login';
};

const refreshToken = async () => {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('access_token', data.access);
      return data.access;
    }
  } catch (error) {
    console.error('Lỗi làm mới token:', error);
  }
  
  return null;
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  let token = localStorage.getItem('access_token');
  
  const headers = {
    ...options.headers,
    'Authorization': token ? `Bearer ${token}` : '',
  };

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Thử làm mới token
    const newToken = await refreshToken();
    if (newToken) {
      const newHeaders = {
        ...options.headers,
        'Authorization': `Bearer ${newToken}`,
      };
      response = await fetch(url, { ...options, headers: newHeaders });
    } else {
      // Nếu không làm mới được, đăng xuất
      logout();
    }
  }

  return response;
};
