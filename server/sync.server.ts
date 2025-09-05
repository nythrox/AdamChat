import { Collection } from "@tanstack/db";

type CollectionRecord = Record<string, Collection<Record<string, any>>>;

type Options<T extends CollectionRecord> = {
    collections: T
}

export function createSyncServer<T extends CollectionRecord>(options: Options<T>) {
    const { collections } = options;

    return {
        init: () => {
            Object.values(collections).forEach(collection => {
                collection.subscribeChangesKey
                collection.subscribeChanges((changes) => {
                    changes.forEach(change => {
                        console.log(change);
                    });
                });
            });
        }
    }
}