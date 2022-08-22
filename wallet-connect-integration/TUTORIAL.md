## Introduction

This is a step-by-step tutorial on how to integrate Wallet Connect to your dApp, to connect all dApps powered by **Ternoa** ecosystem to **Ternoa Wallet**.

Pre-requist: In this tutorial, we assume that you are familiar with es6. We will also use next.js with React.js, but no experience in the latter 2 is required.

### Project setup

Let's get started with creating the project and installing the necessary dependecies.

Open a terminal window and past the following.
```
npx create-next-app@latest dapp-exemple
cd dapp-exemple
npm install @walletconnect/sign-client@2.0.0-beta.100 @walletconnect/legacy-modal@2.0.0-beta.100 better-sqlite3 @polkadot/util-crypto @polkadot/util
```

In the package.json file and past the following. This will make sure that we always use the same version.
```
"overrides": {
    "@walletconnect/sign-client": "2.0.0-beta.100",
    "@walletconnect/core": "2.0.0-beta.100",
    "@walletconnect/types": "2.0.0-beta.100",
    "@walletconnect/utils": "2.0.0-beta.100",
    "@walletconnect/legacy-modal": "2.0.0-beta.100"
  }
```

Create an ".env.local" file in the root directory and past
```
WALLET_CONNECT_DEFAULT_LOGGER=debug
NEXT_PUBLIC_WALLET_CONNECT_RELAY_URL=wss://wallet-connectrelay.ternoa.network/
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=e8f6f7d41ff88cd96a21ce580f018401Ï
```

### Integration

Now that our project is setup, it's time to integrate Wallet Connect. To do so, we will leverage React Context, to create a reusable component that will be accessible in all components of the application.

In your terminal window from the root directory, past the following.

```
mkdir providers
cd providers
mkdir wallet-connect
cd wallet-connect
touch index.js

```
Now on your favoride IDE (VSCode), open the index.js file in wallet-connect folder.

We will start by the dependencies and the constants

```
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
```

Bellow we will create the context and the provider component

```
export const WalletConnectClientContext = createContext();

export const WalletConnectClientContextProvider = ({ children }) => {

  return (
    <WalletConnectClientContext.Provider
      value={{}}
    >
      {children}
    </WalletConnectClientContext.Provider>
}

```

Within the WalletConnectClientContextProvider component, we add the state variable

```
export const WalletConnectClientContextProvider = ({ children }) => {

  const [client, setClient] = useState(null);
  const [pairings, setPairings] = useState(null);
  const [session, setSession] = useState(null);
  const [address, setAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isAccountCertified, setIsAccountCertified] = useState(false);

  ...
```

Initializing Wallet Connect client

```
  ...
  
  // if the "client" doesn't exist yet, we call "createClient"
  useEffect(() => {
    if (!client) {
      createClient();
    }
  }, [client]);

  const createClient = useCallback(async () => {
    try {
      setIsInitializing(true);
      const _client = await Client.init({
        relayUrl: "wss://wallet-connectrelay.ternoa.network/",
        projectId: "e8f6f7d41ff88cd96a21ce580f018401",
        metadata: DEFAULT_APP_METADATA,
      });

      // Here we subscribe to the events
      await subscribeToEvents(_client);

      // Here we check if we have any persisted session
      await checkPersistedState(_client);

      setClient(_client);
    } catch (err) {
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, [subscribeToEvents, checkPersistedState]);

  ...
```

Subscribe to the events

```

  ...
  const createClient = useCallback(async () => {
  ...

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

  ...

```

Restore previous session and pairings if any

```

  ...
  const subscribeToEvents = useCallback(
  ...

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

  ...
```

When the session is connected we call 
```
  ...
  const checkPersistedState = useCallback(
  ...

  const onSessionConnected = useCallback((_session) => {
    const _pubKey = Object.values(_session.namespaces)
      .map((namespace) => namespace.accounts)
      .flat()[0]
      .split(":")[2];
    setSession(_session);
    setAddress(_pubKey);
    console.log("connected _session", _session);
    console.log("connected _pubKey", _pubKey);
  });

  ...
```

Now we're all set for initializing Wallet Connect, and connecting if a previous session existed. Next step will be to connect, disconnect and sign a message.

Connection
```
  ...
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
  ...
```

Disconnection
```
  ...
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
  ...
```

Signing a message