# lensmo-contracts

Contracts for Lensmo, including TrustedTxModifier and Identifier. The TrustedTxModifier is custom Gnosis Safe modifier that enables an owner to execute safe transactions if an EIP712 offchain signature corresponds to the owner of the modifier. In our case, this module allows Lensmo to execute transactions on behalf of users who have been authenticated through social web applications. Our Identifier is a non-transferrable EIP-4671 token used to simply link users' social accounts with their wallets.

## Introduction

Lensmo allows Ethereum signers to send ERC20 tokens to any social account; these social accounts can then claim the tokens through our a user interface after claiming the wallets their tokens have been assigned to as well as take sole ownership of their wallets or transfer their tokens to another Ethereum address.
How is this achieved?

1. The module is generalized to allow arbitrary transactions to be executed through a Gnosis Safe if and only if the result of `ecrecover()` on an offchain signature matches the owner of the module.
2. The module's functions are called by the user interface of Lensmo and automatically executed.

The flow of the TrustedTxModifier is as such:

1. A user is authenticated through a social app that has been integrated into Lensmo.
2. The user can then use Lensmo interface to take sole ownership of their wallets or transfer all of their tokens to an EOA of their choice.

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
