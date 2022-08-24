## Introduction

There are multiple ways to interact with **Ternoa Wallet**, when it comes to sending a request via Wallet Connect.

### Request object

The request object contains 5 keys, based on your business requirments, not all the keys are required, bellow a list of use cases.

```
 {
  txHash?: string, // transaction hash, not necessary if you are signing a message
  nonce?: number, // transaction nonce, not necessary if you are signing a message
  validity?: number, // transaction validity period, not necessary if you are signing a message
  submit?: boolean, // true if the transaction is to be submitted from the wallet, false if you want to receive a signed transaction back to the dApp, not necessary if you are signing a message
  message?: string, // message to be signed, will be rejected if it is a transaction hash, not necessary if you are sending a transaction
}
```