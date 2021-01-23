all: test/readme.t.js README.md

test/readme.t.js: edify.md
	moxie --mode code $< > $@
README.md: edify.md
	moxie --mode text $< > $@
