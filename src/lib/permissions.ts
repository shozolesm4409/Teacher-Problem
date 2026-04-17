import { User } from '../types';

export const hasModulePerm = (user: User | null | undefined, module: string, action: 'create' | 'read' | 'edit' | 'delete') => {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  const userPerms = (user.permission || '').toLowerCase();

  // Check new format: e.g. "entry:read"
  const newFormatToken = `${module}:${action}`.toLowerCase();
  if (userPerms.includes(newFormatToken)) return true;

  // Fallbacks for old format
  const oldEdit = userPerms.includes('edit');
  const oldDelete = userPerms.includes('delete');

  if (module === 'entry') {
    if (action === 'read' || action === 'create') return userPerms.includes('new entry');
  }
  if (module === 'records') {
    if (action === 'read') return userPerms.includes('mill list');
    if (action === 'edit') return userPerms.includes('mill list') && oldEdit;
    if (action === 'delete') return userPerms.includes('mill list') && oldDelete;
  }
  if (module === 'report') {
    if (action === 'read') return userPerms.includes('report');
  }
  if (module === 'comments') {
    if (action === 'read') return userPerms.includes('comments');
    if (action === 'create' || action === 'edit') return userPerms.includes('comments') && oldEdit;
    if (action === 'delete') return userPerms.includes('comments') && oldDelete;
  }
  if (module === 'access') {
    if (action === 'read') return userPerms.includes('user access');
    if (action === 'edit' || action === 'delete') return userPerms.includes('user access') && oldEdit;
  }

  return false;
};
