import React from "react";
import { Component } from "react";

import * as t from 'io-ts';
import { fold } from "fp-ts/lib/Either";

type CategoryProps = { name: string };
type CategoryState = {
    error: any,
    loading: boolean,
    items: any,
};

const ClothItem = t.type({
    id: t.string,
    type: t.string,
    name: t.string,
    color: t.array(t.string),
    price: t.number,
    manufacturer: t.string,
})
type ClothItem = t.TypeOf<typeof ClothItem>

const ClothItemsList = t.array(ClothItem)
type ClothItemsList = t.TypeOf<typeof ClothItemsList>

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

    getData() {
        fetch("https://bad-api-assignment.reaktor.com/products/" + this.props.name)
            .then(res => res.json())
            .then(
                (result) => {
                    var items = ClothItemsList.decode(result)
                    fold(() => {

                    }, (result_items: ClothItemsList) => {

                        this.setState({
                            loading: false,
                            items: result_items.slice(0, 50)
                        });
                    })(items)
                },
                (error) => {
                    this.setState({
                        loading: false,
                        error
                    });
                }
            )
    }

    render() {
        const { error, loading, items } = this.state;
        if (error) {
            return (
                <div>
                    <button onClick={() => { this.setState({ loading: true }); this.getData() }}>
                        Reload
                    </button>
                    <div>Error: {error.message}</div>
                </div>
            );
        } else if (loading) {
            return <div>Loading...</div>;
        } else {
            const items_components = items.map((i: ClothItem) => {
                return (
                    <li>
                        {i.name}
                    </li>
                );
            });

            return (
                <div>
                    <button onClick={() => { this.setState({ loading: true }); this.getData() }}>
                        Reload
                    </button>
                    <ul>{items_components}</ul>
                </div>
            )
        }
    }
}

export default Category