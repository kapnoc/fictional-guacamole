import React from "react";
import { Component } from "react";

import * as t from 'io-ts';


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

type ClothItemProps = {
    item: ClothItemType
}

export class ClothItemDisplay extends Component<ClothItemProps, {}> {
    render() {
        let colors = this.props.item.color.map(color => {
            return (
                <div className="col s3" key={color}>{color}</div>
            )
        })
        return (
            <div className="col s12 m6 l3 card">
                <div className="card-content">
                    <span className="card-title">{this.props.item.name}</span>
                    <ul>
                        <li>
                            <div className="row">
                                <div className="col">Colors :</div>
                                {colors}
                            </div>
                        </li>
                        <li>Price: {this.props.item.price}</li>
                        <li>Manufacturer: {this.props.item.manufacturer}</li>
                        <li>Availability: {this.props.item.availability}</li>
                    </ul>
                </div>
            </div>
        )
    }
}