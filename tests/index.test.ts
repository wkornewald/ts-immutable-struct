import * as immutable from 'immutable'
import {List, Map, Struct, ObjectRef, UserEvent} from '..'

function baseData() {
  return Struct({
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
    fu: (x: number) => null,
    ma: immutable.Map({gaag: immutable.Map({hu: 99})}) as
        immutable.Map<string, immutable.Map<string, number>>,
    ml: [immutable.Map({gaag: immutable.Map({hu: 98})})],
    li: immutable.List([70, 80, 90]),
  })
}

let data = baseData()
beforeEach(() => {
  data = baseData()
})

let num: number
let bool: boolean
let str: string

test('Map/List type inference and accessors', () => {
  num = Map({a: [1], b: 'old'}).set('a', List([9])).set('b', 'new').get('a').get(0)
  expect(num).toBe(9)

  num = List([{a: 9}]).get(0).get('a')
  expect(num).toBe(9)
})

test('Struct type inference and accessors', () => {
  type DataType = ObjectRef<typeof data.__$typespec__>
  let oldVal: DataType = data
  let newVal: DataType = data
  let event: UserEvent | undefined
  data.observe((_event, _oldVal, _newVal) => {
    event = _event
    oldVal = _oldVal
    newVal = _newVal
  })

  data.notify(new Event('Tst'))
  expect(event && event.type).toBe('Tst')

  num = data.get('a').deref()
  expect(num).toBe(5)
  num = data.get('a').val(10).deref()
  expect(num).toBe(10)
  expect(oldVal.get('a').deref()).toBe(5)
  expect(newVal.get('a').deref()).toBe(10)
  expect(newVal).toBe(data)
  expect(event).toBeUndefined()
  num = data.get('a').deref()
  expect(num).toBe(10)
  num = data.get('a').update(x => x - 5).deref()
  expect(num).toBe(5)

  str = data.get('b').deref()
  expect(str).toBe('hey')
  str = data.get('b').update(x => x + ' John', new Event('Tst')).deref()
  expect(str).toBe('hey John')
  expect(event && event.type).toBe('Tst')

  let nstr = data.get('c').deref()
  expect(nstr).toBe(null)
  nstr = data.get('c').val(null).deref()
  expect(nstr).toBe(null)
  nstr = data.get('c').val('ahoy').deref()
  expect(nstr).toBe('ahoy')
  if (nstr !== null) {
    expect(nstr.startsWith('ah')).toBe(true)
  }

  num = data.get('d').get(0).deref()
  expect(num).toBe(1)

  bool = data.get('e').get(0).deref()
  expect(bool).toBe(true)

  str = data.get('f').get(0).deref()
  expect(str).toBe('a')

  num = data.get('g').get(0).get('a').deref()
  expect(num).toBe(40)

  str = data.get('g').get(0).get('b').get(0).deref()
  expect(str).toBe('d')
  str = data.get('g').get(0).get('b').get(0).update(x => x + 'd').deref()
  expect(str).toBe('dd')

  num = data.get('l').get(0).get(0).deref()
  expect(num).toBe(60)
})
