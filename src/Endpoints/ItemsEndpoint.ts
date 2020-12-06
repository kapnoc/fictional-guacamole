import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from 'io-ts';

import { apiEndpoint, headers } from "../config";


export const ClothItem = t.type({
    availability: t.union([t.string, t.undefined]),
    id: t.string,
    type: t.string,
    name: t.string,
    color: t.array(t.string),
    price: t.number,
    manufacturer: t.string,
})
export type ClothItemType = t.TypeOf<typeof ClothItem>

export const ClothItemsList = t.array(ClothItem)
export type ClothItemsListType = t.TypeOf<typeof ClothItemsList>


export async function getItems(category: string) {
    return await pipe(
        TE.tryCatch(
            () => fetch(`${apiEndpoint}/products/${category}`, { headers, }),
            (reason) => new Error(`Could not fetch products: ${reason}`)
        ),
        TE.chain((itemsRes: Response) => TE.tryCatch(
            () => itemsRes.json(),
            (reason) => new Error(`Could not convert products to JSON: ${reason}`)
        )),
        TE.chain((itemsJson: any) => TE.fromEither(
            E.mapLeft(error => new Error(`Could not convert products JSON to io-ts types: ${error}`))(ClothItemsList.decode(itemsJson))
        ))
    )()
}