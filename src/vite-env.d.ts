/// <reference types="vite/client" />

declare module '@paystack/inline-js' {
  export interface PaystackInlineCallbacks {
    onSuccess?: (transaction: { id?: number; reference?: string; message?: string }) => void;
    onCancel?: () => void;
    onLoad?: (response: { id?: number; accessCode?: string }) => void;
    onError?: (error: { message?: string }) => void;
  }

  export default class PaystackPop {
    resumeTransaction(accessCode: string, callbacks?: PaystackInlineCallbacks): unknown;
    cancelTransaction(idOrTransaction?: unknown): void;
  }
}

