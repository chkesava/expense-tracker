export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  username: string;
  role: string;
}

export interface AddressData {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface CardData {
  number: string;
  expiry: string;
  cvv: string;
  holderName: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Expense {
  id?: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface EnvironmentConfig {
  baseURL: string;
  apiURL: string;
  env: 'dev' | 'staging' | 'prod';
}

