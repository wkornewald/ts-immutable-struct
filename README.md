# ts-immutable-struct

[![Greenkeeper badge](https://badges.greenkeeper.io/wkornewald/ts-immutable-struct.svg)](https://greenkeeper.io/)

[![npm version](https://badge.fury.io/js/ts-immutable-struct.svg)](https://badge.fury.io/js/ts-immutable-struct)
[![NPM downloads](https://img.shields.io/npm/dm/ts-immutable-struct.svg?style=flat)](https://npmjs.org/package/ts-immutable-struct)
[![Build Status](https://travis-ci.org/wkornewald/ts-immutable-struct.svg?branch=master)](https://travis-ci.org/wkornewald/ts-immutable-struct)

`ts-immutable-struct` is a TypeScript package for using `immutable.js` with type-safe cursors
and simple event tracking to allow distinguishing between user-initiated state changes and
internal state changes (e.g. to sync state).

The emphasis here is on type-safety.

This package is inspired by [immstruct](https://github.com/omniscientjs/immstruct), but uses references for everything.

React users will want to combine this with [ts-react-struct](https://github.com/wkornewald/ts-react-struct), so
`shouldComponentUpdate()` works with `ts-immutable-struct` cursors.

## Getting started

Install the package:
```sh
npm install --save ts-immutable-struct
```

Initialize the global state struct:
```typescript
import {Struct} from 'ts-immutable-struct'

let data = Struct({
  a: 5,
  b: 'hey',
  c: null as string | null,
  d: [1, 2, 3],
  e: [true, true, false],
  f: ['a', 'b', 'c'],
  g: [{a: 40, b: ['d']}, {a: 50, b: ['e']}],
  l: [[60]],
  o: {f: 65},
  da: new Date(),
})

data.observe((event, oldVal, newVal) => {
  // Handle state changes (oldVal and newVal are both cursors, so you'll need to deref())
})
```

Note that `Struct()` will internally convert the given argument to an immutable.js object using `immutable.fromJS()`.

Here's how to traverse and mutate the `Struct` state:
```typescript
// retrieve a value
let a = data.get('a').deref()

// update a value
data.get('g').get(0).get('a').val(99)

// alternative
data.get('g').get(0).get('a').update(x => x + 1)

// update the underlying immutable.js value
data.get('g').get(0).update(x => x.set('a', 99))
```

Everything here is type-checked. A wrong property name or type results in a compile-time error.
