/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet';
import * as web3 from '@solarti/web3.js';

/**
 * @category Instructions
 * @category Unwrap
 * @category generated
 */
export const unwrapStruct = new beet.BeetArgsStruct<{
  instructionDiscriminator: number[] /* size: 8 */;
}>([['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)]], 'UnwrapInstructionArgs');
/**
 * Accounts required by the _unwrap_ instruction
 *
 * @property [] candyGuard
 * @property [**signer**] authority
 * @property [_writable_] candyMachine
 * @property [**signer**] candyMachineAuthority
 * @property [] candyMachineProgram
 * @category Instructions
 * @category Unwrap
 * @category generated
 */
export type UnwrapInstructionAccounts = {
  candyGuard: web3.PublicKey;
  authority: web3.PublicKey;
  candyMachine: web3.PublicKey;
  candyMachineAuthority: web3.PublicKey;
  candyMachineProgram: web3.PublicKey;
};

export const unwrapInstructionDiscriminator = [126, 175, 198, 14, 212, 69, 50, 44];

/**
 * Creates a _Unwrap_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @category Instructions
 * @category Unwrap
 * @category generated
 */
export function createUnwrapInstruction(
  accounts: UnwrapInstructionAccounts,
  programId = new web3.PublicKey('Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g'),
) {
  const [data] = unwrapStruct.serialize({
    instructionDiscriminator: unwrapInstructionDiscriminator,
  });
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.candyGuard,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.authority,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: accounts.candyMachine,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.candyMachineAuthority,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: accounts.candyMachineProgram,
      isWritable: false,
      isSigner: false,
    },
  ];

  const ix = new web3.TransactionInstruction({
    programId,
    keys,
    data,
  });
  return ix;
}
