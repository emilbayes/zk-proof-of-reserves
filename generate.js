const accounts = 4
const bits = 33

function forin (n, exp) {
  const res = []
  for (let i = 0; i < n; i++) {
    res.push(exp(i))
  }
  return res
}

// commitment, amount_in_bits, blinding_factor, amount,
const args = [
  forin(accounts, (n) => `field[2] commitment_${n}`).join(', '),
  forin(accounts, (n) => `private field[${bits}] amount_in_bits_${n}`).join(', '),
  forin(accounts, (n) => `private field[256] blinding_factor_${n}`).join(', '),
  forin(accounts, (n) => `private field amounts_${n}`).join(', '),
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
  field[2] H = [15062767207209273935069766228681029151541034596557745984629900633106846735903, 6341322789198213736148938234331954507166091334711016221314502571133203693855]

  field sum_amount = 0
  field res = 0
  ${forin(accounts, (j) => `
  Gx = scalarMult${bits}(amount_in_bits_${j}, [G[4], G[5]], G)
  Hr = scalarMult256(blinding_factor_${j}, H, G)
  c_${j} = add(Gx, Hr, G)
  commitment_${j} == c_${j}

  res = 0
  for field i in 0..${bits} do
    field j = ${bits - 1} - i
    field bit = amount_in_bits_${j}[i]
    bit * bit == bit
    res = res + bit * (2 ** j)
  endfor

  amounts_${j} == res
  sum_amount = sum_amount + res
`).join('\n')}
  return total_amount == sum_amount
`

console.log(script)

function genScalarMult (size) {
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
