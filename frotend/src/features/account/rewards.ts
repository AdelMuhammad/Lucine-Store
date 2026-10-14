export function isReferralCode(code: string) {
  return /^FRIEND-[A-Z0-9]{6}$/.test(code.trim().toUpperCase())
}

export function referralLink(code: string, origin = window.location.origin) {
  return `${origin}/?ref=${encodeURIComponent(code)}`
}

export function referralProductLink(
  productId: string,
  code: string,
  origin = window.location.origin,
) {
  return `${origin}/products/${encodeURIComponent(productId)}?ref=${encodeURIComponent(code)}`
}
