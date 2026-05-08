/**
 * Robust identity hierarchy utility to ensure consistent display names across the platform.
 * Priority: full_name -> (first_name + last_name) -> email -> "Guest #[ID]"
 */
export const getDisplayName = (profile) => {
  if (!profile) return 'Guest User';

  // 1. Explicit Full Name (Legacy/Manual entry)
  if (profile.full_name && profile.full_name.trim()) {
    return profile.full_name;
  }

  // 2. Split Name Logic (Modern identity management)
  const first = profile.first_name?.trim();
  const last = profile.last_name?.trim();
  if (first || last) {
    return `${first || ''} ${last || ''}`.trim();
  }

  // 3. System Identifier (Email)
  if (profile.email) {
    return profile.email.split('@')[0];
  }

  // 4. Ultimate Fallback
  return `Guest #${profile.id?.slice(0, 5) || 'User'}`;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount || 0);
};
