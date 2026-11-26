/// <reference types="vite/client" />

declare module '@paystack/inline-js' {
  export interface PaystackTransactionStatus {
    status: string | null;
    id?: string;
    errors?: Array<{ type?: string; message?: string; field?: string } | string>;
    response?: { message?: string; status?: string; gateway_response?: string } | string;
    checkoutUrl?: string;
  }

  export interface PaystackPopupTransaction {
    getStatus(): PaystackTransactionStatus;
  }

  export interface PaystackInlineCallbacks {
    onSuccess?: (transaction: { id?: number | string; reference?: string; message?: string }) => void;
    onCancel?: () => void;
    onLoad?: (response: { id?: number | string; accessCode?: string }) => void;
    onError?: (error: { message?: string; type?: string }) => void;
  }

  export default class PaystackPop {
    resumeTransaction(accessCode: string, callbacks?: PaystackInlineCallbacks): PaystackPopupTransaction;
    cancelTransaction(idOrTransaction?: unknown): void;
  }
}

