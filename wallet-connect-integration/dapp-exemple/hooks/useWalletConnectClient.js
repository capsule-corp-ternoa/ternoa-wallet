import { useContext } from "react";
import { WalletConnectClientContext } from "../providers/wallet-connect";

export function useWalletConnectClient() {
  const context = useContext(WalletConnectClientContext);
  if (context === undefined) {
    throw new Error(
      "useWalletConnectClient must be used within a WalletConnectClientContextProvider"
    );
  }
  return context;
}
