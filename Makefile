build: pedersen.code
	zokrates compile -i pedersen.code

pedersen.code: generate.js
	node generate > pedersen.code
