import React from "react";
import { Component } from "react";

import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

import { ClothItemDisplay, ClothItemType } from "./ClothItem";
import { apiEndpoint, headers, pageSize, apiCacheLengthMinutes } from "../config";
import { ClothItemsListType, getItems } from "../Endpoints/ItemsEndpoint";
import { getManufacturers, ManufacturerItemType, ManufacturerResponse, ManufacturerResponseType } from "../Endpoints/ManufacturersEndpoint";


type CategoryProps = {
    name: string,
    page: number,
};
type CategoryState = {
    error: Error | null,
    loading: boolean,
    items: readonly ClothItemType[],
    manufacturers: readonly ManufacturerResponseType[],
    page: number,
    maxPage: number
};


class Category extends Component<CategoryProps, CategoryState> {
    constructor(props: CategoryProps) {
        super(props);
        this.state = {
            error: null,
            loading: true,
            items: [],
            manufacturers: [],
            page: this.props.page,
            maxPage: 1,
        };
    }

    componentDidUpdate(prevProps: CategoryProps) {
        if (this.props.name !== prevProps.name) {
            this.setState({
                error: null,
                loading: true,
                items: [],
                page: this.props.page,
            });
            this.getData()
        }
    }

    componentDidMount() {
        this.getData();
    }

    async getData() {
        const items = await getItems(this.props.name);
        // filter manufacturers that have been loaded in the last 5 minutes
        // (or whatever is in the apiCacheLengthMinutes config entry)
        let manufacturer_names = E.map((items: ClothItemsListType) => {
            return [...new Set(items.map(((item: ClothItemType) => item.manufacturer)))]
                .filter((manufacturer_name) => {
                    let found_manufacturer = this.state.manufacturers.find(manu => manu.name === manufacturer_name)
                    if (found_manufacturer === undefined)
                        return true;
                    let msPerMinute = 60_000;
                    let refetchDateTrigger = Date.now() - (apiCacheLengthMinutes * msPerMinute)
                    if (found_manufacturer.fetchedDate === undefined)
                        return true
                    return found_manufacturer.fetchedDate < refetchDateTrigger
                });
        })(items)
        let manufacturersData = await getManufacturers(manufacturer_names);

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
                const oldManufacturers = this.state.manufacturers;
                let newManufacturers: ManufacturerResponseType[] = [];
                oldManufacturers.forEach(oldManufacturer => {
                    let newManufacturer = manufacturersData.find((newMan) => {
                        return newMan.name === oldManufacturer.name
                    })
                    if (newManufacturer === undefined) {
                        newManufacturers.push(oldManufacturer)
                    }
                });
                manufacturersData.forEach(newManufacturer => newManufacturers.push(newManufacturer))

                const maxPage = Math.round(items.length / pageSize) + 1;
                const itemsWithAvailability = items
                    .slice((this.state.page - 1) * pageSize, this.state.page * pageSize)
                    .map((item) => {
                        let man = newManufacturers.find((manu) => manu.name === item.manufacturer);
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
                    manufacturers: newManufacturers,
                    maxPage
                });
            })(manufacturersData)
        })(items)
    }

    render() {
        const { error, loading, items } = this.state;
        const reloadButton = (
            <button
                className="btn"
                onClick={() => {
                    this.setState({
                        error: null,
                        manufacturers: [],
                        loading: true
                    });
                    this.getData()
                }}>
                Reload
            </button>
        )
        if (error) {
            return (
                <div>
                    {reloadButton}
                    <div>Error: {`${error}`}</div>
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
            const paginationLinks = [...Array(this.state.maxPage).keys()].map((pageNumber) => {
                let className = (pageNumber + 1 === this.state.page) ? "btn" : "btn btn-flat";
                return (
                    <li>
                        <button
                            className={className}
                            onClick={() => {
                                this.setState({ loading: true, page: pageNumber + 1 });
                                this.getData()
                            }}>
                            {pageNumber + 1}
                        </button>
                    </li>
                )
            })

            return (
                <div>
                    {reloadButton}
                    <div className="row">
                        <ul className="pagination">
                            {paginationLinks}
                        </ul>
                    </div>
                    <div className="row">
                        {items_components}
                    </div>
                </div >
            )
        }
    }
}

export default Category