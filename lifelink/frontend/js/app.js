// LifeLink Main App JS

// ===================== NAVIGATION =====================
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');
  window.scrollTo(0, 0);
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

// Close sidebar on outside click
document.addEventListener('click', (e) => {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar && sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      !e.target.closest('.sidebar-toggle')) {
    sidebar.classList.remove('open');
  }
});

// ===================== TOAST =====================
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ===================== AUTH =====================
function selectRole(role) {
  document.getElementById('register-role').value = role;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`role-${role}`).classList.add('active');

  const donorFields = document.querySelectorAll('.donor-only-field');
  donorFields.forEach(f => {
    f.style.display = role === 'donor' ? 'grid' : 'none';
  });
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  btn.textContent = 'Signing in...'; btn.disabled = true;

  try {
    const data = await api.login({
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value,
    });
    localStorage.setItem('lifelink_token', data.token);
    localStorage.setItem('lifelink_user', JSON.stringify(data.user));
    initDashboard(data.user);
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
  } finally {
    btn.textContent = 'Sign In'; btn.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('register-btn');
  const errEl = document.getElementById('register-error');
  errEl.classList.add('hidden');
  btn.textContent = 'Creating account...'; btn.disabled = true;

  const role = document.getElementById('register-role').value;
  try {
    const data = await api.register({
      name: document.getElementById('reg-name').value,
      email: document.getElementById('reg-email').value,
      password: document.getElementById('reg-password').value,
      phone: document.getElementById('reg-phone').value,
      bloodGroup: document.getElementById('reg-bloodgroup').value,
      city: document.getElementById('reg-city').value,
      age: document.getElementById('reg-age').value || null,
      weight: document.getElementById('reg-weight').value || null,
      role,
    });
    localStorage.setItem('lifelink_token', data.token);
    localStorage.setItem('lifelink_user', JSON.stringify(data.user));
    showToast('Welcome to LifeLink! 🩸');
    initDashboard(data.user);
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.remove('hidden');
  } finally {
    btn.textContent = 'Create Account'; btn.disabled = false;
  }
}

function logout() {
  localStorage.removeItem('lifelink_token');
  localStorage.removeItem('lifelink_user');
  showPage('page-landing');
  showToast('Signed out successfully', 'success');
}

// ===================== DASHBOARD INIT =====================
function initDashboard(user) {
  if (user.role === 'donor') {
    showPage('page-donor-dashboard');
    loadDonorDashboard(user);
  } else {
    showPage('page-receiver-dashboard');
    loadReceiverDashboard(user);
  }
}

// ===================== DONOR DASHBOARD =====================
function showDonorTab(tab) {
  document.querySelectorAll('#page-donor-dashboard .tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#donor-sidebar .nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.querySelector(`#donor-sidebar [data-tab="${tab}"]`).classList.add('active');

  // Load data for tab
  const user = getUser();
  if (tab === 'history') loadDonationHistory(user);
  if (tab === 'requests') loadAllRequests();
  if (tab === 'inventory') loadFullInventory('donor-inventory-display');
  if (tab === 'badges') loadBadges(user);
  if (tab === 'profile') loadProfileForm(user);
}

async function loadDonorDashboard(user) {
  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('donor-greeting').textContent = `${greeting}, ${user.name.split(' ')[0]}! 👋`;

  try {
    // Load donor stats
    const donor = await api.getDonor(user.id).catch(() => null);
    if (donor) {
      document.getElementById('d-total-donations').textContent = donor.totalDonations;
      document.getElementById('d-lives-impact').textContent = donor.totalDonations * 3;
      document.getElementById('d-blood-group').textContent = donor.bloodGroup;
      document.getElementById('d-last-donation').textContent = donor.lastDonation
        ? new Date(donor.lastDonation).toLocaleDateString() : 'Never';

      const toggle = document.getElementById('availability-toggle');
      toggle.checked = donor.isAvailable;
    }

    // Load stats
    const stats = await api.getStats();
    loadInventoryOverview(stats.inventory);

    // Load active requests matching blood group
    const requests = await api.getRequests({ status: 'pending' });
    loadDonorActiveRequests(requests, user.bloodGroup);

  } catch (err) {
    console.error(err);
  }
}

function loadInventoryOverview(inventory) {
  const el = document.getElementById('donor-inventory-overview');
  if (!el) return;

  const grid = document.createElement('div');
  grid.className = 'inventory-grid';

  Object.entries(inventory).forEach(([bg, data]) => {
    const level = data.units < 10 ? 'critical' : data.units < 25 ? 'low' : 'ok';
    const statusText = level === 'critical' ? '⚠️ Critical' : level === 'low' ? '📉 Low' : '✅ Adequate';
    grid.innerHTML += `
      <div class="inventory-card">
        <div class="inventory-bg">${bg}</div>
        <div class="inventory-units">${data.units}</div>
        <div class="inventory-label">units</div>
        <span class="inventory-status status-${level}">${statusText}</span>
      </div>`;
  });
  el.innerHTML = '';
  el.appendChild(grid);
}

function loadDonorActiveRequests(requests, userBloodGroup) {
  const el = document.getElementById('donor-active-requests');
  if (!el) return;

  // Show requests matching donor's blood group or universal compatible
  const compatible = getCompatibleTypes(userBloodGroup);
  const relevant = requests.filter(r => compatible.includes(r.bloodGroup)).slice(0, 3);

  if (!relevant.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><p>No pending requests matching your blood group right now.</p></div>`;
    return;
  }
  el.innerHTML = relevant.map(r => renderRequestCard(r, true)).join('');
}

function getCompatibleTypes(bg) {
  const compat = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+'],
  };
  return compat[bg] || [bg];
}

async function loadDonationHistory(user) {
  const el = document.getElementById('donation-history-list');
  try {
    const donations = await api.getDonations();
    const myDonations = donations.filter(d => d.donorId === user.id);
    if (!myDonations.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💉</div><p>No donations recorded yet. Be a hero — donate today!</p></div>`;
      return;
    }
    el.innerHTML = myDonations.reverse().map(d => `
      <div class="request-card">
        <div class="request-header">
          <span class="request-title">🩸 ${d.bloodGroup} — ${d.units} unit(s)</span>
          <span class="urgency-tag normal">Completed</span>
        </div>
        <div class="request-meta">
          <span>📅 ${new Date(d.date).toLocaleDateString()}</span>
          <span>❤️ ~${d.units * 3} lives potentially saved</span>
        </div>
      </div>`).join('');
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><p>Failed to load history.</p></div>`;
  }
}

async function loadAllRequests() {
  const el = document.getElementById('all-requests-list');
  try {
    const requests = await api.getRequests();
    if (!requests.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🆘</div><p>No blood requests at the moment.</p></div>`;
      return;
    }
    el.innerHTML = requests.reverse().map(r => renderRequestCard(r, true)).join('');
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><p>Failed to load requests.</p></div>`;
  }
}

function renderRequestCard(r, showRespond = false) {
  const urgencyClass = r.urgency || 'normal';
  const urgencyText = urgencyClass === 'critical' ? '🚨 Critical' : urgencyClass === 'urgent' ? '⚡ Urgent' : '📋 Normal';
  const user = getUser();
  const hasResponded = r.responses && r.responses.some(resp => resp.donorId === user?.id);

  return `
    <div class="request-card ${urgencyClass}">
      <div class="request-header">
        <span class="request-title">🩸 ${r.bloodGroup} needed — ${r.patientName || 'Patient'}</span>
        <span class="urgency-tag ${urgencyClass}">${urgencyText}</span>
      </div>
      <div class="request-meta">
        <span>🏥 ${r.hospital || 'Hospital not specified'}</span>
        <span>📍 ${r.city || '—'}</span>
        <span>🔢 ${r.units || 1} unit(s)</span>
        <span>📞 ${r.contact}</span>
      </div>
      ${r.notes ? `<div style="margin-top:0.5rem;font-size:0.82rem;color:var(--text-muted)">📝 ${r.notes}</div>` : ''}
      ${showRespond && user?.role === 'donor' && !hasResponded ? `
        <button class="btn btn-sm btn-outline mt-1" onclick="openRespondModal('${r.id}')">
          Respond to Request
        </button>` : ''}
      ${hasResponded ? `<span class="urgency-tag normal mt-1" style="display:inline-block">✅ You responded</span>` : ''}
      ${r.responses && r.responses.length > 0 ? `<div style="margin-top:0.5rem;font-size:0.78rem;color:var(--text-muted)">${r.responses.length} donor(s) responded</div>` : ''}
    </div>`;
}

async function loadFullInventory(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  try {
    const inv = await api.getInventory();
    el.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'inventory-grid';
    Object.entries(inv).forEach(([bg, data]) => {
      const level = data.units < 10 ? 'critical' : data.units < 25 ? 'low' : 'ok';
      const statusText = level === 'critical' ? '⚠️ Critical' : level === 'low' ? '📉 Low' : '✅ Adequate';
      grid.innerHTML += `
        <div class="inventory-card">
          <div class="inventory-bg">${bg}</div>
          <div class="inventory-units">${data.units}</div>
          <div class="inventory-label">units available</div>
          <span class="inventory-status status-${level}">${statusText}</span>
          <div style="font-size:0.72rem;color:var(--text-dim);margin-top:0.4rem">Updated: ${new Date(data.lastUpdated).toLocaleDateString()}</div>
        </div>`;
    });
    el.appendChild(grid);
  } catch (err) {
    el.innerHTML = '<p style="color:var(--text-muted)">Failed to load inventory.</p>';
  }
}

async function loadBadges(user) {
  const el = document.getElementById('badges-display');
  try {
    const donor = await api.getDonor(user.id).catch(() => ({ badges: [], totalDonations: 0 }));
    const allBadges = [
      { id: 'First Drop', icon: '🩸', name: 'First Drop', desc: 'Made your first blood donation', req: 1 },
      { id: 'Life Saver', icon: '💉', name: 'Life Saver', desc: 'Donated 5 or more times', req: 5 },
      { id: 'Blood Hero', icon: '🦸', name: 'Blood Hero', desc: 'Donated 10 or more times', req: 10 },
      { id: 'Guardian Angel', icon: '😇', name: 'Guardian Angel', desc: 'Donate 20 times', req: 20 },
      { id: 'Legend', icon: '👑', name: 'Legend', desc: 'Donate 50 times', req: 50 },
    ];
    const earned = donor.badges || [];
    const grid = document.createElement('div');
    grid.className = 'badges-grid';
    allBadges.forEach(b => {
      const isEarned = earned.includes(b.id);
      grid.innerHTML += `
        <div class="badge-card ${isEarned ? 'earned' : 'locked'}">
          <div class="badge-icon">${b.icon}</div>
          <div class="badge-name">${b.name}</div>
          <div class="badge-desc">${b.desc}</div>
          ${isEarned ? '<div style="color:var(--warning);font-size:0.8rem;margin-top:0.5rem">🏆 Earned!</div>' : `<div style="color:var(--text-dim);font-size:0.78rem;margin-top:0.5rem">Requires ${b.req} donations</div>`}
        </div>`;
    });
    el.innerHTML = '';
    el.appendChild(grid);
  } catch (err) {
    el.innerHTML = '<p>Failed to load badges.</p>';
  }
}

async function loadProfileForm(user) {
  document.getElementById('profile-name').value = user.name || '';
  document.getElementById('profile-phone').value = user.phone || '';
  document.getElementById('profile-city').value = user.city || '';
  document.getElementById('profile-bloodgroup').value = user.bloodGroup || 'A+';
  document.getElementById('profile-age').value = user.age || '';
  document.getElementById('profile-weight').value = user.weight || '';
  document.getElementById('profile-display-name').textContent = user.name;
  document.getElementById('profile-avatar-display').textContent = user.name[0].toUpperCase();
  document.getElementById('profile-blood-badge').textContent = user.bloodGroup;
}

async function saveProfile() {
  const user = getUser();
  const alertEl = document.getElementById('profile-alert');
  try {
    const updates = {
      name: document.getElementById('profile-name').value,
      phone: document.getElementById('profile-phone').value,
      city: document.getElementById('profile-city').value,
      bloodGroup: document.getElementById('profile-bloodgroup').value,
      age: document.getElementById('profile-age').value,
      weight: document.getElementById('profile-weight').value,
    };
    await api.updateDonor(user.id, updates);
    // Update local storage
    const updated = { ...user, ...updates };
    localStorage.setItem('lifelink_user', JSON.stringify(updated));
    alertEl.textContent = '✅ Profile updated successfully!';
    alertEl.className = 'alert alert-success';
    alertEl.classList.remove('hidden');
    showToast('Profile updated!');
    setTimeout(() => alertEl.classList.add('hidden'), 3000);
  } catch (err) {
    alertEl.textContent = err.message;
    alertEl.className = 'alert alert-error';
    alertEl.classList.remove('hidden');
  }
}

async function toggleAvailability() {
  const user = getUser();
  const isAvailable = document.getElementById('availability-toggle').checked;
  try {
    await api.updateDonor(user.id, { isAvailable });
    showToast(isAvailable ? 'You are now marked as available 🩸' : 'Availability turned off');
  } catch (err) {
    showToast('Failed to update availability', 'error');
  }
}

async function recordDonation() {
  const user = getUser();
  const units = parseInt(document.getElementById('donate-units').value);
  try {
    const result = await api.recordDonation(user.id, { units });
    showToast(`Donation recorded! 🩸 Thank you for saving lives!`);
    // Refresh stats
    document.getElementById('d-total-donations').textContent = result.donor.totalDonations;
    document.getElementById('d-lives-impact').textContent = result.donor.totalDonations * 3;
    document.getElementById('d-last-donation').textContent = new Date(result.donor.lastDonation).toLocaleDateString();
    document.getElementById('availability-toggle').checked = false;

    // Check for new badges
    if (result.donor.badges && result.donor.badges.length > 0) {
      setTimeout(() => showToast(`🏆 New badge earned: ${result.donor.badges[result.donor.badges.length - 1]}!`), 1500);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Respond modal
function openRespondModal(requestId) {
  const user = getUser();
  const modal = document.createElement('div');
  modal.className = 'respond-modal';
  modal.id = 'respond-modal';
  modal.innerHTML = `
    <div class="modal-box">
      <h3>🩸 Respond to Blood Request</h3>
      <div class="form-group">
        <label>Your Phone Number</label>
        <input type="tel" id="respond-phone" value="${user.phone || ''}" placeholder="+91 XXXXX XXXXX" />
      </div>
      <div class="form-group">
        <label>Message to Requester</label>
        <textarea id="respond-message" rows="3" placeholder="I can donate blood. Please contact me..."></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitResponse('${requestId}')">Send Response</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function closeModal() {
  const modal = document.getElementById('respond-modal');
  if (modal) modal.remove();
}

async function submitResponse(requestId) {
  const user = getUser();
  try {
    await api.respondToRequest(requestId, {
      donorName: user.name,
      phone: document.getElementById('respond-phone').value,
      message: document.getElementById('respond-message').value,
    });
    closeModal();
    showToast('Response sent! 🩸 You may be saving a life!');
    loadAllRequests();
    loadDonorActiveRequests(await api.getRequests({ status: 'pending' }), user.bloodGroup);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===================== RECEIVER DASHBOARD =====================
function showReceiverTab(tab) {
  document.querySelectorAll('#page-receiver-dashboard .tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#receiver-sidebar .nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`rtab-${tab}`).classList.add('active');
  document.querySelector(`#receiver-sidebar [data-tab="${tab}"]`).classList.add('active');

  const user = getUser();
  if (tab === 'search') searchDonors();
  if (tab === 'my-requests') loadMyRequests(user);
  if (tab === 'inventory') loadFullInventory('receiver-inventory-display');
  if (tab === 'sos') loadSOSDonors();
}

async function loadReceiverDashboard(user) {
  document.getElementById('receiver-greeting').textContent = `Welcome, ${user.name.split(' ')[0]}! 🏥`;

  try {
    const stats = await api.getStats();
    document.getElementById('r-available-donors').textContent = stats.activeDonors;
    document.getElementById('r-total-units').textContent = stats.totalUnits;

    const requests = await api.getRequests();
    const myReqs = requests.filter(r => r.requesterId === user.id);
    document.getElementById('r-total-requests').textContent = myReqs.length;
    document.getElementById('r-fulfilled').textContent = myReqs.filter(r => r.status === 'fulfilled').length;

    // Load recent requests
    loadRecentRequests(myReqs);
  } catch (err) {
    console.error(err);
  }
}

function loadRecentRequests(requests) {
  const el = document.getElementById('recent-requests-list');
  if (!el) return;
  if (!requests.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><p>No requests yet. Submit your first blood request.</p></div>`;
    return;
  }
  el.innerHTML = requests.slice(-3).reverse().map(r => renderRequestCard(r, false)).join('');
}

async function searchDonors() {
  const bg = document.getElementById('search-bg')?.value || '';
  const city = document.getElementById('search-city')?.value || '';
  const available = document.getElementById('search-available')?.checked;
  const el = document.getElementById('search-results');
  if (!el) return;

  el.innerHTML = '<div class="loading-shimmer"></div>';
  try {
    const params = {};
    if (bg) params.bloodGroup = bg;
    if (city) params.city = city;
    if (available) params.available = 'true';

    const donors = await api.getDonors(params);
    if (!donors.length) {
      el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">😔</div><p>No donors found matching your criteria.</p></div>`;
      return;
    }
    el.innerHTML = donors.map(d => renderDonorCard(d)).join('');
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><p>Search failed. Try again.</p></div>`;
  }
}

async function quickSearch() {
  const bg = document.getElementById('quick-search-bg').value;
  const el = document.getElementById('quick-search-results');
  if (!bg) { el.innerHTML = ''; return; }
  try {
    const donors = await api.getDonors({ bloodGroup: bg, available: 'true' });
    el.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.5rem">${donors.length} available donor(s) with ${bg} found in system.</p>`;
  } catch (err) {
    el.innerHTML = '';
  }
}

function renderDonorCard(d) {
  const initial = d.name[0].toUpperCase();
  const available = d.isAvailable;
  const lastDon = d.lastDonation ? `Last donated: ${new Date(d.lastDonation).toLocaleDateString()}` : 'Never donated';
  const badges = d.badges && d.badges.length > 0
    ? `<div class="donor-badges">${d.badges.map(b => `<span class="mini-badge">🏆 ${b}</span>`).join('')}</div>` : '';

  return `
    <div class="donor-card">
      <div class="donor-card-header">
        <div class="donor-avatar">${initial}</div>
        <div>
          <div class="donor-name">${d.name}</div>
          <div class="donor-city">📍 ${d.city}</div>
        </div>
        <div class="blood-badge ${available ? '' : 'unavailable'}">${d.bloodGroup}</div>
      </div>
      <div class="donor-meta">
        <span><span class="availability-dot ${available ? '' : 'unavailable'}"></span>${available ? 'Available' : 'Unavailable'}</span>
        <span>💉 ${d.totalDonations || 0} donations</span>
        ${d.age ? `<span>🗓 Age ${d.age}</span>` : ''}
      </div>
      <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:0.75rem">${lastDon}</div>
      ${badges}
      ${available ? `
        <div style="margin-top:0.75rem">
          <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.3rem">📞 Contact: ${d.phone}</div>
          <div style="font-size:0.78rem;color:var(--text-muted)">📧 ${d.email}</div>
        </div>` : ''}
    </div>`;
}

async function submitBloodRequest(e) {
  e.preventDefault();
  const user = getUser();
  const successEl = document.getElementById('request-success');
  const errorEl = document.getElementById('request-error');
  successEl.classList.add('hidden'); errorEl.classList.add('hidden');

  try {
    const data = {
      patientName: document.getElementById('req-patient').value,
      bloodGroup: document.getElementById('req-bloodgroup').value,
      units: document.getElementById('req-units').value,
      urgency: document.getElementById('req-urgency').value,
      hospital: document.getElementById('req-hospital').value,
      city: document.getElementById('req-city').value,
      contact: document.getElementById('req-contact').value,
      notes: document.getElementById('req-notes').value,
      requesterName: user.name,
    };
    await api.createRequest(data);
    successEl.textContent = '✅ Blood request submitted! Donors matching your blood group will be notified.';
    successEl.classList.remove('hidden');
    e.target.reset();
    showToast('Request submitted successfully! 🩸');

    // Refresh stats
    const stats = await api.getStats();
    document.getElementById('r-total-requests').textContent = (parseInt(document.getElementById('r-total-requests').textContent) || 0) + 1;
  } catch (err) {
    errorEl.textContent = err.message; errorEl.classList.remove('hidden');
  }
}

async function loadMyRequests(user) {
  const el = document.getElementById('my-requests-list');
  try {
    const requests = await api.getRequests();
    const myReqs = requests.filter(r => r.requesterId === user.id);
    if (!myReqs.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><p>You haven't submitted any requests yet.</p></div>`;
      return;
    }
    el.innerHTML = myReqs.reverse().map(r => renderMyRequestCard(r)).join('');
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><p>Failed to load requests.</p></div>`;
  }
}

function renderMyRequestCard(r) {
  const statusText = r.status === 'fulfilled' ? '✅ Fulfilled' : r.status === 'responded' ? '💬 Responded' : '⏳ Pending';
  const statusClass = r.status === 'fulfilled' ? 'normal' : r.status === 'responded' ? 'urgent' : '';
  const responsesHtml = r.responses && r.responses.length > 0
    ? `<div style="margin-top:0.75rem;border-top:1px solid var(--border);padding-top:0.75rem">
        <div style="font-size:0.82rem;font-weight:600;margin-bottom:0.5rem">Donor Responses (${r.responses.length}):</div>
        ${r.responses.map(resp => `
          <div style="background:var(--bg-2);border-radius:6px;padding:0.6rem;margin-bottom:0.4rem;font-size:0.82rem">
            <strong>${resp.donorName}</strong> · 📞 ${resp.phone}<br/>
            <span style="color:var(--text-muted)">${resp.message || 'No message'}</span>
          </div>`).join('')}
        <button class="btn btn-sm btn-primary mt-1" onclick="fulfillRequest('${r.id}')">Mark as Fulfilled</button>
      </div>` : '';

  return `
    <div class="request-card ${r.urgency || 'normal'}">
      <div class="request-header">
        <span class="request-title">🩸 ${r.bloodGroup} for ${r.patientName}</span>
        <span class="urgency-tag ${statusClass || 'normal'}">${statusText}</span>
      </div>
      <div class="request-meta">
        <span>🏥 ${r.hospital}</span>
        <span>📍 ${r.city}</span>
        <span>🔢 ${r.units} unit(s)</span>
        <span>📅 ${new Date(r.createdAt).toLocaleDateString()}</span>
      </div>
      ${responsesHtml}
    </div>`;
}

async function fulfillRequest(requestId) {
  try {
    await api.updateRequest(requestId, { status: 'fulfilled' });
    showToast('Request marked as fulfilled! ✅');
    loadMyRequests(getUser());
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadSOSDonors() {
  const bg = document.getElementById('sos-bg')?.value;
  const el = document.getElementById('sos-donors-list');
  if (!el) return;
  try {
    const params = { available: 'true' };
    if (bg) params.bloodGroup = bg;
    const donors = await api.getDonors(params);
    if (!donors.length) {
      el.innerHTML = `<div class="empty-state"><p>No available donors found.</p></div>`;
      return;
    }
    el.innerHTML = donors.slice(0, 6).map(d => `
      <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:var(--bg-2);border:1px solid var(--border);border-radius:8px;margin-bottom:0.5rem">
        <div class="donor-avatar" style="width:36px;height:36px;font-size:1rem">${d.name[0]}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:0.9rem">${d.name}</div>
          <div style="font-size:0.78rem;color:var(--text-muted)">📍 ${d.city} · 📞 ${d.phone}</div>
        </div>
        <div class="blood-badge">${d.bloodGroup}</div>
      </div>`).join('');
  } catch (err) {
    el.innerHTML = '<p style="color:var(--text-muted)">Failed to load donors.</p>';
  }
}

async function sendSOS(e) {
  e.preventDefault();
  const successEl = document.getElementById('sos-success');
  const bg = document.getElementById('sos-bg').value;
  const phone = document.getElementById('sos-phone').value;
  const location = document.getElementById('sos-location').value;
  const message = document.getElementById('sos-message').value;

  try {
    const user = getUser();
    await api.createRequest({
      patientName: 'Emergency SOS',
      bloodGroup: bg,
      units: 1,
      urgency: 'critical',
      hospital: location,
      city: location,
      contact: phone,
      notes: `🚨 EMERGENCY SOS: ${message}`,
      requesterName: user.name,
    });
    successEl.textContent = '🚨 SOS Alert sent! All available donors with matching blood group have been notified. They will contact you shortly.';
    successEl.classList.remove('hidden');
    e.target.reset();
    loadSOSDonors();
    showToast('SOS sent to all available donors! 🚨');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('sos-bg')?.addEventListener('change', loadSOSDonors);

// ===================== LANDING PAGE DATA =====================
async function loadLandingData() {
  try {
    const stats = await api.getStats();
    document.getElementById('stat-donors').textContent = stats.totalDonors;
    document.getElementById('stat-units').textContent = stats.totalUnits;
    document.getElementById('stat-saved').textContent = stats.fulfilledRequests;

    // Blood types bar
    const grid = document.getElementById('landing-inventory');
    if (grid) {
      grid.innerHTML = '';
      Object.entries(stats.inventory).forEach(([bg, data]) => {
        const maxUnits = 100;
        const pct = Math.min((data.units / maxUnits) * 100, 100);
        const level = data.units < 10 ? 'critical' : data.units < 25 ? 'low' : '';
        grid.innerHTML += `
          <div class="blood-type-pill">
            <span class="bg-label">${bg}</span>
            <span class="bg-units">${data.units} units</span>
            <div class="bg-bar"><div class="bg-bar-fill ${level}" style="width:${pct}%"></div></div>
          </div>`;
      });
    }
  } catch (err) {
    // Silent fail on landing
  }
}

// ===================== AUTO LOGIN =====================
window.addEventListener('load', () => {
  loadLandingData();
  selectRole('donor'); // init role selector

  const token = getToken();
  const user = getUser();
  if (token && user) {
    initDashboard(user);
  } else {
    showPage('page-landing');
  }
});
