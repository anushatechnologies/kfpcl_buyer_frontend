import { create } from "zustand";

interface CallModalOptions {
  phoneNumber?: string;
  title?: string;
  subtitle?: string;
  productName?: string;
}

interface CallModalState {
  isOpen: boolean;
  phoneNumber: string;
  title: string;
  subtitle: string;
  productName?: string;
  openCallModal: (options?: CallModalOptions) => void;
  closeCallModal: () => void;
}

export const useCallModalStore = create<CallModalState>((set) => ({
  isOpen: false,
  phoneNumber: "6309981444",
  title: "Call KFPCL Support",
  subtitle: "Speak directly with our team for orders & enquiries",
  productName: undefined,
  openCallModal: (options) =>
    set({
      isOpen: true,
      phoneNumber: options?.phoneNumber || "6309981444",
      title: options?.title || "Call KFPCL Support",
      subtitle: options?.subtitle || "Speak directly with our team for orders & enquiries",
      productName: options?.productName,
    }),
  closeCallModal: () => set({ isOpen: false }),
}));
