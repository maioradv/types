export type GlobalEntities = {
  tidelizio: 'Product' | 'ProductVariant' | 'Bundle' | 'BundleVariant' | 'Collection';
  accounts: 'Customer' | 'Dashboard';
};

export type Domain = keyof GlobalEntities;

export type Entity<D extends Domain> = GlobalEntities[D];

export type Gid<D extends Domain> = `gid://${D}/${Entity<D>}/${number}`;

export function toGlobalId<
  D extends Domain,
  E extends Entity<D>
>(domain: D, entity: E, id: number): Gid<D> {
  return `gid://${domain}/${entity}/${id}`;
}

export function fromGlobalId<T extends Gid<Domain>>(gid: T) {
  const [, , domain, entity, id] = gid.split("/");

  return {
    domain: domain as Domain,
    entity: entity as GlobalEntities[Domain],
    id: id as string,
  };
}
