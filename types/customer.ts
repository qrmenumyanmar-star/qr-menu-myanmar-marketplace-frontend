export type Township = {
  id: string;
  name: string;
};

export type CreateCustomerInput = {
  name: string;
  email?: string;
  phone?: string;
  street?: string;
  street2?: string;
  townshipId?: string;
  tagIds?: string[];
};

export type ContactTag = {
  id: string;
  name: string;
};

export type ContactSearchResult = {
  id: string;
  name: string;
  phone: string;
  street: string;
  street2: string;
  city: string;
  township: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  jobPosition: string;
  company: string;
  isCompany: boolean;
  activity: string;
  township: string;
  status: string;
  lastMonthSales: number;
  thisMonthSales: number;
  thisMonthPercent: number;
  lastInvoiceDate: string;
  expoPushToken: string;
  extra: Record<string, string>;
};

export type CustomerDetail = {
  id: string;
  name: string;
  relatedCompany: string;
  relatedCompanyId: number | null;
  email: string;
  phone: string;
  street: string;
  street2: string;
  township: string;
  city: string;
  state: string;
  stateId: number | null;
  zip: string;
  country: string;
  countryId: number | null;
  tags: string;
  memberCode: string;
};
