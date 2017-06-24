import * as immutable from 'immutable'

export interface ImmJS {__$implements_interface_immjs__: true}
export type Primitive = number | string | boolean | Date | RegExp | Function
                      | null | undefined | ImmJS

export function Raw<T>(x: T) {
  return x as T & ImmJS
}

export interface Map<T extends object> extends immutable.Map<string, any> {
  // XXX: This is needed to make type checks work because we don't store an
  // actual value of T anywhere.
  __$typespec__: T

  get<K extends keyof T, S extends {[A in K]: Primitive}>(this: Map<S>, k: K): T[K]
  get<K extends keyof T, V, S extends {[A in K]: V[]}>(this: Map<S>, k: K): List<T[K]>
  get<K extends keyof T, SK, SV, S extends {[A in K]: immutable.Iterable<SK, SV>}>(
    this: Map<S>, k: K): T[K]
  get<K extends keyof T, V extends object, S extends {[A in K]: V}>(this: Map<S>, k: K): Map<T[K]>

  set<K extends keyof T, S extends {[A in K]: Primitive}>(this: Map<S>, k: K, v: T[K]): Map<S>
  set<K extends keyof T, V, S extends {[A in K]: V[]}>(this: Map<S>, k: K, v: List<V[]>): Map<S>
  set<K extends keyof T, SK, SV, S extends {[A in K]: immutable.Iterable<SK, SV>}>(
    this: Map<S>, k: K, v: T[K]): Map<S>
  set<K extends keyof T, V extends object, S extends {[A in K]: V}>(this: Map<S>, k: K, v: Map<T[K]>): Map<S>

  mergeDeep<S extends object>(v: Map<S>): Map<S & T>
}

export function Map<T extends object>(x: T): Map<T> {
  return immutable.fromJS(x) as Map<T>
}

export interface List<T> extends immutable.List<any> {
  // XXX: This is needed to make type checks work because we don't store an
  // actual value of T anywhere.
  __$typespec__: T

  get<V extends Primitive>(this: List<V[]>, k: number): V
  get<V>(this: List<V[][]>, k: number): List<V[]>
  get<K, V, S extends immutable.Iterable<K, V>>(this: List<S[]>, k: number): S
  get<S extends object>(this: List<S[]>, k: number): Map<S>
  get(k: number): never

  push<V extends Primitive>(this: List<V[]>, v: V): List<V[]>
  push<V>(this: List<V[][]>, v: List<V[]>): List<V[][]>
  push<K, V, S extends immutable.Iterable<K, V>>(this: List<S[]>, v: S): List<S[]>
  push<S extends object>(this: List<S[]>, v: S): List<S[]>
}

export function List<T>(x: T[]): List<T[]> {
  return immutable.fromJS(x) as List<T[]>
}

// TODO: implement a more flexible observer system that can deal with nested events
// TODO: allow batching mutations from different cursors and events
export type Observer<T> = (oldVal: T, newVal: T, event: ChangeReason) => void

export class ChangeReason {
  readonly event?: Event
  readonly wasUser: boolean
  readonly source?: any

  constructor(event?: Event, wasUser?: boolean, source?: any) {
    this.event = event
    this.wasUser = wasUser === undefined ? Boolean(event) : wasUser
    this.source = source
  }
}

export interface BaseObservable<T> {
  observe(observer: Observer<T>): void
  unobserve(observer: Observer<T>): void
  notify(event: ChangeReason, oldVal?: T, newVal?: T): void
}

export class Observable<T> implements BaseObservable<T> {
  protected _observers: Observer<T>[] = []

  observe(observer: Observer<T>) {
    this._observers.push(observer)
  }

  unobserve(observer: Observer<T>) {
    this._observers = this._observers.filter(o => o !== observer)
  }

  notify(event: ChangeReason, oldVal: T, newVal: T) {
    for (let observer of this._observers) {
      observer(oldVal, newVal, event)
    }
  }
}

class Root<S extends object> extends Observable<ObjectRef<S>> {
  private _value: immutable.Map<string, any>
  private _owner?: ObjectRef<S>

  constructor(value: immutable.Map<string, any>, owner?: ObjectRef<S>) {
    super()
    this._value = value
    this._owner = owner
  }

  setOwner(owner: ObjectRef<S>) {
    if (this._owner) {
      throw Error('Owner already set')
    }
    this._owner = owner
  }

  deref(): immutable.Map<string, any> {
    return this._value
  }

  set(value: immutable.Map<string, any>, event: ChangeReason) {
    if (!this._owner) {
      throw Error('Owner not set')
    }
    let old = new InternalRootRefForEvent(new Root<S>(this._value, this._owner)) as ObjectRef<S>
    this._value = value
    this.notify(event, old, this._owner)
  }
}

export class BaseRef<T> {
  // XXX: This is needed to make type checks work because we don't store an
  // actual value of T anywhere.
  __$typespec__: T

  protected root: Root<any>
  protected path: any[]

  protected constructor(root: Root<any>, path: any[] = []) {
    this.root = root
    this.path = path
  }

  deref(): any {
    return this.root.deref().getIn(this.path)
  }

  val(v: any, event: ChangeReason): this {
    this.root.set(this.root.deref().updateIn(this.path, (val: any) => v), event)
    return this
  }

  update(func: (v: any) => any, event: ChangeReason): this {
    this.root.set(this.root.deref().updateIn(this.path, func), event)
    return this
  }
}

export interface LeafRef<T> extends BaseRef<T> {
  deref(): T

  val(x: T, event: ChangeReason): this

  update(func: (v: T) => T, event: ChangeReason): this
}

export class Ref<T> extends BaseRef<T> {
  get(k: any): any {
    return new Ref<any>(this.root, this.path.concat(k))
  }
}

class InternalRootRefForEvent<T extends object> extends Ref<T> {
  constructor(root: Root<T>) {
    super(root)
  }
}

export interface ObjectRef<T extends object> extends Ref<T> {
  get<K extends keyof T, SK, SV, S extends {[A in K]: immutable.Iterable<SK, SV>}>(
    this: ObjectRef<S>, k: K): ImmutableRef<T[K]>
  get<K extends keyof T, S extends {[A in K]: Primitive}>(
    this: ObjectRef<S>, k: K): LeafRef<T[K]>
  get<K extends keyof T, V, S extends {[A in K]: V[]}>(
    this: ObjectRef<S>, k: K): ArrayRef<T[K]>
  get<K extends keyof T, V extends object, S extends {[A in K]: V}>(this: ObjectRef<S>, k: K): ObjectRef<T[K]>
  get<K extends keyof T>(k: K): never

  deref(): Map<T>

  val(v: Map<T>, event: ChangeReason): this

  update(func: (v: Map<T>, event: ChangeReason) => Map<T>): this
}

export interface ArrayRef<T> extends Ref<T> {
  get<V extends Primitive>(this: ArrayRef<V[]>, k: number): LeafRef<V>
  get<V>(this: ArrayRef<V[][]>, k: number): ArrayRef<V[]>
  get<K, V, S extends immutable.Iterable<K, V>>(
    this: ArrayRef<S[]>, k: number): ImmutableRef<S>
  get<V extends object>(this: ArrayRef<V[]>, k: number): ObjectRef<V>
  get(k: number): never

  deref(): List<T>

  val(v: List<T>, event: ChangeReason): this

  update(func: (v: List<T>, event: ChangeReason) => List<T>): this
}

export interface ImmutableRef<T> extends Ref<T> {
  get<K, V extends Primitive>(
    this: ImmutableRef<immutable.Iterable<K, V>>, k: K): LeafRef<V>
  get<K, SK, SV, S extends immutable.Iterable<SK, SV>>(
    this: ImmutableRef<immutable.Iterable<K, S>>, k: K): ImmutableRef<S>
  get<K, V>(this: ImmutableRef<immutable.Iterable<K, V>>, k: K): never

  deref(): T

  val<K, V, S extends immutable.Iterable<K, V>>(
    this: ImmutableRef<S>, v: S, event: ChangeReason): this

  update<K, V, S extends immutable.Iterable<K, V>>(
    this: ImmutableRef<S>, func: (v: S) => S, event: ChangeReason): this
}

export class RootRef<T extends object> extends Ref<T> implements BaseObservable<ObjectRef<T>> {
  protected root: Root<T>

  constructor(x: T) {
    super(new Root<T>(immutable.fromJS(x)))
    this.root.setOwner(this as any)
  }

  observe(observer: Observer<ObjectRef<T>>) {
    this.root.observe(observer)
  }

  unobserve(observer: Observer<ObjectRef<T>>) {
    this.root.unobserve(observer)
  }

  notify(event: ChangeReason, oldVal: ObjectRef<T> = this as any, newVal: ObjectRef<T> = this as any) {
    this.root.notify(event, oldVal, newVal)
  }
}

export function Struct<T extends object>(x: T): ObjectRef<T> & BaseObservable<ObjectRef<T>> {
  return new RootRef<T>(x) as any
}
