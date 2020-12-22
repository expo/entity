import ES6Error from 'es6-error';

export enum EntityErrorState {
  UNKNOWN,
  TRANSIENT,
  PERMANENT,
}

export default abstract class EntityError extends ES6Error {
  public abstract readonly state: EntityErrorState;
}
