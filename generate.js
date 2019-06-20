const accounts = 4
const bits = 33

function forin (n, exp) {
  const res = []
  for (var i = 0; i < n; i++) {
    res.push(exp(n))
  }
  return res
}

const args = [
  forin(accounts, (n) => `private field commitment_${n}`).join(', '),
  forin(accounts, (n) => `private field[${bits}] amount_${n}`).join(', '),
  forin(accounts, (n) => `private field amounts_${n}`).join(', '),
  forin(accounts, (n) => `private field[256] blinding_factor_${n}`).join(', '),
  `private field[${bits * accounts}] bits`,
  `public field total_amount`
].join(', ')

const script = `
import "ecc/edwardsAdd.code" as add
import "ecc/edwardsOnCurve.code" as assertOnCurve
import "ecc/babyjubjubParams.code" as jubjub

${genScalarMult(256)}
${genScalarMult(bits)}

// ACCOUNTS = ${accounts}
// BITS = ${bits}
def main (${args}) -> (bool):
  G = jubjub()
  // Generated in sage
  field[2] H = [6194595726402067201576091900283561622215763079773074967268850179021717238447, 8439092241020226480363983149744167072619692543280365025111519919082806615610]

  field sum_amount = 0
  field res = 0
  ${forin(accounts, (j) => `
  c_${j} = add(scalarMult${bits}(amount_${j}, [G[4], G[5]], G), scalarMult256(blinding_factor_${j}, H, G), G)
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

function genScalarMult(size) {
  return `def scalarMult${size}(field[${size}] exponent, field[2] pt, field[10] context) -> (field[2]):

    field[2] infinity = [context[2], context[3]]

    field[2] doubledP = pt
    field[2] accumulatedP = infinity

    for field i in 0..${size} do
        field j = ${size - 1} - i
        candidateP = add(accumulatedP, doubledP, context)
        accumulatedP = if exponent[j] == 1 then candidateP else accumulatedP fi
        doubledP = add(doubledP, doubledP, context)
    endfor

    1 == assertOnCurve(accumulatedP, context)

    return accumulatedP`
}
