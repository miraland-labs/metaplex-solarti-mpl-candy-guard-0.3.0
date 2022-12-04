use super::*;
use crate::{
    state::GuardType,
    utils::{assert_keys_equal, spl_token_transfer, TokenTransferParams},
};
use mpl_token_metadata::state::{Metadata, TokenMetadataAccount};
use solana_program::program::invoke;
use spl_associated_token_account::instruction::create_associated_token_account;

/// Guard that charges another NFT (token) from a specific collection as payment
/// for the mint.
///
/// List of accounts required:
///
///   0. `[writeable]` Token account of the NFT.
///   1. `[writeable]` Metadata account of the NFT.
///   2. `[]` Mint account of the NFT.
///   3. `[]` Account to receive the NFT.
///   4. `[writeable]` Destination PDA key (seeds [destination pubkey, token program id, nft mint pubkey]).
///   5. `[]` spl-associate-token program ID.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct NftPayment {
    pub required_collection: Pubkey,
    pub destination: Pubkey,
}

impl Guard for NftPayment {
    fn size() -> usize {
        32   // required_collection
        + 32 // destination
    }

    fn mask() -> u64 {
        GuardType::as_mask(GuardType::NftPayment)
    }
}

impl Condition for NftPayment {
    fn validate<'info>(
        &self,
        ctx: &Context<'_, '_, '_, 'info, Mint<'info>>,
        _mint_args: &[u8],
        _guard_set: &GuardSet,
        evaluation_context: &mut EvaluationContext,
    ) -> Result<()> {
        let index = evaluation_context.account_cursor;

        // validates that we received all required accounts

        let nft_account = try_get_account_info(ctx, index)?;
        let nft_metadata = try_get_account_info(ctx, index + 1)?;
        let nft_mint = try_get_account_info(ctx, index + 2)?;
        evaluation_context.account_cursor += 3;

        NftGate::verify_collection(
            nft_account,
            nft_metadata,
            &self.required_collection,
            ctx.accounts.payer.key,
        )?;

        let metadata: Metadata = Metadata::from_account_info(nft_metadata)?;
        assert_keys_equal(&metadata.mint, nft_mint.key)?;

        let destination = try_get_account_info(ctx, index + 3)?;
        let destination_ata = try_get_account_info(ctx, index + 4)?;
        let _atoken_program = try_get_account_info(ctx, index + 5)?;
        evaluation_context.account_cursor += 3;

        assert_keys_equal(destination.key, &self.destination)?;

        let (ata, _) = Pubkey::find_program_address(
            &[
                destination.key.as_ref(),
                spl_token::ID.as_ref(),
                nft_mint.key.as_ref(),
            ],
            &spl_associated_token_account::ID,
        );

        assert_keys_equal(destination_ata.key, &ata)?;

        evaluation_context
            .indices
            .insert("nft_payment_index", index);

        Ok(())
    }

    fn pre_actions<'info>(
        &self,
        ctx: &Context<'_, '_, '_, 'info, Mint<'info>>,
        _mint_args: &[u8],
        _guard_set: &GuardSet,
        evaluation_context: &mut EvaluationContext,
    ) -> Result<()> {
        let index = evaluation_context.indices["nft_payment_index"];
        let nft_account = try_get_account_info(ctx, index)?;
        let nft_mint = try_get_account_info(ctx, index + 2)?;
        let destination = try_get_account_info(ctx, index + 3)?;
        let destination_ata = try_get_account_info(ctx, index + 4)?;

        // creates the ATA to receive the NFT

        invoke(
            &create_associated_token_account(
                ctx.accounts.payer.key,
                &self.destination,
                nft_mint.key,
            ),
            &[
                ctx.accounts.payer.to_account_info(),
                destination_ata.to_account_info(),
                destination.to_account_info(),
                nft_mint.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // transfers the NFT

        spl_token_transfer(TokenTransferParams {
            source: nft_account.to_account_info(),
            destination: destination_ata.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
            authority_signer_seeds: &[],
            token_program: ctx.accounts.token_program.to_account_info(),
            // fixed to always require 1 NFT
            amount: 1,
        })?;

        Ok(())
    }
}
