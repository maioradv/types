export type Customer = {
  id: number;
  email: string;
  password: string;
  name: string|null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type Operator = {
  id: number;
  operatorRoleId: number;
  email: string;
  password: string;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}