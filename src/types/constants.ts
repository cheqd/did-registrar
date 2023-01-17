export enum Messages {
    Invalid = "Invalid payload",
    Internal = "Internal server error",
    TryAgain = "The operation failed due to an internal error. Please try again",
    GetSignature = "Please sign the following payload with the keys in verificationMethod and Add the signingResponse in secret",
    DidNotFound = "The DID does not exist"
}