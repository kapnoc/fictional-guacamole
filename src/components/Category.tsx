import React from "react";
import { Component } from "react";

import * as E from "fp-ts/lib/Either";

import { apiCacheLengthMinutes } from "../config";
import { ClothItemDisplay } from "./ClothItem";
import { ClothItemsListType, ClothItemType, getItems } from "../endpoints/ItemsEndpoint";
import { getManufacturers, ManufacturerResponseType } from "../endpoints/ManufacturersEndpoint";
import { MatchResultsType, matchItemsWithAvailability } from "../endpoints/MatchItems";


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
        let manufacturers = await getManufacturers(manufacturer_names);

        let itemsWithAvailability = matchItemsWithAvailability(
            items,
            manufacturers,
            this.state.manufacturers,
            this.state.page)

        E.fold((error: Error) => {
            this.setState({
                error: error,
                loading: false,
                items: [],
                manufacturers: [],
                maxPage: 1,
            });
        }, (matchResults: MatchResultsType) => {
            this.setState({
                error: null,
                loading: false,
                items: matchResults.items,
                manufacturers: matchResults.newManufacturers,
                maxPage: matchResults.maxPage,
            });
        })(itemsWithAvailability)
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