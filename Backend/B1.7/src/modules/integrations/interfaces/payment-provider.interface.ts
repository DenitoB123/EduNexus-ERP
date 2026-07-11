export interface InitiatePaymentParams {
  schoolId: string;
  amount: number;
  currency: string;
  phoneNumber?: string;
  reference: string;
  description: string;
}

export interface InitiatePaymentResult {
  providerReference: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  raw?: Record<string, unknown>;
}

/** Implemented per gateway (M-Pesa, Flutterwave, Paystack, ...). */
export interface PaymentProvider {
  readonly key: string;
  initiate(params: InitiatePaymentParams): Promise<InitiatePaymentResult>;
  verifySignature(rawBody: string, headers: Record<string, string>): Promise<boolean>;
}
