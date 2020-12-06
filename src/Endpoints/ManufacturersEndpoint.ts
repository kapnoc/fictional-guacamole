import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from 'io-ts';
import * as xmlParser from 'fast-xml-parser';

import { apiEndpoint, headers } from "../config";

export const Availability = t.type({
    AVAILABILITY: t.type({
        INSTOCKVALUE: t.string
    }),
})
export type AvailabilityType = t.TypeOf<typeof Availability>

export const ManufacturerItem = t.type({
    id: t.string,
    DATAPAYLOAD: t.string,
})
export type ManufacturerItemType = t.TypeOf<typeof ManufacturerItem>

export const ManufacturerItemsList = t.array(ManufacturerItem)
export type ManufacturerItemsListType = t.TypeOf<typeof ManufacturerItemsList>

export const ManufacturerResponse = t.type({
    fetchedDate: t.union([t.number, t.undefined]),
    name: t.union([t.string, t.undefined]),
    code: t.number,
    response: ManufacturerItemsList,
})
export type ManufacturerResponseType = t.TypeOf<typeof ManufacturerResponse>


export async function getManufacturers(manufacturer_names: E.Either<Error, string[]>) {
    return await pipe(
        TE.fromEither(manufacturer_names),
        TE.chain((manufacturers) => {
            return TE.sequenceArray(manufacturers.map((manufacturer_name: string) => {
                return pipe(
                    TE.tryCatch(
                        () => fetch(`${apiEndpoint}/availability/${manufacturer_name}`, { headers, }),
                        (reason) => new Error(`Could not fetch manufacturer: ${reason}`)
                    ),
                    TE.chain((manufacturerRes: Response) => TE.tryCatch(
                        () => manufacturerRes.json(),
                        (reason) => new Error(`Could not convert manufacturer to JSON: ${reason}`)
                    )),
                    TE.chain((manufacturerJson: any) => TE.fromEither(
                        E.mapLeft(error => new Error(`Could not convert manufacturer JSON to io-ts types: ${error}`))
                            (ManufacturerResponse.decode(manufacturerJson))
                    )),
                    // Now parse XML
                    TE.chain((manufacturer: ManufacturerResponseType) => {
                        let response: E.Either<Error, readonly ManufacturerItemType[]> = E.sequenceArray(
                            manufacturer.response.map((item: ManufacturerItemType) => {
                                let availabilityJson = xmlParser.parse(item.DATAPAYLOAD);
                                let availability = E.mapLeft(error => new Error(`Could not convert manufacturer JSON to io-ts types: ${error}`))
                                    (Availability.decode(availabilityJson));
                                return E.map((avail: AvailabilityType) => {
                                    return {
                                        id: item.id,
                                        DATAPAYLOAD: avail.AVAILABILITY.INSTOCKVALUE
                                    }
                                })(availability)
                            }));
                        return TE.fromEither(E.map((resp: readonly ManufacturerItemType[]) => {
                            let newResp: ManufacturerItemType[] = [...resp];
                            return {
                                ...manufacturer,
                                response: newResp
                            }
                        })(response))
                    }),
                    // Add name & date, used to match with items later & to know if we reload
                    TE.map((manufacturer: ManufacturerResponseType) => {
                        let finalManufacturer: ManufacturerResponseType = {
                            ...manufacturer,
                            name: manufacturer_name,
                            fetchedDate: Date.now(),
                        };
                        return finalManufacturer;
                    })
                )
            }))
        })
    )()
}
