/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiResponse, User, MillEntry, CommentOption } from '../types';

// NOTE: The user must deploy the Apps Script as a Web App and provide the URL here.
// For now, we use a placeholder. In production, this can be set via env var VITE_SCRIPT_URL.
const SCRIPT_URL = (import.meta as any).env.VITE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyOv_IynUMqlPeh2GoPD1CjMSvCOi3ssipthLKsHfnnFTX9wYMjKkUfpCrWWi8XvFAK/exec';

async function request<T>(action: string, data?: any): Promise<ApiResponse<T>> {
  if (!SCRIPT_URL) {
    return { success: false, error: 'Apps Script URL not configured' };
  }

  try {
    const response = await fetch(`${SCRIPT_URL}?action=${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(data || {}),
      redirect: 'follow'
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export const api = {
  login: (userId: string) => request<User>('login', { userId }),
  getConfig: () => request<{ comments: CommentOption[], users: User[] }>('getConfig'),
  getMillList: () => request<MillEntry[]>('getMillList'),
  addMillEntry: (entry: Omit<MillEntry, 'sl'>) => request<void>('addEntry', entry),
  updateMillEntry: (entry: MillEntry) => request<void>('updateEntry', entry),
  deleteMillEntry: (sl: string | number) => request<void>('deleteEntry', { sl }),
  searchExaminer: (tPin: string) => request<{ examinerName: string; institute: string; department: string; phone: string }>('searchExaminer', { tPin }),
  getAllExaminers: () => request<any[]>('getAllExaminers'),
  addComment: (comment: Omit<CommentOption, 'sl'>) => request<void>('addComment', comment),
  updateComment: (comment: CommentOption) => request<void>('updateComment', comment),
  deleteComment: (sl: string | number) => request<void>('deleteComment', { sl }),
  updateUserPermission: (userId: string, permission: string, audit?: { updatorDate: string, updatorName: string, updatorUserId: string }) => request<void>('updateUserPermission', { userId, permission, ...audit }),
  addUser: (user: Omit<User, 'sl'>) => request<void>('addUser', user),
  updateUser: (user: User) => request<void>('updateUser', user),
  deleteUser: (userId: string) => request<void>('deleteUser', { userId }),
};
