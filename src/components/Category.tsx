import React from "react";
import { Component } from "react";

import * as t from 'io-ts';
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";

import { ClothItem, ClothItemDisplay, ClothItemType } from "./ClothItem";
import { apiEndpoint, headers } from "../config";
import { pipe } from "fp-ts/lib/function";


type CategoryProps = {
    name: string,
};
type CategoryState = {
    error: Error | null,
    loading: boolean,
    items: readonly ClothItemType[],
};

const ClothItemsList = t.array(ClothItem)
type ClothItemsListType = t.TypeOf<typeof ClothItemsList>


const ManufacturerItem = t.type({
    id: t.string,
    DATAPAYLOAD: t.string,
})
export type ManufacturerItemType = t.TypeOf<typeof ManufacturerItem>

const ManufacturerItemsList = t.array(ManufacturerItem)
// type ManufacturerItemsListType = t.TypeOf<typeof ManufacturerItemsList>

const ManufacturerResponse = t.type({
    name: t.union([t.string, t.undefined]),
    code: t.number,
    response: ManufacturerItemsList,
})
export type ManufacturerResponseType = t.TypeOf<typeof ManufacturerResponse>


class Category extends Component<CategoryProps, CategoryState> {
    constructor(props: CategoryProps) {
        super(props);
        this.state = {
            error: null,
            loading: true,
            items: [],
        };
    }

    componentDidMount() {
        this.getData();
    }

    async getData() {
        const items = await pipe(
            TE.tryCatch(
                () => fetch(`${apiEndpoint}/products/${this.props.name}`, { headers, }),
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
        let manufacturers = E.map((items: ClothItemsListType) => {
            return [...new Set(items.map(((item: ClothItemType) => item.manufacturer)))];
        })(items)
        let manufacturersData = await pipe(
            TE.fromEither(manufacturers),
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
                            E.mapLeft(error => new Error(`Could not convert manufacturer JSON to io-ts types: ${error}`))(ManufacturerResponse.decode(manufacturerJson))
                        )),
                        TE.map((manufacturer) => { return { ...manufacturer, name: manufacturer_name } })
                    )
                }))
            })
        )()

        E.fold((error) => {
            this.setState({
                error: new Error(`Error getting items: ${error}`),
                loading: false,
                items: [],
            });
        }, (items: ClothItemsListType) => {
            E.fold((error) => {
                this.setState({
                    error: new Error(`Error getting availability of items: ${error}`),
                    loading: false,
                    items: [],
                });
            }, (manufacturersData: readonly ManufacturerResponseType[]) => {
                const itemsWithAvailability = items.map((item) => {
                    let man = manufacturersData.find((manu) => manu.name === item.manufacturer);
                    if (man === undefined) {
                        return { ...item, availability: undefined };
                    }
                    let manItem: ManufacturerItemType | undefined = man.response.find((manuItem) => manuItem.id === item.id.toUpperCase())
                    if (manItem === undefined) {
                        console.log(item.id.toUpperCase());
                        return { ...item, availability: undefined };
                    }
                    return { ...item, availability: manItem.DATAPAYLOAD };
                })
                this.setState({
                    error: null,
                    loading: false,
                    items: itemsWithAvailability,
                });
            })(manufacturersData)
        })(items)
    }

    render() {
        const { error, loading, items } = this.state;
        if (error) {
            return (
                <div>
                    <button className="btn green darken-2" onClick={() => { this.setState({ error: null, loading: true }); this.getData() }}>
                        Reload
                    </button>
                    <div>Error: {error}</div>
                </div>
            );
        } else if (loading) {
            return <div>Loading...</div>;
        } else {
            const items_components = items.map((i: ClothItemType) => {
                return (
                    <ClothItemDisplay item={i} key={i.id}></ClothItemDisplay>
                );
            });

            return (
                <div>
                    <button className="btn green darken-2" onClick={() => { this.setState({ loading: true }); this.getData() }}>
                        Reload
                    </button>
                    <div className="row">
                        {items_components}
                    </div>
                </div >
            )
        }
    }
}

export default Category