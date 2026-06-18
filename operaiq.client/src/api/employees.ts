import { api } from './client';

export interface EmployeeDto {
  id: string;
  fullName: string;
  email: string;
  departmentName?: string;
  jobTitle?: string;
  roles?: string[];
}

export const employeesApi = {
  all: () => api.get<EmployeeDto[]>('/employees').then(r => r.data),
};
