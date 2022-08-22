import "../styles/globals.css";
import { WalletConnectClientContextProvider } from "../providers/wallet-connect";

function MyApp({ Component, pageProps }) {
  return (
    <WalletConnectClientContextProvider>
      <Component {...pageProps} />
    </WalletConnectClientContextProvider>
  );
}

export default MyApp;
