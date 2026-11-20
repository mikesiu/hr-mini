export interface User {
  id: number;
  username: string;
  display_name?: string;
  email?: string;
  is_active?: boolean;
  roles: Array<{
    code: string;
    name: string;
    permissions: string[];
  }>;
  permissions: string[];
}
