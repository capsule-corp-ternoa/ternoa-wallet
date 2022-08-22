import { useWalletConnectClient } from "../hooks/useWalletConnectClient";

export default function Home() {
  const {
    connect,
    disconnect,
    signMessage,
    address,
    isInitializing,
    isLoading,
    isAccountCertified,
  } = useWalletConnectClient();

  return (
    <div>
      <h1>Ternoa Wallet Connect Tutorial</h1>
      {!isInitializing && !address ? (
        <button onClick={connect}>CONNECT</button>
      ) : null}
      {address ? (
        <>
          <button onClick={disconnect}>DISCONNECT</button>
          <button onClick={signMessage}>SIGN MESSAGE</button>
        </>
      ) : null}
      {isLoading && "Waiting for response..."}
      {address && <p>pubKey: {address}</p>}
      <p>Account certified: {isAccountCertified + ""}</p>
    </div>
  );
}
