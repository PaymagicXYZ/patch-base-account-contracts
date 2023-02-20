# Patch Wallet: base-account-contracts

This repository contains the base account smart contracts source code for Patch Wallets. Patch Wallets is a Wallet Protocol that leverages ERC-4337 compliant smart contracts to provide a secure and convenient way for users to transact on Ethereum and EVM-compatible networks using their email, phone number, or social media accounts in a non-custodial manner.

## Introduction

Patch Wallets allows users to transact on the Ethereum network using their email, phone number, or social media accounts, eliminating the need for private keys or custodians.

The protocol uses the ERC-4337 compatible BaseAccount.sol contracts with the same deterministic address deployed to all EVM chains. Each wallet is attached to the email, phone number, or social media account of the user and transaction signing can be done through any signing service, although we recommend [Lit Protocol](https://litprotocol.com/). 

## Installation

```

git clone

```

To install with dependencies

```

yarn

```

## Local development

This project uses Hardhat as the development framework.

### Testing

```

yarn hardhat test

```
