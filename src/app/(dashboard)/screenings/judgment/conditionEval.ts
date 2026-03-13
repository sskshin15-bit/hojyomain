/**
 * 判定エンジン用の条件評価（安全なサブセットのみ）
 * value と数値・文字列の比較のみ許可
 */
export function evaluateCondition(condition: string, value: string | number): boolean {
  const s = condition.trim()
  if (!s.includes("value")) return false

  const numVal = typeof value === "string" ? parseFloat(value) : value
  const isNum = typeof value === "number" || (typeof value === "string" && value !== "" && !Number.isNaN(parseFloat(value)))

  if (s.includes(">=")) {
    const [, right] = s.split(">=").map((x) => x.trim())
    const n = parseFloat(right)
    if (isNum && !Number.isNaN(n)) return numVal >= n
    return false
  }
  if (s.includes("<=")) {
    const [, right] = s.split("<=").map((x) => x.trim())
    const n = parseFloat(right)
    if (isNum && !Number.isNaN(n)) return numVal <= n
    return false
  }
  if (s.includes(">") && !s.includes(">=")) {
    const [, right] = s.split(">").map((x) => x.trim())
    const n = parseFloat(right)
    if (isNum && !Number.isNaN(n)) return numVal > n
    return false
  }
  if (s.includes("<") && !s.includes("<=")) {
    const [, right] = s.split("<").map((x) => x.trim())
    const n = parseFloat(right)
    if (isNum && !Number.isNaN(n)) return numVal < n
    return false
  }
  const parseLiteral = (right: string): string => {
    if (right === "''" || right === '""') return ""
    return right.replace(/^['"]|['"]$/g, "")
  }
  if (s.includes("===")) {
    const parts = s.split("===").map((x) => x.trim())
    const right = parts[1]
    if (right === undefined) return false
    return String(value) === parseLiteral(right)
  }
  if (s.includes("!==")) {
    const parts = s.split("!==").map((x) => x.trim())
    const right = parts[1]
    if (right === undefined) return true
    return String(value) !== parseLiteral(right)
  }

  return false
}
