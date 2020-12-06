import { pipe } from "fp-ts/lib/function";
import * as E from "fp-ts/lib/Either";

import { pageSize } from "../config";
import { ClothItemsListType } from "./ItemsEndpoint";
import { ManufacturerItemType, ManufacturerResponseType } from "./ManufacturersEndpoint";

export type MatchResultsType = {
    items: ClothItemsListType,
    maxPage: number,
    newManufacturers: ManufacturerResponseType[],
}

export function matchItemsWithAvailability(
    itemsTE: E.Either<Error, unknown>,
    newManufacturersTE: E.Either<Error, unknown>,
    oldManufacturers: readonly ManufacturerResponseType[],
    page: number
) {
    let finalNewManufacturers: ManufacturerResponseType[] = [];
    let maxPage = 1;
    return pipe(
        E.sequenceArray([itemsTE, newManufacturersTE]),
        E.chain(([itemsAny, newManufacturersAny]) => {
            let items = itemsAny as ClothItemsListType;

            // update the manufacturers cache
            let newManufacturers = newManufacturersAny as ManufacturerResponseType[];
            oldManufacturers.forEach(oldManufacturer => {
                let newManufacturer = newManufacturers.find((newMan) => {
                    return newMan.name === oldManufacturer.name
                })
                if (newManufacturer === undefined) {
                    finalNewManufacturers.push(oldManufacturer)
                }
            });
            newManufacturers.forEach(newManufacturer => finalNewManufacturers.push(newManufacturer))

            // find the availability of each item from the updated manufacturer cache
            maxPage = Math.round(items.length / pageSize) + 1;
            const itemsWithAvailability = E.sequenceArray(items
                .slice((page - 1) * pageSize, page * pageSize)
                .map((item) => {
                    let man = finalNewManufacturers.find((manu) => manu.name === item.manufacturer);
                    if (man === undefined) {
                        return E.left(new Error(`Item with unknown manufacturer: ${item.manufacturer}`))
                    }
                    let manItem: ManufacturerItemType | undefined = man.response.find((manuItem) => manuItem.id === item.id.toUpperCase())
                    if (manItem === undefined) {
                        return E.left(new Error(`Item with unknown id: ${item.id}`))
                    }
                    return E.right({ ...item, availability: manItem.DATAPAYLOAD });
                }))

            return itemsWithAvailability;
        }),
        E.map(items => {
            console.log(finalNewManufacturers)
            return {
                items: [...items],
                newManufacturers: finalNewManufacturers,
                maxPage,
            }
        })
    )
}