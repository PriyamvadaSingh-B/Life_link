// LifeLink API Helper
const API_BASE = '/api';

const getToken = () => localStorage.getItem('lifelink_token');
const getUser = () => JSON.parse(localStorage.getItem('lifelink_user') || 'null');

const apiCall = async (method, endpoint, body = null) => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API_BASE + endpoint, opts);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

const api = {
  // Auth
  register: (data) => apiCall('POST', '/auth/register', data),
  login: (data) => apiCall('POST', '/auth/login', data),
  me: () => apiCall('GET', '/auth/me'),

  // Donors
  getDonors: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiCall('GET', `/donors${q ? '?' + q : ''}`);
  },
  getDonor: (id) => apiCall('GET', `/donors/${id}`),
  updateDonor: (id, data) => apiCall('PUT', `/donors/${id}`, data),
  recordDonation: (id, data) => apiCall('POST', `/donors/${id}/donate`, data),

  // Requests
  getRequests: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiCall('GET', `/requests${q ? '?' + q : ''}`);
  },
  createRequest: (data) => apiCall('POST', '/requests', data),
  updateRequest: (id, data) => apiCall('PUT', `/requests/${id}`, data),
  respondToRequest: (id, data) => apiCall('POST', `/requests/${id}/respond`, data),

  // Inventory
  getInventory: () => apiCall('GET', '/inventory'),

  // Donations
  getDonations: () => apiCall('GET', '/donations'),

  // Stats
  getStats: () => apiCall('GET', '/stats'),
};
