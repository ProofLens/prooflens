These files are development/test C2PA Generator Product credentials.

They are not a production ProofLens C2PA trust root. A cryptographically
valid development credential remains externally untrusted unless a validating
ecosystem independently trusts it. ProofLens never reports these credentials
as ecosystem-trusted and never treats C2PA as authentication of the human
creator.

Private material is generated at runtime by `createDevelopmentC2paCredentials()`
and is separate from ProofLens creator identity keys.
