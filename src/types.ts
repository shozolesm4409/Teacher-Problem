/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  sl: number;
  userId: string;
  fullName: string;
  role: 'Admin' | 'User';
  permission: string;
  creatorDate?: string;
  creatorName?: string;
  creatorUserId?: string;
  updatorDate?: string;
  updatorName?: string;
  updatorUserId?: string;
}

export interface MillEntry {
  sl: number;
  date?: string;
  tPin: string;
  nickName: string;
  institute: string;
  department: string;
  comment: string;
  creatorDate?: string;
  creatorName?: string;
  creatorUserId?: string;
  updatorDate?: string;
  updatorName?: string;
  updatorUserId?: string;
}

export interface CommentOption {
  sl: number;
  comment: string;
  rm: string;
  creatorDate?: string;
  creatorName?: string;
  creatorUserId?: string;
  updatorDate?: string;
  updatorName?: string;
  updatorUserId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
