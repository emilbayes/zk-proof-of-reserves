const accounts = 4
const bits = 33

function forin (n, exp) {
  res = []
  for (var i = 0; i < n; i++) {
    res.push(exp(n))
  }
  return res
}

const args = [
  forin(accounts, (n) => `private field commitment_${n}`).join(', '),
  forin(accounts, (n) => `private field[256] amount_${n}`).join(', '),
  forin(accounts, (n) => `private field amounts_${n}`).join(', '),
  forin(accounts, (n) => `private field[256] blinding_factor_${n}`).join(', '),
  `private field[${bits * accounts}] bits`,
  `public field total_amount`
].join(', ')

const HexpBits = BigInt('2417296792044260459589534796306265266991365743098572196690216026133643768250').toString(2).padStart(256, '0').split('')

const script = `
import "ecc/edwardsAdd.code" as add
import "ecc/edwardsScalarMult.code" as scalarMult
import "ecc/babyjubjubParams.code" as jubjub

// ACCOUNTS = ${accounts}
// BITS = ${bits}
def main (${args}) -> (bool):
  G = jubjub()
  H = scalarMult([${HexpBits.join()}], [G[4], G[5]], G)

  field sum_amount = 0
  field res = 0
  ${forin(accounts, (j) => `
  c_${j} = add(scalarMult(amount_${j}, [G[4], G[5]], G), scalarMult(blinding_factor_${j}, H, G), G)
  commitment_${j} == c_${j}[0]

  res = 0
  for field i in 0..${bits} do
    field bit = bits[i + ${j - 1} * ${bits}]
    bit * bit == bit
    res = res + bit * (2 ** i)
  endfor

  amounts_${j} == res
  sum_amount = sum_amount + res
`).join('\n')}
  return total_amount == sum_amount
`

console.log(script)
