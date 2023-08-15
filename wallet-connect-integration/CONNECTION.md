
## Introduction

We have Intregrated ``Wallet Connect` with **Ternoa Wallet** to conveniently and securely connect with Dapps. There are currently 3 ways to initiate a connection.

### Deeplink

Example :

```
ternoa-wallet://wc?uri=<wallet-connect-ui>
```

### QR Scan

Example :

```
  import QRCodeModal from "@walletconnect/legacy-modal";

  ...
  QRCodeModal.open(uri)
  ...
```

### Webview

Ternoa Wallet injects an isTernoaWallet boolean in webview, this boolean will be user to defect that this is a webview

Example :

```
const isTernoaWallet = (window as any).isTernoaWallet;
if (isTernoaWallet) {
  const ternoWalletWebview = (window as any).ReactNativeWebView;
  ternoWalletWebview.postMessage(JSON.stringify({ data: uri, action: "WC_PAIR" }));
}

```


