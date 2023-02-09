export enum Messages {
    Invalid = "Invalid payload",
    Internal = "Internal server error",
    TryAgain = "The operation failed due to an internal error. Please try again",
    GetSignature = "Please sign the following payload with the keys in verificationMethod and Add the signingResponse in secret",
    DidNotFound = "The DID does not exist or Deactivated",
    InvalidDidDocument = "Provide a DID Document with atleast one valid verification method",
    InvalidDid = "The DID is not valid",
    InvalidJob = "The jobId is either expired or not found",
    SecretValidation = "Provide either a valid KeyPair or Signature",
    InvalidResource = "Resource Data is invalid",
    TestnetFaucet = "sketch mountain erode window enact net enrich smoke claim kangaroo another visual write meat latin bacon pulp similar forum guilt father state erase bright",
    SigingResponse = "e.g. { verificationMethodId: did:cheqd:testnet:qsqdcansoica#key-1, signature: aca1s12q14213casdvaadcfas }",
    InvalidOptions = "The provided options are invalid",
    InvalidSecret = "The provided secret is invalid"
}