import React from "react";
import { Component } from "react";

import { ClothItemType } from "../Endpoints/ItemsEndpoint";

export type ClothItemProps = {
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