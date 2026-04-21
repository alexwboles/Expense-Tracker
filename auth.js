/* ═══════════════════════════════════════════════
   AUTH.JS — Multi-User Authentication & Roles
   Boles West Run Ranch — Expense Tracker
   ═══════════════════════════════════════════════ */

const AUTH = (() => {

  // ─── STATE ───
  let currentUser = null;
  let supabaseAuth = null;
  let onAuthChangeCallback = null;

  // ═══════════════════════════════════════════════
  //  INITIALIZATION
  // ═══════════════════════════════════════════════

  function init() {
    // Check for Supabase client from db.js
    if (window.supabase && CONFIG.supabase.anonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE') {
      try {
        supabaseAuth = window.supabase.createClient(
          CONFIG.supabase.url,
          CONFIG.supabase.anonKey
        ).auth;
      } catch (e) {
        console.warn('AUTH: Supabase auth init failed — using local mode');
        supabaseAuth = null;
      }
    }

    // Restore session from localStorage
    const savedUser = localStorage.getItem('bwrr_current_user');
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
      } catch (e) {
        localStorage.removeItem('bwrr_current_user');
      }
    }

    // Listen for Supabase auth state changes
    if (supabaseAuth) {
      supabaseAuth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          syncUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          currentUser = null;
          localStorage.removeItem('bwrr_current_user');
          if (onAuthChangeCallback) onAuthChangeCallback(null);
        }
      });
    }
  }

  // ═══════════════════════════════════════════════
  //  SIGN UP
  // ═══════════════════════════════════════════════

  async function signUp(email, password, name, role = 'worker') {
    // Validate inputs
    if (!email || !password || !name) {
      return { error: 'Name, email, and password are required.' };
    }
    if (password.length < 8) {
      return { error: 'Password must be at least 8 characters.' };
    }
    if (!isValidEmail(email)) {
      return { error: 'Please enter a valid email address.' };
    }

    // Supabase signup
    if (supabaseAuth) {
      try {
        const { data, error } = await supabaseAuth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              role: role
            }
          }
        });

        if (error) {
          return { error: formatAuthError(error) };
        }

        if (data.user) {
          const userProfile = {
            id: data.user.id,
            email: data.user.email,
            name: name,
            role: role,
            created_at: new Date().toISOString(),
            status: 'active'
          };

          // Save profile to users table
          await saveUserProfile(userProfile);

          currentUser = userProfile;
          localStorage.setItem('bwrr_current_user', JSON.stringify(currentUser));

          if (onAuthChangeCallback) onAuthChangeCallback(currentUser);
          return { user: currentUser };
        }

        return { error: 'Account created. Please check your email to confirm.' };
      } catch (e) {
        return { error: 'Sign up failed. Please try again.' };
      }
    }

    // Local mode fallback
    return localSignUp(email, password, name, role);
  }

  // ═══════════════════════════════════════════════
  //  SIGN IN
  // ═══════════════════════════════════════════════

  async function signIn(email, password) {
    if (!email || !password) {
      return { error: 'Email and password are required.' };
    }

    // Supabase sign in
    if (supabaseAuth) {
      try {
        const { data, error } = await supabaseAuth.signInWithPassword({
          email,
          password
        });

        if (error) {
          return { error: formatAuthError(error) };
        }

        if (data.user) {
          await syncUserProfile(data.user);
          if (onAuthChangeCallback) onAuthChangeCallback(currentUser);
          return { user: currentUser };
        }

        return { error: 'Sign in failed.' };
      } catch (e) {
        return { error: 'Sign in failed. Please check your connection.' };
      }
    }

    // Local mode fallback
    return localSignIn(email, password);
  }

  // ═══════════════════════════════════════════════
  //  SIGN OUT
  // ═══════════════════════════════════════════════

  async function signOut() {
    if (supabaseAuth) {
      try {
        await supabaseAuth.signOut();
      } catch (e) {
        console.warn('AUTH: Supabase signout error', e);
      }
    }

    currentUser = null;
    localStorage.removeItem('bwrr_current_user');
    if (onAuthChangeCallback) onAuthChangeCallback(null);
  }

  // ═══════════════════════════════════════════════
  //  SESSION MANAGEMENT
  // ═══════════════════════════════════════════════

  function getUser() {
    return currentUser;
  }

  function isAuthenticated() {
    return currentUser !== null;
  }

  function getUserRole() {
    return currentUser ? currentUser.role : null;
  }

  function getUserName() {
    return currentUser ? currentUser.name : 'Guest';
  }

  function getUserId() {
    return currentUser ? currentUser.id : null;
  }

  // ═══════════════════════════════════════════════
  //  PERMISSIONS
  // ═══════════════════════════════════════════════

  function hasPermission(permission) {
    if (!currentUser) return false;
    return CONFIG.hasPermission(currentUser.role, permission);
  }

  function canWrite() {
    return hasPermission('write');
  }

  function canDelete() {
    return hasPermission('delete');
  }

  function canManageUsers() {
    return hasPermission('manage_users');
  }

  function canViewReports() {
    return hasPermission('reports');
  }

  function canExport() {
    return hasPermission('export');
  }

  function canManageCategories() {
    return hasPermission('manage_categories');
  }

  function canAccessSettings() {
    return hasPermission('settings');
  }

  /**
   * Enforce permission — returns true if allowed,
   * shows toast and returns false if denied
   */
  function requirePermission(permission, actionName) {
    if (hasPermission(permission)) return true;

    if (typeof APP !== 'undefined' && APP.showToast) {
      APP.showToast(
        `You don't have permission to ${actionName || 'perform this action'}.`,
        'error'
      );
    }
    return false;
  }

  // ═══════════════════════════════════════════════
  //  USER MANAGEMENT (Admin only)
  // ═══════════════════════════════════════════════

  /**
   * Get all users (admin/owner only)
   */
  async function getAllUsers() {
    if (!hasPermission('manage_users')) {
      return [];
    }

    // Try Supabase
    if (DB.isSupabaseConnected()) {
      try {
        const client = window.supabase.createClient(
          CONFIG.supabase.url,
          CONFIG.supabase.anonKey
        );
        const { data, error } = await client
          .from('users')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && data) {
          localStorage.setItem('bwrr_users', JSON.stringify(data));
          return data;
        }
      } catch (e) { /* fall through */ }
    }

    // Local fallback
    const users = JSON.parse(localStorage.getItem('bwrr_users') || '[]');
    return users;
  }

  /**
   * Update a user's role (admin/owner only)
   */
  async function updateUserRole(userId, newRole) {
    if (!hasPermission('manage_users')) {
      return { error: 'Permission denied.' };
    }

    if (!CONFIG.roles[newRole]) {
      return { error: 'Invalid role.' };
    }

    // Prevent self-demotion from owner
    if (userId === currentUser.id && currentUser.role === 'owner' && newRole !== 'owner') {
      return { error: 'You cannot demote yourself from Owner.' };
    }

    // Update in Supabase
    if (DB.isSupabaseConnected()) {
      try {
        const client = window.supabase.createClient(
          CONFIG.supabase.url,
          CONFIG.supabase.anonKey
        );
        const { error } = await client
          .from('users')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (error) throw error;
      } catch (e) {
        return { error: 'Failed to update user role.' };
      }
    }

    // Update local
    const users = JSON.parse(localStorage.getItem('bwrr_users') || '[]');
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].role = newRole;
      localStorage.setItem('bwrr_users', JSON.stringify(users));
    }

    return { success: true };
  }

  /**
   * Deactivate a user (admin/owner only)
   */
  async function deactivateUser(userId) {
    if (!hasPermission('manage_users')) {
      return { error: 'Permission denied.' };
    }

    if (userId === currentUser.id) {
      return { error: 'You cannot deactivate yourself.' };
    }

    if (DB.isSupabaseConnected()) {
      try {
        const client = window.supabase.createClient(
          CONFIG.supabase.url,
          CONFIG.supabase.anonKey
        );
        const { error } = await client
          .from('users')
          .update({ status: 'inactive', updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (error) throw error;
      } catch (e) {
        return { error: 'Failed to deactivate user.' };
      }
    }

    const users = JSON.parse(localStorage.getItem('bwrr_users') || '[]');
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].status = 'inactive';
      localStorage.setItem('bwrr_users', JSON.stringify(users));
    }

    return { success: true };
  }

  // ═══════════════════════════════════════════════
  //  INTERNAL HELPERS
  // ═══════════════════════════════════════════════

  async function syncUserProfile(supabaseUser) {
    // Try to fetch profile from users table
    try {
      const client = window.supabase.createClient(
        CONFIG.supabase.url,
        CONFIG.supabase.anonKey
      );
      const { data } = await client
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (data) {
        currentUser = {
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          status: data.status,
          created_at: data.created_at
        };
      } else {
        // Create profile if missing
        currentUser = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
          role: supabaseUser.user_metadata?.role || 'worker',
          status: 'active',
          created_at: new Date().toISOString()
        };
        await saveUserProfile(currentUser);
      }
    } catch (e) {
      currentUser = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
        role: supabaseUser.user_metadata?.role || 'worker',
        status: 'active',
        created_at: new Date().toISOString()
      };
    }

    localStorage.setItem('bwrr_current_user', JSON.stringify(currentUser));
  }

  async function saveUserProfile(profile) {
    if (DB.isSupabaseConnected()) {
      try {
        const client = window.supabase.createClient(
          CONFIG.supabase.url,
          CONFIG.supabase.anonKey
        );
        await client.from('users').upsert(profile);
      } catch (e) {
        console.warn('AUTH: Failed to save user profile to Supabase');
      }
    }

    // Also keep in local users list
    const users = JSON.parse(localStorage.getItem('bwrr_users') || '[]');
    const idx = users.findIndex(u => u.id === profile.id);
    if (idx !== -1) {
      users[idx] = profile;
    } else {
      users.push(profile);
    }
    localStorage.setItem('bwrr_users', JSON.stringify(users));
  }

  // ─── LOCAL MODE AUTH (no Supabase) ───

  function localSignUp(email, password, name, role) {
    const users = JSON.parse(localStorage.getItem('bwrr_users') || '[]');

    // Check for duplicate
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { error: 'An account with this email already exists.' };
    }

    // First user is always owner
    const assignedRole = users.length === 0 ? 'owner' : role;

    const user = {
      id: 'local_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      email: email.toLowerCase().trim(),
      name: name.trim(),
      role: assignedRole,
      status: 'active',
      password_hash: simpleHash(password),
      created_at: new Date().toISOString()
    };

    users.push(user);
    localStorage.setItem('bwrr_users', JSON.stringify(users));

    // Auto sign in
    const { password_hash, ...safeUser } = user;
    currentUser = safeUser;
    localStorage.setItem('bwrr_current_user', JSON.stringify(currentUser));

    if (onAuthChangeCallback) onAuthChangeCallback(currentUser);
    return { user: currentUser };
  }

  function localSignIn(email, password) {
    const users = JSON.parse(localStorage.getItem('bwrr_users') || '[]');
    const user = users.find(
      u => u.email.toLowerCase() === email.toLowerCase().trim()
    );

    if (!user) {
      return { error: 'No account found with this email.' };
    }

    if (user.status === 'inactive') {
      return { error: 'This account has been deactivated.' };
    }

    if (user.password_hash && user.password_hash !== simpleHash(password)) {
      return { error: 'Incorrect password.' };
    }

    const { password_hash, ...safeUser } = user;
    currentUser = safeUser;
    localStorage.setItem('bwrr_current_user', JSON.stringify(currentUser));

    if (onAuthChangeCallback) onAuthChangeCallback(currentUser);
    return { user: currentUser };
  }

  /**
   * Simple hash for local-only password storage.
   * NOT cryptographically secure — only for local demo mode.
   * Production auth uses Supabase Auth (bcrypt on server).
   */
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit int
    }
    return 'lh_' + Math.abs(hash).toString(36);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function formatAuthError(error) {
    const msg = error.message || '';
    if (msg.includes('already registered')) return 'This email is already registered.';
    if (msg.includes('Invalid login')) return 'Invalid email or password.';
    if (msg.includes('Email not confirmed')) return 'Please confirm your email first.';
    if (msg.includes('rate limit')) return 'Too many attempts. Please wait a moment.';
    return msg || 'Authentication failed.';
  }

  // ─── AUTH STATE LISTENER ───
  function onAuthChange(callback) {
    onAuthChangeCallback = callback;
  }

  // ═══════════════════════════════════════════════
  //  UI VISIBILITY HELPERS
  //  Hide/show elements based on permissions
  // ═══════════════════════════════════════════════

  function applyPermissionVisibility() {
    // Elements with data-require-permission="xxx"
    document.querySelectorAll('[data-require-permission]').forEach(el => {
      const perm = el.getAttribute('data-require-permission');
      el.style.display = hasPermission(perm) ? '' : 'none';
    });

    // Elements with data-require-role="owner,manager"
    document.querySelectorAll('[data-require-role]').forEach(el => {
      const roles = el.getAttribute('data-require-role').split(',').map(r => r.trim());
      const userRole = getUserRole();
      el.style.display = roles.includes(userRole) ? '' : 'none';
    });

    // Hide manage users nav for non-admins
    const manageUsersNav = document.getElementById('nav-manage-users');
    if (manageUsersNav) {
      manageUsersNav.style.display = canManageUsers() ? '' : 'none';
    }

    // Hide settings for non-admin/manager
    const settingsNav = document.getElementById('nav-settings');
    if (settingsNav) {
      settingsNav.style.display = canAccessSettings() ? '' : 'none';
    }
  }

  // ═══════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════
  return {
    init,
    signUp,
    signIn,
    signOut,

    // Session
    getUser,
    isAuthenticated,
    getUserRole,
    getUserName,
    getUserId,

    // Permissions
    hasPermission,
    requirePermission,
    canWrite,
    canDelete,
    canManageUsers,
    canViewReports,
    canExport,
    canManageCategories,
    canAccessSettings,

    // User management
    getAllUsers,
    updateUserRole,
    deactivateUser,

    // UI
    applyPermissionVisibility,

    // Listener
    onAuthChange
  };

})();
