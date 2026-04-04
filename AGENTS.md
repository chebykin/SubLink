## Instructions

* Specifications should live at `specs/spec-{timestamp}.md` with the most recent
  spec available at `specs/spec.md`.
* If we redesign something there should be a new complete spec created with a
  current timestamp. Thus we cann see the decision flow over the time.


## Unlink

Docs: UNLINK_DOCS.md in the project root. Original at docs.unlink.xyz
Token: USDC 0x036CbD53842c5426634e7929541eC2318f3dCF7e


## Coding

* Use bun.js with Typescript
* Blockchain interactions: viem.js

## Chain

There is only chain: `Base Sepolia`
* RPC: https://sepolia.base.org
* Explorer: https://sepolia-explorer.base.org

.env file:

* `UNLINK_API_KEY` - unlink api key
* `UNLINK_API_ENDPOINT` - unlink api endpoint

## Wallets

.env file contain keys:
* `DEPLOYER` - for deploying contracts
* `ALICE` - sender
* `BOB` - receiver
