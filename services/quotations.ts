import { apiRequest } from '@/services/api';
import { QuotationDraft } from '@/components/quotation/QuotationBuilder';
import { Quotation, QuotationDetail } from '@/types/quotation';

type QuotationsResponse = {
  data: Quotation[];
};

type QuotationDetailResponse = {
  data: QuotationDetail;
};

type CreateQuotationResponse = {
  data: Quotation;
};

export async function fetchQuotations(token: string): Promise<Quotation[]> {
  const response = await apiRequest<QuotationsResponse>('/quotations', { token });
  return response.data;
}

export async function fetchQuotationDetail(
  token: string,
  id: string,
): Promise<QuotationDetail> {
  const response = await apiRequest<QuotationDetailResponse>(`/quotations/${id}`, {
    token,
  });
  return response.data;
}

export async function createQuotation(
  token: string,
  draft: QuotationDraft,
): Promise<Quotation> {
  const response = await apiRequest<CreateQuotationResponse>('/quotations', {
    method: 'POST',
    token,
    body: {
      customerId: draft.customer.id,
      deliveryNote: draft.deliveryNote,
      preferredDeliveryDate: draft.preferredDeliveryDate,
      phoneNumber: draft.phoneNumber,
      lines: draft.lines.map(line => ({
        productId: line.product.id,
        quantity: line.qty,
        unitPrice: line.unitPrice,
        discountPercent: line.discountPercent,
      })),
    },
  });
  return response.data;
}
