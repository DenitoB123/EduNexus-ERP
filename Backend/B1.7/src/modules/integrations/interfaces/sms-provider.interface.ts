export interface SendSmsParams {
  to: string; // E.164 / MSISDN
  message: string;
  schoolId?: string;
}

export interface SendSmsResult {
  providerMessageId: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
}

/** Implemented per SMS gateway (Africa's Talking, Twilio, ...). */
export interface SmsProvider {
  readonly key: string;
  send(params: SendSmsParams): Promise<SendSmsResult>;
}
