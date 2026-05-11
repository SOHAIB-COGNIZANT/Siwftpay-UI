// Required document types per KYC level — matches the spec.
export const KYC_REQUIRED_DOCS = {
  Min:      ['IDProof'],
  Full:     ['IDProof', 'AddressProof', 'Selfie'],
  Enhanced: ['IDProof', 'AddressProof', 'Selfie', 'IncomeProof', 'ProofOfFunds'],
}

export const KYC_DOC_LABELS = {
  IDProof:      'Government ID (Passport / Driver\'s License / National ID)',
  AddressProof: 'Address Proof (Utility bill / Bank statement)',
  Selfie:       'Live Selfie / Photo holding ID',
  IncomeProof:  'Income Proof (Payslip / Tax return)',
  ProofOfFunds: 'Source of Funds (Bank statement / Sale deed)',
}

// True if KYC is verified
export const isKycVerified = (kyc) => kyc?.verificationStatus === 'Verified'

// Customer-facing readable status with icon hint
export const kycStatusMeta = (kyc) => {
  if (!kyc) return { tone: 'neutral',  label: 'Not started' }
  switch (kyc.verificationStatus) {
    case 'Verified': return { tone: 'success', label: 'Verified' }
    case 'Rejected': return { tone: 'error',   label: 'Rejected' }
    case 'Pending':  return { tone: 'warning', label: 'Under review' }
    default:         return { tone: 'neutral', label: kyc.verificationStatus || 'Pending' }
  }
}
