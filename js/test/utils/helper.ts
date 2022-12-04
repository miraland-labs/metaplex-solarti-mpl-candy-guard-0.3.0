import { Test } from 'tape';
import {
  ConfirmedTransactionAssertablePromise,
  PayerTransactionHandler,
} from '@metaplex-solarti/amman-client';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  SYSVAR_SLOT_HASHES_PUBKEY,
} from '@solarti/web3.js';
import {
  AddConfigLinesInstructionAccounts,
  AddConfigLinesInstructionArgs,
  CandyMachine,
  CandyMachineData,
  ConfigLine,
  createAddConfigLinesInstruction,
  createInitializeInstruction,
  createMintInstruction,
  InitializeInstructionAccounts,
  InitializeInstructionArgs,
  MintInstructionAccounts,
  PROGRAM_ID,
} from '@metaplex-solarti/mpl-candy-machine-core';
import { amman } from '../setup';
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  MintLayout,
  TOKEN_PROGRAM_ID,
} from '@solarti/spl-token';
import {
  // findAssociatedTokenAccountPda,
  findCandyMachineV2CreatorPda,
  findCollectionAuthorityRecordPda,
  findMasterEditionV2Pda,
  findMetadataPda,
  keypairIdentity,
  Metaplex,
} from '@metaplex-solarti/js';
import { COLLECTION_METADATA } from './constants';
import { getCandyMachineSpace } from '.';

export const CANDY_MACHINE_PROGRAM = PROGRAM_ID;
export const METAPLEX_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export class CandyMachineHelper {
  async initialize(
    t: Test,
    payer: Keypair,
    candyMachine: Keypair,
    data: CandyMachineData,
    handler: PayerTransactionHandler,
    connection: Connection,
  ): Promise<{ tx: ConfirmedTransactionAssertablePromise }> {
    // creates a collection nft
    const metaplex = Metaplex.make(connection).use(keypairIdentity(payer));

    const { nft: collection } = await metaplex
      .nfts()
      .create({
        uri: COLLECTION_METADATA,
        name: 'CORE Collection',
        sellerFeeBasisPoints: 500,
      })
      ;

    const authorityPda = findCandyMachineV2CreatorPda(candyMachine.publicKey, CANDY_MACHINE_PROGRAM);

    await amman.addr.addLabel('Collection Mint', collection.address);

    const collectionAuthorityRecord = findCollectionAuthorityRecordPda(
      collection.mint.address,
      authorityPda,
    );
    await amman.addr.addLabel('Collection Authority Record', collectionAuthorityRecord);

    const collectionMetadata = findMetadataPda(collection.mint.address);
    await amman.addr.addLabel('Collection Metadata', collectionMetadata);

    const collectionMasterEdition = findMasterEditionV2Pda(collection.mint.address);
    await amman.addr.addLabel('Collection Master Edition', collectionMasterEdition);

    const accounts: InitializeInstructionAccounts = {
      authorityPda,
      collectionUpdateAuthority: collection.updateAuthorityAddress,
      candyMachine: candyMachine.publicKey,
      authority: payer.publicKey,
      payer: payer.publicKey,
      collectionMetadata,
      collectionMint: collection.address,
      collectionMasterEdition,
      collectionAuthorityRecord,
      tokenMetadataProgram: METAPLEX_PROGRAM_ID,
    };

    const args: InitializeInstructionArgs = {
      data: data,
    };

    const ixInitialize = createInitializeInstruction(accounts, args);
    const ixCreateAccount = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: candyMachine.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(getCandyMachineSpace(data)),
      space: getCandyMachineSpace(data),
      programId: CANDY_MACHINE_PROGRAM,
    });

    const tx = new Transaction().add(ixCreateAccount).add(ixInitialize);

    const txPromise = handler.sendAndConfirmTransaction(
      tx,
      [candyMachine, payer],
      'tx: Initialize',
    );

    return { tx: txPromise };
  }

  async addConfigLines(
    t: Test,
    candyMachine: PublicKey,
    payer: Keypair,
    lines: ConfigLine[],
  ): Promise<{ txs: Transaction[] }> {
    const accounts: AddConfigLinesInstructionAccounts = {
      candyMachine: candyMachine,
      authority: payer.publicKey,
    };

    const txs: Transaction[] = [];
    let start = 0;

    while (start < lines.length) {
      // sends the config lines in chunks of 10
      const limit = Math.min(lines.length - start, 10);
      const args: AddConfigLinesInstructionArgs = {
        configLines: lines.slice(start, start + limit),
        index: start,
      };

      const ix = createAddConfigLinesInstruction(accounts, args);
      txs.push(new Transaction().add(ix));

      start = start + limit;
    }

    return { txs };
  }

  async mint(
    t: Test,
    candyMachine: PublicKey,
    payer: Keypair,
    mint: Keypair,
    handler: PayerTransactionHandler,
    connection: Connection,
  ): Promise<{ tx: ConfirmedTransactionAssertablePromise }> {
    const candyMachineObject = await CandyMachine.fromAccountAddress(connection, candyMachine);

    // PDAs required for the mint
    const nftMetadata = findMetadataPda(mint.publicKey);
    const nftMasterEdition = findMasterEditionV2Pda(mint.publicKey);
    // const nftTokenAccount = findAssociatedTokenAccountPda(mint.publicKey, payer.publicKey);
    const nftTokenAccount = await getAssociatedTokenAddress(mint.publicKey, payer.publicKey);

    const collectionMint = candyMachineObject.collectionMint;
    // retrieves the collection nft
    const metaplex = Metaplex.make(connection).use(keypairIdentity(payer));
    const collection = await metaplex.nfts().findByMint({ mintAddress: collectionMint });
    // collection PDAs
    const authorityPda = findCandyMachineV2CreatorPda(candyMachine, CANDY_MACHINE_PROGRAM);
    const collectionAuthorityRecord = findCollectionAuthorityRecordPda(
      collectionMint,
      authorityPda,
    );
    const collectionMetadata = findMetadataPda(collectionMint);
    const collectionMasterEdition = findMasterEditionV2Pda(collectionMint);

    const accounts: MintInstructionAccounts = {
      candyMachine: candyMachine,
      authorityPda,
      mintAuthority: candyMachineObject.mintAuthority,
      payer: payer.publicKey,
      nftMint: mint.publicKey,
      nftMintAuthority: payer.publicKey,
      nftMetadata,
      nftMasterEdition,
      collectionAuthorityRecord,
      collectionMint,
      collectionUpdateAuthority: collection.updateAuthorityAddress,
      collectionMetadata,
      collectionMasterEdition,
      tokenMetadataProgram: METAPLEX_PROGRAM_ID,
      recentSlothashes: SYSVAR_SLOT_HASHES_PUBKEY,
    };

    const ixs: TransactionInstruction[] = [];
    ixs.push(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint.publicKey,
        lamports: await connection.getMinimumBalanceForRentExemption(MintLayout.span),
        space: MintLayout.span,
        programId: TOKEN_PROGRAM_ID,
      }),
    );
    ixs.push(createInitializeMintInstruction(mint.publicKey, 0, payer.publicKey, payer.publicKey));
    ixs.push(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        nftTokenAccount,
        payer.publicKey,
        mint.publicKey,
      ),
    );
    ixs.push(createMintToInstruction(mint.publicKey, nftTokenAccount, payer.publicKey, 1, []));
    // candy machine mint instruction
    ixs.push(createMintInstruction(accounts));
    const tx = new Transaction().add(...ixs);

    return { tx: handler.sendAndConfirmTransaction(tx, [payer, mint], 'tx: Candy Machine Mint') };
  }
}
