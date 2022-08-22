import { createContext, useCallback, useState, useEffect } from "react";

import Client from "@walletconnect/sign-client";
import QRCodeModal from "@walletconnect/legacy-modal";
import { ERROR } from "@walletconnect/utils";
import {
  cryptoWaitReady,
  decodeAddress,
  signatureVerify,
} from "@polkadot/util-crypto";
import { u8aToHex } from "@polkadot/util";

const DEFAULT_APP_METADATA = {
  name: "dApp exemple",
  description: "dApp exemple",
  url: "https://ternoa.com",
  icons: ["https://www.ternoa.com/favicon.ico"],
};

const TERNOA_ALPHANET_CHAIN = "ternoa:18bcdb75a0bba577b084878db2dc2546";

const requiredNamespaces = {
  ternoa: {
    chains: [TERNOA_ALPHANET_CHAIN],
    events: ["event_test"],
    methods: ["sign_message"],
  },
};

export const WalletConnectClientContext = createContext();

export const WalletConnectClientContextProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [pairings, setPairings] = useState(null);
  const [session, setSession] = useState(null);
  const [address, setAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isAccountCertified, setIsAccountCertified] = useState(false);

  useEffect(() => {
    if (!client) {
      createClient();
    }
  }, [client]);

  const onSessionConnected = useCallback((_session) => {
    const _pubKey = Object.values(_session.namespaces)
      .map((namespace) => namespace.accounts)
      .flat()[0]
      .split(":")[2];
    setSession(_session);
    setAddress(_pubKey);
  });

  const subscribeToEvents = useCallback(
    async (_client) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      _client.on("session_update", ({ topic, params }) => {
        const { namespaces } = params;
        const _session = _client.session.get(topic);
        const updatedSession = { ..._session, namespaces };
        onSessionConnected(updatedSession);
      });
      _client.on("session_delete", () => {
        reset();
      });
    },
    [onSessionConnected]
  );

  const checkPersistedState = useCallback(
    async (_client) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      // populates existing pairings to state
      setPairings(_client.pairing.values);

      if (typeof session !== "undefined") return;

      // populates (the last) existing session to state
      if (_client.session.length) {
        const lastKeyIndex = _client.session.keys.length - 1;
        const _session = _client.session.get(
          _client.session.keys[lastKeyIndex]
        );
        await onSessionConnected(_session);
        return _session;
      }
    },
    [session, onSessionConnected]
  );

  const createClient = useCallback(async () => {
    try {
      setIsInitializing(true);
      const _client = await Client.init({
        relayUrl: "wss://wallet-connectrelay.ternoa.network/",
        projectId: "e8f6f7d41ff88cd96a21ce580f018401",
        metadata: DEFAULT_APP_METADATA,
      });
      await subscribeToEvents(_client);
      await checkPersistedState(_client);
      setClient(_client);
    } catch (err) {
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, [subscribeToEvents, checkPersistedState]);

  const connect = useCallback(
    async (pairing) => {
      if (typeof client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      try {
        const { uri, approval } = await client.connect({
          pairingTopic: pairing?.topic,
          requiredNamespaces: requiredNamespaces,
        });

        if (uri) {
          QRCodeModal.open(uri);
        }
        const session = await approval();
        onSessionConnected(session);
      } catch (e) {
        console.error(e);
      } finally {
        QRCodeModal.close();
      }
    },
    [client, onSessionConnected]
  );

  const disconnect = useCallback(async () => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    if (typeof session === "undefined") {
      throw new Error("Session is not connected");
    }
    await client.disconnect({
      topic: session.topic,
      reason: ERROR.USER_DISCONNECTED.format(),
    });

    reset();
  }, [client, session]);

  const reset = () => {
    setPairings([]);
    setSession(null);
    setAddress(null);
  };

  const signMessage = useCallback(async () => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    setIsLoading(true);

    const message = "Confirm Account";

    await client
      .request({
        chainId: TERNOA_ALPHANET_CHAIN,
        topic: session.topic,
        request: {
          method: "sign_message",
          params: {
            pubKey: address,
            request: {
              nonce: 1,
              validity: null,
              submit: false,
              message,
            },
          },
        },
      })
      .then(async (response) => {
        const responseObj = JSON.parse(response);

        await cryptoWaitReady();
        const isValid = isValidSignaturePolkadot(
          message,
          responseObj.signedMessageHash,
          address
        );
        setIsAccountCertified(isValid);
      })
      .catch(() => {
        console.log("ERROR: invalid signature");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [client, session, address]);

  const isValidSignaturePolkadot = (signedMessage, signature, address) => {
    const publicKey = decodeAddress(address);
    const hexPublicKey = u8aToHex(publicKey);
    return signatureVerify(signedMessage, signature, hexPublicKey).isValid;
  };

  return (
    <WalletConnectClientContext.Provider
      value={{
        connect,
        disconnect,
        signMessage,
        address,
        isInitializing,
        isLoading,
        isAccountCertified,
      }}
    >
      {children}
    </WalletConnectClientContext.Provider>
  );
};
