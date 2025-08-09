export type ClientStatus = 
  | "new" 
  | "in-progress" 
  | "proposal-sent" 
  | "call-scheduled" 
  | "contract-signing"
  | "postponed" 
  | "closed";

export type ServiceType = 
  | "landscape-design"
  | "auto-irrigation" 
  | "lawn"
  | "planting"
  | "hardscape"
  | "maintenance";

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  services: ServiceType[];
  status: ClientStatus;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  lastContact?: Date;
  nextAction?: string;
  projectArea?: number;
  budget?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  clientId?: string;
  assignee?: string;
  status: "pending" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: Date;
  createdAt: Date;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  price: number;
  category: string;
  supplier?: string;
  inStock: boolean;
}

export interface EstimateItem {
  id: string;
  materialId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Estimate {
  id: string;
  clientId: string;
  title: string;
  items: EstimateItem[];
  totalAmount: number;
  status: "draft" | "sent" | "approved" | "rejected";
  createdAt: Date;
  validUntil?: Date;
}