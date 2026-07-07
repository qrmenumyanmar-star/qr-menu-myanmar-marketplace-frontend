import {
  ContactSearchResult,
  ContactTag,
  CreateCustomerInput,
  Customer,
  CustomerDetail,
  Township,
} from '@/types/customer';
import { apiRequest } from '@/services/api';

type CustomersResponse = {
  data: Customer[];
};

type CustomerDetailResponse = {
  data: CustomerDetail;
};

type TownshipsResponse = {
  data: Township[];
};

type TagsResponse = {
  data: ContactTag[];
};

type SearchContactsResponse = {
  data: ContactSearchResult[];
};

type CreateCustomerResponse = {
  data: Customer;
};

export async function fetchCustomers(token: string): Promise<Customer[]> {
  const response = await apiRequest<CustomersResponse>('/customers', { token });
  return response.data;
}

export async function fetchCustomerDetail(
  token: string,
  id: string,
): Promise<CustomerDetail> {
  const response = await apiRequest<CustomerDetailResponse>(`/customers/${id}`, {
    token,
  });
  return response.data;
}

export async function fetchTownships(token: string): Promise<Township[]> {
  const response = await apiRequest<TownshipsResponse>('/customers/townships', {
    token,
  });
  return response.data;
}

export async function fetchContactTags(token: string): Promise<ContactTag[]> {
  const response = await apiRequest<TagsResponse>('/customers/tags', { token });
  return response.data;
}

export async function searchContactsByPhone(
  token: string,
  phone: string,
): Promise<ContactSearchResult[]> {
  const query = encodeURIComponent(phone);
  const response = await apiRequest<SearchContactsResponse>(
    `/customers/search?phone=${query}`,
    { token },
  );
  return response.data;
}

export async function createCustomer(
  token: string,
  input: CreateCustomerInput,
): Promise<Customer> {
  const response = await apiRequest<CreateCustomerResponse>('/customers', {
    token,
    method: 'POST',
    body: input,
  });
  return response.data;
}
