# H5P Game Map
Let your students choose their exercises on a game map.

## Getting started
Clone this repository with git and check out the branch that you are interested
in (or choose the branch first and then download the archive, but learning
how to use git really makes sense).

One thing to note in particular: Common H5P integrations use mySQL databases with
the type of `text` for the `semantics` field in the `h5p_libraries`table. That means
that this field can hold up to 64KB of data. However, semantics.json of GameMap
exceeds that limit, so I came up with a quick fix: I use semantics_src.json and
minify it. That's what I use `npm run build_semantics` for. Not ideal, because it requires
you to run it when you change semantics, but for now that's okay. `npm run build` and `npm run watch`
will build the minified semantics, too.

Change to the repository directory and run
```bash
npm install
```

to install required modules. Afterwards, you can build the project using
```bash
npm run build
```

or, if you want to let everything be built continuously while you are making
changes to the code, run
```bash
npm run watch
```
Before putting the code in production, you should always run `npm run build`.

Also, you should run
```bash
npm run lint
```
in order to check for coding style guide violations.

The build process will transpile ES6 to earlier versions in order to improve
compatibility to older browsers. If you want to use particular functions that
some browsers don't support, you'll have to add a polyfill.

The build process will also move the source files into one distribution file and
minify the code.

In order to pack an H5P library, please install the H5P CLI tool instead of zipping everything manually. That tool will take care of a couple of things automatically that you will need to know otherwise.

In simple cases, something such as
```bash
h5p pack <your-repository-directory> my-awesome-library.h5p
```
will suffice.

For more information on how to use those distribution files in H5P, please have a look at https://youtu.be/xEgBJaRUBGg and the H5P developer guide at https://h5p.org/library-development.
