SRC = $(shell find src -name \*.js)

lint:
	gjslint --strict --jslint_error=all --disable=110 --nojsdoc $(SRC)
