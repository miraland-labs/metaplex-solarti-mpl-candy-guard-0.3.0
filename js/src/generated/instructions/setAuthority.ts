/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as web3 from '@solarti/web3.js';
import * as beetSolana from '@metaplex-solarti/beet-solana';
import * as beet from '@metaplex-foundation/beet';

/**
 * @category Instructions
 * @category SetAuthority
 * @category generated
 */
export type SetAuthorityInstructionArgs = {
  newAuthority: web3.PublicKey;
};
/**
 * @category Instructions
 * @category SetAuthority
 * @category generated
 */
export const setAuthorityStruct = new beet.BeetArgsStruct<
  SetAuthorityInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */;
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['newAuthority', beetSolana.publicKey],
  ],
  'SetAuthorityInstructionArgs',
);
/**
 * Accounts required by the _setAuthority_ instruction
 *
 * @property [_writable_] candyGuard
 * @property [**signer**] authority
 * @category Instructions
 * @category SetAuthority
 * @category generated
 */
export type SetAuthorityInstructionAccounts = {
  candyGuard: web3.PublicKey;
  authority: web3.PublicKey;
};

export const setAuthorityInstructionDiscriminator = [133, 250, 37, 21, 110, 163, 26, 121];

/**
 * Creates a _SetAuthority_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 *
 * @category Instructions
 * @category SetAuthority
 * @category generated
 */
export function createSetAuthorityInstruction(
  accounts: SetAuthorityInstructionAccounts,
  args: SetAuthorityInstructionArgs,
  programId = new web3.PublicKey('Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g'),
) {
  const [data] = setAuthorityStruct.serialize({
    instructionDiscriminator: setAuthorityInstructionDiscriminator,
    ...args,
  });
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.candyGuard,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.authority,
      isWritable: false,
      isSigner: true,
    },
  ];

  const ix = new web3.TransactionInstruction({
    programId,
    keys,
    data,
  });
  return ix;
}
