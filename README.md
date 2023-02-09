# patch-wallets-contracts

This repository contains the smart contracts source code for Patch Wallets. Patch Wallets is a an Ethereum protocol that leverages ERC-4337 compliant smart contracts to provide a secure and convenient way for users to transact on Ethereum and EVM-compatible networks using their email, phone number, or social media accounts in a non-custodial manner.

## Introduction

Patch Wallets allows users to transact on the Ethereum network using their email, phone number, or social media accounts, eliminating the need for private keys.

The protocol uses a combination of off-chain components and smart contracts to provide a seamless and secure wallet experience for users. The off-chain component acts as the bridge between the user's email, phone number, or social media account and the Ethereum network while the smart contract system is responsible for creating wallet instances as well as executing transactions.

The flow of Patch Wallets is as such:

1. When a user authenticates themselves through email, phone number, or social media, the off-chain component calls the BaseAccountFactory, creating a counterfactual wallet on Polygon whose address is determined by the associated email, phone number, or social media account used for authentication.

2. The user is then able to receive tokens or initiate transactions on any chain from their BaseAccount instance.

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
