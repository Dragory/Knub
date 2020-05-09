import "reflect-metadata";

function getTargetIterableProps(target) {
  const nonEnumerableProps = Object.getOwnPropertyNames(target.prototype);
  const enumerableProps = Object.keys(target);
  return [...nonEnumerableProps, ...enumerableProps];
}

export function getMetadataFromAllProperties<T = any>(target, name): Record<string, T> {
  return getTargetIterableProps(target).reduce((map, prop) => {
    const data = Reflect.getMetadata(name, target.prototype, prop);
    if (data) {
      map[prop] = data;
    }
    return map;
  }, {});
}

export function appendToPropertyMetadata(target, prop, name, value) {
  if (!Reflect.hasMetadata(name, target, prop)) {
    Reflect.defineMetadata(name, [], target, prop);
  }

  const arr = Reflect.getMetadata(name, target, prop);
  arr.push(value);
}
