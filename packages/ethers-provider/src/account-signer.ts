import {
  BaseSmartContractAccount,
  resolveProperties,
  type AccountMiddlewareFn,
  type PublicErc4337Client,
} from "@alchemy/aa-core";
import { Signer } from "@ethersproject/abstract-signer";
import { hexlify } from "@ethersproject/bytes";
import type { Deferrable } from "@ethersproject/properties";
import {
  type TransactionRequest,
  type TransactionResponse,
} from "@ethersproject/providers";
import { EthersProviderAdapter } from "./provider-adapter.js";

const hexlifyOptional = (value: any): `0x${string}` | undefined => {
  if (value == null) {
    return undefined;
  }

  return hexlify(value) as `0x${string}`;
};

export class AccountSigner extends Signer {
  private account?: BaseSmartContractAccount;
  sendUserOperation;

  constructor(readonly provider: EthersProviderAdapter) {
    super();
    this.account = this.provider.accountProvider.account;
    this.sendUserOperation =
      this.provider.accountProvider.sendUserOperation.bind(
        this.provider.accountProvider
      );
  }

  getAddress(): Promise<string> {
    if (!this.account) {
      throw new Error(
        "connect the signer to a provider that has a connected account"
      );
    }

    return this.account.getAddress();
  }

  signMessage(message: string | Uint8Array): Promise<string> {
    if (!this.account) {
      throw new Error(
        "connect the signer to a provider that has a connected account"
      );
    }

    return this.account.signMessage(message);
  }

  withPaymasterMiddleware: (overrides: {
    dummyPaymasterMiddleware: AccountMiddlewareFn;
    getPaymasterAndDataMiddleware: AccountMiddlewareFn;
  }) => this = (overrides) => {
    this.provider.withPaymasterMiddleware(overrides);
    return this;
  };

  withGasEstimator: (override: AccountMiddlewareFn) => this = (override) => {
    this.provider.withGasEstimator(override);
    return this;
  };

  withFeeDataGetter: (override: AccountMiddlewareFn) => this = (override) => {
    this.provider.withFeeDataGetter(override);
    return this;
  };

  async sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionResponse> {
    const resolved = await resolveProperties(transaction);
    const txHash = await this.provider.accountProvider.sendTransaction({
      // TODO: need to support gas fields as well
      from: (await this.getAddress()) as `0x${string}`,
      to: resolved.to as `0x${string}` | undefined,
      data: hexlifyOptional(resolved.data),
    });

    return this.provider.getTransaction(txHash);
  }

  signTransaction(
    _transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    throw new Error(
      "Transaction signing is not supported, use sendUserOperation instead"
    );
  }

  getPublicErc4337Client(): PublicErc4337Client {
    return this.provider.getPublicErc4337Client();
  }

  connect(provider: EthersProviderAdapter): AccountSigner {
    return new AccountSigner(provider);
  }
}
