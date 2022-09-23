## Introduction

This is a step-by-step tutorial on how to integrate Wallet Connect to your dApp, to connect all dApps powered by **Ternoa** ecosystem to **Ternoa Wallet**.

Pre-requist: In this tutorial, we assume that you are familiar with es6. We will also use next.js with React.js, but no experience in the latter 2 is required.


### Project setup

Let's get started with creating the project and installing the necessary dependecies.

Open a terminal window and run this command to create your NextJS project
```
npx create-next-app@latest dapp-example && cd dapp-example
```
In the package.json file of your recently created project, copy and past the following. This will make sure that we always use the same version of WalletConnect.
```
"overrides": {
    "@walletconnect/sign-client": "2.0.0-beta.100",
    "@walletconnect/core": "2.0.0-beta.100",
    "@walletconnect/types": "2.0.0-beta.100",
    "@walletconnect/utils": "2.0.0-beta.100",
    "@walletconnect/legacy-modal": "2.0.0-beta.100"
  },

```

Run the following commands to install the necessary dependencies

```
npm install @walletconnect/sign-client@2.0.0-beta.100 @walletconnect/legacy-modal@2.0.0-beta.100 better-sqlite3 @polkadot/util-crypto @polkadot/util
```


Make sure that you have `swcMinify` disabled on your `next.config.js` file:
```
const nextConfig = {
  swcMinify: false,
  ...
}
```

### Integration

Now that our project is setup, it's time to integrate Wallet Connect. Open the index file in the pages directory, we will start by the dependencies and the constants

```
import { useCallback, useState, useEffect } from "react";
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
  name: "dApp example",
  description: "dApp example",
  url: "https://ternoa.com",
  icons: ["https://www.ternoa.com/favicon.ico"],
};

const TERNOA_ALPHANET_CHAIN = "ternoa:18bcdb75a0bba577b084878db2dc2546";
const RELAY_URL = "wss://wallet-connectrelay.ternoa.network/";
const PROJECT_ID = "" // Get your project id by applying to the form, link in the introduction
const requiredNamespaces = {
  ternoa: {
    chains: [TERNOA_ALPHANET_CHAIN],
    events: ["event_test"], // events that we will use, each project implements events according to the business logic
    methods: ["sign_message"], // methods that we will use, each project implements methods according to the business logic
  },
};
```

Within the Home component, we add the state variable

```
export default function Home() {

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
        relayUrl: RELAY_URL,
        projectId: PROJECT_ID,
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

  const subscribeToEvents = useCallback(
    async (_client) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      // here we can use several type of events, predefined in the Wallect Connect document
      _client.on("session_update", ({ topic, params }) => {
        const { namespaces } = params;
        const _session = _client.session.get(topic);
        const updatedSession = { ..._session, namespaces };
        onSessionConnected(updatedSession);
      });
      _client.on("session_event", ({ event }) => {
        // Handle session events, such as "chainChanged", "accountsChanged", etc.
      });
      _client.on("session_delete", () => {
        // Session was deleted -> reset the dapp state, clean up from user session, etc.
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

  const checkPersistedState = useCallback(
    async (_client) => {
      if (typeof _client === "undefined") {
        throw new Error("WalletConnect is not initialized");
      }
      setPairings(_client.pairing.values);

      if (typeof session !== "undefined") return;

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

When the session is connected we call onSessionConnected to change the dapp state accordingly
```
  ...

  const onSessionConnected = useCallback((_session) => {
    const _pubKey = Object.values(_session.namespaces)
      .map((namespace) => namespace.accounts)
      .flat()[0]
      .split(":")[2];
    setSession(_session);
    setAddress(_pubKey);
  });

  ...
```

Now we're all set for Wallet Connect initialization. The next step will be to connect, disconnect and sign a message.

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
        // Here we will await the Wallet's response to the pairing proposal
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

```
  ...

  const signMessage = useCallback(async () => {
    if (typeof client === "undefined") {
       throw new Error("WalletConnect is not initialized");
    }
    setIsLoading(true);

    // This could be any message, but will be rejected by the Wallet if it is a transaction hash
    const message = "Confirm Account";

    await client.request({
      chainId: TERNOA_ALPHANET_CHAIN,
      topic: session.topic,
      request: {
        method: "sign_message",
        params: {
          pubKey: address,
          request: {
            message,
          },
        },
      },
    })
    .then(async (response) => {
      const responseObj = JSON.parse(response);

      // The method to verify the signature uses WASM librairies under the hood, so we have to make sure that they are all available before proceeding
      await cryptoWaitReady();
      const isValid = isValidSignaturePolkadot(
        message,
        responseObj.signedMessageHash,
        address
      );

      setIsAccountCertified(isValid);
    })
    .catch((err) => {
      console.error(err);
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

  ...
```