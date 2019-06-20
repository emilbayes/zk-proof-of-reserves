build: pedersen.code
	zokrates compile -i pedersen.code

pedersen.code:
	node generate > pedersen.code
