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

#### Example 1
Sign a message

```
  const request = {
    message: 'Your message'
  }
```

#### Example 2
Transaction to be signed and submited in the Wallet

```
  const request = {
    txHash: 'Your transaction hash',
    submit: true
  }
```

#### Example 3
Transaction to be signed and returned to the dApp

```
  const request = {
    txHash: 'Your transaction hash',
    submit: false
  }
```

#### Example 4
Transaction to be signed and submited in the Wallet, with custom nonce

Unique value that will lock the transaction execution to a single submission, the default value of nonce is -1, which corresponds to the next available nonce.

```
  const request = {
    txHash: 'Your transaction hash',
    submit: true,
    nonce: -1,
  }
```

#### Example 5
Transaction to be signed and submited in the Wallet, with custom validity

Number of blocks for which the transaction can be submitted, the default value of validity is 0, which corresponds immortal.

```
  const request = {
    txHash: 'Your transaction hash',
    submit: true,
    validity: 0
  }
```

